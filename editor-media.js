(function () {
  'use strict';
  window.createMisamoEditor = function ({ editor, toolbar, onChange, onFiles, onDelete }) {
    const doc = editor.ownerDocument, win = doc.defaultView, surface = editor.parentElement;
    let selected = null, savedRange = null, dragging = null, resizing = null;
    const frame = doc.createElement('div');
    frame.className = 'media-selection'; frame.hidden = true;
    frame.innerHTML = '<div class="media-actions"><span data-media-size></span><button type="button" data-media-delete aria-label="선택 이미지 삭제">사진 삭제</button></div>' +
      ['nw', 'ne', 'sw', 'se'].map(c => `<button type="button" class="media-handle ${c}" data-media-resize="${c}" aria-label="이미지 크기 조절 ${c}"></button>`).join('');
    const indicator = doc.createElement('div');
    indicator.className = 'media-drop-line'; indicator.hidden = true;
    surface.append(frame, indicator);
    function updateFrame() {
      if (!selected || !editor.contains(selected)) { frame.hidden = true; return; }
      const r = selected.getBoundingClientRect(), base = surface.getBoundingClientRect();
      Object.assign(frame.style, { left:`${r.left-base.left}px`, top:`${r.top-base.top}px`, width:`${r.width}px`, height:`${r.height}px` });
      frame.querySelector('[data-media-size]').textContent = `${Math.round(r.width)} × ${Math.round(r.height)} · 사진을 끌어 이동`;
      frame.hidden = false;
      const actions = frame.querySelector('.media-actions');
      actions.style.left = `${Math.min(-2, base.width - (r.left-base.left) - actions.offsetWidth - 8)}px`;
    }
    function clearSelection() { selected = null; frame.hidden = true; }
    function select(image) { selected = image; updateFrame(); syncAlignment(); }
    function refresh() {
      editor.querySelectorAll('img[data-image-id]').forEach(image => { image.draggable = true; image.tabIndex = 0; });
      updateFrame();
    }
    function rememberRange() {
      const selection = win.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (editor.contains(range.startContainer) && editor.contains(range.endContainer)) savedRange = range.cloneRange();
      syncAlignment();
    }
    function restoreRange() {
      const range = savedRange && editor.contains(savedRange.startContainer) && editor.contains(savedRange.endContainer) ? savedRange.cloneRange() : doc.createRange();
      if (!savedRange || !editor.contains(range.startContainer)) { range.selectNodeContents(editor); range.collapse(false); }
      editor.focus({ preventScroll:true });
      win.getSelection().removeAllRanges(); win.getSelection().addRange(range);
      return range;
    }
    function syncAlignment() {
      let node = selected || savedRange?.startContainer;
      if (node?.nodeType === 3) node = node.parentElement;
      const align = node?.closest?.('[data-align]')?.dataset.align || (selected ? 'center' : 'left');
      toolbar.querySelectorAll('[data-editor-align]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.editorAlign === align)));
    }
    function alignContent(align) {
      if (!['left','center','right'].includes(align)) return;
      if (selected && editor.contains(selected)) {
        selected.dataset.align = align;
        selected.style.marginLeft = align === 'left' ? '0' : 'auto';
        selected.style.marginRight = align === 'right' ? '0' : 'auto';
        updateFrame();
      } else {
        const range = restoreRange();
        const start = range.startContainer, end = range.endContainer, startOffset = range.startOffset, endOffset = range.endOffset;
        let paragraph = null;
        Array.from(editor.childNodes).forEach(node => {
          if (node.nodeType === 1 && /^(P|DIV|H2|H3|UL|OL|IMG)$/.test(node.tagName)) { paragraph = null; return; }
          if (!paragraph) { paragraph = doc.createElement('p'); editor.insertBefore(paragraph,node); }
          paragraph.append(node);
        });
        if (!editor.childNodes.length) { const p=doc.createElement('p');p.append(doc.createElement('br'));editor.append(p);range.selectNodeContents(p);range.collapse(true); }
        else if (start !== editor && end !== editor && editor.contains(start) && editor.contains(end)) { range.setStart(start,startOffset);range.setEnd(end,endOffset); }
        const blockSelector = 'p,div,h2,h3,li';
        const blocks = Array.from(editor.querySelectorAll(blockSelector)).filter(b => range.intersectsNode(b) &&
          (!b.querySelector(blockSelector) || Array.from(b.childNodes).some(n =>
            !(n.nodeType === 1 && /^(P|DIV|H2|H3|UL|OL)$/.test(n.tagName)) && range.intersectsNode(n))));
        if (range.collapsed) {
          const node = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
          const current = node.closest?.(blockSelector);
          if (current && current !== editor && editor.contains(current)) blocks.splice(0,blocks.length,current);
        }
        // Keep unselected nested paragraphs from inheriting the changed parent's alignment.
        blocks.forEach(b => b.querySelectorAll(blockSelector).forEach(child => {
          if (!blocks.includes(child)) {
            const inherited = win.getComputedStyle(child).textAlign;
            child.dataset.align = ['left','center','right'].includes(inherited) ? inherited : 'left';
            child.style.textAlign = child.dataset.align;
          }
        }));
        blocks.forEach(b => { b.dataset.align=align;b.style.textAlign=align; });
        win.getSelection().removeAllRanges();win.getSelection().addRange(range);savedRange=range.cloneRange();
      }
      syncAlignment(); onChange();
    }
    function dropRange(event) {
      let range = doc.caretRangeFromPoint?.(event.clientX,event.clientY);
      if (!range && doc.caretPositionFromPoint) {
        const p=doc.caretPositionFromPoint(event.clientX,event.clientY);
        if(p) { range=doc.createRange();range.setStart(p.offsetNode,p.offset);range.collapse(true); }
      }
      const target = event.target.closest?.('img[data-image-id]');
      if (target && editor.contains(target)) {
        range=doc.createRange();const r=target.getBoundingClientRect();
        if(event.clientY < r.top+r.height/2) range.setStartBefore(target);else range.setStartAfter(target);
        range.collapse(true);
      }
      if (!range || !editor.contains(range.startContainer)) {
        range=doc.createRange();range.selectNodeContents(editor);range.collapse(false);
      }
      range.collapse(true);return range;
    }
    function showDropLine(event, range) {
      const base=surface.getBoundingClientRect(), body=editor.getBoundingClientRect();
      const caret=range.getBoundingClientRect?.();
      const y=caret?.height ? caret.bottom : Math.max(body.top,Math.min(body.bottom,event.clientY));
      Object.assign(indicator.style,{left:`${body.left-base.left}px`,top:`${y-base.top}px`,width:`${body.width}px`});
      indicator.hidden=false;
    }
    function supportsDrop(event) { return !!dragging || Array.from(event.dataTransfer?.types || []).includes('Files'); }
    editor.addEventListener('click', event => {
      const image=event.target.closest?.('img[data-image-id]');
      if(image) select(image);else clearSelection();
    });
    editor.addEventListener('focusin', event => { if(event.target.matches?.('img[data-image-id]')) select(event.target); });
    doc.addEventListener('pointerdown', event => { if(!editor.contains(event.target) && !frame.contains(event.target) && !toolbar.contains(event.target)) clearSelection(); });
    doc.addEventListener('selectionchange',rememberRange);
    toolbar.querySelectorAll('[data-editor-align]').forEach(button => {
      button.addEventListener('mousedown',e=>e.preventDefault());
      button.addEventListener('click',()=>alignContent(button.dataset.editorAlign));
    });
    frame.querySelector('[data-media-delete]').addEventListener('click',()=>{
      if(!selected) return;const id=selected.dataset.imageId;clearSelection();onDelete(id);editor.focus();
    });
    editor.addEventListener('keydown',event=>{
      if(event.key==='Escape') clearSelection();
      if (/^(Arrow|Home|End|Page)/.test(event.key) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='a')) clearSelection();
      if(selected && ['Delete','Backspace'].includes(event.key)) {event.preventDefault();const id=selected.dataset.imageId;clearSelection();onDelete(id);}
    });
    editor.addEventListener('dragstart', event=>{
      const image=event.target.closest?.('img[data-image-id]');if(!image) return;
      dragging=image;select(image);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-misamo-image',image.dataset.imageId);
    });
    editor.addEventListener('dragover',event=>{
      if(!supportsDrop(event)) return;event.preventDefault();event.dataTransfer.dropEffect=dragging?'move':'copy';showDropLine(event,dropRange(event));
    });
    editor.addEventListener('dragleave',event=>{ if(!editor.contains(event.relatedTarget)) indicator.hidden=true; });
    editor.addEventListener('dragend',()=>{dragging=null;indicator.hidden=true;});
    editor.addEventListener('drop',event=>{
      event.preventDefault();indicator.hidden=true;const range=dropRange(event);
      if(dragging && editor.contains(dragging)) {
        const image=dragging;dragging=null;
        if(range.startContainer===image) return;
        image.remove();range.insertNode(image);select(image);onChange();
      } else if(event.dataTransfer?.files?.length) onFiles(Array.from(event.dataTransfer.files),range);
      else {
        const text=event.dataTransfer?.getData('text/plain');
        if(text) {const node=doc.createTextNode(text);range.insertNode(node);onChange();}
      }
    });
    frame.querySelectorAll('[data-media-resize]').forEach(handle=>{
      handle.addEventListener('pointerdown',event=>{
        if(!selected || event.button!==0) return;event.preventDefault();event.stopPropagation();
        const rect=selected.getBoundingClientRect(), er=editor.getBoundingClientRect(), style=win.getComputedStyle(editor);
        const max=er.width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
        if(!max || !rect.width) return;
        resizing={image:selected,x:event.clientX,y:event.clientY,width:rect.width,ratio:rect.width/(rect.height||1),max,corner:handle.dataset.mediaResize};
        handle.setPointerCapture?.(event.pointerId);surface.classList.add('media-resizing');
      });
    });
    doc.addEventListener('pointermove',event=>{
      if(!resizing) return;event.preventDefault();const r=resizing;
      const dx=(event.clientX-r.x)*(r.corner.includes('w')?-1:1),dy=(event.clientY-r.y)*(r.corner.includes('n')?-1:1)*r.ratio;
      const delta=Math.abs(dx)>=Math.abs(dy)?dx:dy;
      const width=Math.round(Math.max(10,Math.min(100,(r.width+delta)/r.max*100))*100)/100;
      r.image.dataset.imageWidth=String(width);r.image.style.width=`${width}%`;r.image.style.height='auto';updateFrame();
    });
    function finishResize() {if(!resizing)return;resizing=null;surface.classList.remove('media-resizing');onChange();}
    doc.addEventListener('pointerup',finishResize);doc.addEventListener('pointercancel',finishResize);
    editor.addEventListener('input',()=>{clearSelection();refresh();});
    editor.addEventListener('load',updateFrame,true);
    win.addEventListener('resize',updateFrame);win.addEventListener('scroll',updateFrame,true);
    win.addEventListener('misamo:view',()=>{clearSelection();indicator.hidden=true;});
    refresh();syncAlignment();
    return { refresh, clearSelection, select };
  };
})();
