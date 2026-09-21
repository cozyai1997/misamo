const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const plain = value => JSON.parse(JSON.stringify(value));
const photo = (id = 'format-photo') => ({ id, src: 'data:image/png;base64,YQ==', alt: id });
const video = (fields = {}) => ({ id: 'format-video', source: 'indexeddb', name: '매장.mp4', mime: 'video/mp4', size: 1024, width: 1920, height: 1080, duration: 12.5, ratio: '4:3', ...fields });
const draft = (fields = {}) => ({ title: '두 가지 게시글 형식', bodyText: '시작설명마침', bodyHtml: '<p>시작설명마침</p>', images: [], tags: [], mediaRatio: '4:3', ...fields });

function openComposer(t, options = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://misamo.test/#write', runScripts: 'outside-only' });
  const w = dom.window;
  t.after(() => w.close());
  w.CSS = { escape: String };
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLMediaElement.prototype.pause = () => {};
  w.HTMLMediaElement.prototype.load = () => {};
  w.URL.createObjectURL = () => 'blob:https://misamo.test/format-media';
  w.URL.revokeObjectURL = () => {};
  w.crypto.randomUUID = randomUUID;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.misamoNavigate = view => w.dispatchEvent(new w.CustomEvent('misamo:view', { detail: view }));
  const load = file => w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  load('video-media.js');
  load('media-carousel.js');
  // File decoding and IndexedDB are covered separately; the composer, sanitizer,
  // store, preview and published rendering use their production implementations.
  w.MisamoVideo = { ...w.MisamoVideo, importFile: options.importFile || (async () => video()), assertAvailable: async () => true };
  for (const file of ['post-store.js', 'post-content.js', 'editor-media.js']) load(file);
  if (options.savedState) w.localStorage.setItem('misamo.prototype.v1', options.savedState);
  else if (options.draft) w.MisamoStore.saveDraft(options.draft);
  for (const file of ['posting.js', 'community-data.js', 'reading.js']) load(file);
  return w;
}

function selectLayout(w, value) {
  const radio = w.document.querySelector(`[name="post-layout"][value="${value}"]`);
  assert.ok(radio, `The composer exposes the ${value} format`);
  radio.checked = true;
  radio.dispatchEvent(new w.Event('change', { bubbles: true }));
}

function layout(w) { return w.document.querySelector('[name="post-layout"]:checked')?.value; }
function save(w) { w.document.querySelector('[data-save-draft]').click(); return w.MisamoStore.readDraft(); }
function editor(w) { return w.document.querySelector('[data-post-editor]'); }

function caret(w, text, offset = text.length) {
  const walker = w.document.createTreeWalker(editor(w), w.NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) if (node.textContent === text) break;
  assert.ok(node, `Find editable text ${text}`);
  const range = w.document.createRange();
  range.setStart(node, offset); range.collapse(true);
  w.getSelection().removeAllRanges(); w.getSelection().addRange(range);
  w.document.dispatchEvent(new w.Event('selectionchange'));
}

function uploadVideo(w) {
  const input = w.document.querySelector('[data-video-input]');
  Object.defineProperty(input, 'files', { configurable: true, value: [new w.File(['video'], '매장.mp4', { type: 'video/mp4' })] });
  input.dispatchEvent(new w.Event('change', { bubbles: true }));
}

function assertOrder(html, values) {
  let previous = -1;
  for (const value of values) {
    const index = html.indexOf(value);
    assert.ok(index > previous, `Expected ${value} after the previous content in ${html}`);
    previous = index;
  }
}

test('new posts start grouped, while legacy photo and video drafts retain their intended format', t => {
  assert.equal(layout(openComposer(t)), 'carousel');
  const legacyPhoto = openComposer(t, { draft: draft({ images: [photo()] }) });
  assert.equal(layout(legacyPhoto), 'inline');
  assert.ok(editor(legacyPhoto).querySelector('[data-image-id="format-photo"]'));
  const legacyVideo = openComposer(t, { draft: draft({ video: video() }) });
  assert.equal(layout(legacyVideo), 'carousel');
  const legacyMixed = openComposer(t, { draft: draft({ images: [photo()], video: video() }) });
  assert.equal(layout(legacyMixed), 'carousel');
});

