const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createMisamoContent } = require('../post-content.js');
const { cleanVideo } = require('../video-media.js');

const record = { id:'video-one', source:'asset', src:'assets/local-test-media/sample.mp4', name:'video.mp4', mime:'video/mp4', size:1200, width:720, height:1280, duration:12, ratio:'9:16' };
function setup(t) {
  const dom = new JSDOM('<div id="toolbar"><button data-editor-align="left"></button><button data-editor-align="center"></button><button data-editor-align="right"></button></div><div id="surface"><div id="editor" contenteditable="true"></div></div>', { runScripts:'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window, d = w.document, editor = d.querySelector('#editor');
  const content = createMisamoContent(d), changes = [], deleted = [];
  w.MisamoVideo = { cleanVideo, release() {}, createFigure() {
    const figure = d.createElement('figure');
    figure.innerHTML = '<video controls></video><button type="button">비율</button><select><option>9:16</option></select>';
    return figure;
  } };
  editor.innerHTML = content.renderHtml('<p>처음 <strong>가운데 마지막</strong> 끝</p><div data-video-id="video-one"></div><p>이후</p>', []);
  content.mountInlineVideo(editor, record);
  w.eval(fs.readFileSync(path.join(__dirname, '..', 'editor-media.js'), 'utf8'));
  const api = w.createMisamoEditor({ editor, toolbar:d.querySelector('#toolbar'), onChange:() => changes.push(true), onFiles() {}, onDelete:id => deleted.push(id) });
  const transfer = { types:['application/x-misamo-image'], files:[], values:{}, setData(k,v) { this.values[k]=v; }, getData(k) { return this.values[k] || ''; } };
  function drag(target, type) {
    const e = new w.Event(type, { bubbles:true, cancelable:true });
    Object.defineProperties(e, { dataTransfer:{value:transfer}, clientX:{value:100}, clientY:{value:100} });
    target.dispatchEvent(e); return e;
  }
  return { w, d, editor, content, api, changes, deleted, transfer, drag, marker:editor.querySelector('div[data-video-id]') };
}

test('inline video selection aligns the marker and identifies it for deletion without resize handles', t => {
  const { w, d, marker, editor, api, deleted } = setup(t);
  assert.equal(marker.draggable, true);
  marker.click();
  assert.equal(api.selectedId(), 'video:video-one');
  assert.equal(d.querySelector('.media-selection').hidden, false);
  assert.ok(Array.from(d.querySelectorAll('[data-media-resize]')).every(handle => handle.hidden));
  for (const align of ['left', 'center', 'right']) {
    d.querySelector(`[data-editor-align="${align}"]`).click();
    assert.equal(marker.dataset.align, align);
    assert.equal(marker.style.marginLeft, align === 'left' ? '0px' : 'auto');
    assert.equal(marker.style.marginRight, align === 'right' ? '0px' : 'auto');
  }
  marker.dispatchEvent(new w.KeyboardEvent('keydown', { key:'Delete', bubbles:true, cancelable:true }));
  assert.deepEqual(deleted, ['video:video-one']);
  assert.ok(editor.contains(marker));
});

test('dragging a video into formatted paragraph text preserves order, formatting, alignment and one marker after reload', t => {
  const { d, editor, marker, content, transfer, drag, api } = setup(t);
  marker.click(); d.querySelector('[data-editor-align="right"]').click();
  const range = d.createRange(); range.setStart(editor.querySelector('strong').firstChild, 4); range.collapse(true);
  d.caretRangeFromPoint = () => range;
  drag(marker, 'dragstart'); drag(editor, 'drop');
  assert.equal(transfer.getData('application/x-misamo-image'), 'video:video-one');
  assert.equal(editor.querySelector('p div[data-video-id]'), null);
  assert.equal(marker.parentElement, editor);
  assert.equal(marker.previousElementSibling.textContent, '처음 가운데 ');
  assert.equal(marker.nextElementSibling.textContent, '마지막 끝');
  assert.equal(marker.previousElementSibling.querySelector('strong').textContent, '가운데 ');
  assert.equal(marker.nextElementSibling.querySelector('strong').textContent, '마지막');
  assert.equal(editor.querySelectorAll('div[data-video-id]').length, 1);
  const saved = content.sanitizeHtml(editor.innerHTML);
  assert.ok(saved.includes('<div data-video-id="video-one" data-align="right"></div>'));
  editor.innerHTML = content.renderHtml(saved, []);
  content.mountInlineVideo(editor, record); api.refresh();
  const loaded = editor.querySelector('div[data-video-id]');
  assert.equal(loaded.dataset.align, 'right');
  assert.equal(loaded.style.marginLeft, 'auto');
  assert.equal(loaded.style.marginRight, '0px');
  assert.equal(loaded.dataset.videoRatio, '9:16');
  assert.equal(editor.querySelectorAll('video').length, 1);
  assert.equal(content.sanitizeHtml(editor.innerHTML), saved);
});

test('video playback and overlay controls keep their keyboard and drag behavior without deleting the selected marker', t => {
  const { w, marker, api, deleted, drag, changes } = setup(t);
  marker.click();
  for (const target of marker.querySelectorAll('video,button,select')) {
    for (const key of ['Delete', 'Backspace', 'ArrowRight']) {
      const event = new w.KeyboardEvent('keydown', { key, bubbles:true, cancelable:true });
      target.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false);
    }
    drag(target, 'dragstart');
    assert.equal(api.isInteracting(), false);
  }
  assert.deepEqual(deleted, []);
  assert.equal(changes.length, 0);
});

test('video moves between existing media and can move to either paragraph boundary without empty blocks or duplicates', t => {
  const { d, editor, marker, drag, content } = setup(t);
  const p = editor.firstElementChild;
  for (const atEnd of [false, true]) {
    const range = d.createRange(); range.selectNodeContents(p); range.collapse(!atEnd);
    d.caretRangeFromPoint = () => range;
    drag(marker, 'dragstart'); drag(editor, 'drop');
    assert.equal(atEnd ? p.nextElementSibling : p.previousElementSibling, marker);
    assert.equal(editor.querySelectorAll('div[data-video-id]').length, 1);
    assert.equal(editor.querySelectorAll('p').length, 2);
    assert.equal(content.sanitizeHtml(editor.innerHTML).includes('<p></p>'), false);
  }
});

test('the explicit video drag handle moves its owning marker and keyboard navigation clears only marker selection', t => {
  const { w, d, marker, editor, api, drag, deleted } = setup(t);
  const handle = d.createElement('button'); handle.dataset.inlineVideoDrag = ''; handle.draggable = true; marker.append(handle);
  const range = d.createRange(); range.selectNodeContents(editor); range.collapse(false); d.caretRangeFromPoint = () => range;
  drag(handle, 'dragstart');
  assert.equal(api.isInteracting(), true);
  drag(editor, 'drop');
  assert.equal(editor.lastElementChild, marker);
  assert.equal(api.isInteracting(), false);
  marker.dispatchEvent(new w.KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true }));
  editor.dispatchEvent(new w.KeyboardEvent('keydown', { key:'Backspace', bubbles:true }));
  assert.deepEqual(deleted, []);
});

test('dropping video into inline formatting in a list item keeps a valid list and text sequence', t => {
  const { d, editor, marker, content, drag } = setup(t);
  editor.firstElementChild.outerHTML = '<ul><li><strong>앞뒤</strong></li><li>다음 항목</li></ul>';
  const range = d.createRange(); range.setStart(editor.querySelector('strong').firstChild, 1); range.collapse(true); d.caretRangeFromPoint = () => range;
  drag(marker, 'dragstart'); drag(editor, 'drop');
  assert.equal(marker.parentElement.tagName, 'LI');
  assert.equal(marker.previousElementSibling.textContent, '앞');
  assert.equal(marker.nextElementSibling.textContent, '뒤');
  const saved = content.sanitizeHtml(editor.innerHTML);
  editor.innerHTML = content.renderHtml(saved, []); content.mountInlineVideo(editor, record);
  assert.equal(editor.querySelectorAll('ul > li').length, 2);
  assert.equal(editor.querySelector('li > div[data-video-id]').dataset.videoId, record.id);
  assert.equal(editor.querySelector('ul').textContent, '앞비율9:16뒤다음 항목');
});
