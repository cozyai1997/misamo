const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..');
const photo = {id:'photo-a', src:'data:image/png;base64,YQ==', alt:'매장 사진'};
const video = {id:'video-a', source:'asset', src:'assets/local-test-media/yena-catchcatch.mp4', name:'영상.mp4', mime:'video/mp4', size:100, width:720, height:1280, duration:19, ratio:'4:3'};
function setup(t) {
  const dom = new JSDOM('<body></body>', {url:'http://localhost/', runScripts:'outside-only'});
  t.after(() => dom.window.close());
  const w = dom.window;
  w.HTMLMediaElement.prototype.pause = function () {this.dataset.paused = 'true';};
  w.HTMLMediaElement.prototype.load = () => {};
  for (const f of ['video-media.js','media-carousel.js','post-store.js']) w.eval(fs.readFileSync(path.join(root,f),'utf8'));
  return w;
}
test('mixed carousel respects order and ratio, pauses video on next, and keeps one active attachment', t => {
  const w = setup(t);
  const gallery = w.MisamoCarousel.create({images:[photo], video, mediaOrder:['video:video-a','image:photo-a'], mediaRatio:'16:9'});
  w.document.body.append(gallery);
  assert.equal(gallery.querySelector('[data-media-count]').textContent, '1 / 2');
  assert.equal(gallery.querySelector('.misamo-media-slide').style.aspectRatio, '16 / 9');
  assert.equal(gallery.querySelectorAll('.misamo-media-slide').length,2);
  assert.equal(gallery.querySelector('.misamo-media-thumbs'),null);
  assert.ok(gallery.querySelector('video'));
  const playing = gallery.querySelector('video');
  gallery.querySelector('[data-media-next]').click();
  assert.equal(playing.dataset.paused, 'true');
  assert.equal(gallery.querySelector('[data-media-count]').textContent, '2 / 2');
  assert.equal(gallery.querySelector('[data-media-stage] img').alt, '매장 사진');
  assert.equal(gallery.querySelectorAll('.misamo-media-slide[hidden]').length,0);
  gallery.querySelector('[data-media-prev]').click();
  assert.ok(gallery.querySelector('video'));
});
test('order ignores removed and duplicate attachments and includes newly added media', t => {
  const w = setup(t);
  assert.deepEqual(Array.from(w.MisamoCarousel.items({images:[photo],video,mediaOrder:['missing','video:video-a','video:video-a']}), i=>i.key), ['video:video-a','image:photo-a']);
});
test('draft and published post preserve the shared aspect ratio and attachment order', t => {
  const w = setup(t);
  const draft = {title:'혼합 게시글',bodyText:'사진과 영상',bodyHtml:'<p>사진과 영상</p>',images:[photo],video,mediaOrder:['video:video-a','image:photo-a'],mediaRatio:'9:16',mediaLayout:'carousel'};
  w.MisamoStore.saveDraft(draft);
  assert.equal(w.MisamoStore.readDraft().mediaRatio,'9:16');
  const post = w.MisamoStore.publish(w.MisamoStore.readDraft());
  assert.deepEqual(Array.from(post.mediaOrder),draft.mediaOrder);
  assert.equal(post.mediaLayout,'carousel');
});


test('scrolling the media strip pauses playing video and updates navigation at the end', t => {
  const w = setup(t);
  const gallery = w.MisamoCarousel.create({images:[photo,{...photo,id:'photo-b'}],video});
  w.document.body.append(gallery);
  const stage = gallery.querySelector('[data-media-stage]');
  Object.defineProperties(stage,{clientWidth:{value:400},scrollWidth:{value:1000}});
  [...stage.children].forEach((slide,i)=>Object.defineProperty(slide,'offsetLeft',{value:i*330}));
  stage.scrollLeft=600;
  stage.dispatchEvent(new w.Event('scroll'));
  assert.equal(gallery.querySelector('video').dataset.paused,'true');
  assert.equal(gallery.querySelector('[data-media-count]').textContent,'3 / 3');
  assert.equal(gallery.querySelector('[data-media-next]').disabled,true);
});


test('previous arrow moves immediately when multiple cards fit and the last page is partial', t => {
  const w=setup(t), gallery=w.MisamoCarousel.create({images:[photo,{...photo,id:'b'}],video});
  w.document.body.append(gallery);
  const stage=gallery.querySelector('[data-media-stage]');
  Object.defineProperties(stage,{clientWidth:{value:807},scrollWidth:{value:1100}});
  [...stage.children].forEach((slide,i)=>Object.defineProperty(slide,'offsetLeft',{value:i*370}));
  stage.scrollLeft=293; stage.dispatchEvent(new w.Event('scroll'));
  gallery.querySelector('[data-media-prev]').click();
  assert.equal(stage.scrollLeft,0);
});

test('legacy 4:5 crop migrates to 4:3 without losing attachments or using video fallback', t => {
  const w = setup(t);
  const draft = {title:'legacy',bodyText:'content',images:[photo],video:{...video,ratio:'9:16'},mediaRatio:'4:5',mediaLayout:'carousel'};
  assert.equal(w.MisamoCarousel.ratio(draft),'4:3');
  assert.equal(w.MisamoCarousel.ratio({video:{...video,ratio:'4:5'}}),'4:3');
  w.MisamoStore.saveDraft(draft);
  const restored = w.MisamoStore.readDraft();
  assert.equal(restored.mediaRatio,'4:3');
  assert.equal(restored.images.length,1);
  assert.equal(restored.video.id,video.id);
});