test('inline video uploads use the remembered text caret and persist only an attachment reference', async t => {
  const w = openComposer(t, { draft: draft() });
  selectLayout(w, 'inline');
  caret(w, '시작설명마침', 2);
  uploadVideo(w); await flush();
  const saved = save(w);
  assert.equal(saved.mediaLayout, 'inline');
  assert.deepEqual(plain(saved.video), video());
  assert.equal(editor(w).querySelectorAll('div[data-video-id="format-video"]').length, 1);
  assertOrder(saved.bodyHtml, ['시작', 'data-video-id="format-video"', '설명마침']);
  assert.doesNotMatch(saved.bodyHtml, /blob:|<video|<source|controls|매장\.mp4/);
  assert.equal(saved.bodyText, '시작설명마침');
});

test('switching formats repeatedly preserves image and video positions and all attachments', t => {
  const bodyHtml = '<p>시작</p><img data-image-id="format-photo"><p>설명</p><div data-video-id="format-video"></div><p>마침</p>';
  const w = openComposer(t, { draft: draft({ bodyHtml, images: [photo()], video: video(), mediaLayout: 'inline' }) });
  assert.equal(layout(w), 'inline');
  for (const format of ['carousel', 'inline', 'carousel', 'inline']) {
    selectLayout(w, format);
    const saved = save(w);
    assert.equal(saved.mediaLayout, format);
    assert.equal(saved.images.length, 1);
    assert.equal(saved.video.id, 'format-video');
    assertOrder(saved.bodyHtml, ['시작', 'data-image-id="format-photo"', '설명', 'data-video-id="format-video"', '마침']);
  }
  assert.equal(editor(w).querySelectorAll('[data-image-id="format-photo"]').length, 1);
  assert.equal(editor(w).querySelectorAll('div[data-video-id="format-video"]').length, 1);
});

test('dragging an inline video moves the existing attachment between paragraphs without duplicating it', t => {
  const w = openComposer(t, { draft: draft({ bodyHtml: '<p>시작</p><p>설명</p><p>마침</p><div data-video-id="format-video"></div>', video: video(), mediaLayout: 'inline' }) });
  const body = editor(w), marker = body.querySelector('div[data-video-id="format-video"]');
  const range = w.document.createRange();
  range.setStartAfter(body.querySelector('p')); range.collapse(true);
  // JSDOM has no native pointer geometry or OS drag data; only these boundaries
  // are supplied while the editor's real drag/drop and history handlers run.
  w.document.caretRangeFromPoint = () => range;
  const transfer = { types: [], files: [], data: {}, setData(type, value) { this.data[type] = value; this.types.push(type); }, getData(type) { return this.data[type] || ''; } };
  for (const [target, type] of [[marker, 'dragstart'], [body, 'dragover'], [body, 'drop']]) {
    const event = new w.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, { dataTransfer: { value: transfer }, clientX: { value: 30 }, clientY: { value: 50 } });
    target.dispatchEvent(event);
  }
  const saved = save(w);
  assertOrder(saved.bodyHtml, ['시작', 'data-video-id="format-video"', '설명', '마침']);
  assert.equal(editor(w).querySelectorAll('div[data-video-id="format-video"]').length, 1);
  assert.equal(saved.video.id, 'format-video');
});

test('inline representative photo selection survives restoration and controls the feed cover', async t => {
  const first = photo('first-photo'), second = photo('second-photo');
  const w = openComposer(t, { draft: draft({ bodyHtml: '<p>시작</p><img data-image-id="first-photo"><p>설명</p><img data-image-id="second-photo"><p>마침</p>', images: [first, second], mediaLayout: 'inline' }) });
  const choice = w.document.querySelector('[data-cover-select="second-photo"]');
  assert.ok(choice, 'Inline media tools expose representative photo choices');
  choice.click();
  assert.equal(save(w).coverId, 'second-photo');
  const restored = openComposer(t, { savedState: w.localStorage.getItem('misamo.prototype.v1') });
  assert.equal(save(restored).coverId, 'second-photo');
  restored.document.querySelector('[data-publish-post]').click(); await flush();
  const post = restored.MisamoStore.getPosts()[0];
  const card = restored.document.querySelector(`[data-post-id="${post.id}"]`);
  assert.equal(post.coverId, 'second-photo');
  assert.equal(card.querySelector('.post-image'), null);
  assert.ok(card.querySelector('.post-inline-media-preview'));
  assert.equal(card.querySelectorAll('.post-rich-body [data-image-id]').length, 2);
});

