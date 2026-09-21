const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const modulePath = path.join(__dirname, '..', 'video-media.js');
const sample = overrides => ({ id:'video-one', source:'indexeddb', name:'우리 가게.mp4', mime:'video/mp4', size:48, width:720, height:1280, duration:12.4, ratio:'4:3', ...overrides });
const source = () => fs.existsSync(modulePath) ? fs.readFileSync(modulePath, 'utf8') : '';
const tick = () => new Promise(resolve => setImmediate(resolve));

function setup(t) {
  const dom = new JSDOM('<main></main>', { runScripts:'outside-only', url:'http://localhost:5173', pretendToBeVisual:true });
  t.after(() => dom.window.close());
  const w = dom.window, d = w.document, revoked = [], created = [], rows = new Map(), writes = [];
  w.URL.createObjectURL = blob => { const url = 'blob:test-' + (created.length + 1); created.push({url,blob}); return url; };
  w.URL.revokeObjectURL = url => revoked.push(url);
  w.HTMLMediaElement.prototype.pause = function () { this.pauseCount = (this.pauseCount || 0) + 1; };
  w.HTMLMediaElement.prototype.load = function () {};
  w.HTMLMediaElement.prototype.canPlayType = () => 'probably';
  const db = {
    objectStoreNames:{ contains:() => true }, close() {},
    transaction(_name, mode) {
      const transaction = { error:null, objectStore:() => ({
        put(row) { writes.push({row,transaction}); return {}; },
        get(id) { const request={}; queueMicrotask(() => { request.result=rows.get(id); request.onsuccess?.(); queueMicrotask(() => transaction.oncomplete?.()); }); return request; }
      }) };
      return transaction;
    }
  };
  w.indexedDB = { open() { const request={}; queueMicrotask(() => {request.result=db;request.onsuccess?.();});return request; } };
  w.eval(source());
  assert.ok(w.MisamoVideo, 'video module is available');
  return {w,d,api:w.MisamoVideo,rows,writes,created,revoked};
}

test('video metadata is bounded and strips unrelated binary metadata', () => {
  const api = fs.existsSync(modulePath) ? require(modulePath) : {};
  assert.equal(typeof api.cleanVideo, 'function');
  assert.equal(api.cleanVideo(null), null);
  assert.deepEqual(api.cleanVideo({...sample(),base64:'data:video/mp4;base64,abc',extra:'ignored'}), sample());
  for (const invalid of [
    {source:'remote'}, {id:'../bad'}, {mime:'image/png'}, {size:0}, {size:104857601},
    {width:Infinity}, {height:0}, {duration:NaN}, {duration:-1}, {ratio:'3:2'},
    {src:'blob:temporary'}, {src:'https://example.com/video.mp4'}
  ]) assert.equal(api.cleanVideo(sample(invalid)), null, JSON.stringify(invalid));
  assert.equal(api.cleanVideo(sample({ratio:'1.91:1'})).ratio,'16:9');
  assert.equal(api.cleanVideo(sample({ratio:'4:5'})).ratio,'4:3');
  for(const ratio of ['4:3','1:1','9:16','16:9']) assert.equal(api.cleanVideo(sample({ratio})).ratio,ratio);
});

test('only local test assets with matching video extensions are accepted', () => {
  const api = fs.existsSync(modulePath) ? require(modulePath) : {};
  assert.equal(typeof api.cleanVideo, 'function');
  const asset=sample({source:'asset',src:'assets/local-test-media/shop-demo.mp4'});
  assert.deepEqual(api.cleanVideo(asset),asset);
  for(const src of ['https://example.com/a.mp4','/assets/local-test-media/a.mp4','assets/local-test-media/../a.mp4','assets/local-test-media/a.mp4?x=1','assets/local-test-media/a.webm','data:video/mp4;base64,AAA']) {
    assert.equal(api.cleanVideo({...asset,src}),null,src);
  }
});

test('asset availability checks the actual same-origin file and rejects missing assets', async t => {
  const {w,api}=setup(t);const calls=[];
  w.fetch=async (url,options)=>{calls.push({url,options});return {ok:false,status:404};};
  const asset=sample({source:'asset',src:'assets/local-test-media/shop.mp4'});
  await assert.rejects(api.assertAvailable(asset),/찾을 수 없/);
  assert.equal(calls[0].url,'http://localhost:5173/assets/local-test-media/shop.mp4');
  assert.equal(calls[0].options.method,'HEAD');assert.equal(calls[0].options.redirect,'error');
  w.fetch=async()=>({ok:true,status:200});assert.equal((await api.assertAvailable(asset)).id,asset.id);
});

