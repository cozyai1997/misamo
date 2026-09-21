const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '..', 'comments.js'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const comment = (id, extras = {}) => ({ id, authorId: 'member', author: 'member', text: `댓글 ${id} 입니다.`, order: Number(id) || 0, likes: 0, replies: [], ...extras });
const post = id => `<article class="post-card" data-post-id="${id}" data-author-id="author"><header class="post-head"><strong>author</strong></header><div class="post-body"><div class="post-copy"><h2>제목</h2><p>본문</p></div></div><footer class="post-actions"><button data-comments-open aria-haspopup="dialog"><span data-comments-count>23</span></button></footer></article>`;
function setup(seed = null, id = 'demo-cafe', open = true) {
  const dom = new JSDOM(`<main>${post(id)}</main>`, { runScripts: 'outside-only', url: 'https://misamo.test/' });
  let saved = seed && clone(seed);
  const state = { readsFail: false, writesFail: false, writes: 0, saved: () => clone(saved) };
  dom.window.MisamoStore = {
    USER: { id: 'demo-me', name: 'misamo_korea', avatar: '' },
    readComments() { if (state.readsFail) throw new Error('불러오기 실패'); return saved && clone(saved); },
    saveComments(id, value) { if (state.writesFail) throw new Error('저장 실패'); state.writes++; saved = clone(value); return clone(value); },
  };
  state.start = () => dom.window.eval(source);
  state.dom = dom; state.window = dom.window; state.document = dom.window.document;
  state.start();
  if (open) state.document.querySelector('[data-comments-open]').click();
  return state;
}
function type(state, field, value) { field.value = value; field.dispatchEvent(new state.window.Event('input', { bubbles: true })); }
function submit(state, form) { form.dispatchEvent(new state.window.Event('submit', { bubbles: true, cancelable: true })); }
function rootVisible(state) { return [...state.document.querySelectorAll('.comments-list > .comment-item')].filter(node => !node.hidden); }

test('comments start collapsed and toggle accessibly without rewriting stored data', () => {
  const state = setup(null, 'demo-cafe', false); const doc = state.document;
  assert.equal(doc.querySelector('dialog'), null);
  const section = doc.querySelector('.post-card > .comments-section'); assert.ok(section);
  assert.equal(section.hidden, true);
  assert.ok(section.querySelector('.comments-compose textarea'));
  assert.equal(doc.querySelector('[data-comments-count]').textContent, '4');
  assert.deepEqual(rootVisible(state).map(node => node.dataset.commentId), ['demo-4', 'demo-2']);
  const trigger = doc.querySelector('[data-comments-open]');
  assert.equal(trigger.getAttribute('aria-controls'), section.id);
  assert.equal(trigger.getAttribute('aria-haspopup'), null);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(trigger.getAttribute('aria-label'), '댓글 보기');
  trigger.click(); assert.equal(section.hidden, false); assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  trigger.click(); assert.equal(section.hidden, true); assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(state.writes, 0, 'normalizing visible count must not rewrite stored data');
});

test('compose and reply drafts, selection, node identity and focus survive like, sorting, more and toggling', () => {
  const seed = { total: 15, comments: Array.from({ length: 15 }, (_, i) => comment(String(i + 1))) };
  const state = setup(seed, 'p'); const doc = state.document;
  const composer = doc.querySelector('.comments-compose textarea'); type(state, composer, '댓글 초안\n둘째 줄');
  const item = rootVisible(state)[0]; item.querySelector('[data-reply]').click();
  const reply = item.querySelector('.comment-reply-form textarea'); type(state, reply, '작성 중인 답글'); reply.focus(); reply.setSelectionRange(2, 5);
  item.querySelector('[data-comment-like]').click();
  assert.equal(item.querySelector('.comment-reply-form textarea'), reply);
  assert.equal(doc.activeElement, reply); assert.equal(reply.selectionStart, 2); assert.equal(reply.selectionEnd, 5);
  const sort = doc.querySelector('[data-comments-sort]'); sort.value = 'popular'; sort.dispatchEvent(new state.window.Event('change'));
  doc.querySelector('[data-comments-more]').click();
  doc.querySelector('[data-comments-open]').click(); doc.querySelector('[data-comments-open]').click();
  assert.equal(item.querySelector('.comment-reply-form textarea'), reply);
  assert.equal(reply.value, '작성 중인 답글'); assert.equal(composer.value, '댓글 초안\n둘째 줄');
  assert.equal(rootVisible(state).length, 12);
});

