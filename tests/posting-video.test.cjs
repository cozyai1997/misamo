const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const video = (fields = {}) => ({ id: 'composer-video', source: 'indexeddb', name: '매장.mp4', mime: 'video/mp4', size: 1024, width: 1920, height: 1080, duration: 12.5, ratio: '4:3', ...fields });

function openComposer(t, options = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://misamo.test/#write', runScripts: 'outside-only' });
  const w = dom.window;
  t.after(() => w.close());
  w.CSS = { escape: String };
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLMediaElement.prototype.pause = () => {};
  w.HTMLMediaElement.prototype.load = () => {};
  w.URL.createObjectURL = () => 'blob:https://misamo.test/test-media';
  w.URL.revokeObjectURL = () => {};
  w.crypto.randomUUID = randomUUID;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.misamoNavigate = view => w.dispatchEvent(new w.CustomEvent('misamo:view', { detail: view }));
  const load = file => w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  load('video-media.js');
  load('media-carousel.js');
  // The browser upload/IndexedDB boundary is covered by video-media tests.
  // Composer, metadata validation, figure markup, store and edit paths run unchanged.
  w.MisamoVideo = {
    ...w.MisamoVideo,
    importFile: options.importFile || (async () => video()),
    assertAvailable: options.assertAvailable || (async () => true),
  };
  for (const file of ['post-store.js', 'post-content.js', 'editor-media.js']) load(file);
  const body = options.body || '첨부 전 작성한 본문';
  w.MisamoStore.saveDraft({ title: '작성 중인 제목', bodyText: body, bodyHtml: `<p>${body}</p>`, images: options.images || [], tags: [], video: options.video || null, mediaOrder:options.mediaOrder || [], mediaRatio:options.video?.ratio || '4:3' });
  for (const file of ['posting.js', 'community-data.js', 'reading.js']) load(file);
  return w;
}

function chooseVideo(w) {
  const input = w.document.querySelector('[data-video-input]');
  Object.defineProperty(input, 'files', { configurable: true, value: [new w.File(['video'], '매장.mp4', { type: 'video/mp4' })] });
  input.dispatchEvent(new w.Event('change', { bubbles: true }));
}

function setRatio(w, value) {
  const select = w.document.querySelector('[data-inline-video-ratio]') || w.document.querySelector('[data-media-ratio-select]');
  assert.ok(select, 'The attachment exposes its ratio select');
  select.value = value;
  select.dispatchEvent(new w.Event('change', { bubbles: true }));
}

function removeVideo(w) {
  const control = w.document.querySelector('[data-inline-video-remove]') || w.document.querySelector('[data-media-remove^="video:"]');
  assert.ok(control, 'The attachment exposes its remove control');
  control.click();
}

function setPosition(w, from, to) {
  const select = w.document.querySelector(`[aria-label="${from}번 첨부파일 순서"]`);
  assert.ok(select, 'The attachment exposes its numbered order select');
  select.value = String(to);
  select.dispatchEvent(new w.Event('change', { bubbles: true }));
}

test('video import saves a draft and selected ratio survives draft restoration and preview', async t => {
  const w = openComposer(t);
  chooseVideo(w);
  await flush();
  assert.deepEqual(plain(w.MisamoStore.readDraft().video), video());
  assert.equal(w.document.querySelector('[data-video-attachment]').hidden, false);
  assert.ok(w.document.querySelector('[data-video-preview] .misamo-video'));
  setRatio(w, '9:16');
  w.document.querySelector('[data-save-draft]').click();
  assert.equal(w.MisamoStore.readDraft().video.ratio, '9:16');
  w.document.querySelector('[data-preview-post]').click();
  assert.ok(w.document.querySelector('[data-preview-images] .misamo-video'));
  assert.equal(w.document.querySelector('[data-preview-body] .misamo-video'), null);
  const restored = openComposer(t, { video: plain(w.MisamoStore.readDraft().video) });
  assert.equal(restored.document.querySelector('[data-media-ratio-select]').value, '9:16');
  assert.equal(restored.MisamoStore.readDraft().video.id, video().id);
});

