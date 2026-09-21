const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..');
const order = ['home', 'explore', 'write', 'messages', 'profile'];

function boot(width = 390) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    url: 'http://127.0.0.1:9999/#home', runScripts: 'outside-only'
  });
  const w = dom.window;
  Object.defineProperty(w, 'innerWidth', {value: width, writable: true});
  w.matchMedia = query => ({matches: query.includes('max-width: 980px') && w.innerWidth <= 980, addEventListener() {}, removeEventListener() {}});
  w.CSS = {escape: String};
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.localStorage.setItem('misamo.prototype.v1', JSON.stringify({version: 1, draft: null, posts: [
    {id: 'alpha', authorId: 'writer-a', author: 'cafe_author', title: '카페 운영 기록', bodyText: '주문 동선을 정리했습니다.', bodyHtml: '<p>주문 동선을 정리했습니다.</p>', category: '운영 노하우', type: '정보 공유', industry: '외식·카페', tags: ['카페'], images: [], createdAt: '2026-09-14T10:00:00Z'}
  ], threads: {}, likes: {}}));
  for (const file of ['post-store.js', 'post-content.js', 'editor-media.js', 'posting.js', 'community-data.js', 'community-shell.js', 'script.js', 'comments.js', 'reading.js', 'bookmarks.js']) {
    w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  }
  return dom;
}

function touch(w, target, type, points, changed = points) {
  const event = new w.Event(type, {bubbles: true, cancelable: true});
  Object.defineProperties(event, {
    touches: {value: points.map(([clientX, clientY, identifier = 1]) => ({clientX, clientY, identifier}))},
    changedTouches: {value: changed.map(([clientX, clientY, identifier = 1]) => ({clientX, clientY, identifier}))}
  });
  target.dispatchEvent(event);
  return event;
}
function swipe(w, target, dx = -160, dy = 0) {
  const x = dx < 0 ? 260 : 100;
  touch(w, target, 'touchstart', [[x, 300]]);
  const move = touch(w, target, 'touchmove', [[x + dx, 300 + dy]]);
  touch(w, target, 'touchend', [], [[x + dx, 300 + dy]]);
  return move;
}
function active(w) { return w.document.querySelector('.page-view.is-active').dataset.page; }
function surface(w) { return w.document.querySelector('.page-view.is-active'); }

test('mobile tabs expose the requested five destinations and keep one active tab', () => {
  const dom = boot();
  try {
    const w = dom.window, links = [...w.document.querySelectorAll('.mobile-nav a')];
    assert.deepEqual(links.map(link => link.dataset.viewTarget), order);
    assert.deepEqual(links.map(link => link.textContent.trim()), ['홈', '탐색', '글쓰기', '메시지', '프로필']);
    for (const link of links) {
      link.click();
      assert.equal(active(w), link.dataset.viewTarget);
      assert.equal(w.document.querySelectorAll('.mobile-nav [aria-current="page"]').length, 1);
      assert.equal(link.getAttribute('aria-current'), 'page');
    }
  } finally { dom.window.close(); }
});

test('horizontal touch swipes follow tab order in both directions without wrapping', () => {
  const dom = boot();
  try {
    const w = dom.window, nav = w.document.querySelector('.mobile-nav');
    swipe(w, surface(w), 160);
    assert.equal(active(w), 'home', 'the first tab does not wrap');
    swipe(w, surface(w));
    assert.equal(active(w), 'explore', 'content supports a left swipe');
    for (const expected of order.slice(2)) {
      swipe(w, nav);
      assert.equal(active(w), expected);
      assert.equal(w.document.querySelector('.mobile-nav .active').dataset.viewTarget, expected);
    }
    swipe(w, nav);
    assert.equal(active(w), 'profile', 'the last tab does not wrap');
    for (const expected of order.slice(0, -1).reverse()) {
      swipe(w, nav, 160);
      assert.equal(active(w), expected);
    }
  } finally { dom.window.close(); }
});

test('desktop, vertical scroll, short gestures, multitouch and cancellation do not navigate', () => {
  const dom = boot();
  try {
    const w = dom.window, page = surface(w);
    w.innerWidth = 1200;
    swipe(w, page);
    assert.equal(active(w), 'home');
    w.innerWidth = 390;
    const vertical = swipe(w, page, -30, 160);
    assert.equal(vertical.defaultPrevented, false, 'native vertical scrolling stays available');
    swipe(w, page, -25);
    assert.equal(active(w), 'home');
    touch(w, page, 'touchstart', [[260, 300], [280, 320, 2]]);
    touch(w, page, 'touchend', [], [[100, 300]]);
    assert.equal(active(w), 'home');
    touch(w, page, 'touchstart', [[260, 300]]);
    touch(w, page, 'touchmove', [[200, 300], [220, 320, 2]]);
    touch(w, page, 'touchend', [], [[100, 300]]);
    assert.equal(active(w), 'home');
    touch(w, page, 'touchstart', [[260, 300]]);
    touch(w, page, 'touchcancel', []);
    touch(w, page, 'touchend', [], [[100, 300]]);
    assert.equal(active(w), 'home');
  } finally { dom.window.close(); }
});