test('failed writes preserve typed content and successful comment is saved with actual totals', () => {
  const state = setup({ total: 23, comments: [comment('1')] }, 'p'); const doc = state.document;
  const compose = doc.querySelector('.comments-compose'); const field = compose.querySelector('textarea'); type(state, field, '내가 쓴 댓글\n다음 줄');
  state.writesFail = true; submit(state, compose);
  assert.equal(field.value, '내가 쓴 댓글\n다음 줄'); assert.equal(state.writes, 0);
  state.writesFail = false; submit(state, compose);
  assert.equal(field.value, ''); assert.equal(state.saved().total, 2);
  assert.equal(state.saved().comments[1].text, '내가 쓴 댓글\n다음 줄');
  assert.equal(doc.querySelector('[data-comments-count]').textContent, '2');
});

test('read failures after initial load block all mutation and retain drafts until explicit reload', () => {
  const state = setup({ total: 1, comments: [comment('1')] }, 'p'); const doc = state.document;
  const compose = doc.querySelector('.comments-compose'); const field = compose.querySelector('textarea'); type(state, field, '보존해야 하는 초안');
  state.readsFail = true; submit(state, compose);
  doc.querySelector('[data-comment-like]').click();
  assert.equal(state.writes, 0); assert.equal(field.value, '보존해야 하는 초안');
  assert.ok(doc.querySelector('[data-comments-retry]'));
  state.readsFail = false; doc.querySelector('[data-comments-retry]').click(); submit(state, compose);
  assert.equal(state.saved().comments.length, 2);
});

test('nested legacy replies flatten only their presentation and reply submission preserves ancestry', () => {
  const seed = { total: 20, comments: [comment('1', { replies: [comment('r1', { replies: [comment('r2', { author: 'nested' })] })] })] };
  const state = setup(seed, 'p'); const doc = state.document;
  assert.equal(doc.querySelector('[data-comments-count]').textContent, '3');
  const toggle = doc.querySelector('[data-replies-toggle]'); assert.ok(toggle); toggle.click();
  const nested = doc.querySelector('[data-comment-id="r2"]');
  assert.equal(nested.parentElement.className, 'comment-replies');
  assert.equal(nested.parentElement.closest('[data-comment-id]').dataset.commentId, '1');
  assert.ok(nested.querySelector('.comment-mention').textContent.includes('@member'));
  nested.querySelector('[data-reply]').click(); const form = nested.querySelector('.comment-reply-form'); type(state, form.querySelector('textarea'), '깊은 댓글에 답글'); submit(state, form);
  assert.equal(state.saved().comments[0].replies[0].replies[0].id, 'r2');
  assert.equal(state.saved().comments[0].replies[1].mention, 'nested');
  assert.equal(state.saved().total, 4);
});

test('own edit survives another action and failed save, then persists edited flag', () => {
  const state = setup({ total: 2, comments: [comment('1'), comment('2', { authorId: 'demo-me', text: '수정 전' })] }, 'p'); const doc = state.document;
  const item = doc.querySelector('[data-comment-id="2"]'); item.querySelector('[data-comment-edit]').click();
  const form = item.querySelector('.comment-edit-form'); const field = form.querySelector('textarea'); type(state, field, '수정한 글\n두 줄입니다.'); field.focus();
  doc.querySelector('[data-comment-id="1"] [data-comment-like]').click();
  assert.equal(item.querySelector('.comment-edit-form'), form); assert.equal(doc.activeElement, field);
  state.writesFail = true; submit(state, form); assert.equal(field.value, '수정한 글\n두 줄입니다.');
  state.writesFail = false; submit(state, form);
  assert.equal(state.saved().comments[1].edited, true); assert.equal(state.saved().comments[1].text, '수정한 글\n두 줄입니다.');
});

test('long comments preview complete sentences and expand without clipping, dynamic posts attach once', () => {
  const long = `${'충분히 길지만 완성된 문장입니다. '.repeat(28)}마지막 문장입니다.`;
  const state = setup({ total: 1, comments: [comment('1', { text: long })] }, 'p'); const doc = state.document;
  const item = doc.querySelector('[data-comment-id="1"]'); const toggle = item.querySelector('[data-comment-expand]'); assert.ok(toggle);
  assert.ok(item.querySelector('.comment-text').textContent.trimEnd().endsWith('.'));
  assert.ok(item.querySelector('.comment-text').textContent.length < long.length);
  toggle.click(); assert.equal(item.querySelector('.comment-text').textContent, long);
  doc.querySelector('main').insertAdjacentHTML('beforeend', post('new'));
  state.window.dispatchEvent(new state.window.CustomEvent('misamo:post-rendered'));
  state.window.dispatchEvent(new state.window.CustomEvent('misamo:post-rendered'));
  assert.equal(doc.querySelectorAll('[data-post-id="new"] > .comments-section').length, 1);
  assert.equal(doc.querySelector('[data-post-id="new"] > .comments-section').hidden, true);
});

