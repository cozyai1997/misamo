const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..');
const images = ['a','b','c'].map(id => ({id,src:'data:image/png;base64,YQ==',alt:`사진 ${id}`}));
const video = {id:'clip',source:'asset',src:'assets/local-test-media/yena-catchcatch.mp4',name:'영상.mp4',mime:'video/mp4',size:100,width:720,height:1280,duration:19,ratio:'4:3'};
function setup(t, options = {}) {
  const dom = new JSDOM('<body></body>', {url:'http://localhost/',runScripts:'outside-only'});
  t.after(() => dom.window.close());
  const w = dom.window;
  w.HTMLMediaElement.prototype.pause = function () { this.dataset.paused = 'true'; };
  w.HTMLMediaElement.prototype.load = () => {};
  for (const file of ['video-media.js','media-carousel.js']) w.eval(fs.readFileSync(path.join(root,file),'utf8'));
  const gallery = w.MisamoCarousel.create({images,video,mediaRatio:'4:3',mediaOrder:['image:a','video:clip','image:b','image:c']},options);
  w.document.body.append(gallery);
  return {w,gallery,stage:gallery.querySelector('[data-media-stage]')};
}
function transfer() {
  const data = new Map();
  return {setData:(type,value) => data.set(type,value),getData:type => data.get(type) || '',effectAllowed:'',dropEffect:''};
}
function dragEvent(w,target,type,dataTransfer) {
  const event = new w.Event(type,{bubbles:true,cancelable:true});
  Object.defineProperty(event,'dataTransfer',{value:dataTransfer});
  target.dispatchEvent(event);
  return event;
}
test('editing order menus display upload order and move one item without losing photos or video', t => {
  const calls = [];
  const {w,gallery} = setup(t,{editing:true,onReorder:keys => calls.push(Array.from(keys))});
  const menus = [...gallery.querySelectorAll('[data-media-position]')];
  assert.deepEqual(menus.map(menu => menu.value),['1','2','3','4']);
  assert.equal(menus[1].getAttribute('aria-label'),'2번 첨부파일 순서');
  assert.equal(menus[1].options.length,4);
  menus[1].value = '4'; menus[1].dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.deepEqual(calls,[['image:a','image:b','image:c','video:clip']]);
  menus[0].value = '1'; menus[0].dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(calls.length,1,'choosing the current position does not create a history entry');
});
test('dragging across three attachments preserves the exact key set and supports both directions', t => {
  const calls = [];
  const {w,gallery} = setup(t,{editing:true,onReorder:keys => calls.push(Array.from(keys))});
  const cards = [...gallery.querySelectorAll('[data-media-key]')];
  const data = transfer();
  dragEvent(w,cards[0],'dragstart',data);
  assert.equal(dragEvent(w,cards[3],'dragover',data).defaultPrevented,true);
  dragEvent(w,cards[3],'drop',data);
  dragEvent(w,cards[0],'dragend',data);
  assert.deepEqual(calls,[['video:clip','image:b','image:c','image:a']]);
  dragEvent(w,cards[3],'dragstart',data);
  dragEvent(w,cards[0],'drop',data);
  assert.deepEqual(calls[1],['image:c','image:a','video:clip','image:b']);
  dragEvent(w,cards[0],'drop',data);
  assert.equal(calls.length,2,'one drag only produces one reorder');
  assert.equal(gallery.querySelector('.is-reorder-source'),null);
});
test('editing controls change crop or remove an attachment without opening the photo viewer', t => {
  const ratios = [], removed = [], clicks = [];
  const {w,gallery} = setup(t,{editing:true,onRatioChange:value => ratios.push(value),onRemove:key => removed.push(key)});
  w.document.addEventListener('click',event => clicks.push(event.target));
  const select = gallery.querySelector('[data-media-ratio-select]');
  assert.equal(gallery.querySelectorAll('[data-media-ratio-select]').length,1);
  assert.equal(gallery.querySelectorAll('.misamo-media-fit-label').length,3);
  assert.equal(gallery.querySelector('[data-media-drag]'),null);
  assert.deepEqual([...select.options].map(option => option.value),['4:3','1:1','9:16','16:9']);
  select.click(); select.value = '9:16'; select.dispatchEvent(new w.Event('change',{bubbles:true}));
  gallery.querySelector('[data-media-remove="video:clip"]').click();
  assert.deepEqual(ratios,['9:16']); assert.deepEqual(removed,['video:clip']);
  assert.equal(clicks.length,0);
  assert.equal(gallery.querySelector('[data-reading-image]'),null);
  const stage = gallery.querySelector('[data-media-stage]');
  select.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  assert.equal(gallery.querySelector('[data-media-count]').textContent,'1 / 4','select arrow keys do not navigate the gallery');
  assert.equal(stage.scrollLeft,0);
});
test('video controls remain native and dragging from controls cannot reorder', t => {
  const calls = [];
  const {w,gallery} = setup(t,{editing:true,onReorder:keys => calls.push(keys)});
  const player = gallery.querySelector('video');
  assert.equal(player.controls,true);
  const data = transfer();
  assert.equal(dragEvent(w,player,'dragstart',data).defaultPrevented,true);
  dragEvent(w,gallery.querySelector('[data-media-key="image:c"]'),'drop',data);
  assert.equal(calls.length,0);
  const handle = gallery.querySelector('[data-media-key="video:clip"]');
  assert.ok(handle); assert.equal(handle.draggable,true);
  dragEvent(w,handle,'dragstart',data);
  dragEvent(w,gallery.querySelector('[data-media-key="image:c"]'),'drop',data);
  assert.deepEqual(Array.from(calls[0]),['image:a','image:b','image:c','video:clip']);
});
test('disabled editor cannot reorder, change ratio, or remove media', t => {
  const calls = [];
  const {w,gallery} = setup(t,{editing:true,disabled:true,onReorder:value => calls.push(value),onRatioChange:value => calls.push(value),onRemove:value => calls.push(value)});
  assert.ok([...gallery.querySelectorAll('.misamo-media-edit-controls button, .misamo-media-edit-controls select')].every(control => control.disabled));
  const select = gallery.querySelector('[data-media-position]');
  select.value = '3'; select.dispatchEvent(new w.Event('change',{bubbles:true}));
  const crop = gallery.querySelector('[data-media-ratio-select]');
  crop.value = '9:16'; crop.dispatchEvent(new w.Event('change',{bubbles:true}));
  const cards = [...gallery.querySelectorAll('[data-media-key]')], data = transfer();
  assert.ok(cards.every(card => !card.draggable));
  dragEvent(w,cards[0],'dragstart',data); dragEvent(w,cards[3],'drop',data);
  assert.deepEqual(calls,[]);
});
test('read-only galleries keep photo viewing and scroll navigation without editing overlays', t => {
  const {w,gallery,stage} = setup(t);
  assert.equal(gallery.querySelector('.misamo-media-edit-controls'),null);
  assert.equal(gallery.querySelector('[data-media-position]'),null);
  assert.equal(gallery.querySelectorAll('[data-reading-image]').length,3);
  assert.ok([...gallery.querySelectorAll('.misamo-media-slide')].every(card => !card.draggable));
  Object.defineProperties(stage,{clientWidth:{value:400},scrollWidth:{value:1400}});
  [...stage.children].forEach((slide,i) => Object.defineProperty(slide,'offsetLeft',{value:i*350}));
  stage.scrollLeft = 1000; stage.dispatchEvent(new w.Event('scroll'));
  assert.equal(gallery.querySelector('[data-media-count]').textContent,'4 / 4');
  assert.equal(gallery.querySelector('video').dataset.paused,'true');
});
