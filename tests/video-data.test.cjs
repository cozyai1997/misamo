const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { createMisamoStore } = require('../post-store.js');

const POST_KEY = 'misamo.prototype.v1';
const COMMUNITY_KEY = 'misamo.community.v1';
const plain = value => JSON.parse(JSON.stringify(value));
const draft = video => ({ title: '동영상 창업 기록', bodyText: '매장 소개', bodyHtml: '<p>매장 소개</p>', images: [], video });
const video = (fields = {}) => ({ id: 'video-first', source: 'indexeddb', name: '매장.mp4', mime: 'video/mp4', size: 1024, width: 1920, height: 1080, duration: 12.5, ratio: '4:3', ...fields });

class Storage {
  constructor() { this.values = new Map(); this.writes = 0; this.fail = false; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) {
    if (this.fail) throw new Error('QuotaExceededError');
    this.writes += 1;
    this.values.set(key, value);
  }
}

function boot(saved = {}, withVideo = true) {
  const dom = new JSDOM('', { url: 'https://example.test', runScripts: 'outside-only' });
  const w = dom.window;
  for (const [key, value] of Object.entries(saved)) if (value !== null) w.localStorage.setItem(key, value);
  const files = [...(withVideo ? ['video-media.js'] : []), 'post-store.js', 'post-content.js', 'community-data.js'];
  for (const file of files) w.eval(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
  return w;
}

function snapshot(w) {
  return { [POST_KEY]: w.localStorage.getItem(POST_KEY), [COMMUNITY_KEY]: w.localStorage.getItem(COMMUNITY_KEY) };
}

test('video draft metadata survives reopening and excludes binary and temporary playback data', () => {
  const storage = new Storage();
  const source = video({ blob: new Blob(['video']), objectUrl: 'blob:https://example.test/temporary', bytes: [1, 2, 3], extra: 'unused' });
  const saved = createMisamoStore(storage).saveDraft(draft(source));
  assert.deepEqual(saved.video, video());
  source.ratio = '1:1';
  const restored = createMisamoStore(storage).readDraft();
  assert.deepEqual(restored.video, video());
  assert.doesNotMatch(storage.getItem(POST_KEY), /blob:|objectUrl|bytes|unused/);
});

test('publishing a video preserves its metadata and clears its draft in one write', () => {
  const storage = new Storage();
  const store = createMisamoStore(storage);
  const data = draft(video({ ratio: '16:9' }));
  store.saveDraft(data);
  const beforeWrites = storage.writes;
  const published = store.publish(data);
  assert.equal(storage.writes, beforeWrites + 1);
  assert.deepEqual(published.video, data.video);
  const reopened = createMisamoStore(storage);
  assert.equal(reopened.readDraft(), null);
  assert.deepEqual(reopened.getPosts()[0].video, data.video);
});

test('validated local asset videos retain their durable source', () => {
  const storage = new Storage();
  const source = video({ id: 'video-asset', source: 'asset', src: 'assets/local-test-media/shop-tour.webm', name: 'shop-tour.webm', mime: 'video/webm' });
  const published = createMisamoStore(storage).publish(draft(source));
  assert.deepEqual(published.video, source);
  assert.deepEqual(createMisamoStore(storage).getPosts()[0].video, source);
});

test('invalid video drafts and publishes leave existing records byte-identical', () => {
  const storage = new Storage();
  const store = createMisamoStore(storage);
  store.publish(draft(video()));
  store.saveDraft({ title: '남겨 둘 초안', video: null });
  const saved = storage.getItem(POST_KEY);
  const writes = storage.writes;
  const invalid = [
    video({ ratio: '3:2' }),
    video({ size: 100 * 1024 * 1024 + 1 }),
    video({ width: 0 }),
    video({ duration: Infinity }),
    video({ source: 'asset', src: 'https://example.test/clip.mp4' }),
    video({ source: 'asset', src: 'assets/local-test-media/../../clip.mp4' }),
    video({ source: 'asset', src: 'blob:https://example.test/clip' }),
  ];
  for (const record of invalid) {
    assert.throws(() => store.saveDraft(draft(record)), /동영상|영상|비율|용량|파일|형식/);
    assert.throws(() => store.publish(draft(record)), /동영상|영상|비율|용량|파일|형식/);
    assert.equal(storage.getItem(POST_KEY), saved);
  }
  assert.equal(storage.writes, writes);
});

test('post storage failure retains the video draft without a phantom publication', () => {
  const storage = new Storage();
  const store = createMisamoStore(storage);
  const data = draft(video());
  store.saveDraft(data);
  const saved = storage.getItem(POST_KEY);
  storage.fail = true;
  assert.throws(() => store.publish(data), /저장/);
  assert.equal(storage.getItem(POST_KEY), saved);
  assert.deepEqual(store.readDraft().video, data.video);
  assert.equal(store.getPosts().length, 0);
});

test('without the video module text posts work and video writes fail with a clear error', () => {
  const sandbox = { module: { exports: {} }, crypto: require('node:crypto').webcrypto };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'post-store.js'), 'utf8'), sandbox);
  const storage = new Storage();
  const store = sandbox.module.exports.createMisamoStore(storage);
  store.saveDraft({ title: '텍스트 초안' });
  assert.equal(store.readDraft().video, null);
  store.publish(draft(null));
  const saved = storage.getItem(POST_KEY);
  assert.throws(() => store.saveDraft(draft(video())), /동영상 처리 기능/);
  assert.throws(() => store.publish(draft(video())), /동영상 처리 기능/);
  assert.equal(storage.getItem(POST_KEY), saved);
});