test('malformed initial saved data stays intact and blocks composing until it can be read', () => {
  const malformed = { total: 23, comments: [{ id: 'broken', text: '기존 데이터', replies: 'invalid' }] };
  const state = setup(malformed, 'p'); const doc = state.document;
  const form = doc.querySelector('.comments-compose'); const field = form.querySelector('textarea'); type(state, field, '읽기 오류 중 초안');
  submit(state, form);
  assert.equal(state.writes, 0); assert.deepEqual(state.saved(), malformed);
  assert.equal(field.value, '읽기 오류 중 초안');
  assert.equal(doc.querySelector('[data-comments-retry]').hidden, false);
});

test('sorting a drafted root outside the first page preserves the visible form and focus', () => {
  const comments = Array.from({ length: 14 }, (_, i) => comment(String(i + 1), { likes: i < 2 ? 50 - i : 0 }));
  const state = setup({ total: 14, comments }, 'p'); const doc = state.document;
  const item = doc.querySelector('[data-comment-id="14"]'); item.querySelector('[data-reply]').click();
  const form = item.querySelector('.comment-reply-form'); const field = form.querySelector('textarea'); type(state, field, '정렬 후에도 보존'); field.focus(); field.setSelectionRange(3, 5);
  const sort = doc.querySelector('[data-comments-sort]'); sort.value = 'popular'; sort.dispatchEvent(new state.window.Event('change'));
  assert.equal(item.hidden, false); assert.equal(doc.activeElement, field); assert.equal(field.selectionStart, 3);
  form.querySelector('.comment-cancel').click(); item.querySelector('[data-reply]').click();
  assert.equal(form.querySelector('textarea'), field); assert.equal(field.value, '정렬 후에도 보존');
});

test('large reply threads show the latest ten in conversation order and add older replies without losing drafts', () => {
  const replies = Array.from({ length: 13 }, (_, i) => comment(`r${i + 1}`));
  const state = setup({ total: 14, comments: [comment('1', { replies })] }, 'p'); const doc = state.document;
  const root = doc.querySelector('[data-comment-id="1"]'); root.querySelector('[data-replies-toggle]').click();
  const list = root.querySelector('.comment-replies');
  const visible = () => [...list.querySelectorAll(':scope > .comment-item')].filter(node => !node.hidden);
  assert.deepEqual(visible().map(node => node.dataset.commentId), replies.slice(3).map(item => item.id));
  root.querySelector('[data-reply]').click(); const form = root.querySelector('.comment-reply-form'); type(state, form.querySelector('textarea'), '최신 답글입니다.'); submit(state, form);
  assert.equal(visible().length, 10); assert.ok(visible().at(-1).textContent.includes('최신 답글입니다.'));
  list.querySelector('[data-replies-more]').click(); assert.equal(visible().length, 14);
  assert.deepEqual(visible().slice(0, 13).map(node => node.dataset.commentId), replies.map(item => item.id));
});

test('unbroken long comments and many short lines stay compact without cutting original text', () => {
  for (const long of ['글'.repeat(2000), `${'글'.repeat(1900)}. 마지막 문장입니다.`, Array.from({ length: 12 }, (_, i) => `내용 ${i + 1}`).join('\n')]) {
    const state = setup({ total: 1, comments: [comment('1', { text: long })] }, 'p');
    const item = state.document.querySelector('[data-comment-id="1"]'); const text = item.querySelector('.comment-text'); const toggle = item.querySelector('[data-comment-expand]');
    assert.equal(toggle.hidden, false);
    assert.ok(text.textContent.length <= 360); assert.ok(text.textContent.split('\n').length <= 6);
    toggle.click(); assert.equal(text.textContent, long);
    assert.equal(state.writes, 0);
  }
});

test('reopening comments does not shrink drafts inside collapsed replies and visible replies resize again', () => {
  const state = setup({ total: 2, comments: [comment('1', { replies: [comment('r1')] })] }, 'p'); const doc = state.document;
  const root = doc.querySelector('[data-comment-id="1"]'); root.querySelector('[data-replies-toggle]').click();
  const reply = doc.querySelector('[data-comment-id="r1"]'); reply.querySelector('[data-reply]').click();
  const field = reply.querySelector('.comment-reply-form textarea');
  field.getClientRects = () => field.closest('[hidden]') ? [] : [{}];
  Object.defineProperty(field, 'scrollHeight', { get: () => field.closest('[hidden]') ? 0 : 180 });
  type(state, field, '여러 줄의 답글\n한 줄\n두 줄\n세 줄\n네 줄\n다섯 줄');
  assert.equal(field.style.height, '182px');
  root.querySelector('[data-replies-toggle]').click();
  doc.querySelector('[data-comments-open]').click(); doc.querySelector('[data-comments-open]').click();
  assert.equal(field.style.height, '182px');
  root.querySelector('[data-replies-toggle]').click(); assert.equal(field.style.height, '182px');
  assert.ok(field.value.endsWith('다섯 줄'));
});
