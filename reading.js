(function () {
  'use strict';
  const states = new WeakMap();
  let sequence = 0, readingPost = null, returnPosition = 0, navigating = false;
  const home = document.querySelector('[data-page="home"]');
  if (!home) return;
  const toolbar = document.createElement('div'); toolbar.className = 'reading-toolbar'; toolbar.hidden = true;
  toolbar.innerHTML = '<button type="button" data-reading-back><i data-lucide="arrow-left"></i>홈으로 돌아가기</button><span>게시글 전체 보기</span>';
  home.prepend(toolbar);
  const notice = document.createElement('p'); notice.className = 'reading-notice'; notice.hidden = true; toolbar.after(notice);
  function excerptOf(full) {
    const items = [...full.querySelectorAll('li')];
    if (items.length > 6) return items.slice(0,2).map(item => '• ' + item.textContent.trim()).join('\n');
    const paragraphs = [...full.querySelectorAll('p')].filter(p => !p.closest('.posting-link-card'));
    const text = paragraphs.length ? paragraphs.flatMap(p => { const clone = p.cloneNode(true); clone.querySelectorAll('br').forEach(br => br.replaceWith('\n')); return clone.textContent.split(/\n+/).map(text => text.trim()).filter(Boolean); }).slice(0,2) : [full.textContent.trim()];
    let excerpt = '';
    for (const paragraph of text) {
      if ((excerpt + paragraph).length <= 340) { excerpt += (excerpt ? '\n\n' : '') + paragraph; if (excerpt.length >= 160) break; }
      else {
        const sentences = paragraph.match(/[^.!?。！？]+[.!?。！？]+["'”’)]*/gu) || [];
        for (const sentence of sentences) { if ((excerpt + sentence).length > 340) break; excerpt += (excerpt ? ' ' : '') + sentence.trim(); }
        break;
      }
    }
    return excerpt || '긴 본문이 있습니다. 펼쳐서 전체 내용을 확인해주세요.';
  }
  function setExpanded(post, expanded, fromBottom = false) {
    const state = states.get(post); if (!state?.toggle) return;
    if (!expanded) state.full.querySelectorAll('video').forEach(video => { try { video.pause(); } catch (_) { /* A removed player may already be released. */ } });
    if (expanded) post.querySelectorAll('.post-inline-media-preview video').forEach(video => { try { video.pause(); } catch (_) {} });
    state.expanded = expanded; state.full.hidden = !expanded; state.preview.hidden = expanded; state.bottom.hidden = !expanded;
    state.toggle.setAttribute('aria-expanded', String(expanded)); state.toggle.textContent = expanded ? '본문 접기' : '본문 펼치기';
    post.classList.toggle('reading-expanded', expanded);
    if (fromBottom) { post.scrollIntoView({ block: 'start' }); state.toggle.focus({ preventScroll: true }); }
  }
  function hydrate() {
    document.querySelectorAll('.post-card[data-post-id]').forEach(post => {
      if (states.has(post)) return;
      const copy = post.querySelector('.post-copy'), full = copy?.querySelector('.post-rich-body') || copy?.querySelector('p'), heading = copy?.querySelector('h2');
      if (!full || !heading) return;
      const state = { full, expanded: false }; states.set(post, state); post.classList.add('reading-post');
      const link = document.createElement('a'); link.dataset.readingLink = ''; link.href = `#post/${encodeURIComponent(post.dataset.postId)}`;
      while (heading.firstChild) link.append(heading.firstChild); heading.append(link);
      const articleMedia = post.classList.contains('posting-article-post') && Boolean(full.querySelector('img, video, [data-video-id]'));
      const long = articleMedia || full.textContent.trim().length > 360 || full.querySelectorAll('img').length > 1 || Boolean(full.querySelector('table, pre')) || full.children.length > 4 || full.querySelectorAll('li, br').length > 6 || full.textContent.split(/\n/).length > 6;
      if (long) {
        full.id ||= `reading-body-${++sequence}`;
        const preview = document.createElement('p'); preview.className = 'reading-excerpt'; preview.textContent = excerptOf(full);
        const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'reading-toggle'; toggle.dataset.readingToggle = ''; toggle.setAttribute('aria-controls', full.id);
        const bottom = document.createElement('button'); bottom.type = 'button'; bottom.className = 'reading-toggle reading-collapse'; bottom.dataset.readingCollapse = ''; bottom.textContent = '본문 접기'; bottom.setAttribute('aria-controls', full.id);
        full.before(preview, toggle); full.after(bottom); Object.assign(state, { preview, toggle, bottom });
        toggle.addEventListener('click', () => setExpanded(post, !state.expanded)); bottom.addEventListener('click', () => setExpanded(post, false, true)); setExpanded(post, false);
      }
      full.querySelectorAll('table').forEach(table => {
        const scroll = document.createElement('div'); scroll.className = 'reading-table'; scroll.tabIndex = 0; scroll.setAttribute('role','region'); scroll.setAttribute('aria-label','표 전체 보기 — 좌우로 이동할 수 있습니다'); table.before(scroll); scroll.append(table);
      });
      post.querySelectorAll('.post-image, .post-rich-body img').forEach(image => {
        if (image.closest('a, button')) return;
        image.dataset.readingImage = ''; image.tabIndex = 0; image.setAttribute('role','button'); image.setAttribute('aria-label', `${image.alt || '게시글 이미지'} 확대 보기`);
      });
    });
    window.createMisamoIcons?.();
  }
  function leaveReader(restore = false) {
    if (!readingPost && !document.body.classList.contains('is-reading-post')) return;
    const returnFocus = readingPost?.querySelector('[data-reading-link]');
    readingPost?.classList.remove('is-reading-target'); readingPost = null; document.body.classList.remove('is-reading-post'); toolbar.hidden = true; notice.hidden = true;
    if (restore) { window.scrollTo({ top: returnPosition, behavior: 'instant' }); returnFocus?.focus({preventScroll:true}); }
  }
  function openReader(id, push = true) {
    const communityPost = window.MisamoCommunity ? window.MisamoCommunity.post(id) : undefined;
    let post = communityPost === null ? null : [...document.querySelectorAll('.post-card[data-post-id]')].find(post => post.dataset.postId === id);
    if (!post && communityPost) {
      window.MisamoPosting?.renderPost(communityPost);
      post = [...document.querySelectorAll('.post-card[data-post-id]')].find(node => node.dataset.postId === id);
    }
    if (!document.body.classList.contains('is-reading-post')) returnPosition = window.scrollY;
    navigating = true; window.misamoNavigate?.('home'); navigating = false; leaveReader(false);
    document.body.classList.add('is-reading-post'); toolbar.hidden = false;
    if (post) { readingPost = post; post.classList.add('is-reading-target'); setExpanded(post, true); }
    else { notice.hidden = false; notice.textContent = '이 브라우저에서 게시글을 찾을 수 없습니다. 직접 작성한 글은 작성한 브라우저에 저장됩니다.'; }
    window.history[push ? 'pushState' : 'replaceState'](null, '', `#post/${encodeURIComponent(id)}`); window.scrollTo({ top: 0, behavior: 'instant' });
  }
  toolbar.querySelector('button').addEventListener('click', () => { leaveReader(true); navigating = true; window.misamoNavigate?.('home'); navigating = false; });
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-reading-link]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); openReader(link.closest('[data-post-id]').dataset.postId);
  });
  window.addEventListener('misamo:view', () => { if (!navigating) leaveReader(false); });
  window.addEventListener('hashchange', () => {
    if (window.location.hash.startsWith('#post/')) { try { openReader(decodeURIComponent(window.location.hash.slice(6)), false); } catch (_) { leaveReader(false); } }
    else if (document.body.classList.contains('is-reading-post')) { leaveReader(true); navigating = true; window.misamoNavigate?.(window.location.hash.slice(1)); navigating = false; }
  });
  const viewer = document.createElement('dialog'); viewer.className = 'reading-image-dialog'; viewer.setAttribute('aria-label','게시글 이미지 전체 보기');
  viewer.innerHTML = '<header><span>이미지 전체 보기</span><button type="button" aria-label="이미지 닫기">닫기</button></header><div class="reading-image-canvas"><img alt=""></div><div class="reading-image-navigation"><button type="button" data-viewer-prev>이전 사진</button><span data-viewer-count></span><button type="button" data-viewer-next>다음 사진</button></div>';
  document.body.append(viewer); let imageTrigger = null;
  let galleryImages = [], galleryIndex = 0;
  function paintImage() {
    const current = galleryImages[galleryIndex]; if (!current) return;
    const target = viewer.querySelector('img'); target.src = current.src; target.alt = current.alt || '';
    viewer.querySelector('[data-viewer-count]').textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
    viewer.querySelectorAll('[data-viewer-prev],[data-viewer-next]').forEach(b => b.hidden = galleryImages.length < 2);
  }
  function moveImage(delta) { galleryIndex = (galleryIndex + delta + galleryImages.length) % galleryImages.length; paintImage(); }
  function showImage(image) {
    imageTrigger = image;
    const card = image.closest('[data-post-id]');
    const inline = [...(card?.querySelectorAll('.post-rich-body img') || [])].map(i => ({src:i.src,alt:i.alt}));
    const covers = [...(card?.querySelectorAll('.post-image') || [image])].map(i => ({src:i.src,alt:i.alt}));
    const attachments = window.MisamoCommunity?.post(card?.dataset.postId)?.images || [];
    const seen = new Set(); galleryImages = [...inline,...attachments,...covers].filter(i => i.src && !seen.has(i.src) && seen.add(i.src));
    galleryIndex = Math.max(0, galleryImages.findIndex(i => i.src === image.src));
    paintImage(); viewer.showModal();
  }
  viewer.querySelector('[data-viewer-prev]').addEventListener('click', () => moveImage(-1));
  viewer.querySelector('[data-viewer-next]').addEventListener('click', () => moveImage(1));
  viewer.addEventListener('keydown', event => { if (['ArrowLeft','ArrowRight'].includes(event.key)) {event.preventDefault();moveImage(event.key === 'ArrowRight' ? 1 : -1);} });
  document.addEventListener('click', event => { const image = event.target.closest('[data-reading-image]'); if (image) showImage(image); });
  document.addEventListener('keydown', event => { if (event.target.matches('[data-reading-image]') && ['Enter',' '].includes(event.key)) { event.preventDefault(); showImage(event.target); } });
  viewer.querySelector('button').addEventListener('click', () => viewer.close()); viewer.addEventListener('close', () => imageTrigger?.focus({preventScroll:true}));
  window.addEventListener('misamo:post-updated', event => {
    const card = [...document.querySelectorAll('.post-card[data-post-id]')].find(p => p.dataset.postId === event.detail?.id);
    if (card) { states.delete(card); hydrate(); if (card === readingPost) setExpanded(card, true); }
  });
  hydrate(); window.addEventListener('misamo:post-rendered', hydrate);
  if (window.misamoInitialPost) { try { openReader(decodeURIComponent(window.misamoInitialPost), false); } catch (_) { /* Invalid URL leaves home available. */ } }
})();
