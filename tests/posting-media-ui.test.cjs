const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const plain = value => JSON.parse(JSON.stringify(value));
const photo = id => ({ id, src: 'data:image/png;base64,YQ==', alt: id });
const video = () => ({ id: 'ui-video', source: 'indexeddb', name: '매장.mp4', mime: 'video/mp4', size: 1024, width: 1080, height: 1920, duration: 12.5, ratio: '4:3' });
const mixedDraft = (fields = {}) => ({
  title: '첨부 편집 테스트', bodyText: '시작설명마침',
  bodyHtml: '<p>시작</p><img data-image-id="first-photo"><p>설명</p><div data-video-id="ui-video"></div><img data-image-id="second-photo"><p>마침</p>',
  images: [photo('first-photo'), photo('second-photo')], video: video(), tags: [],
  mediaLayout: 'inline', mediaRatio: '4:3',
  mediaOrder: ['image:first-photo', 'video:ui-video', 'image:second-photo'],
  ...fields,
});

function openComposer(t, options = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    url: 'https://misamo.test/#write', runScripts: 'outside-only',
  });
  const w = dom.window;
  t.after(() => w.close());
  w.CSS = { escape: String };
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLMediaElement.prototype.pause = () => {};
  w.HTMLMediaElement.prototype.load = () => {};
  w.URL.createObjectURL = () => 'blob:https://misamo.test/media-ui';
  w.URL.revokeObjectURL = () => {};
  w.crypto.randomUUID = randomUUID;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.misamoNavigate = view => w.dispatchEvent(new w.CustomEvent('misamo:view', { detail: view }));
  const load = file => w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  load('video-media.js');
  load('media-carousel.js');
  // Only the IndexedDB availability boundary is replaced. Composer, editor,
  // sanitization, draft storage, preview and publication run their real code.
  w.MisamoVideo = { ...w.MisamoVideo, assertAvailable: async () => true };
  for (const file of ['post-store.js', 'post-content.js', 'editor-media.js']) load(file);
  if (options.savedState) w.localStorage.setItem('misamo.prototype.v1', options.savedState);
  else w.MisamoStore.saveDraft(options.draft || mixedDraft());
  for (const file of ['posting.js', 'community-data.js', 'reading.js']) load(file);
  return w;
}

const editor = w => w.document.querySelector('[data-post-editor]');
const marker = w => editor(w).querySelector('div[data-video-id="ui-video"]');
function save(w) { w.document.querySelector('[data-save-draft]').click(); return w.MisamoStore.readDraft(); }
function command(w, value) { w.document.querySelector(`[data-editor-command="${value}"]`).click(); }
function select(w, node, value) {
  assert.ok(node, 'Expected an accessible media select');
  node.value = value;
  // Native SELECT interactions emit input before change. Both bubble through
  // the contenteditable wrapper when this is an inline video control.
  node.dispatchEvent(new w.Event('input', { bubbles: true }));
  node.dispatchEvent(new w.Event('change', { bubbles: true }));
}
async function publish(w) {
  w.document.querySelector('[data-publish-post]').click();
  await flush();
  const post = w.MisamoStore.getPosts()[0];
  assert.ok(post, 'Publication creates a stored post');
  return { post, card: w.document.querySelector(`[data-post-id="${post.id}"]`) };
}
function savedVideoMarker(w) {
  const content = w.document.createElement('template');
  content.innerHTML = save(w).bodyHtml;
  return content.content.querySelector('div[data-video-id="ui-video"]');
}

