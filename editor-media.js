(function () {
  'use strict';
  window.createMisamoEditor = function ({ editor, toolbar, onChange, onFiles, onDelete, onBeforeChange = () => {} }) {
    const doc = editor.ownerDocument, win = doc.defaultView, surface = editor.parentElement;
    let selected = null, savedRange = null, dragging = null, resizing = null;
    const mediaSelector='img[data-image-id],a[data-link-card="1"]';
    const mediaId=node=>node?.dataset.linkCard==='1'?`card:${node.dataset.cardId}`:node?.dataset.imageId || '';
    const frame = doc.createElement('div');
    frame.className = 'media-selection'; frame.hidden = true;
    frame.innerHTML = '<div class="media-actions"><span data-media-size></span></div>' +
      ['nw', 'ne', 'sw', 'se'].map(c => `<button type="button" class="media-handle ${c}" data-media-resize="${c}" aria-label="이미지 크기 조절 ${c}"></button>`).join('');
    const indicator = doc.createElement('div');
    indicator.className = 'media-drop-line'; indicator.hidden = true;
    surface.append(frame, indicator);
    function updateFrame() {
      if (!selected || !editor.contains(selected)) { frame.hidden = true; return; }
      const r = selected.getBoundingClientRect(), base = surface.getBoundingClientRect();
      Object.assign(frame.style, { left:`${r.left-base.left}px`, top:`${r.top-base.top}px`, width:`${r.width}px`, height:`${r.height}px` });
      frame.querySelector('[data-media-size]').textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
      frame.hidden = false;
      const actions = frame.querySelector('.media-actions');
      actions.style.left = `${Math.min(-2, base.width - (r.left-base.left) - actions.offsetWidth - 8)}px`;
    }
    function clearSelection() { selected = null; frame.hidden = true; }
    function finishDrag() {
      dragging?.classList.remove('is-dragging');
      dragging=null;indicator.hidden=true;surface.classList.remove('media-dragging');
    }
    function select(image) { selected = image; updateFrame(); syncAlignment(); }
    function refresh() {
      editor.querySelectorAll(mediaSelector).forEach(image => { if(image.dataset.linkCard==='1' && !image.dataset.cardId) image.dataset.cardId=win.crypto.randomUUID();image.draggable = true; image.tabIndex = 0; });
      updateFrame();
    }
    function rememberRange() {
      const selection = win.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (editor.contains(range.startContainer) && editor.contains(range.endContainer)) {
        savedRange = range.cloneRange();
        if(!range.collapsed && !dragging && !resizing) clearSelection();
      }
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
      if(editor.getAttribute('contenteditable')==='false') return;
      if (!['left','center','right'].includes(align)) return;
      onBeforeChange();
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
      const target = event.target.closest?.(mediaSelector);
      if (target && editor.contains(target)) {
        range=doc.createRange();const r=target.getBoundingClientRect();
        if(event.clientY < r.top+r.height/2) range.setStartBefore(target);else range.setStartAfter(target);
        range.collapse(true);
      }
      if (!range || !editor.contains(range.startContainer)) {
        range=doc.createRange();range.selectNodeContents(editor);range.collapse(false);
      }
      const caret=range.getBoundingClientRect?.();
      if (range.startContainer.nodeType===3 && caret?.height &&
          (event.clientY < caret.top-3 || event.clientY > caret.bottom+3)) {
        let block=range.startContainer.parentElement;
        while(block.parentElement && block.parentElement!==editor) block=block.parentElement;
        if(block!==editor) {
          const rect=block.getBoundingClientRect();
          if(event.clientY < (rect.top+rect.bottom)/2) range.setStartBefore(block);else range.setStartAfter(block);
        }
      }
      range.collapse(true);return range;
    }
    function showDropLine(event, range) {
      const base=surface.getBoundingClientRect(), body=editor.getBoundingClientRect();
      const caret=range.getBoundingClientRect?.();
      const inline=range.startContainer.nodeType===3 && caret?.height;
      indicator.dataset.kind=inline?'caret':'block';
      if(inline) {
        Object.assign(indicator.style,{left:`${caret.left-base.left}px`,top:`${caret.top-base.top}px`,width:'2px',height:`${caret.height}px`});
      } else {
        const container=range.startContainer,offset=range.startOffset;
        const next=container.childNodes?.[offset],previous=container.childNodes?.[offset-1];
        const before=previous?.getBoundingClientRect?.(),after=next?.getBoundingClientRect?.();
        const y=before && after ? (before.bottom+after.top)/2 : after?.top ?? before?.bottom ?? Math.max(body.top,Math.min(body.bottom,event.clientY));
        Object.assign(indicator.style,{left:`${body.left-base.left}px`,top:`${y-base.top}px`,width:`${body.width}px`,height:'0px'});
      }
      indicator.hidden=false;
    }
    function supportsDrop(event) { return !!dragging || Array.from(event.dataTransfer?.types || []).includes('Files'); }
    editor.addEventListener('click', event => {
      const image=event.target.closest?.(mediaSelector);
      if(image) select(image);else clearSelection();
    });
    editor.addEventListener('focusin', event => { if(event.target.matches?.(mediaSelector)) select(event.target); });
    editor.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch' && !event.target.closest?.(mediaSelector)) clearSelection();
    });
    doc.addEventListener('pointerdown', event => { if(!editor.contains(event.target) && !frame.contains(event.target) && !toolbar.contains(event.target)) clearSelection(); });
    doc.addEventListener('selectionchange',rememberRange);
    toolbar.querySelectorAll('[data-editor-align]').forEach(button => {
      button.addEventListener('mousedown',e=>e.preventDefault());
      button.addEventListener('click',()=>alignContent(button.dataset.editorAlign));
    });
    editor.addEventListener('keydown',event=>{
      if(editor.getAttribute('contenteditable')==='false') return;
      if(event.key==='Escape') clearSelection();
      if (/^(Arrow|Home|End|Page)/.test(event.key) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='a')) clearSelection();
      if(selected && ['Delete','Backspace'].includes(event.key)) {event.preventDefault();onBeforeChange();const id=mediaId(selected);clearSelection();onDelete(id);}
    });
    editor.addEventListener('dragstart', event=>{
      if(editor.getAttribute('contenteditable')==='false') {event.preventDefault();return;}
      const image=event.target.closest?.(mediaSelector);if(!image) return;
      onBeforeChange();
      dragging=image;select(image);image.classList.add('is-dragging');surface.classList.add('media-dragging');
      event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-misamo-image',mediaId(image));
    });
    editor.addEventListener('dragover',event=>{
      if(editor.getAttribute('contenteditable')==='false') {event.preventDefault();return;}
      if(!supportsDrop(event)) return;event.preventDefault();event.dataTransfer.dropEffect=dragging?'move':'copy';showDropLine(event,dropRange(event));
    });
    editor.addEventListener('dragleave',event=>{ if(!editor.contains(event.relatedTarget)) indicator.hidden=true; });
    editor.addEventListener('dragend',finishDrag);
    editor.addEventListener('drop',event=>{
      if(editor.getAttribute('contenteditable')==='false') {event.preventDefault();finishDrag();return;}
      event.preventDefault();indicator.hidden=true;const range=dropRange(event);
      if(dragging && editor.contains(dragging)) {
        const image=dragging;finishDrag();
        if(range.startContainer===image || image.contains(range.startContainer)) return;
        image.remove();range.insertNode(image);
        range.setStartAfter(image);range.collapse(true);
        editor.focus({preventScroll:true});win.getSelection().removeAllRanges();win.getSelection().addRange(range);
        savedRange=range.cloneRange();select(image);onChange();
      } else if(event.dataTransfer?.files?.length) onFiles(Array.from(event.dataTransfer.files),range);
      else {
        const text=event.dataTransfer?.getData('text/plain');
        if(text) {onBeforeChange();const node=doc.createTextNode(text);range.insertNode(node);onChange();}
      }
    });
    frame.querySelectorAll('[data-media-resize]').forEach(handle=>{
      handle.addEventListener('pointerdown',event=>{
        if(!selected || event.button!==0 || editor.getAttribute('contenteditable')==='false') return;event.preventDefault();event.stopPropagation();
        onBeforeChange();
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
      r.image.dataset.imageWidth=String(width);r.image.style.width=`${width}%`;r.image.style.height='auto';
      if(r.image.dataset.linkCard==='1') r.image.style.maxWidth='100%';
      updateFrame();
    });
    function finishResize() {if(!resizing)return;resizing=null;surface.classList.remove('media-resizing');onChange();}
    doc.addEventListener('pointerup',finishResize);doc.addEventListener('pointercancel',finishResize);
    editor.addEventListener('input',()=>{clearSelection();refresh();});
    editor.addEventListener('load',updateFrame,true);
    win.addEventListener('resize',updateFrame);win.addEventListener('scroll',updateFrame,true);
    win.addEventListener('misamo:view',()=>{clearSelection();finishDrag();});
    refresh();syncAlignment();
    return { refresh, clearSelection, select, selectedId: () => selected?mediaId(selected):'', isInteracting: () => !!(dragging || resizing) };
  };
})();
