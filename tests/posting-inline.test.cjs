const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const photo = { id: 'photo-1', src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', alt: '사진' };

function openComposer(savedState) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://misamo.test/#write', runScripts: 'outside-only' });
  const w = dom.window;
  // JSDOM lacks these visual browser operations. The actual content and store run unchanged.
  w.CSS = { escape: value => String(value) }; // Test ids are safe UUIDs.
  w.scrollTo = () => {};
  w.crypto.randomUUID = randomUUID;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.eval(fs.readFileSync(path.join(root, 'post-store.js'), 'utf8'));
  if (savedState) w.localStorage.setItem('misamo.prototype.v1', savedState);
  else w.MisamoStore.saveDraft({ title: '본문 이미지', bodyText: '앞뒤', bodyHtml: '<p>앞뒤</p>', images: [photo], tags: [] });
  w.eval(fs.readFileSync(path.join(root, 'post-content.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(root, 'editor-media.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(root, 'posting.js'), 'utf8'));
  return dom;
}

function insertBetweenWords(w) {
  const editor = w.document.querySelector('[data-post-editor]');
  const range = w.document.createRange();
  range.setStart(editor.querySelector('p').firstChild, 1);
  range.collapse(true);
  w.getSelection().removeAllRanges();
  w.getSelection().addRange(range);
  w.document.dispatchEvent(new w.Event('selectionchange'));
  const image = editor.querySelector('img');
  assert.ok(image, 'Legacy attachments are accessible directly inside the editor');
  w.document.caretRangeFromPoint = () => range;
  const transfer = { effectAllowed:'', setData(){}, getData(){return '';}, files:[] };
  for(const [target,type] of [[image,'dragstart'],[editor,'drop']]) {
    const event = new w.Event(type,{bubbles:true,cancelable:true});
    Object.defineProperties(event,{dataTransfer:{value:transfer},clientX:{value:0},clientY:{value:0}});
    target.dispatchEvent(event);
  }
  return editor;
}

test('inserting at a remembered caret preserves surrounding text and stores only an image reference', () => {
  const dom = openComposer(); const w = dom.window;
  try {
    const editor = insertBetweenWords(w);
    const image = editor.querySelector('img');
    assert.ok(image);
    assert.equal(image.previousSibling.textContent, '앞');
    const siblings = Array.from(image.parentNode.childNodes);
    assert.equal(siblings.slice(siblings.indexOf(image) + 1).map(node => node.textContent).join(''), '뒤');
    assert.equal(image.getAttribute('src'), photo.src);
    w.document.querySelector('[data-save-draft]').click();
    const saved = w.MisamoStore.readDraft();
    assert.equal(saved.images.length, 1);
    assert.ok(saved.bodyHtml.includes('data-image-id="photo-1"'));
    assert.ok(!saved.bodyHtml.includes('base64'));
    assert.equal(saved.bodyText, '앞뒤');
    const restored = openComposer(w.localStorage.getItem('misamo.prototype.v1'));
    try {
      const restoredImage = restored.window.document.querySelector('[data-post-editor] img');
      assert.equal(restoredImage.getAttribute('src'), photo.src);
      assert.equal(restoredImage.previousSibling.textContent, '앞');
    } finally { restored.window.close(); }
  } finally { w.close(); }
});

test('preview and published feed show the inline image once without a duplicate cover', () => {
  const dom = openComposer(); const w = dom.window;
  try {
    insertBetweenWords(w);
    w.document.querySelector('[data-preview-post]').click();
    assert.equal(w.document.querySelectorAll('[data-preview-body] img').length, 1);
    assert.equal(w.document.querySelectorAll('[data-preview-images] img').length, 0);
    w.document.querySelector('[data-preview-close]').click();
    w.document.querySelector('[data-publish-post]').click();
    assert.equal(w.MisamoStore.getPosts().length, 1);
    const card = w.document.querySelector('.feed-panel .post-card');
    assert.equal(card.querySelectorAll('.post-body img').length, 1);
    assert.ok(card.classList.contains('posting-inline-post'));
    assert.equal(card.querySelector('.post-rich-body img').previousSibling.textContent, '앞');
    const restored = openComposer(w.localStorage.getItem('misamo.prototype.v1'));
    try { assert.equal(restored.window.document.querySelectorAll('.feed-panel .post-card:first-of-type .post-rich-body img').length, 1); }
    finally { restored.window.close(); }
  } finally { w.close(); }
});

test('deleting an attachment removes its inline reference and moving it does not duplicate it', () => {
  const dom = openComposer(); const w = dom.window;
  try {
    const editor = insertBetweenWords(w);
    insertBetweenWords(w);
    assert.equal(editor.querySelectorAll('img').length, 1);
    w.document.querySelector('[data-media-delete]').click();
    w.document.querySelector('[data-save-draft]').click();
    assert.equal(editor.querySelectorAll('img').length, 0);
    assert.equal(w.MisamoStore.readDraft().images.length, 0);
    assert.ok(!w.MisamoStore.readDraft().bodyHtml.includes('data-image-id'));
    assert.equal(editor.textContent, '앞뒤');
  } finally { w.close(); }
});

test('legacy attachments migrate into the body without retaining the lower attachment area', () => {
  const dom = openComposer(); const w = dom.window;
  try {
    assert.equal(w.document.querySelector('[data-post-editor]').textContent, '앞뒤');
    w.document.querySelector('[data-preview-post]').click();
    assert.equal(w.document.querySelectorAll('[data-preview-body] img').length, 1);
    assert.equal(w.document.querySelectorAll('[data-preview-images] img').length, 0);
    assert.equal(w.document.querySelector('[data-image-list]'), null);
    assert.equal(w.document.querySelector('[data-image-upload]'), null);
    assert.equal(w.MisamoStore.readDraft().images[0].src, photo.src);
  } finally { w.close(); }
});

test('repeatedly moving then deleting a photo preserves the original paragraph spacing', () => {
  const dom = openComposer(); const w = dom.window;
  try {
    insertBetweenWords(w);
    for (let i = 0; i < 4; i++) insertBetweenWords(w);
    w.document.querySelector('[data-media-delete]').click();
    w.document.querySelector('[data-save-draft]').click();
    assert.equal(w.MisamoStore.readDraft().bodyHtml, '<p>앞뒤</p>');
  } finally { w.close(); }
});

test('image alignment and percentage size persist through draft, preview and publishing', () => {
  const dom=openComposer(), w=dom.window;
  try {
    const editor=insertBetweenWords(w), image=editor.querySelector('img');
    image.dataset.imageWidth='45'; image.style.width='45%';
    image.click();w.document.querySelector('[data-editor-align="right"]').click();
    w.document.querySelector('[data-save-draft]').click();
    const next=openComposer(w.localStorage.getItem('misamo.prototype.v1'));
    try {
      const d=next.window.document;
      assert.equal(d.querySelector('[data-post-editor] img').style.width,'45%');
      assert.equal(d.querySelector('[data-post-editor] img').dataset.align,'right');
      d.querySelector('[data-preview-post]').click();
      assert.equal(d.querySelector('[data-preview-body] img').style.width,'45%');
      d.querySelector('[data-preview-close]').click();d.querySelector('[data-publish-post]').click();
      assert.equal(d.querySelector('.feed-panel .post-rich-body img').dataset.align,'right');
      assert.equal(d.querySelector('.feed-panel .post-rich-body img').style.width,'45%');
    } finally { next.window.close(); }
  } finally { w.close(); }
});