test('inline mixed posts retain their format through draft, preview, publish, edit and feed rendering', async t => {
  const w = openComposer(t, { draft: draft({ bodyHtml: '<p>시작</p><img data-image-id="format-photo"><p>설명</p><div data-video-id="format-video"></div><p>마침</p>', images: [photo()], video: video(), mediaLayout: 'inline' }) });
  save(w);
  const restored = openComposer(t, { savedState: w.localStorage.getItem('misamo.prototype.v1') });
  assert.equal(layout(restored), 'inline');
  const doc = restored.document;
  doc.querySelector('[data-preview-post]').click();
  assert.equal(doc.querySelectorAll('[data-preview-body] video').length, 1);
  assert.equal(doc.querySelectorAll('[data-preview-body] [data-image-id]').length, 1);
  assert.equal(doc.querySelectorAll('[data-preview-images] video').length, 0);
  doc.querySelector('[data-preview-close]').click();
  doc.querySelector('[data-publish-post]').click(); await flush();
  const post = restored.MisamoStore.getPosts()[0];
  assert.equal(post.mediaLayout, 'inline');
  assertOrder(post.bodyHtml, ['시작', 'data-image-id="format-photo"', '설명', 'data-video-id="format-video"', '마침']);
  const card = doc.querySelector(`[data-post-id="${post.id}"]`);
  assert.equal(card.querySelectorAll('.post-rich-body video').length, 1);
  assert.equal(card.querySelectorAll('.post-inline-media-preview').length, 1);
  restored.MisamoPosting.editPost(post.id);
  assert.equal(layout(restored), 'inline');
  assert.equal(editor(restored).querySelectorAll('div[data-video-id="format-video"]').length, 1);
  doc.querySelector('[data-post-title]').value = '본문형 게시글 수정';
  doc.querySelector('[data-publish-post]').click(); await flush();
  const edited = restored.MisamoCommunity.post(post.id);
  assert.equal(edited.title, '본문형 게시글 수정');
  assert.equal(edited.mediaLayout, 'inline');
  assertOrder(edited.bodyHtml, ['시작', 'data-image-id="format-photo"', '설명', 'data-video-id="format-video"', '마침']);
  assert.equal(card.querySelectorAll('.post-rich-body video').length, 1);
});

test('grouped mixed preview moves all media below the text and remains grouped when published', async t => {
  const w = openComposer(t, { draft: draft({ bodyHtml: '<p>시작</p><img data-image-id="format-photo"><p>설명</p><div data-video-id="format-video"></div><p>마침</p>', images: [photo()], video: video(), mediaLayout: 'inline' }) });
  selectLayout(w, 'carousel');
  w.document.querySelector('[data-preview-post]').click();
  assert.equal(w.document.querySelectorAll('[data-preview-body] img, [data-preview-body] video').length, 0);
  assert.equal(w.document.querySelectorAll('[data-preview-images] .misamo-carousel video').length, 1);
  assert.equal(w.document.querySelectorAll('[data-preview-images] .misamo-carousel img').length, 1);
  w.document.querySelector('[data-preview-close]').click();
  w.document.querySelector('[data-publish-post]').click(); await flush();
  const post = w.MisamoStore.getPosts()[0];
  assert.equal(post.mediaLayout, 'carousel');
  const card = w.document.querySelector(`[data-post-id="${post.id}"]`);
  assert.equal(card.querySelectorAll('.misamo-carousel video').length, 1);
  assert.equal(card.querySelectorAll('.post-rich-body img, .post-rich-body video').length, 0);
});

test('undo and redo restore inline video attachment data as well as its position after insertion and removal', async t => {
  const w = openComposer(t, { draft: draft({ mediaLayout: 'inline' }) });
  caret(w, '시작설명마침', 2);
  uploadVideo(w); await flush();
  const uploaded = save(w);
  w.document.querySelector('[data-editor-command="undo"]').click();
  assert.equal(save(w).video, null);
  assert.equal(editor(w).querySelector('div[data-video-id]'), null);
  w.document.querySelector('[data-editor-command="redo"]').click();
  assert.deepEqual(plain(save(w).video), video());
  assert.equal(save(w).bodyHtml, uploaded.bodyHtml);
  w.document.querySelector('[data-inline-video-remove]').click();
  assert.equal(save(w).video, null);
  assert.equal(editor(w).querySelector('div[data-video-id]'), null);
  w.document.querySelector('[data-editor-command="undo"]').click();
  assert.deepEqual(plain(save(w).video), video());
  assert.equal(save(w).bodyHtml, uploaded.bodyHtml);
  w.document.querySelector('[data-editor-command="redo"]').click();
  assert.equal(save(w).video, null);
  assert.equal(editor(w).querySelector('div[data-video-id]'), null);
});