test('import rejects unsupported and oversized files before allocating URLs or writing', async t => {
  const {w,api,created,writes}=setup(t);
  await assert.rejects(api.importFile(new w.File(['x'],'x.mov',{type:'video/quicktime'})), /MP4|WebM/);
  const large=new w.File(['x'],'x.mp4',{type:'video/mp4'});Object.defineProperty(large,'size',{value:104857601});
  await assert.rejects(api.importFile(large), /100/);
  assert.equal(created.length,0);assert.equal(writes.length,0);
});

test('import requires a decoded frame and resolves only after the IndexedDB transaction commits', async t => {
  const {w,d,api,writes,created,revoked}=setup(t);
  const original=d.createElement.bind(d), probes=[];
  d.createElement=function(name,...args){const element=original(name,...args);if(name==='video')probes.push(element);return element;};
  const file=new w.File(['valid video fixture'],'store.mp4',{type:'video/mp4'});
  let resolved=false;
  const importing=api.importFile(file).then(value=>{resolved=true;return value;});
  await tick();const probe=probes[0];assert.ok(probe);
  Object.defineProperties(probe,{videoWidth:{value:1920},videoHeight:{value:1080},duration:{value:4.25},readyState:{value:2}});
  probe.dispatchEvent(new w.Event('loadedmetadata'));await tick();
  assert.equal(resolved,false);
  probe.dispatchEvent(new w.Event('loadeddata'));await tick();
  assert.equal(writes.length,1);assert.equal(resolved,false,'put success alone must not report saved');
  assert.equal(writes[0].row.blob,file);
  writes[0].transaction.oncomplete();const record=await importing;
  assert.equal(record.name,'store.mp4');assert.equal(record.ratio,'4:3');assert.equal(record.duration,4.25);
  assert.equal(record.src,undefined);assert.deepEqual(revoked,[created[0].url]);
});

test('codec errors clean the temporary URL and do not persist a broken file', async t => {
  const {w,d,api,writes,created,revoked}=setup(t);
  const original=d.createElement.bind(d);let probe;
  d.createElement=function(name,...args){const element=original(name,...args);if(name==='video')probe=element;return element;};
  const importing=api.importFile(new w.File(['broken'],'broken.mp4',{type:'video/mp4'}));
  const rejection=assert.rejects(importing,/재생|코덱/);await tick();probe.dispatchEvent(new w.Event('error'));await rejection;
  assert.equal(writes.length,0);assert.deepEqual(revoked,[created[0].url]);
});

test('storage abort rejects an otherwise valid upload with a quota explanation', async t => {
  const {w,d,api,writes,revoked}=setup(t);
  const original=d.createElement.bind(d);let probe;
  d.createElement=function(name,...args){const element=original(name,...args);if(name==='video')probe=element;return element;};
  const importing=api.importFile(new w.File(['valid'],'store.webm',{type:'video/webm'}));
  const rejection=assert.rejects(importing,/저장 공간/);await tick();
  Object.defineProperties(probe,{videoWidth:{value:400},videoHeight:{value:500},duration:{value:3},readyState:{value:2}});
  probe.dispatchEvent(new w.Event('loadedmetadata'));probe.dispatchEvent(new w.Event('loadeddata'));await tick();
  writes[0].transaction.error={name:'QuotaExceededError'};writes[0].transaction.onabort();await rejection;assert.equal(revoked.length,1);
});

test('quota errors bubbling from the failed request keep their explanation through transaction abort', async t => {
  const {w,d,api,writes}=setup(t);
  const original=d.createElement.bind(d);let probe;
  d.createElement=function(name,...args){const element=original(name,...args);if(name==='video')probe=element;return element;};
  const importing=api.importFile(new w.File(['valid'],'store.mp4',{type:'video/mp4'}));
  const rejection=assert.rejects(importing,/저장 공간/);await tick();
  Object.defineProperties(probe,{videoWidth:{value:400},videoHeight:{value:500},duration:{value:3}});
  probe.dispatchEvent(new w.Event('loadedmetadata'));probe.dispatchEvent(new w.Event('loadeddata'));await tick();
  const transaction=writes[0].transaction;
  transaction.onerror({target:{error:{name:'QuotaExceededError'}}});
  transaction.error={name:'AbortError'};transaction.onabort();await rejection;
});

test('a media metadata timeout rejects and releases the temporary URL', async t => {
  const {w,api,created,revoked}=setup(t);const original=w.setTimeout.bind(w);
  w.setTimeout=(callback,delay,...args)=>original(callback,delay===25000?0:delay,...args);
  await assert.rejects(api.importFile(new w.File(['incomplete'],'partial.mp4',{type:'video/mp4'})),/시간.*초과/);
  assert.deepEqual(revoked,[created[0].url]);
});