test('publishing video clears its draft and places playable media outside folded rich text', async t => {
  let availabilityChecks = 0;
  const w = openComposer(t, { body: '긴 본문입니다. '.repeat(80), assertAvailable: async () => { availabilityChecks++; return true; } });
  chooseVideo(w);
  await flush();
  setRatio(w, '16:9');
  w.document.querySelector('[data-publish-post]').click();
  await flush();
  const published = w.MisamoStore.getPosts()[0];
  assert.equal(availabilityChecks, 1);
  assert.equal(published.video.ratio, '16:9');
  assert.equal(w.MisamoStore.readDraft(), null);
  const card = w.document.querySelector(`[data-post-id="${published.id}"]`);
  assert.ok(card.querySelector('.post-body > .misamo-carousel .misamo-video'));
  assert.equal(card.querySelector('.post-rich-body').hidden, true);
  assert.equal(card.querySelector('.post-rich-body .misamo-video'), null);
  assert.ok(card.querySelector('.misamo-video video'));
  assert.equal(w.document.querySelector('[data-video-attachment]').hidden, true);
});

test('editing a video ratio or removing it preserves an unrelated draft and comment input', async t => {
  const w = openComposer(t, { video: video() });
  w.document.querySelector('[data-publish-post]').click();
  await flush();
  const published = w.MisamoStore.getPosts()[0];
  const card = w.document.querySelector(`[data-post-id="${published.id}"]`);
  const comment = w.document.createElement('textarea');
  comment.value = '아직 작성 중인 댓글';
  card.append(comment);
  const title = w.document.querySelector('[data-post-title]');
  const editor = w.document.querySelector('[data-post-editor]');
  title.value = '별도 새 글 초안';
  editor.innerHTML = '<p>남겨 둘 초안 본문</p>';
  w.MisamoPosting.editPost(published.id);
  setRatio(w, '1:1');
  w.document.querySelector('[data-publish-post]').click();
  await flush();
  assert.equal(w.MisamoCommunity.post(published.id).video.ratio, '1:1');
  assert.equal(w.MisamoStore.readDraft().title, '별도 새 글 초안');
  assert.equal(title.value, '별도 새 글 초안');
  assert.equal(card.querySelector('textarea'), comment);
  assert.equal(comment.value, '아직 작성 중인 댓글');
  w.MisamoPosting.editPost(published.id);
  removeVideo(w);
  w.document.querySelector('[data-publish-post]').click();
  await flush();
  assert.equal(w.MisamoCommunity.post(published.id).video, null);
  assert.equal(card.querySelector('.misamo-video'), null);
  assert.equal(w.MisamoStore.readDraft().title, '별도 새 글 초안');
  assert.equal(card.querySelector('textarea'), comment);
});

test('failed video replacement preserves previous attachment, title, body and saved draft', async t => {
  const w = openComposer(t, { video: video(), importFile: async () => { throw new Error('동영상 저장 공간 부족'); } });
  const saved = w.localStorage.getItem('misamo.prototype.v1');
  const title = w.document.querySelector('[data-post-title]').value;
  const body = w.document.querySelector('[data-post-editor]').innerHTML;
  chooseVideo(w);
  await flush();
  assert.match(w.document.querySelector('[data-posting-status]').textContent, /저장 공간 부족/);
  assert.equal(w.localStorage.getItem('misamo.prototype.v1'), saved);
  assert.equal(w.document.querySelector('[data-post-title]').value, title);
  assert.equal(w.document.querySelector('[data-post-editor]').innerHTML, body);
  assert.equal(w.document.querySelector('[data-video-attachment]').hidden, false);
  assert.equal(w.document.querySelector('[data-publish-post]').disabled, false);
  w.document.querySelector('[data-save-draft]').click();
  assert.deepEqual(plain(w.MisamoStore.readDraft().video), video());
});

test('navigating during an import prevents its late result from replacing another draft attachment', async t => {
  let finishImport;
  const w = openComposer(t, { video: video(), importFile: () => new Promise(resolve => { finishImport = resolve; }) });
  chooseVideo(w);
  assert.equal(w.document.querySelector('[data-publish-post]').disabled, true);
  w.misamoNavigate('home');
  w.misamoNavigate('write');
  w.document.querySelector('[data-post-title]').value = '다시 작성한 새 제목';
  w.document.querySelector('[data-post-editor]').innerHTML = '<p>다시 작성한 본문</p>';
  finishImport(video({ id: 'late-video', name: '늦게 끝난 영상.mp4' }));
  await flush();
  w.document.querySelector('[data-save-draft]').click();
  const saved = w.MisamoStore.readDraft();
  assert.equal(saved.title, '다시 작성한 새 제목');
  assert.equal(saved.bodyText, '다시 작성한 본문');
  assert.equal(saved.video.id, 'composer-video');
  assert.equal(w.document.querySelector('[data-publish-post]').disabled, false);
});