test('inline ratio is controlled on the video and survives restoration, preview and publication without editor controls leaking into content', async t => {
  const w = openComposer(t);
  const ratio = marker(w).querySelector('select[data-inline-video-ratio]');
  assert.equal(ratio?.getAttribute('aria-label'), '영상 화면 비율');
  assert.deepEqual(Array.from(ratio.options, option => option.value), ['4:3', '1:1', '9:16', '16:9']);
  assert.equal(marker(w).querySelector('[data-inline-video-remove]')?.getAttribute('aria-label'), '영상 삭제');
  assert.equal(w.document.querySelector('[data-video-attachment]').hidden, true);
  assert.equal(w.document.querySelector('[data-video-at-caret], [name="video-ratio"]'), null);
  select(w, ratio, '9:16');
  const saved = save(w);
  assert.equal(saved.video.ratio, '9:16');
  assert.doesNotMatch(saved.bodyHtml, /<select|<button|data-inline-video-ratio|data-inline-video-remove/);
  assert.equal(saved.bodyText, '시작설명마침');
  const restored = openComposer(t, { savedState: w.localStorage.getItem('misamo.prototype.v1') });
  assert.equal(marker(restored).querySelector('[data-inline-video-ratio]').value, '9:16');
  restored.document.querySelector('[data-preview-post]').click();
  assert.equal(restored.document.querySelector('[data-preview-body] .misamo-video').dataset.videoRatio, '9:16');
  assert.equal(restored.document.querySelector('[data-preview-body] [data-inline-video-ratio], [data-preview-body] [data-inline-video-remove], [data-preview-body] [data-inline-video-drag]'), null);
  restored.document.querySelector('[data-preview-close]').click();
  const { post, card } = await publish(restored);
  assert.equal(post.video.ratio, '9:16');
  assert.equal(card.querySelector('.post-rich-body .misamo-video').dataset.videoRatio, '9:16');
  assert.equal(card.querySelector('.post-rich-body [data-inline-video-ratio]'), null);
});

test('selected inline video supports left, center and right alignment and persists it into the published body', async t => {
  const w = openComposer(t);
  for (const align of ['left', 'center', 'right']) {
    marker(w).click();
    w.document.querySelector(`[data-editor-align="${align}"]`).click();
    assert.equal(savedVideoMarker(w)?.dataset.align, align);
  }
  select(w, marker(w).querySelector('[data-inline-video-ratio]'), '16:9');
  assert.equal(marker(w).dataset.align, 'right');
  const saved = save(w);
  assert.equal(saved.video.ratio, '16:9');
  const restored = openComposer(t, { savedState: w.localStorage.getItem('misamo.prototype.v1') });
  assert.equal(marker(restored).dataset.align, 'right');
  restored.document.querySelector('[data-preview-post]').click();
  assert.equal(restored.document.querySelector('[data-preview-body] div[data-video-id]').dataset.align, 'right');
  restored.document.querySelector('[data-preview-close]').click();
  const { post, card } = await publish(restored);
  assert.equal(post.bodyHtml, saved.bodyHtml);
  assert.equal(card.querySelector('.post-rich-body div[data-video-id]').dataset.align, 'right');
});

test('native ratio input does not reset the pending selection before change and ratio undo preserves the previous alignment', t => {
  const w = openComposer(t);
  marker(w).click();
  w.document.querySelector('[data-editor-align="right"]').click();
  const before = save(w);
  const ratio = marker(w).querySelector('[data-inline-video-ratio]');
  ratio.value = '9:16';
  ratio.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(ratio.isConnected, true, 'An input event from the select must not replace the video controls');
  assert.equal(ratio.value, '9:16', 'Pending native selection must survive until its change event');
  ratio.dispatchEvent(new w.Event('change', { bubbles: true }));
  assert.equal(save(w).video.ratio, '9:16');
  assert.equal(savedVideoMarker(w).dataset.align, 'right');
  command(w, 'undo');
  assert.equal(save(w).video.ratio, before.video.ratio);
  assert.equal(save(w).bodyHtml, before.bodyHtml);
  assert.equal(marker(w).dataset.align, 'right');
  command(w, 'redo');
  assert.equal(save(w).video.ratio, '9:16');
  assert.equal(marker(w).dataset.align, 'right');
});

test('deleting a focused inline video removes the attachment and undo/redo restore its position, ratio and alignment', t => {
  const w = openComposer(t);
  select(w, marker(w).querySelector('[data-inline-video-ratio]'), '16:9');
  marker(w).click();
  w.document.querySelector('[data-editor-align="left"]').click();
  const before = save(w);
  marker(w).focus();
  marker(w).dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
  assert.equal(save(w).video, null);
  assert.equal(marker(w), null);
  assert.equal(save(w).images.length, 2);
  command(w, 'undo');
  assert.deepEqual(plain(save(w).video), plain(before.video));
  assert.equal(save(w).bodyHtml, before.bodyHtml);
  assert.equal(marker(w).dataset.align, 'left');
  assert.equal(marker(w).querySelector('[data-inline-video-ratio]').value, '16:9');
  command(w, 'redo');
  assert.equal(save(w).video, null);
  assert.equal(marker(w), null);
});

