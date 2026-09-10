const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const file = path.join(__dirname, '..', 'post-store.js');
const sandbox = { module: { exports: {} }, crypto: require('node:crypto').webcrypto };
if (fs.existsSync(file)) vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
const createStore = sandbox.module.exports.createMisamoStore;
class Storage {
  constructor() { this.values = new Map(); this.fail = false; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.fail) throw new Error('QuotaExceededError'); this.values.set(key, value); }
}
const draft = () => ({ title: '카페 창업 기록', bodyText: '첫 번째 창업 이야기', bodyHtml: '<p>첫 번째 창업 이야기</p>', type: '경험 나눔', category: '창업 준비', tags: ['카페', '#카페', '창업'], images: [] });
test('store API is available', () => assert.equal(typeof createStore, 'function'));
test('draft survives a new store instance', () => {
  const storage = new Storage(); const store = createStore(storage);
  store.saveDraft({ title: '작성 중', bodyText: '' });
  assert.equal(createStore(storage).readDraft().title, '작성 중');
  assert.ok(createStore(storage).readDraft().savedAt);
});

test('unselected draft fields remain empty after reload', () => {
  const storage = new Storage(); const store = createStore(storage);
  store.saveDraft({ title: '작성 중', type: '', category: '' });
  const restored = createStore(storage).readDraft();
  assert.equal(restored.type, '');
  assert.equal(restored.category, '');
  store.clearDraft();
  assert.equal(createStore(storage).readDraft(), null);
});
test('publishing persists authored post and clears draft in one write', () => {
  const storage = new Storage(); const store = createStore(storage);
  store.saveDraft(draft()); const post = store.publish(draft());
  const reopened = createStore(storage);
  assert.equal(reopened.getPosts()[0].id, post.id);
  assert.equal(reopened.getPosts()[0].authorId, 'demo-me');
  assert.equal(reopened.getPosts()[0].author, 'misamo_korea');
  assert.equal(JSON.stringify(post.tags), '["카페","창업"]');
  assert.equal(reopened.readDraft(), null);
});
test('empty content and overlong title cannot publish', () => {
  const store = createStore(new Storage());
  assert.throws(() => store.publish({ ...draft(), title: ' ' }));
  assert.throws(() => store.publish({ ...draft(), bodyText: '\n ' }));
  assert.throws(() => store.publish({ ...draft(), title: '가'.repeat(101) }));
  assert.equal(store.getPosts().length, 0);
});
test('storage failure preserves saved draft and never creates phantom post', () => {
  const storage = new Storage(); const store = createStore(storage);
  store.saveDraft(draft()); storage.fail = true;
  assert.throws(() => store.publish(draft()), /저장/);
  storage.fail = false;
  assert.equal(store.readDraft().title, '카페 창업 기록');
  assert.equal(store.getPosts().length, 0);
});
test('post comments and edited flags stay isolated across reload', () => {
  const storage = new Storage(); const store = createStore(storage);
  store.saveComments('post-a', { total: 1, comments: [{ id: 'c1', text: '수정한 댓글', edited: true, replies: [] }] });
  const restored = createStore(storage);
  assert.equal(restored.readComments('post-a').comments[0].edited, true);
  assert.equal(restored.readComments('post-b'), null);
});
test('like state is idempotent and independent per post', () => {
  const storage = new Storage(); const store = createStore(storage);
  store.setPostLike('demo-cafe', true); store.setPostLike('demo-cafe', true);
  assert.equal(store.getPostLike('demo-cafe').count, 125);
  assert.equal(store.getPostLike('new-post').count, 0);
  store.setPostLike('new-post', true);
  assert.equal(createStore(storage).getPostLike('new-post').count, 1);
  store.setPostLike('demo-cafe', false);
  assert.equal(store.getPostLike('demo-cafe').count, 124);
});
test('corrupt saved data reports failure without overwriting it', () => {
  const storage = new Storage(); storage.setItem('misamo.prototype.v1', '{broken');
  assert.throws(() => createStore(storage).getPosts(), /저장/);
  assert.equal(storage.getItem('misamo.prototype.v1'), '{broken');
});
test('active or remote image payloads are rejected', () => {
  const store = createStore(new Storage());
  assert.throws(() => store.publish({ ...draft(), images: [{ id: 'bad', src: 'data:image/svg+xml,<svg/>', alt: '' }] }));
  assert.throws(() => store.publish({ ...draft(), images: [{ id: 'bad', src: 'javascript:alert(1)', alt: '' }] }));
});
