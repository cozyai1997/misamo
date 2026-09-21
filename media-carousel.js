(function () {
  'use strict';
  const ratios = ['4:3', '1:1', '9:16', '16:9'];
  function ratio(post) { if (post.mediaRatio === '4:5') return '4:3'; return ratios.includes(post.mediaRatio) ? post.mediaRatio : (ratios.includes(post.video?.ratio) ? post.video.ratio : '4:3'); }
  function items(post) {
    const all = (post.images || []).filter(i => i?.id && i.src).map(image => ({key:`image:${image.id}`, kind:'image', image}));
    if (post.video) all.push({key:`video:${post.video.id}`, kind:'video', video:post.video});
    const ordered = [], seen = new Set();
    for (const key of [...(Array.isArray(post.mediaOrder) ? post.mediaOrder : []), ...all.map(i => i.key)]) {
      const item = all.find(i => i.key === key);
      if (item && !seen.has(key)) { ordered.push(item); seen.add(key); }
    }
    if (post.mediaLayout === 'inline' && post.coverId) {
      const coverIndex = ordered.findIndex(item => item.key === post.coverId || (item.kind === 'image' && item.image.id === post.coverId));
      if (coverIndex > 0) ordered.unshift(ordered.splice(coverIndex,1)[0]);
    }
    return ordered;
  }
  function enabled(post) { return post.mediaLayout !== 'inline' && (post.mediaLayout === 'carousel' || Boolean(post.video && post.images?.length)); }
  function stripImages(container) {
    container.querySelectorAll('img[data-image-id],div[data-video-id]').forEach(img => img.remove());
    container.querySelectorAll('p,div').forEach(node => { if (!node.textContent.trim() && !node.querySelector('img,a,br')) node.remove(); });
  }
  function create(post, options = {}) {
    const media = items(post); if (!media.length) return null;
    const root = document.createElement('section'); root.className = 'misamo-carousel';
    root.classList.toggle('is-editing', Boolean(options.editing));
    root.setAttribute('aria-label', '첨부 사진과 영상'); root.setAttribute('aria-roledescription', '캐러셀');
    root.dataset.mediaRatio = ratio(post); root.dataset.mediaCount = String(media.length);
    const stage = document.createElement('div'); stage.className = 'misamo-media-stage'; stage.dataset.mediaStage = '';
    stage.tabIndex = 0; stage.setAttribute('aria-label','사진과 영상 — 좌우로 넘겨보기');
    const count = document.createElement('span'); count.className = 'misamo-media-count sr-only'; count.dataset.mediaCount = '';
    count.setAttribute('aria-live','polite'); count.setAttribute('aria-atomic','true');
    let index = Math.max(0, media.findIndex(m => m.key === options.selectedKey));
    let reorderKey = null;
    function clearReorder() {
      reorderKey = null;
      stage.querySelectorAll('.is-reorder-source,.is-reorder-target').forEach(card => card.classList.remove('is-reorder-source','is-reorder-target'));
    }
    function reorder(key, targetIndex) {
      if (!options.editing || options.disabled || !options.onReorder) return;
      const from = media.findIndex(item => item.key === key);
      if (from < 0 || !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= media.length || from === targetIndex) return;
      const keys = media.map(item => item.key);
      keys.splice(targetIndex,0,keys.splice(from,1)[0]);
      pauseVideos(); options.onReorder(keys);
    }
    function button(label, text, handler) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label',label); b.textContent = text; b.addEventListener('click',handler); return b; }
    const prev = button('이전 첨부파일','‹',() => move(-1)); prev.dataset.mediaPrev = '';
    const next = button('다음 첨부파일','›',() => move(1)); next.dataset.mediaNext = '';
    prev.className = next.className = 'misamo-media-arrow';
    [prev,next].forEach((control,i) => {
      control.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${i === 0 ? 'M15 5 8 12l7 7' : 'M9 5l7 7-7 7'}" /></svg>`;
    });
    const slides = media.map((item,i) => {
      const holder = document.createElement('div'); holder.className = 'misamo-media-slide';
      holder.dataset.mediaKey = item.key;
      holder.style.aspectRatio = ratio(post).replace(':',' / ');
      holder.setAttribute('role','group'); holder.setAttribute('aria-label',`${i+1} / ${media.length} · ${item.kind === 'video' ? '영상' : '사진'}`);
      if (item.kind === 'video') {
        const figure = window.MisamoVideo?.createFigure({...item.video,ratio:ratio(post)});
        if (figure) holder.append(figure);
      } else {
        const img = document.createElement('img'); img.src = item.image.src; img.alt = item.image.alt || '첨부 사진'; img.draggable = false;
        if (!options.editing) { img.dataset.readingImage = ''; img.tabIndex = 0; img.setAttribute('role','button'); img.setAttribute('aria-label',`${img.alt} 전체 보기`); }
        holder.append(img);
      }
      if (options.editing) {
        const overlay = document.createElement('div'); overlay.className = 'misamo-media-edit-controls';
        const actions = document.createElement('div'); actions.className = 'misamo-media-edit-actions';
        const settings = document.createElement('div'); settings.className = 'misamo-media-edit-settings';
        overlay.addEventListener('click',event => event.stopPropagation());
        const remove = button(`${i+1}번 ${item.kind === 'video' ? '영상' : '사진'} 삭제`,'',() => {
          if (!options.disabled) options.onRemove?.(item.key);
        });
        remove.dataset.mediaRemove = item.key; remove.className = 'misamo-media-edit-remove';
        remove.title = '첨부파일 삭제'; remove.disabled = Boolean(options.disabled || !options.onRemove);
        remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18" /></svg>';
        const crop = document.createElement('select'); crop.dataset.mediaRatioSelect = '';
        crop.className = 'misamo-media-ratio-select'; crop.setAttribute('aria-label',`${i+1}번 첨부파일 비율`);
        crop.title = '사진·영상 비율 선택'; crop.disabled = Boolean(options.disabled || !options.onRatioChange);
        ratios.forEach(value => { const option = document.createElement('option'); option.value = option.textContent = value; crop.append(option); });
        crop.value = ratio(post);
        crop.addEventListener('change',() => {
          if (!options.disabled && ratios.includes(crop.value) && crop.value !== ratio(post)) options.onRatioChange?.(crop.value);
        });
        const position = document.createElement('select'); position.dataset.mediaPosition = '';
        position.className = 'misamo-media-position-select'; position.setAttribute('aria-label',`${i+1}번 첨부파일 순서`);
        position.title = '첨부파일 순서 선택'; position.disabled = Boolean(options.disabled || !options.onReorder);
        media.forEach((_,n) => { const option = document.createElement('option'); option.value = option.textContent = String(n+1); position.append(option); });
        position.value = String(i+1);
        position.addEventListener('change',() => reorder(item.key,Number(position.value)-1));
        actions.append(remove);
        if (i === 0) settings.append(crop);
        else { const fit = document.createElement('span'); fit.className = 'misamo-media-fit-label'; fit.textContent = '비율 자동 맞춤'; fit.title = '첫 번째 사진·영상의 비율에 맞춰집니다'; settings.append(fit); }
        settings.append(position); overlay.append(actions,settings); holder.append(overlay);
        holder.draggable = !options.disabled && Boolean(options.onReorder);
        holder.addEventListener('dragstart',event => {
          if (!holder.draggable || event.target.closest('video,select,input,a,button')) { event.preventDefault(); return; }
          clearReorder(); reorderKey = item.key; holder.classList.add('is-reorder-source');
          if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain',item.key); }
        });
        holder.addEventListener('dragover',event => {
          if (!reorderKey || options.disabled) return;
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
          stage.querySelectorAll('.is-reorder-target').forEach(card => card.classList.remove('is-reorder-target'));
          if (reorderKey !== item.key) holder.classList.add('is-reorder-target');
        });
        holder.addEventListener('dragleave',event => { if (!holder.contains(event.relatedTarget)) holder.classList.remove('is-reorder-target'); });
        holder.addEventListener('drop',event => {
          if (!reorderKey || options.disabled) return;
          event.preventDefault(); event.stopPropagation();
          const key = reorderKey; clearReorder(); reorder(key,i);
        });
        holder.addEventListener('dragend',clearReorder);
      }
      stage.append(holder); return holder;
    });
    const controls = document.createElement('div'); controls.className = 'misamo-media-controls'; controls.append(prev,count,next);
    controls.hidden = media.length < 2; root.append(stage,controls);
    function pauseVideos() { stage.querySelectorAll('video').forEach(video => video.pause()); }
    function paint() {
      count.textContent = `${index+1} / ${media.length}`;
      prev.disabled = index === 0; next.disabled = index === media.length-1;
      options.onSelect?.(media[index].key);
    }
    function offset(i) { return slides[i].offsetLeft - slides[0].offsetLeft; }
    function move(delta) {
      if (!stage.clientWidth) { show(index + delta); return; }
      const candidates = slides.map((_,i) => i).filter(i => delta < 0 ? offset(i) < stage.scrollLeft-2 : offset(i) > stage.scrollLeft+2);
      show(delta < 0 ? (candidates.at(-1) ?? 0) : (candidates[0] ?? media.length-1));
    }
    function show(value) {
      if (value < 0 || value >= media.length) return;
      if (value !== index) pauseVideos();
      index = value; paint();
      if (typeof stage.scrollTo === 'function') stage.scrollTo({left:offset(index),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
      else stage.scrollLeft = offset(index);
    }
    stage.addEventListener('scroll', () => {
      pauseVideos();
      const end = stage.scrollWidth - stage.clientWidth;
      if (end <= 1) return;
      index = stage.scrollLeft >= end-2 ? media.length-1 : slides.reduce((best,_,i) => Math.abs(offset(i)-stage.scrollLeft) < Math.abs(offset(best)-stage.scrollLeft) ? i : best,0);
      paint();
    }, {passive:true});
    root.addEventListener('keydown', e => {
      if (e.target.closest('video,select,input,textarea,button') || !['ArrowLeft','ArrowRight'].includes(e.key)) return;
      e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1);
    });
    // Native horizontal scrolling preserves touch momentum and video controls.
    // Mouse users can also drag photos; suppress only the click following a drag.
    let drag = null, dragged = false;
    stage.addEventListener('pointerdown', e => {
      if (options.editing || e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('video,button')) return;
      drag = {x:e.clientX,left:stage.scrollLeft,id:e.pointerId}; dragged = false;
    });
    stage.addEventListener('pointermove', e => {
      if (!drag || !(e.buttons & 1)) return;
      const delta = e.clientX - drag.x;
      if (!dragged && Math.abs(delta) < 8) return;
      dragged = true; stage.setPointerCapture?.(drag.id); stage.classList.add('is-dragging');
      stage.scrollLeft = drag.left-delta; e.preventDefault();
    });
    function stopDrag() { drag = null; stage.classList.remove('is-dragging'); }
    stage.addEventListener('pointerup',stopDrag); stage.addEventListener('pointercancel',stopDrag);
    stage.addEventListener('lostpointercapture',stopDrag);
    stage.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } },true);
    paint();
    if (index && window.requestAnimationFrame) window.requestAnimationFrame(() => { if (root.isConnected) stage.scrollLeft = offset(index); });
    return root;
  }
  window.MisamoCarousel = {items, ratio, enabled, stripImages, create};
})();