test('grouped numbered order selectors persist order across undo, draft restoration, preview and publication', async t => {
  const w = openComposer(t, { draft: mixedDraft({ mediaLayout: 'carousel' }) });
  const preview = () => w.document.querySelector('[data-video-preview]');
  const choices = Array.from(preview().querySelectorAll('[data-media-position]'));
  assert.equal(choices.length, 3);
  choices.forEach((choice, index) => assert.equal(choice.getAttribute('aria-label'), `${index + 1}번 첨부파일 순서`));
  const original = save(w);
  // The visible positions are one-based; derive the target value from its option.
  const lastPosition = choices[0].options[2].value;
  select(w, choices[0], lastPosition);
  const reordered = ['video:ui-video', 'image:second-photo', 'image:first-photo'];
  assert.deepEqual(plain(save(w).mediaOrder), reordered);
  command(w, 'undo');
  assert.deepEqual(plain(save(w).mediaOrder), plain(original.mediaOrder));
  command(w, 'redo');
  assert.deepEqual(plain(save(w).mediaOrder), reordered);
  select(w, preview().querySelector('[data-media-ratio-select]'), '1:1');
  const saved = save(w);
  assert.equal(saved.mediaRatio, '1:1');
  assert.equal(saved.video.ratio, '1:1');
  const restored = openComposer(t, { savedState: w.localStorage.getItem('misamo.prototype.v1') });
  assert.deepEqual(plain(save(restored).mediaOrder), reordered);
  restored.document.querySelector('[data-preview-post]').click();
  assert.equal(restored.document.querySelector('[data-preview-images] [data-media-stage]').firstElementChild.querySelector('video')?.tagName, 'VIDEO');
  assert.equal(restored.document.querySelector('[data-preview-images] .misamo-carousel').dataset.mediaRatio, '1:1');
  restored.document.querySelector('[data-preview-close]').click();
  const { post, card } = await publish(restored);
  assert.deepEqual(plain(post.mediaOrder), reordered);
  assert.equal(card.querySelector('[data-media-stage]').firstElementChild.querySelector('video')?.tagName, 'VIDEO');
  assert.equal(card.querySelector('.misamo-carousel').dataset.mediaRatio, '1:1');
  assert.equal(card.querySelector('[data-media-position], [data-media-ratio-select]'), null);
});

test('inline feed gallery preserves body media and updates after video removal', async t => {
  const w = openComposer(t);
  const { post, card } = await publish(w);
  const cover = () => card.querySelector('.post-inline-media-preview');
  assert.equal(card.querySelector('.post-cover-preview'), null);
  assert.equal(cover().querySelectorAll('.misamo-media-slide').length, 3);
  assert.equal(cover().querySelectorAll('video').length, 1);
  let paused = 0; cover().querySelector('video').pause = () => paused++;
  card.querySelector('[data-reading-toggle]').click();
  assert.ok(card.classList.contains('reading-expanded'));
  assert.equal(paused, 1);
  assert.equal(card.querySelector('.post-rich-body').hidden, false);
  card.querySelector('[data-reading-toggle]').click();
  assert.equal(card.querySelector('.post-rich-body').hidden, true);
  w.MisamoPosting.editPost(post.id);
  marker(w).querySelector('[data-inline-video-remove]').click();
  w.document.querySelector('[data-publish-post]').click();
  await flush();
  assert.equal(w.MisamoCommunity.post(post.id).video, null);
  assert.equal(cover().querySelectorAll('.misamo-media-slide').length, 2);
  assert.equal(cover().querySelector('video'), null);
  assert.equal(card.querySelectorAll('.post-rich-body img[data-image-id]').length, 2);
});

