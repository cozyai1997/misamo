const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
function boot(saved = {}) {
  const dom = new JSDOM('<article class="post-card" data-post-id="demo-cafe" data-author-id="startup-hello"><header class="post-head"><strong>startup_hello</strong></header><div class="post-copy"><h2>Cafe</h2><p>Story</p></div></article>', { url: 'https://example.test', runScripts: 'outside-only' });
  const w = dom.window;
  for (const [key, value] of Object.entries(saved)) w.localStorage.setItem(key, value);
  for (const file of ['post-store.js', 'post-content.js', 'community-data.js']) w.eval(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
  return w;
}
function own(w) { return w.MisamoStore.publish({ title: 'Owned', bodyText: 'Body', bodyHtml: '<p>Body<img data-image-id="pic"></p>', images: [{ id: 'pic', src: 'data:image/png;base64,YWJj', alt: 'Photo' }] }); }
test('community changes persist and report concrete events without seed activity', () => {
  const w = boot(); const c = w.MisamoCommunity; let event;
  w.addEventListener('misamo:community-change', e => event = e.detail);
  assert.equal(c.state().activity.length, 0);
  assert.equal(c.toggleFollow('startup-hello'), true);
  assert.equal(event.id, 'startup-hello');
  const next = boot({ 'misamo.community.v1': w.localStorage.getItem('misamo.community.v1') });
  assert.equal(next.MisamoCommunity.state().following[0], 'startup-hello');
});
test('hidden, snoozed, blocked and deleted exclusions can be restored', () => {
  const w = boot(); const c = w.MisamoCommunity;
  c.hidePost('demo-cafe'); assert.equal(c.posts().length, 0); assert.ok(c.post('demo-cafe'));
  c.restorePost('demo-cafe'); c.snoozeAuthor('startup-hello'); assert.equal(c.posts().length, 0);
  c.unsnoozeAuthor('startup-hello'); c.blockAuthor('startup-hello'); assert.equal(c.posts().length, 0);
  c.unblockAuthor('startup-hello'); assert.equal(c.posts().length, 1);
  const p = own(w); c.deletePost(p.id); assert.equal(c.post(p.id), null); assert.equal(w.MisamoStore.getPosts().length, 0);
  c.restoreDeleted(p.id); assert.ok(c.post(p.id));
});
test('corrupt and blocked storage fail closed without destructive reset or event', () => {
  const w = boot({ 'misamo.community.v1': '{broken' });
  assert.throws(() => w.MisamoCommunity.state(), /저장/);
  assert.throws(() => w.MisamoCommunity.toggleFollow('startup-hello'), /저장/);
  assert.equal(w.localStorage.getItem('misamo.community.v1'), '{broken');
  const next = boot(); let fired = false;
  next.addEventListener('misamo:community-change', () => fired = true);
  next.Storage.prototype.setItem = () => { throw new Error('quota'); };
  assert.throws(() => next.MisamoCommunity.hidePost('demo-cafe'), /저장/);
  assert.equal(fired, false); assert.equal(next.MisamoCommunity.state().hidden.length, 0);
});
test('owned edits preserve images, sanitize HTML and leave original posts and drafts byte-identical', () => {
  const w = boot(); const p = own(w); w.MisamoStore.saveDraft({ title: 'Unrelated draft' });
  const original = w.localStorage.getItem('misamo.prototype.v1');
  const c = w.MisamoCommunity;
  assert.throws(() => c.updatePost('demo-cafe', { title: 'No' }), /본인/);
  assert.throws(() => c.deletePost('demo-cafe'), /본인/);
  c.updatePost(p.id, { title: 'Edited', bodyHtml: '<p>Safe<img data-image-id="pic"></p><script>bad()</script>' });
  assert.equal(c.post(p.id).images[0].id, 'pic'); assert.match(c.post(p.id).bodyHtml, /data-image-id/);
  assert.doesNotMatch(c.post(p.id).bodyHtml, /script/); assert.equal(w.MisamoStore.getPosts()[0].title, 'Edited');
  assert.equal(w.localStorage.getItem('misamo.prototype.v1'), original);
  const reload = boot({ 'misamo.prototype.v1': original, 'misamo.community.v1': w.localStorage.getItem('misamo.community.v1') });
  assert.equal(reload.MisamoStore.getPosts()[0].title, 'Edited');
});
test('local messages and registrations are real local records with read state', () => {
  const c = boot().MisamoCommunity;
  assert.throws(() => c.sendMessage('startup-hello', ' '));
  const m = c.sendMessage('startup-hello', 'Hello', 'demo-cafe'); assert.equal(m.text, 'Hello');
  assert.equal(c.state().messages.length, 1);
  const r = c.register('seminar-start', 'My question'); c.register('seminar-start'); assert.equal(c.state().registrations.length, 1);
  assert.equal(r.details, 'My question'); assert.throws(() => c.register('another', 'x'.repeat(2001)));
  assert.equal(r.serviceId, 'seminar-start'); c.cancelRegistration('seminar-start'); assert.equal(c.state().registrations.length, 0);
  const a = c.state().activity[0]; c.markRead(a.id); assert.equal(c.state().activity[0].read, true);
  c.updateProfile({ name: 'New name', bio: 'Bio', id: 'not-me' }); assert.equal(c.profile('demo-me').id, 'demo-me');
});
test('structurally corrupt state is rejected and fresh publishes remain visible', () => {
  const w = boot(); const c = w.MisamoCommunity;
  const state = c.state(); state.following = {};
  w.localStorage.setItem('misamo.community.v1', JSON.stringify(state));
  assert.throws(() => c.posts(), /저장/);
  w.localStorage.removeItem('misamo.community.v1');
  const p = own(w); assert.ok(c.post(p.id));
  const detached = c.post(p.id); detached.images.length = 0;
  assert.equal(c.post(p.id).images.length, 1);
});