test('media, scrollable lists and form controls keep their own gestures', () => {
  const dom = boot();
  try {
    const w = dom.window, d = w.document, page = surface(w);
    for (const html of [
      '<div class="misamo-carousel"><div>사진</div></div>',
      '<div class="stories"><div>스토리</div></div>',
      '<video></video>', '<input>', '<textarea></textarea>', '<select><option>선택</option></select>',
      '<button>버튼</button>', '<a href="#home">링크</a>', '<div contenteditable="true">편집</div>'
    ]) {
      const host = d.createElement('div');
      host.innerHTML = html; page.append(host);
      const target = host.firstElementChild.firstElementChild || host.firstElementChild;
      const move = swipe(w, target);
      assert.equal(active(w), 'home', html);
      assert.equal(move.defaultPrevented, false, html);
      host.remove();
    }
    const scrolling = d.createElement('div');
    scrolling.style.overflowX = 'auto';
    Object.defineProperties(scrolling, {scrollWidth: {value: 600}, clientWidth: {value: 300}});
    page.append(scrolling);
    swipe(w, scrolling);
    assert.equal(active(w), 'home');
    w.misamoNavigate('write');
    for (const target of [d.querySelector('[data-post-title]'), d.querySelector('[data-post-editor]'), d.querySelector('.posting-editor-block')]) {
      swipe(w, target);
      assert.equal(active(w), 'write');
    }
  } finally { dom.window.close(); }
});

test('dialogs, selected text, browser edge gestures and post detail prevent tab swipes', () => {
  const dom = boot();
  try {
    const w = dom.window, d = w.document, nav = d.querySelector('.mobile-nav'), page = surface(w);
    const dialog = d.createElement('dialog'); dialog.open = true; d.body.append(dialog);
    swipe(w, nav); assert.equal(active(w), 'home'); dialog.remove();
    const paragraph = d.createElement('p'); paragraph.textContent = '선택한 문장'; page.append(paragraph);
    const range = d.createRange(); range.selectNodeContents(paragraph); w.getSelection().addRange(range);
    swipe(w, nav); assert.equal(active(w), 'home'); w.getSelection().removeAllRanges();
    touch(w, page, 'touchstart', [[10, 300]]);
    touch(w, page, 'touchend', [], [[160, 300]]);
    assert.equal(active(w), 'home');
    w.history.replaceState(null, '', '#post/alpha');
    swipe(w, nav); assert.equal(w.location.hash, '#post/alpha');
  } finally { dom.window.close(); }
});

test('swiping to profile opens the current user after visiting another author', () => {
  const dom = boot();
  try {
    const w = dom.window, d = w.document;
    w.MisamoCommunityUI.openProfile('writer-a');
    assert.match(d.querySelector('[data-page="profile"] h2').textContent, /cafe_author/);
    w.misamoNavigate('messages');
    swipe(w, surface(w));
    assert.equal(active(w), 'profile');
    assert.equal(d.querySelector('[data-page="profile"] h2').textContent, w.MisamoCommunity.profile(w.MisamoStore.USER.id).name);
  } finally { dom.window.close(); }
});

test('explicit navigation-bar swipes save a pending new post and retain message text', () => {
  const dom = boot();
  try {
    const w = dom.window, d = w.document, nav = d.querySelector('.mobile-nav');
    w.misamoNavigate('write');
    const title = d.querySelector('[data-post-title]'), editor = d.querySelector('[data-post-editor]');
    title.value = '스와이프 후에도 남는 초안'; title.dispatchEvent(new w.Event('input', {bubbles: true}));
    editor.innerHTML = '<p>마지막 문장도 그대로 보관합니다.</p>'; editor.dispatchEvent(new w.Event('input', {bubbles: true}));
    swipe(w, nav); assert.equal(active(w), 'messages');
    const draft = w.MisamoStore.readDraft();
    assert.equal(draft.title, title.value);
    assert.match(draft.bodyText, /마지막 문장도 그대로 보관합니다/);
    swipe(w, nav, 160); assert.equal(active(w), 'write');
    assert.equal(d.querySelector('[data-post-title]').value, '스와이프 후에도 남는 초안');
    w.MisamoCommunityUI.openMessages('writer-a');
    const message = d.querySelector('[data-page="messages"] textarea');
    message.value = '전송하지 않은 메시지'; message.dispatchEvent(new w.Event('input', {bubbles: true}));
    swipe(w, nav); assert.equal(active(w), 'profile');
    swipe(w, nav, 160); assert.equal(active(w), 'messages');
    assert.equal(d.querySelector('[data-page="messages"] textarea').value, '전송하지 않은 메시지');
  } finally { dom.window.close(); }
});
