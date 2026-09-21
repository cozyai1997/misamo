const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '..', 'reading.js'), 'utf8');

function setup(body, article = true) {
  const dom = new JSDOM(`<main data-page="home"><section class="feed-panel"><article class="post-card ${article ? 'posting-article-post posting-inline-post' : ''}" data-post-id="article"><div class="post-body"><div class="post-copy"><h2>현장 이야기</h2><div class="post-rich-body">${body}</div></div><img class="post-image" src="data:image/png;base64,AAAA" alt="대표 사진"></div></article></section></main>`, { runScripts: 'outside-only', url: 'https://misamo.test/#home' });
  const win = dom.window;
  win.scrollTo = () => {};
  win.HTMLElement.prototype.scrollIntoView = () => {};
  const paused = [];
  win.HTMLMediaElement.prototype.pause = function () { paused.push(this); };
  win.eval(source);
  return { dom, win, post: win.document.querySelector('.post-card'), paused };
}

test('article media uses a compact home preview and reveals the original text/media order', () => {
  for (const media of ['<img data-image-id="photo" src="data:image/png;base64,AAAA">', '<div data-video-id="video-one"></div>']) {
    const { dom, post } = setup(`<p>공사 전입니다.</p>${media}<p>공사 후입니다.</p>`);
    try {
      const full = post.querySelector('.post-rich-body');
      const original = full.innerHTML;
      const toggle = post.querySelector('[data-reading-toggle]');
      assert.ok(toggle);
      assert.equal(full.hidden, true);
      assert.match(post.querySelector('.reading-excerpt').textContent, /공사 전입니다/);
      assert.ok(post.querySelector('.post-image'));
      toggle.click();
      assert.equal(full.hidden, false);
      assert.equal(full.innerHTML, original);
      assert.equal(post.classList.contains('reading-expanded'), true);
    } finally { dom.window.close(); }
  }
});

test('collapsing an article immediately pauses its video while preserving player and comment draft', () => {
  const { dom, post, paused } = setup('<p>작업 과정입니다.</p><div data-video-id="video-one"><video></video></div><p>완성했습니다.</p>');
  try {
    const toggle = post.querySelector('[data-reading-toggle]');
    assert.ok(toggle);
    toggle.click();
    const video = post.querySelector('video');
    const comment = dom.window.document.createElement('textarea');
    comment.value = '입력 중인 댓글'; post.append(comment);
    paused.length = 0;
    toggle.click();
    assert.deepEqual(paused, [video]);
    assert.equal(post.querySelector('video'), video);
    assert.equal(comment.value, '입력 중인 댓글');
    assert.equal(post.querySelector('.post-rich-body').hidden, true);
  } finally { dom.window.close(); }
});

test('short text articles and legacy single-image posts retain their existing reading behavior', () => {
  for (const [body, article] of [['<p>짧은 글입니다.</p>', true], ['<p>사진 설명입니다.</p><img data-image-id="photo" src="data:image/png;base64,AAAA">', false]]) {
    const { dom, post } = setup(body, article);
    try {
      assert.equal(post.querySelector('[data-reading-toggle]'), null);
      assert.equal(post.querySelector('.post-rich-body').hidden, false);
    } finally { dom.window.close(); }
  }
});