test('community normalization and unrelated edits preserve video metadata after reload', t => {
  const w = boot(); t.after(() => w.close());
  const published = w.MisamoStore.publish(draft(video()));
  w.MisamoStore.saveDraft({ title: '다른 초안' });
  const originalPosts = w.localStorage.getItem(POST_KEY);
  assert.deepEqual(plain(w.MisamoCommunity.post(published.id).video), video());
  w.MisamoCommunity.updatePost(published.id, { title: '수정한 제목' });
  assert.equal(w.localStorage.getItem(POST_KEY), originalPosts);
  const reloaded = boot(snapshot(w)); t.after(() => reloaded.close());
  assert.deepEqual(plain(reloaded.MisamoCommunity.post(published.id).video), video());
  assert.deepEqual(plain(reloaded.MisamoStore.getPosts()[0].video), video());
  assert.equal(reloaded.MisamoStore.getPosts()[0].title, '수정한 제목');
});

test('community edits replace and explicitly remove video without changing original posts or draft', t => {
  const w = boot(); t.after(() => w.close());
  const published = w.MisamoStore.publish(draft(video()));
  w.MisamoStore.saveDraft({ title: '보존할 초안', video: video() });
  const originalPosts = w.localStorage.getItem(POST_KEY);
  const replacement = video({ id: 'video-replacement', name: '새 매장.webm', mime: 'video/webm', ratio: '1:1' });
  const edited = w.MisamoCommunity.updatePost(published.id, { video: { ...replacement, objectUrl: 'blob:temporary', blob: new w.Blob(['new']) } });
  assert.deepEqual(plain(edited.video), replacement);
  assert.deepEqual(plain(w.MisamoStore.getPosts()[0].video), replacement);
  assert.doesNotMatch(w.localStorage.getItem(COMMUNITY_KEY), /blob:|objectUrl/);
  const reloaded = boot(snapshot(w)); t.after(() => reloaded.close());
  assert.deepEqual(plain(reloaded.MisamoCommunity.post(published.id).video), replacement);
  reloaded.MisamoCommunity.updatePost(published.id, { video: null });
  reloaded.MisamoCommunity.updatePost(published.id, { category: '창업 준비' });
  assert.equal(reloaded.MisamoStore.getPosts()[0].video, null);
  assert.equal(reloaded.localStorage.getItem(POST_KEY), originalPosts);
  const removed = boot(snapshot(reloaded)); t.after(() => removed.close());
  assert.equal(removed.MisamoCommunity.post(published.id).video, null);
});

test('invalid video edits do not persist partial fields, activity or change events', t => {
  const w = boot(); t.after(() => w.close());
  const published = w.MisamoStore.publish(draft(video()));
  w.MisamoCommunity.updatePost(published.id, { industry: '외식·카페' });
  const saved = snapshot(w);
  let events = 0;
  w.addEventListener('misamo:community-change', () => events++);
  assert.throws(() => w.MisamoCommunity.updatePost(published.id, { title: '저장되면 안 됨', video: video({ size: -1 }) }));
  assert.deepEqual(snapshot(w), saved);
  assert.equal(events, 0);
  assert.equal(w.MisamoCommunity.post(published.id).title, published.title);
});

test('community storage failure preserves the previous video and emits no success event', t => {
  const w = boot(); t.after(() => w.close());
  const published = w.MisamoStore.publish(draft(video()));
  const saved = snapshot(w);
  let events = 0;
  w.addEventListener('misamo:community-change', () => events++);
  w.Storage.prototype.setItem = () => { throw new Error('quota'); };
  assert.throws(() => w.MisamoCommunity.updatePost(published.id, { video: video({ id: 'replacement' }) }), /저장/);
  assert.deepEqual(snapshot(w), saved);
  assert.deepEqual(plain(w.MisamoCommunity.post(published.id).video), video());
  assert.equal(events, 0);
});

test('missing video module allows existing video preservation and explicit removal only', t => {
  const w = boot(); t.after(() => w.close());
  const published = w.MisamoStore.publish(draft(video()));
  const reloaded = boot(snapshot(w), false); t.after(() => reloaded.close());
  reloaded.MisamoCommunity.updatePost(published.id, { title: '제목 변경' });
  assert.deepEqual(plain(reloaded.MisamoCommunity.post(published.id).video), video());
  const saved = snapshot(reloaded);
  assert.throws(() => reloaded.MisamoCommunity.updatePost(published.id, { video: video({ id: 'replacement' }) }), /동영상 처리 기능/);
  assert.deepEqual(snapshot(reloaded), saved);
  reloaded.MisamoCommunity.updatePost(published.id, { video: null });
  assert.equal(reloaded.MisamoCommunity.post(published.id).video, null);
});