test('format-only changes are undoable without losing stored media positions', t => {
  const w = openComposer(t, { draft: draft({ bodyHtml: '<p>시작</p><img data-image-id="format-photo"><p>설명마침</p>', images: [photo()], mediaLayout: 'inline' }) });
  const before = save(w);
  selectLayout(w, 'carousel');
  assert.equal(save(w).mediaLayout, 'carousel');
  w.document.querySelector('[data-editor-command="undo"]').click();
  assert.equal(layout(w), 'inline');
  assert.equal(save(w).mediaLayout, 'inline');
  assert.equal(save(w).bodyHtml, before.bodyHtml);
  w.document.querySelector('[data-editor-command="redo"]').click();
  assert.equal(layout(w), 'carousel');
  assert.equal(save(w).mediaLayout, 'carousel');
  assert.equal(save(w).images.length, 1);
});

test('replacing an inline video keeps its original position even when the current caret is elsewhere', async t => {
  const oldHtml = '<p>시작</p><div data-video-id="format-video"></div><p>설명</p><img data-image-id="format-photo"><p>마침</p>';
  const replacement = video({ id: 'replacement-video', width: 1080, height: 1920 });
  const w = openComposer(t, { draft: draft({ bodyHtml: oldHtml, images: [photo()], video: video(), mediaLayout: 'inline' }), importFile: async () => replacement });
  const before = save(w);
  caret(w, '마침');
  uploadVideo(w); await flush();
  const saved = save(w);
  assert.equal(saved.video.id, 'replacement-video');
  assert.equal(saved.images.length, 1);
  assertOrder(saved.bodyHtml, ['시작', 'data-video-id="replacement-video"', '설명', 'data-image-id="format-photo"', '마침']);
  assert.equal(editor(w).querySelectorAll('div[data-video-id]').length, 1);
  assert.equal(editor(w).querySelectorAll('video').length, 1);
  assert.equal(editor(w).querySelector('div[data-video-id="format-video"]'), null);
  w.document.querySelector('[data-editor-command="undo"]').click();
  assert.deepEqual(plain(save(w).video), video());
  assert.equal(save(w).bodyHtml, before.bodyHtml);
  w.document.querySelector('[data-editor-command="redo"]').click();
  assert.equal(save(w).video.id, 'replacement-video');
  assert.equal(save(w).bodyHtml, saved.bodyHtml);
});

test('representative photo changes can be undone and redone without changing the inline body', t => {
  const w = openComposer(t, { draft: draft({ bodyHtml: '<p>시작</p><img data-image-id="first-photo"><p>설명</p><img data-image-id="second-photo"><p>마침</p>', images: [photo('first-photo'), photo('second-photo')], mediaLayout: 'inline' }) });
  const original = save(w);
  assert.equal(original.coverId, 'first-photo');
  w.document.querySelector('[data-cover-select="second-photo"]').click();
  assert.equal(save(w).coverId, 'second-photo');
  assert.equal(w.document.querySelector('[data-cover-select="second-photo"]').getAttribute('aria-pressed'), 'true');
  w.document.querySelector('[data-editor-command="undo"]').click();
  assert.equal(save(w).coverId, 'first-photo');
  assert.equal(w.document.querySelector('[data-cover-select="first-photo"]').getAttribute('aria-pressed'), 'true');
  assert.equal(save(w).bodyHtml, original.bodyHtml);
  w.document.querySelector('[data-editor-command="redo"]').click();
  assert.equal(save(w).coverId, 'second-photo');
  assert.equal(w.document.querySelector('[data-cover-select="second-photo"]').getAttribute('aria-pressed'), 'true');
  assert.equal(save(w).bodyHtml, original.bodyHtml);
  assert.equal(save(w).images.length, 2);
});