test('figures use native playback, centered crop and editable frame ratios', async t => {
  const {d,api}=setup(t);
  const figure=api.createFigure(sample({source:'asset',src:'assets/local-test-media/shop.mp4'}));
  d.querySelector('main').append(figure);await tick();
  const video=figure.querySelector('video');assert.equal(video.controls,true);assert.equal(video.playsInline,true);assert.equal(video.autoplay,false);
  assert.equal(video.preload,'metadata');assert.equal(video.style.objectFit,'cover');assert.equal(video.style.objectPosition,'center');
  assert.equal(figure.querySelector('.misamo-video-frame').style.aspectRatio,'4 / 3');
  api.setRatio(figure,'16:9');assert.equal(figure.querySelector('.misamo-video-frame').style.aspectRatio,'16 / 9');
  assert.match(figure.querySelector('figcaption').textContent,/16:9/);assert.match(video.getAttribute('aria-label'),/우리 가게/);
  Object.defineProperty(video,'duration',{value:19.747075});video.dispatchEvent(new d.defaultView.Event('durationchange'));
  assert.match(figure.querySelector('figcaption').textContent,/0:19/);
  assert.throws(()=>api.setRatio(figure,'3:2'),/비율/);
});

test('an asset that never finishes loading reports timeout and can be retried', async t => {
  const {w,d,api}=setup(t);const original=w.setTimeout.bind(w);
  w.setTimeout=(callback,delay,...args)=>original(callback,delay===15000?0:delay,...args);
  const figure=api.createFigure(sample({source:'asset',src:'assets/local-test-media/shop.mp4'}));d.querySelector('main').append(figure);
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.match(figure.textContent,/시간.*초과/);assert.equal(figure.hasAttribute('aria-busy'),false);
  assert.equal(figure.querySelector('button').hidden,false);assert.equal(figure.querySelector('video').hasAttribute('src'),false);
});

test('removing a loaded figure revokes its Blob URL, while an unmounted figure allocates none', async t => {
  const {w,d,api,rows,created,revoked}=setup(t);rows.set('video-one',{id:'video-one',blob:new w.Blob([new Uint8Array(48)],{type:'video/mp4'})});
  const unused=api.createFigure(sample());await tick();assert.equal(created.length,0);api.release(unused);
  const figure=api.createFigure(sample());d.querySelector('main').append(figure);await tick();await tick();
  assert.equal(created.length,1);const video=figure.querySelector('video');figure.remove();await tick();
  assert.deepEqual(revoked,[created[0].url]);assert.equal(video.hasAttribute('src'),false);assert.ok(video.pauseCount);
});

test('missing files show a readable error and can be retried after storage becomes available', async t => {
  const {w,d,api,rows}=setup(t);const figure=api.createFigure(sample());d.querySelector('main').append(figure);await tick();await tick();
  assert.match(figure.textContent,/찾을 수 없|다시 첨부/);const retry=figure.querySelector('button');assert.equal(retry.hidden,false);
  await assert.rejects(api.assertAvailable(sample()),/찾을 수 없|다시 첨부/);
  rows.set('video-one',{id:'video-one',blob:new w.Blob([new Uint8Array(48)],{type:'video/mp4'})});retry.click();await tick();await tick();
  assert.match(figure.querySelector('video').src,/^blob:/);await api.assertAvailable(sample());
});

test('starting a second player and navigation, hidden tabs, and dialog close pause playback', async t => {
  const {w,d,api}=setup(t);const main=d.querySelector('main'), dialog=d.createElement('dialog');dialog.open=true;main.append(dialog);
  const first=api.createFigure(sample({source:'asset',src:'assets/local-test-media/one.mp4'}));
  const second=api.createFigure(sample({id:'video-two',source:'asset',src:'assets/local-test-media/two.mp4'}));main.append(first);dialog.append(second);await tick();
  const a=first.querySelector('video'),b=second.querySelector('video');
  b.dispatchEvent(new w.Event('play'));assert.ok(a.pauseCount);
  const before=b.pauseCount||0;w.dispatchEvent(new w.CustomEvent('misamo:view'));assert.ok(b.pauseCount>before);
  const after=b.pauseCount;Object.defineProperty(d,'hidden',{value:true,configurable:true});d.dispatchEvent(new w.Event('visibilitychange'));assert.ok(b.pauseCount>after);
  const hidden=b.pauseCount;dialog.dispatchEvent(new w.Event('close'));assert.ok(b.pauseCount>hidden);
});
