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

test('editor cards block navigation and expose a dismissible link menu without changing saved content', () => {
  const dom=openComposer();const w=dom.window;
  try {
    const editor=w.document.querySelector('[data-post-editor]');
    editor.innerHTML=w.MisamoContent.renderHtml(w.MisamoContent.linkCard({url:'https://example.com/',title:'Card'}),[]);
    const card=editor.querySelector('a');
    const saved=w.MisamoContent.sanitizeHtml(editor.innerHTML);
    for(const type of ['click','auxclick']) {
      const event=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:type==='click'?0:1});
      card.dispatchEvent(event);assert.equal(event.defaultPrevented,true);
    }
    const context=new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:900,clientY:700});
    card.querySelector('span').dispatchEvent(context);assert.equal(context.defaultPrevented,true);
    const menu=w.document.querySelector('[data-link-context-menu]');
    assert.ok(menu && !menu.hidden);
    const link=menu.querySelector('a');assert.equal(link.textContent,'링크 보기');assert.equal(link.href,'https://example.com/');assert.equal(link.rel,'noopener noreferrer');
    assert.equal(w.MisamoContent.sanitizeHtml(editor.innerHTML),saved);
    w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert.equal(menu.hidden,true);
    const textContext=new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true});
    editor.dispatchEvent(textContext);assert.equal(textContext.defaultPrevented,false);
    card.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
    w.document.body.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));assert.equal(menu.hidden,true);
    const preview=w.document.createElement('div');preview.innerHTML=card.outerHTML;w.document.body.append(preview);
    const normalClick=new w.MouseEvent('click',{bubbles:true,cancelable:true});
    preview.querySelector('a').addEventListener('click',e=>{assert.equal(e.defaultPrevented,false);e.preventDefault();});
    preview.querySelector('a').dispatchEvent(normalClick);
  }finally{w.close();}
});