test('rewriting grouped text then switching to inline restores missing attachment positions after the new text', t => {
  const first = photo('first-photo'), second = photo('second-photo');
  const w = openComposer(t, { draft: draft({ bodyHtml: '<p>시작</p><img data-image-id="first-photo"><p>설명</p><div data-video-id="format-video"></div><img data-image-id="second-photo"><p>마침</p>', images: [first, second], video: video(), mediaLayout: 'carousel' }) });
  editor(w).innerHTML = '<p>완전히 새로 작성한 본문</p>';
  editor(w).dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(save(w).images.length, 2);
  assert.equal(save(w).video.id, 'format-video');
  selectLayout(w, 'inline');
  const saved = save(w);
  assert.equal(saved.mediaLayout, 'inline');
  assert.equal(saved.bodyText, '완전히 새로 작성한 본문');
  assert.equal(saved.images.length, 2);
  assert.equal(saved.video.id, 'format-video');
  for (const image of [first, second]) {
    assertOrder(saved.bodyHtml, ['완전히 새로 작성한 본문', `data-image-id="${image.id}"`]);
    assert.equal(editor(w).querySelectorAll(`[data-image-id="${image.id}"]`).length, 1);
    assert.equal(editor(w).querySelector(`[data-image-id="${image.id}"]`).src, image.src);
  }
  assertOrder(saved.bodyHtml, ['완전히 새로 작성한 본문', 'data-video-id="format-video"']);
  assert.equal(editor(w).querySelectorAll('div[data-video-id="format-video"]').length, 1);
  const restored = openComposer(t, { savedState: w.localStorage.getItem('misamo.prototype.v1') });
  assert.equal(layout(restored), 'inline');
  assert.equal(editor(restored).querySelectorAll('img[data-image-id]').length, 2);
  assert.equal(editor(restored).querySelectorAll('div[data-video-id="format-video"]').length, 1);
});

test('native inline image deletion stays deleted across format changes and undo restores each action separately', t => {
  const w = openComposer(t, { draft: draft({ bodyHtml: '<p>시작</p><img data-image-id="format-photo"><p>설명마침</p>', images: [photo()], mediaLayout: 'inline' }) });
  const original = save(w);
  editor(w).querySelector('img[data-image-id="format-photo"]').remove();
  editor(w).dispatchEvent(new w.InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
  assert.equal(save(w).images.length, 0);
  selectLayout(w, 'carousel');
  assert.equal(layout(w), 'carousel');
  assert.equal(save(w).images.length, 0);
  assert.equal(editor(w).querySelector('img[data-image-id]'), null);
  assert.equal(w.document.querySelector('[data-video-preview] .misamo-carousel img'), null);
  w.document.querySelector('[data-editor-command="undo"]').click();
  assert.equal(layout(w), 'inline');
  assert.equal(save(w).images.length, 0);
  assert.equal(editor(w).querySelector('img[data-image-id]'), null);
  w.document.querySelector('[data-editor-command="undo"]').click();
  assert.equal(layout(w), 'inline');
  assert.equal(save(w).images.length, 1);
  assert.equal(editor(w).querySelector('img[data-image-id="format-photo"]').src, photo().src);
  assert.equal(save(w).bodyHtml, original.bodyHtml);
  w.document.querySelector('[data-editor-command="redo"]').click();
  assert.equal(save(w).images.length, 0);
  w.document.querySelector('[data-editor-command="redo"]').click();
  assert.equal(layout(w), 'carousel');
  assert.equal(save(w).images.length, 0);
  assert.equal(editor(w).querySelector('img[data-image-id]'), null);
});

test('pasting plain text over all inline content removes the video and undo restores its attachment and position', t => {
  const w = openComposer(t, { draft: draft({ bodyHtml: '<p>시작</p><div data-video-id="format-video"></div><p>설명마침</p>', video: video(), mediaLayout: 'inline' }) });
  const original = save(w);
  const range = w.document.createRange();
  range.selectNodeContents(editor(w));
  w.getSelection().removeAllRanges(); w.getSelection().addRange(range);
  w.document.dispatchEvent(new w.Event('selectionchange'));
  const paste = new w.Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(paste, 'clipboardData', { value: { getData: type => type === 'text/plain' ? '붙여 넣은 새 본문' : '' } });
  editor(w).dispatchEvent(paste);
  assert.equal(paste.defaultPrevented, true);
  const replaced = save(w);
  assert.equal(replaced.mediaLayout, 'inline');
  assert.equal(replaced.bodyText, '붙여 넣은 새 본문');
  assert.equal(replaced.video, null);
  assert.doesNotMatch(replaced.bodyHtml, /data-video-id/);
  assert.equal(editor(w).querySelector('video, div[data-video-id]'), null);
  w.document.querySelector('[data-editor-command="undo"]').click();
  assert.deepEqual(plain(save(w).video), video());
  assert.equal(save(w).bodyHtml, original.bodyHtml);
  assert.equal(editor(w).querySelectorAll('div[data-video-id="format-video"]').length, 1);
  assert.equal(editor(w).querySelectorAll('video').length, 1);
  w.document.querySelector('[data-editor-command="redo"]').click();
  assert.equal(save(w).video, null);
  assert.equal(save(w).bodyText, '붙여 넣은 새 본문');
  assert.equal(editor(w).querySelector('video, div[data-video-id]'), null);
});