test('unavailable video blocks publication while preserving recoverable composer data', async t => {
  const w = openComposer(t, { video: video(), assertAvailable: async () => { throw new Error('첨부 영상을 찾을 수 없습니다'); } });
  const saved = w.localStorage.getItem('misamo.prototype.v1');
  w.document.querySelector('[data-publish-post]').click();
  await flush();
  assert.equal(w.MisamoStore.getPosts().length, 0);
  assert.equal(w.localStorage.getItem('misamo.prototype.v1'), saved);
  assert.match(w.document.querySelector('[data-posting-status]').textContent, /첨부 영상을 찾을 수 없습니다/);
  assert.equal(w.document.querySelector('[data-post-title]').value, '작성 중인 제목');
  assert.equal(w.document.querySelector('[data-video-attachment]').hidden, false);
});


test('mixed post preview, reorder, publish, edit and draft restoration preserve shared media', async t => {
  const photo = {id:'mixed-photo',src:'data:image/png;base64,YQ==',alt:'사진'};
  const w = openComposer(t, {video:video(),images:[photo]});
  const doc = w.document;
  const editor = doc.querySelector('[data-post-editor]');
  assert.ok(editor.querySelector('img'));
  assert.ok(doc.querySelector('[data-video-preview] .misamo-carousel'));
  setPosition(w, 2, 1);
  setRatio(w,'9:16');
  doc.querySelector('[data-save-draft]').click();
  assert.equal(w.MisamoStore.readDraft().mediaOrder[0], 'video:composer-video');
  doc.querySelector('[data-preview-post]').click();
  assert.equal(doc.querySelector('[data-preview-body] img'),null);
  assert.ok(doc.querySelector('[data-preview-images] .misamo-carousel video'));
  doc.querySelector('[data-preview-close]').click();
  doc.querySelector('[data-publish-post]').click(); await flush();
  const post = w.MisamoStore.getPosts()[0];
  const card = doc.querySelector(`[data-post-id="${post.id}"]`);
  assert.equal(card.querySelector('.post-rich-body img'),null);
  assert.ok(card.querySelector('.misamo-carousel video'));
  assert.equal(card.querySelector('.misamo-carousel').dataset.mediaRatio,'9:16');
  w.MisamoPosting.editPost(post.id);
  setPosition(w, 1, 2);
  setRatio(w,'16:9');
  doc.querySelector('[data-publish-post]').click(); await flush();
  const edited = w.MisamoCommunity.post(post.id);
  assert.equal(edited.mediaOrder[0],'image:mixed-photo');
  assert.equal(edited.mediaRatio,'16:9');
  assert.equal(card.querySelector('[data-media-stage] img').alt,'사진');
  w.MisamoPosting.editPost(post.id);
  removeVideo(w);
  doc.querySelector('[data-publish-post]').click(); await flush();
  assert.equal(card.querySelector('.misamo-carousel video'),null);
  assert.ok(card.querySelector('.misamo-carousel img'));
});


test('replacing a mixed video retains its chosen position and photos can be removed from attachment controls', async t => {
  const photo = {id:'mixed-photo',src:'data:image/png;base64,YQ==',alt:'사진'};
  const w = openComposer(t, {video:video(),images:[photo],mediaOrder:['video:composer-video','image:mixed-photo'],importFile:async()=>video({id:'replacement'})});
  chooseVideo(w); await flush();
  assert.equal(w.MisamoStore.readDraft().mediaOrder[0],'video:replacement');
  w.document.querySelector('[data-media-remove="image:mixed-photo"]').click();
  w.document.querySelector('[data-save-draft]').click();
  assert.equal(w.MisamoStore.readDraft().images.length,0);
  assert.ok(w.MisamoStore.readDraft().video);
});


test('rewriting mixed post text does not silently remove its separate photo attachments', t => {
  const photo = {id:'mixed-photo',src:'data:image/png;base64,YQ==',alt:'사진'};
  const w = openComposer(t, {video:video(),images:[photo]});
  const editor = w.document.querySelector('[data-post-editor]');
  editor.innerHTML = '<p>본문 전체를 새로 작성했습니다.</p>';
  editor.dispatchEvent(new w.Event('input',{bubbles:true}));
  w.document.querySelector('[data-save-draft]').click();
  assert.equal(w.MisamoStore.readDraft().images.length,1);
});
