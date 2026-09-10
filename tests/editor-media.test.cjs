const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
function setup(t) {
  const dom = new JSDOM('<div id="toolbar"><button data-editor-align="left"></button><button data-editor-align="center"></button><button data-editor-align="right"></button></div><div id="surface"><div id="editor" contenteditable="true"><p>앞</p><img data-image-id="one" data-image-width="50"><p>뒤</p></div></div>', { runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window, d = w.document, editor = d.querySelector('#editor');
  const file = path.join(__dirname, '..', 'editor-media.js');
  if (fs.existsSync(file)) w.eval(fs.readFileSync(file, 'utf8'));
  assert.equal(typeof w.createMisamoEditor, 'function', 'interactive editor available');
  // JSDOM supplies the real DOM, but has no geometry or OS drag data. Supply these boundaries only.
  editor.getBoundingClientRect = () => ({ x:0,y:0,left:0,top:0,right:800,bottom:600,width:800,height:600 });
  editor.querySelector('img').getBoundingClientRect = () => ({ left:0,top:40,right:400,bottom:240,width:400,height:200 });
  const changes = [], files = [];
  const api = w.createMisamoEditor({ editor, toolbar:d.querySelector('#toolbar'), onChange:()=>changes.push(true), onFiles:(list,range)=>files.push({list,range}), onDelete:id=>{editor.querySelector('img').remove();changes.push(id);} });
  const transfer = { types:['application/x-misamo-image'], files:[], data:{}, setData(k,v){this.data[k]=v;}, getData(k){return this.data[k]||'';} };
  function drag(target,type,x=100,y=590) { const e=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{dataTransfer:{value:transfer},clientX:{value:x},clientY:{value:y}});target.dispatchEvent(e);return e; }
  return { w,d,editor,api,changes,files,transfer,drag };
}
test('selecting a photo allows alignment and deletion without editor control text in the body', t=>{
  const {d,editor,changes}=setup(t);
  editor.querySelector('img').click();
  d.querySelector('[data-editor-align="right"]').click();
  assert.equal(editor.querySelector('img').dataset.align,'right');
  assert.equal(editor.textContent,'앞뒤');
  editor.dispatchEvent(new d.defaultView.KeyboardEvent('keydown',{key:'Delete',bubbles:true,cancelable:true}));
  assert.equal(editor.querySelector('img'),null);
  assert.ok(changes.length);
});
test('paragraph alignment applies to the selected paragraph rather than all content', t=>{
  const {w,d,editor}=setup(t); const range=d.createRange();range.selectNodeContents(editor.querySelector('p'));
  w.getSelection().addRange(range);d.dispatchEvent(new w.Event('selectionchange'));
  d.querySelector('[data-editor-align="center"]').click();
  assert.equal(editor.querySelector('p').dataset.align,'center');
  assert.equal(editor.querySelectorAll('p')[1].dataset.align,undefined);
});
test('dragging an existing image moves the same node and retains size and alignment', t=>{
  const {d,editor,drag}=setup(t);const img=editor.querySelector('img');img.dataset.align='right';
  const range=d.createRange();range.selectNodeContents(editor);range.collapse(false);
  d.caretRangeFromPoint=()=>range;
  drag(img,'dragstart');drag(editor,'dragover');drag(editor,'drop');
  assert.equal(editor.lastChild,img);assert.equal(editor.querySelectorAll('img').length,1);
  assert.equal(img.dataset.imageWidth,'50');assert.equal(img.dataset.align,'right');
});
test('alignment targets direct text in a nested block without changing unrelated paragraphs', t=>{
  const {w,d,editor}=setup(t);
  editor.innerHTML='<div>outer<div>inner</div></div><p>last</p>';
  const range=d.createRange();range.setStart(editor.firstChild.firstChild,2);range.collapse(true);
  w.getSelection().addRange(range);d.dispatchEvent(new w.Event('selectionchange'));
  d.querySelector('[data-editor-align="center"]').click();
  assert.equal(editor.firstChild.dataset.align,'center');
  assert.equal(editor.lastChild.dataset.align,undefined);
  assert.equal(editor.firstChild.lastChild.style.textAlign,'left');
});
test('keyboard caret navigation clears photo selection before text deletion', t=>{
  const {w,editor}=setup(t);const img=editor.querySelector('img');img.click();
  editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
  editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Backspace',bubbles:true}));
  assert.equal(editor.querySelector('img'),img);
});
test('file drops route actual files and insertion range to the upload boundary', t=>{
  const {w,editor,files,transfer,drag}=setup(t);
  transfer.types=['Files'];transfer.files=[new w.File(['x'],'photo.png',{type:'image/png'})];
  const e=drag(editor,'drop');assert.equal(e.defaultPrevented,true);
  assert.equal(files.length,1);assert.equal(files[0].list[0].name,'photo.png');
  assert.ok(editor.contains(files[0].range.startContainer));
});
test('pointer resizing stores a bounded percentage width without forcing height', t=>{
  const {w,d,editor,changes}=setup(t);const img=editor.querySelector('img');img.click();
  const handle=d.querySelector('[data-media-resize="se"]');
  handle.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,clientX:400,clientY:240,button:0}));
  d.dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:200,clientY:140}));
  d.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));
  assert.equal(img.dataset.imageWidth,'25');assert.equal(img.style.width,'25%');
  assert.ok(!img.style.height || img.style.height==='auto');assert.ok(changes.length);
});
test('drag appearance resets on cancellation and after dropping between words', t=>{
  const {w,d,editor,drag}=setup(t);const img=editor.querySelector('img');
  drag(img,'dragstart');
  assert.ok(img.classList.contains('is-dragging'));
  drag(img,'dragend');assert.equal(img.classList.contains('is-dragging'),false);
  const paragraph=editor.querySelector('p');paragraph.textContent='앞글뒷글';
  const range=d.createRange();range.setStart(paragraph.firstChild,2);range.collapse(true);d.caretRangeFromPoint=()=>range;
  drag(img,'dragstart');drag(editor,'drop');
  assert.equal(img.classList.contains('is-dragging'),false);
  assert.equal(paragraph.childNodes[0].textContent,'앞글');
  assert.equal(paragraph.childNodes[1],img);
  assert.equal(paragraph.childNodes[2].textContent,'뒷글');
  const caret=w.getSelection().getRangeAt(0);
  assert.equal(caret.startContainer,paragraph);assert.equal(caret.startOffset,2);
});
test('text drop shows a vertical caret at the exact insertion character', t=>{
  const {d,editor,drag}=setup(t);const p=editor.querySelector('p');p.textContent='앞뒤';
  const range=d.createRange();range.setStart(p.firstChild,1);range.collapse(true);
  range.getBoundingClientRect=()=>({left:120,top:20,bottom:40,height:20});d.caretRangeFromPoint=()=>range;
  drag(editor.querySelector('img'),'dragstart');drag(p,'dragover',120,30);
  const line=d.querySelector('.media-drop-line');
  assert.equal(line.dataset.kind,'caret');assert.equal(line.style.left,'120px');assert.equal(line.style.height,'20px');
  drag(p,'drop',120,30);assert.equal(p.childNodes[1].tagName,'IMG');
});
test('paragraph gap uses a horizontal boundary and inserts outside text', t=>{
  const {d,editor,drag}=setup(t);const p=editor.querySelector('p');
  p.getBoundingClientRect=()=>({top:20,bottom:40});
  const range=d.createRange();range.setStart(p.firstChild,1);range.collapse(true);
  range.getBoundingClientRect=()=>({left:120,top:20,bottom:40,height:20});d.caretRangeFromPoint=()=>range;
  const img=editor.querySelector('img');drag(img,'dragstart');drag(editor,'dragover',120,48);
  assert.equal(d.querySelector('.media-drop-line').dataset.kind,'block');
  drag(editor,'drop',120,48);assert.equal(img.parentElement,editor);assert.equal(img.previousSibling,p);
});
test('locked editor rejects text and file drops during an image transaction',t=>{
  const {w,editor,transfer,drag,files}=setup(t);editor.setAttribute('contenteditable','false');
  const before=editor.innerHTML;transfer.data['text/plain']='unexpected';drag(editor,'drop');
  assert.equal(editor.innerHTML,before);
  transfer.files=[new w.File(['x'],'x.png',{type:'image/png'})];drag(editor,'drop');
  assert.equal(files.length,0);
});
test('touch selection preserves native behavior and dismisses photo controls',t=>{
  const {w,d,editor}=setup(t);editor.querySelector('img').click();
  const touch=new w.Event('pointerdown',{bubbles:true,cancelable:true});Object.defineProperty(touch,'pointerType',{value:'touch'});
  editor.querySelector('p').dispatchEvent(touch);
  assert.equal(touch.defaultPrevented,false);assert.equal(d.querySelector('.media-selection').hidden,true);
  editor.querySelector('img').click();
  const range=d.createRange();range.selectNodeContents(editor.querySelector('p'));
  w.getSelection().addRange(range);d.dispatchEvent(new w.Event('selectionchange'));
  assert.equal(d.querySelector('.media-selection').hidden,true);
  for(const type of ['contextmenu','selectstart','copy']) {const event=new w.Event(type,{bubbles:true,cancelable:true});editor.dispatchEvent(event);assert.equal(event.defaultPrevented,false);}
});