test('inline representative video and photo persist with a shared preview ratio and safe removal fallback', async t => {
  const w = openComposer(t);
  w.document.querySelector('[data-cover-select="video:ui-video"]').click();
  select(w, marker(w).querySelector('[data-inline-video-ratio]'), '16:9');
  const saved = save(w);
  assert.equal(saved.coverId, 'video:ui-video');
  assert.equal(saved.mediaRatio, '16:9');
  assert.equal(saved.video.ratio, '16:9');
  assert.equal(w.document.querySelector('[data-inline-video-ratio]').hidden, false);
  assert.equal(w.document.querySelector('[data-inline-media-tools]').hidden, true);
  const restored = openComposer(t, { savedState: w.localStorage.getItem('misamo.prototype.v1') });
  assert.equal(save(restored).coverId, 'video:ui-video');
  const {post, card} = await publish(restored);
  const gallery = card.querySelector('.post-inline-media-preview');
  assert.equal(gallery.querySelector('.misamo-media-slide').dataset.mediaKey, 'video:ui-video');
  assert.equal(gallery.dataset.mediaRatio, '16:9');
  assert.ok([...gallery.querySelectorAll('.misamo-media-slide')].every(slide => slide.style.aspectRatio === '16 / 9'));
  assert.deepEqual([...card.querySelectorAll('.post-rich-body img[data-image-id],.post-rich-body div[data-video-id]')].map(node => node.dataset.imageId || node.dataset.videoId), ['first-photo','ui-video','second-photo']);
  restored.MisamoPosting.editPost(post.id);
  restored.document.querySelector('[data-cover-select="second-photo"]').click();
  assert.equal(restored.document.querySelector('[data-inline-video-ratio]').hidden, false);
  assert.equal(restored.document.querySelector('[data-cover-select="second-photo"]').getAttribute('aria-pressed'), 'true');
  restored.document.querySelector('[data-cover-select="video:ui-video"]').click();
  marker(restored).querySelector('[data-inline-video-remove]').click();
  restored.document.querySelector('[data-publish-post]').click(); await flush();
  assert.equal(restored.MisamoCommunity.post(post.id).coverId, 'first-photo');
  assert.equal(restored.MisamoCommunity.post(post.id).mediaRatio, '16:9');
});


test('inline media overlay chooses the cover while body video ratio remains independent of the preview', t => {
  const w = openComposer(t);
  const photoCover = w.document.querySelector('[data-image-cover-overlay="second-photo"] [data-inline-cover]');
  assert.ok(photoCover);
  photoCover.click();
  assert.equal(save(w).coverId, 'second-photo');
  select(w, w.document.querySelector('[data-inline-image-ratio="second-photo"]'), '1:1');
  select(w, marker(w).querySelector('[data-inline-video-ratio]'), '9:16');
  const saved = save(w);
  assert.equal(saved.mediaRatio, '1:1');
  assert.equal(saved.video.ratio, '9:16');
  assert.equal(marker(w).dataset.videoRatio, '9:16');
  assert.doesNotMatch(saved.bodyHtml, /data-inline-cover|data-image-cover-overlay|<button/);
  const restored = openComposer(t, {savedState:w.localStorage.getItem('misamo.prototype.v1')});
  assert.equal(marker(restored).dataset.videoRatio, '9:16');
  assert.equal(save(restored).mediaRatio, '1:1');
  marker(restored).querySelector('[data-inline-cover]').click();
  assert.equal(save(restored).coverId, 'video:ui-video');
  assert.equal(save(restored).mediaRatio, '9:16');
  assert.equal(restored.document.querySelectorAll('[data-inline-video-fit]').length, 0);
});


test('image corner ratio controls preserve independent ratios through save, restore and publication', async t => {
  const w = openComposer(t);
  assert.equal(w.document.querySelector('[data-inline-media-tools]').children.length, 0);
  select(w,w.document.querySelector('[data-inline-image-ratio="first-photo"]'),'1:1');
  select(w,w.document.querySelector('[data-inline-image-ratio="second-photo"]'),'16:9');
  const saved=save(w);
  assert.equal(saved.mediaRatio,'1:1');
  assert.equal(saved.video.ratio,'4:3');
  assert.match(saved.bodyHtml,/data-image-ratio="16:9"/);
  const restored=openComposer(t,{savedState:w.localStorage.getItem('misamo.prototype.v1')});
  assert.equal(restored.document.querySelector('[data-inline-image-ratio="first-photo"]').value,'1:1');
  const {card}=await publish(restored);
  assert.equal(card.querySelector('.post-rich-body img[data-image-id="second-photo"]').style.aspectRatio,'16 / 9');
  assert.equal(card.querySelector('.post-inline-media-preview').dataset.mediaRatio,'1:1');
});