test('a standalone pasted URL becomes a persistent card with undo and redo', async () => {
  const dom=openComposer();const w=dom.window;
  try {
    const editor=w.document.querySelector('[data-post-editor]');
    editor.innerHTML='<p><br></p>';
    editor.dispatchEvent(new w.Event('input',{bubbles:true}));
    const range=w.document.createRange();range.setStart(editor.firstChild,0);range.collapse(true);
    w.getSelection().removeAllRanges();w.getSelection().addRange(range);
    w.fetch=async()=>({ok:true,json:async()=>({url:'https://example.com/',title:'Example title',description:'Preview description',image:''})});
    const paste=new w.Event('paste',{bubbles:true,cancelable:true});
    Object.defineProperty(paste,'clipboardData',{value:{getData:()=> 'https://example.com/'}});
    editor.dispatchEvent(paste);
    assert.match(w.MisamoStore.readDraft().bodyHtml,/https:\/\/example.com\//,'Address is saved before the metadata request resolves');
    await new Promise(resolve=>setTimeout(resolve,20));
    assert.equal(editor.querySelector('.posting-link-title')?.textContent,'Example title');
    w.document.querySelector('[data-save-draft]').click();
    assert.match(w.MisamoStore.readDraft().bodyHtml,/data-link-card="1"/);
    w.document.querySelector('[data-editor-command="undo"]').click();
    assert.equal(editor.querySelector('.posting-link-card'),null);
    w.document.querySelector('[data-editor-command="redo"]').click();
    assert.equal(editor.querySelector('.posting-link-title')?.textContent,'Example title');
  } finally {w.close();}
});

test('failed preview keeps the pasted address and sentence pastes never fetch', async () => {
  const dom=openComposer();const w=dom.window;
  try {
    const editor=w.document.querySelector('[data-post-editor]');
    editor.innerHTML='<p><br></p>';editor.dispatchEvent(new w.Event('input',{bubbles:true}));
    const range=w.document.createRange();range.setStart(editor.firstChild,0);range.collapse(true);
    w.getSelection().removeAllRanges();w.getSelection().addRange(range);
    let requests=0;w.fetch=async()=>{requests++;throw new Error('Unavailable');};
    const paste=text=>{const event=new w.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{value:{getData:()=>text}});editor.dispatchEvent(event);};
    paste('https://example.com/');await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(editor.querySelector('a').textContent,'https://example.com/');
    assert.equal(editor.querySelector('.posting-link-card'),null);
    paste('추천 https://example.com/ 입니다');
    assert.equal(requests,1);assert.match(editor.textContent,/추천 https:\/\/example.com\/ 입니다/);
  }finally{w.close();}
});

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
    editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Delete',bubbles:true,cancelable:true}));
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
    w.document.querySelector('[data-post-editor]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Delete',bubbles:true,cancelable:true}));
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
test('Delete removes a selected photo and keyboard undo/redo restores the photo source', t=>{
  const dom=openComposer(),w=dom.window,d=w.document;t.after(()=>w.close());
  const editor=d.querySelector('[data-post-editor]');
  assert.equal(d.querySelector('[data-media-delete]'),null);
  editor.querySelector('img').click();
  const key=(key,extra={})=>editor.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra}));
  key('Delete');assert.equal(editor.querySelector('img'),null);
  key('z',{ctrlKey:true});assert.equal(editor.querySelector('img')?.getAttribute('src'),photo.src);
  key('y',{ctrlKey:true});assert.equal(editor.querySelector('img'),null);
  key('z',{ctrlKey:true});d.querySelector('[data-save-draft]').click();
  assert.equal(w.MisamoStore.readDraft().images[0].src,photo.src);
});
test('toolbar undo and redo restore photo movement and alignment in chronological order',t=>{
  const dom=openComposer(),w=dom.window,d=w.document;t.after(()=>w.close());
  const editor=insertBetweenWords(w);
  d.querySelector('[data-editor-align="right"]').click();
  d.querySelector('[data-editor-command="undo"]').click();
  assert.equal(editor.querySelector('img').dataset.align,undefined);
  assert.equal(editor.querySelector('img').previousSibling.textContent,'앞');
  d.querySelector('[data-editor-command="undo"]').click();
  assert.equal(editor.querySelector('img').parentElement,editor);
  d.querySelector('[data-editor-command="redo"]').click();
  assert.equal(editor.querySelector('img').previousSibling.textContent,'앞');
  d.querySelector('[data-editor-command="redo"]').click();
  assert.equal(editor.querySelector('img').dataset.align,'right');
});
test('typing after undo clears redo and does not lose the restored image',t=>{
  const dom=openComposer(),w=dom.window,d=w.document;t.after(()=>w.close());
  const editor=d.querySelector('[data-post-editor]');editor.querySelector('img').click();
  editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Delete',bubbles:true,cancelable:true}));
  d.querySelector('[data-editor-command="undo"]').click();
  editor.querySelector('p').append('새 글');editor.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText'}));
  assert.equal(d.querySelector('[data-editor-command="redo"]').disabled,true);
  d.querySelector('[data-editor-command="undo"]').click();
  assert.equal(editor.textContent,'앞뒤');assert.ok(editor.querySelector('img'));
});
test('history buttons work when browser selection is outside the editor',t=>{
  const dom=openComposer(),w=dom.window,d=w.document;t.after(()=>w.close());
  const editor=insertBetweenWords(w),range=d.createRange();
  range.selectNodeContents(d.querySelector('h1'));w.getSelection().removeAllRanges();w.getSelection().addRange(range);
  d.querySelector('[data-editor-command="undo"]').click();
  assert.equal(editor.querySelector('img').parentElement,editor);
});
test('one resize gesture is one undo step and redo retains percentage width',t=>{
  const dom=openComposer(),w=dom.window,d=w.document;t.after(()=>w.close());
  const editor=d.querySelector('[data-post-editor]'),img=editor.querySelector('img');
  editor.getBoundingClientRect=()=>({width:800});img.getBoundingClientRect=()=>({width:400,height:200,left:0,top:0});img.click();
  d.querySelector('[data-media-resize="se"]').dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,button:0,clientX:400,clientY:200}));
  for(const x of [360,320,280]) d.dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:x,clientY:200}));
  d.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));
  const width=img.dataset.imageWidth;assert.ok(Number(width)<50);
  d.querySelector('[data-editor-command="undo"]').click();assert.equal(editor.querySelector('img').dataset.imageWidth,undefined);
  d.querySelector('[data-editor-command="redo"]').click();assert.equal(editor.querySelector('img').dataset.imageWidth,width);
});
test('IME composition records completed text as one reversible operation',t=>{
  const dom=openComposer(),w=dom.window,d=w.document;t.after(()=>w.close());
  const editor=d.querySelector('[data-post-editor]'),p=editor.querySelector('p');
  editor.dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true}));
  p.textContent='앞뒤ㅎ';editor.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertCompositionText',isComposing:true}));
  p.textContent='앞뒤한';editor.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertCompositionText',isComposing:true}));
  editor.dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true,data:'한'}));
  d.querySelector('[data-editor-command="undo"]').click();assert.equal(editor.textContent,'앞뒤');
  d.querySelector('[data-editor-command="redo"]').click();assert.equal(editor.textContent,'앞뒤한');assert.ok(editor.querySelector('img'));
});
test('plain text paste replaces selected range, keeps line breaks and supports undo',t=>{
  const dom=openComposer(),w=dom.window,d=w.document;t.after(()=>w.close());
  const editor=d.querySelector('[data-post-editor]'),range=d.createRange();
  range.setStart(editor.querySelector('p').firstChild,1);range.setEnd(editor.querySelector('p').firstChild,2);
  w.getSelection().removeAllRanges();w.getSelection().addRange(range);
  const event=new w.Event('paste',{bubbles:true,cancelable:true});
  Object.defineProperty(event,'clipboardData',{value:{getData:type=>type==='text/plain'?'복사\n<문장>':''}});
  editor.dispatchEvent(event);
  assert.equal(editor.textContent,'앞복사<문장>');assert.equal(editor.querySelectorAll('p br').length,1);
  assert.ok(editor.querySelector('img'));
  d.querySelector('[data-editor-command="undo"]').click();assert.equal(editor.textContent,'앞뒤');
  d.querySelector('[data-editor-command="redo"]').click();assert.equal(editor.textContent,'앞복사<문장>');
});
