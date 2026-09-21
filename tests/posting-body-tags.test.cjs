const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const plain = value => JSON.parse(JSON.stringify(value));
const photo = id => ({ id, src: 'data:image/png;base64,YQ==', alt: id });
const video = () => ({ id: 'ui-video', source: 'indexeddb', name: '매장.mp4', mime: 'video/mp4', size: 1024, width: 1080, height: 1920, duration: 12.5, ratio: '4:3' });
const mixedDraft = (fields = {}) => ({
  title: '첨부 편집 테스트', bodyText: '시작설명마침',
  bodyHtml: '<p>시작</p><img data-image-id="first-photo"><p>설명</p><div data-video-id="ui-video"></div><img data-image-id="second-photo"><p>마침</p>',
  images: [photo('first-photo'), photo('second-photo')], video: video(), tags: [],
  mediaLayout: 'inline', mediaRatio: '4:3',
  mediaOrder: ['image:first-photo', 'video:ui-video', 'image:second-photo'],
  ...fields,
});

function openComposer(t, options = {}) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    url: 'https://misamo.test/#write', runScripts: 'outside-only',
  });
  const w = dom.window;
  t.after(() => w.close());
  w.CSS = { escape: String };
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLMediaElement.prototype.pause = () => {};
  w.HTMLMediaElement.prototype.load = () => {};
  w.URL.createObjectURL = () => 'blob:https://misamo.test/media-ui';
  w.URL.revokeObjectURL = () => {};
  w.crypto.randomUUID = randomUUID;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.misamoNavigate = view => w.dispatchEvent(new w.CustomEvent('misamo:view', { detail: view }));
  const load = file => w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  load('video-media.js');
  load('media-carousel.js');
  // Only the IndexedDB availability boundary is replaced. Composer, editor,
  // sanitization, draft storage, preview and publication run their real code.
  w.MisamoVideo = { ...w.MisamoVideo, assertAvailable: async () => true };
  for (const file of ['post-store.js', 'post-content.js', 'editor-media.js']) load(file);
  if (options.savedState) w.localStorage.setItem('misamo.prototype.v1', options.savedState);
  else w.MisamoStore.saveDraft(options.draft || mixedDraft());
  for (const file of ['posting.js', 'community-data.js', 'reading.js']) load(file);
  return w;
}

const editor = w => w.document.querySelector('[data-post-editor]');
const marker = w => editor(w).querySelector('div[data-video-id="ui-video"]');
function save(w) { w.document.querySelector('[data-save-draft]').click(); return w.MisamoStore.readDraft(); }
function command(w, value) { w.document.querySelector(`[data-editor-command="${value}"]`).click(); }
function select(w, node, value) {
  assert.ok(node, 'Expected an accessible media select');
  node.value = value;
  // Native SELECT interactions emit input before change. Both bubble through
  // the contenteditable wrapper when this is an inline video control.
  node.dispatchEvent(new w.Event('input', { bubbles: true }));
  node.dispatchEvent(new w.Event('change', { bubbles: true }));
}
async function publish(w) {
  w.document.querySelector('[data-publish-post]').click();
  await flush();
  const post = w.MisamoStore.getPosts()[0];
  assert.ok(post, 'Publication creates a stored post');
  return { post, card: w.document.querySelector(`[data-post-id="${post.id}"]`) };
}
function savedVideoMarker(w) {
  const content = w.document.createElement('template');
  content.innerHTML = save(w).bodyHtml;
  return content.content.querySelector('div[data-video-id="ui-video"]');
}


function body(w, html) {
  editor(w).innerHTML=html;
  editor(w).dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText'}));
}
function tagValues(w) { return [...w.document.querySelectorAll('[data-tag-list] button')].map(button=>button.getAttribute('aria-label').replace(/ 태그 삭제$/,'')); }
function emptyDraft() { return {title:'태그 테스트',bodyHtml:'<p>본문</p>',bodyText:'본문',tags:[],images:[],mediaLayout:'inline'}; }
test('body hashtags add distinct Korean and Latin tags and never collect URL fragments or attachment metadata', t=>{
 const w=openComposer(t,{draft:emptyDraft()});
 body(w,'<p>#하루살이 #하루살이, #cafe_2026!</p><p>#둘째</p><p>https://example.com/#anchor 글#아님</p>');
 assert.deepEqual(tagValues(w),['하루살이','cafe_2026','둘째']);
 body(w,'<p>#하루살이수정 #cafe_2026</p>');
 assert.deepEqual(tagValues(w),['cafe_2026','하루살이수정']);
});
test('removing an automatic tag keeps body untouched and stays suppressed across save, publish and edit',async t=>{
 const w=openComposer(t,{draft:emptyDraft()}); body(w,'<p>오늘은 #하루살이 #카페</p>');
 const html=editor(w).innerHTML;
 w.document.querySelector('[aria-label="하루살이 태그 삭제"]').click();
 assert.equal(editor(w).innerHTML,html);
 body(w,html+'<p>다음 문단</p>'); assert.deepEqual(tagValues(w),['카페']);
 save(w);
 const restored=openComposer(t,{savedState:w.localStorage.getItem('misamo.prototype.v1')});
 assert.deepEqual(tagValues(restored),['카페']);
 const {post}=await publish(restored);
 assert.ok(post.bodyHtml.includes('#하루살이')); assert.deepEqual(plain(post.tags),['카페']);
 restored.MisamoPosting.editPost(post.id);
 body(restored,editor(restored).innerHTML+'<p>수정한 문단</p>');
 assert.deepEqual(tagValues(restored),['카페']);
 restored.document.querySelector('[aria-label="카페 태그 삭제"]').click();
 restored.document.querySelector('[data-publish-post]').click(); await flush();
 restored.MisamoPosting.editPost(post.id);
 assert.deepEqual(tagValues(restored),[]);
 const input=restored.document.querySelector('[data-tag-input]');input.value='하루살이';input.dispatchEvent(new restored.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 assert.deepEqual(tagValues(restored),['하루살이']);
});
test('Korean composition does not add unfinished syllables, manual tags survive body changes, and tags cap at ten',t=>{
 const w=openComposer(t,{draft:emptyDraft()});
 editor(w).dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true}));body(w,'<p>#ㅎ</p>');
 assert.deepEqual(tagValues(w),[]);
 editor(w).innerHTML='<p>#하루살이</p>';editor(w).dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true}));
 assert.deepEqual(tagValues(w),['하루살이']);
 const input=w.document.querySelector('[data-tag-input]');input.value='수동';input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 body(w,'<p>'+Array.from({length:15},(_,i)=>'#태그'+i).join(' ')+'</p>');
 assert.equal(tagValues(w).length,10);assert.equal(tagValues(w)[0],'수동');
 body(w,'<p>태그 없는 본문</p>');assert.deepEqual(tagValues(w),['수동']);
});
