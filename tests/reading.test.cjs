const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const paragraph = '창업을 준비하며 같은 거리를 여러 시간대에 살펴보았습니다. ';
function setup(body) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url:'https://misamo.test/#home', runScripts:'outside-only' });
  const w = dom.window, doc = w.document;
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () { this.dataset.wasScrolled = 'true'; };
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  const post = doc.querySelector('[data-post-id="demo-cafe"]');
  post.querySelector('.post-copy p').outerHTML = `<div class="post-rich-body">${body}</div>`;
  w.eval(fs.readFileSync(path.join(root, 'script.js'), 'utf8'));
  const file = path.join(root,'reading.js'); if (fs.existsSync(file)) w.eval(fs.readFileSync(file,'utf8'));
  return {dom,w,doc,post};
}
test('long post reveals unchanged rich content; collapse retains comment draft and scrolls to the post', () => {
  const original = `<p>${paragraph.repeat(6)}</p><h3>다음 단계</h3><p>원본 링크 <a href="https://example.com">참고</a></p><img src="data:image/png;base64,AAAA" alt="전체 사진"><p>${paragraph.repeat(12)}</p>`;
  const {dom,doc,post} = setup(original);
  try {
    const full = post.querySelector('.post-rich-body'), expand = post.querySelector('[data-reading-toggle]');
    assert.ok(expand); assert.equal(full.hidden, true);
    assert.match(post.querySelector('.reading-excerpt').textContent, /살펴보았습니다\./);
    const before = full.innerHTML;
    const input = doc.createElement('textarea'); input.value = '작성 중 댓글'; post.append(input);
    expand.click(); assert.equal(full.hidden, false); assert.equal(full.innerHTML, before);
    assert.equal(full.querySelectorAll('img').length,1); assert.equal(full.querySelector('a').href,'https://example.com/');
    post.querySelector('[data-reading-collapse]').click(); assert.equal(full.hidden,true);
    assert.equal(input.value,'작성 중 댓글'); assert.equal(post.dataset.wasScrolled,'true');
  } finally { dom.window.close(); }
});
test('short text needs no expand control and remains fully accessible', () => {
  const {dom,post} = setup('<p>짧은 글은 전체를 그대로 읽습니다.</p>');
  try { assert.equal(post.querySelector('[data-reading-toggle]'),null); assert.equal(post.querySelector('.post-rich-body').hidden,false); }
  finally { dom.window.close(); }
});
test('media-first and unpunctuated long posts have a safe preview with access to the full original', () => {
  const {dom,post} = setup(`<img src="data:image/png;base64,AAAA"><p>${'긴내용'.repeat(400)}</p>`);
  try {
    assert.ok(post.querySelector('[data-reading-toggle]'));
    assert.ok(post.querySelector('.reading-excerpt').textContent.length < 450);
    post.querySelector('[data-reading-toggle]').click();
    assert.equal(post.querySelector('.post-rich-body').textContent.length,1200);
  } finally { dom.window.close(); }
});
test('posts hydrate independently after publishing and direct reading returns to the feed', () => {
  const {dom,w,doc,post} = setup(`<p>${paragraph.repeat(15)}</p>`);
  try {
    const second = doc.createElement('article'); second.className='post-card'; second.dataset.postId='new-post';
    second.innerHTML = `<div class="post-body"><div class="post-copy"><h2>새 글</h2><div class="post-rich-body"><p>${paragraph.repeat(15)}</p></div></div></div>`;
    doc.querySelector('.feed-panel').append(second); w.dispatchEvent(new w.CustomEvent('misamo:post-rendered'));
    post.querySelector('[data-reading-toggle]').click(); second.querySelector('[data-reading-toggle]').click();
    assert.equal(post.querySelector('.post-rich-body').hidden,false);
    second.querySelector('[data-reading-link]').click();
    assert.match(w.location.hash,/post\/new-post/); assert.ok(second.classList.contains('is-reading-target'));
    doc.querySelector('[data-reading-back]').click(); assert.equal(w.location.hash,'#home'); assert.equal(doc.body.classList.contains('is-reading-post'),false);
  } finally { dom.window.close(); }
});
test('many short list items and line breaks still receive a bounded preview', () => {
  for (const body of ['<ul>'+Array.from({length:35},(_,i)=>'<li>항목 '+i+'</li>').join('')+'</ul>','<p>'+Array.from({length:25},()=> '짧은 줄').join('<br>')+'</p>']) {
    const {dom,post} = setup(body);
    try { assert.ok(post.querySelector('[data-reading-toggle]')); } finally {dom.window.close();}
  }
});
test('returning from the reading view restores focus to the visible post title', () => {
  const {dom,doc,post} = setup('<p>짧은 글</p>');
  try {
    const title=post.querySelector('[data-reading-link]'); title.click();
    const back=doc.querySelector('[data-reading-back]'); back.focus(); back.click();
    assert.equal(doc.activeElement,title);
  } finally {dom.window.close();}
});
