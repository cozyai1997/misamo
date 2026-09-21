const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const key = 'misamo.prototype.v1';
function open(saved) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://misamo.test', runScripts: 'outside-only' });
  const w = dom.window;
  w.scrollTo = () => {};
  w.CSS = { escape: String };
  if (saved) w.localStorage.setItem(key, saved);
  for (const file of ['post-store.js', 'post-content.js', 'editor-media.js', 'posting.js', 'script.js', 'bookmarks.js']) {
    if (fs.existsSync(path.join(root, file))) w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  }
  return dom;
}
test('bookmark click persists through reload; removing from saved updates original and persists', () => {
  let dom = open();
  try {
    let w = dom.window;
    w.document.querySelector('.post-actions button[aria-label="저장"]').click();
    assert.equal(w.document.querySelector('.post-actions button[aria-label="저장 해제"]')?.getAttribute('aria-pressed'), 'true');
    const saved = w.localStorage.getItem(key);
    dom.window.close(); dom = open(saved); w = dom.window;
    assert.equal(w.document.querySelector('.post-actions [data-bookmark-button]').getAttribute('aria-pressed'), 'true');
    w.document.querySelector('[data-view-target="saved"]').click();
    assert.ok(w.document.querySelector('[data-page="saved"]').classList.contains('is-active'));
    w.document.querySelector('[data-bookmark-list] [data-bookmark-button]').click();
    assert.equal(w.document.querySelector('.post-actions [data-bookmark-button]').getAttribute('aria-pressed'), 'false');
    assert.equal(w.document.querySelector('[data-bookmark-list] [data-bookmark-button]'), null);
    const removed = w.localStorage.getItem(key);
    dom.window.close(); dom = open(removed);
    assert.equal(dom.window.document.querySelector('.post-actions [data-bookmark-button]').getAttribute('aria-pressed'), 'false');
  } finally { dom.window.close(); }
});
test('recommendations save independently and legacy drafts, comments and likes survive', () => {
  const legacy = { version: 1, draft: { title: 'keep' }, posts: [], threads: { a: { total: 2 } }, likes: { a: { liked: true, count: 1 } } };
  const dom = open(JSON.stringify(legacy));
  try {
    const w = dom.window;
    const buttons = w.document.querySelectorAll('.recommend-card footer button');
    buttons[0].click(); buttons[1].click(); buttons[0].click();
    assert.equal(buttons[0].getAttribute('aria-pressed'), 'false');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');
    const state = JSON.parse(w.localStorage.getItem(key));
    for (const field of ['draft', 'posts', 'threads', 'likes']) assert.deepEqual(state[field], legacy[field]);
  } finally { dom.window.close(); }
});
test('blocked storage never displays a successful save', () => {
  const dom = open();
  try {
    const w = dom.window; let message;
    w.alert = value => { message = value; };
    w.Storage.prototype.setItem = () => { throw new Error('blocked'); };
    const button = w.document.querySelector('.post-actions button[aria-label="저장"]');
    button.click();
    assert.ok(message);
    assert.equal(button.getAttribute('aria-pressed'), 'false');
  } finally { dom.window.close(); }
});
test('authored posts have bookmarks after hydration and restore their saved state', () => {
  const state = { version: 1, draft: null, posts: [{ id: 'my-post', title: '내 글', bodyText: '본문', createdAt: new Date().toISOString() }], threads: {}, likes: {} };
  let dom = open(JSON.stringify(state));
  try {
    const button = dom.window.document.querySelector('[data-post-id="my-post"] [data-bookmark-button]');
    assert.ok(button); button.click();
    const saved = dom.window.localStorage.getItem(key);
    dom.window.close(); dom = open(saved);
    assert.equal(dom.window.document.querySelector('[data-post-id="my-post"] [data-bookmark-button]').getAttribute('aria-pressed'), 'true');
  } finally { dom.window.close(); }
});
test('saved cards filter by category and folder, and folder assignments survive reload', () => {
  let dom = open();
  try {
    let w = dom.window;
    w.document.querySelector('.post-actions [data-bookmark-button]').click();
    w.document.querySelector('.recommend-card [data-bookmark-button]').click();
    assert.equal(w.document.querySelectorAll('.saved-content-card').length, 2);
    w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    w.HTMLDialogElement.prototype.close = function () { this.open = false; };
    w.document.querySelector('[data-folder-create]').click();
    w.document.querySelector('[data-folder-name]').value = '카페 창업';
    w.document.querySelector('[data-folder-form]').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    const select = w.document.querySelector('[data-bookmark-list] select');
    assert.ok(select);
    select.value = select.options[1].value;
    select.dispatchEvent(new w.Event('change', { bubbles: true }));
    const saved = w.localStorage.getItem(key);
    dom.window.close(); dom = open(saved); w = dom.window;
    const folder = [...w.document.querySelectorAll('[data-folder-filter]')].find(button => button.textContent.includes('카페 창업'));
    assert.ok(folder); folder.click();
    assert.equal(w.document.querySelectorAll('.saved-content-card').length, 1);
    w.document.querySelector('[data-saved-view="list"]').click();
    assert.equal(w.document.querySelector('[data-bookmark-list]').dataset.layout, 'list');
  } finally { dom.window.close(); }
});
test('category filters and saved-order sorting display the matching real cards', () => {
  const dom = open();
  try {
    const w = dom.window, doc = w.document;
    doc.querySelector('.post-actions [data-bookmark-button]').click();
    doc.querySelector('[data-post-id="recommend-cost"] [data-bookmark-button]').click();
    assert.match(doc.querySelector('.saved-content-card h2').textContent, /엑셀/);
    const sort = doc.querySelector('[data-saved-sort]'); sort.value = 'oldest'; sort.dispatchEvent(new w.Event('change'));
    assert.match(doc.querySelector('.saved-content-card h2').textContent, /준비 과정/);
    [...doc.querySelectorAll('.saved-filter')].find(button => button.textContent.startsWith('자료실')).click();
    assert.equal(doc.querySelectorAll('.saved-content-card').length, 1);
    assert.match(doc.querySelector('.saved-content-card h2').textContent, /엑셀/);
  } finally { dom.window.close(); }
});
