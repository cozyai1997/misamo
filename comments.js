(function () {
  'use strict';
  if (window.__misamoCommentsInitialized) return;
  window.__misamoCommentsInitialized = true;
  const store = window.MisamoStore;
  const user = store?.USER || { id: 'demo-me', name: 'misamo_korea', avatar: '' };
  const controllers = new WeakMap();
  let sequence = 0;
  const copy = value => JSON.parse(JSON.stringify(value));
  const countComments = comments => comments.reduce((total, item) => total + 1 + countComments(item.replies || []), 0);
  const canEdit = item => Boolean(item.authorId) && item.authorId === user.id;
  const messageOf = (error, fallback) => typeof error?.message === 'string' && error.message.trim() ? error.message : fallback;

  function validThread(value) {
    const ids = new Set();
    const validItems = items => Array.isArray(items) && items.every(item => {
      if (!item || typeof item !== 'object' || item.id == null || ids.has(String(item.id)) || typeof item.text !== 'string') return false;
      ids.add(String(item.id));
      return item.replies == null || validItems(item.replies);
    });
    return Boolean(value) && Number.isFinite(Number(value.total)) && Number(value.total) >= 0 && validItems(value.comments);
  }
  function findComment(comments, id) {
    for (const item of comments) {
      if (String(item.id) === String(id)) return item;
      const nested = findComment(item.replies || [], id);
      if (nested) return nested;
    }
    return null;
  }
  function initialThread(state) {
    if (state.id !== 'demo-cafe') return { total: 0, comments: [] };
    return { total: 4, comments: [
      { id: 'demo-1', authorId: 'growth-ceo', author: 'growth_ceo', time: '2시간 전', order: 1, text: '정말 도움이 되는 글이에요! 혹시 초기 비용은 어느 정도 들었는지 자세히 공유해주실 수 있을까요?', likes: 12, replies: [] },
      { id: 'demo-2', authorId: 'cafe-dreamer', author: 'cafe_dreamer', time: '1시간 전', order: 2, text: '저도 지금 카페 창업 준비 중인데 많은 도움이 됐어요 😊\n컨설팅은 어떤 과정으로 진행되나요?', likes: 8, replies: [
        { id: 'demo-3', authorId: state.authorId || 'startup-hello', author: state.author || 'startup_hello', time: '1시간 전', text: '컨설팅은 상권 분석부터 메뉴 구성, 인테리어, 운영 전략까지 단계별로 진행됐어요! 자세한 내용은 따로 정리해볼게요 :)', mention: 'cafe_dreamer', likes: 6, replies: [] },
      ] },
      { id: 'demo-4', authorId: 'biz-master', author: 'biz_master', time: '55분 전', order: 3, text: '준비 과정을 공유해주셔서 감사합니다. 앞으로의 창업도 응원합니다!', likes: 3, replies: [] },
    ] };
  }
  function setImage(image, source) {
    image.hidden = !source;
    if (source && image.getAttribute('src') !== source) image.src = source;
    if (!source) image.removeAttribute('src');
  }
  function resizeField(field) {
    if (field.closest('[hidden]') || field.getClientRects().length === 0) return;
    field.style.height = 'auto';
    field.style.height = `${Math.max(44, field.scrollHeight + 2)}px`;
  }
  function showStatus(state, message, error = false) {
    state.statusText.textContent = message;
    state.status.classList.toggle('is-error', error);
    state.retry.hidden = !state.readError;
  }
  function readThread(state) {
    if (typeof store?.readComments !== 'function') throw new Error('댓글 저장소에 연결할 수 없습니다. 입력한 내용은 그대로 유지됩니다.');
    const value = store.readComments(state.id);
    if (value == null) return initialThread(state);
    if (!validThread(value)) throw new Error('저장된 댓글을 읽을 수 없습니다. 기존 데이터는 변경하지 않았습니다.');
    return copy(value);
  }
  function load(state) {
    try {
      state.thread = readThread(state);
      state.readError = false;
      showStatus(state, '');
    } catch (error) {
      state.thread ||= { total: 0, comments: [] };
      state.readError = true;
      showStatus(state, messageOf(error, '댓글을 불러오지 못했습니다. 다시 불러온 후 등록해주세요.'), true);
    }
    render(state);
  }
  function persist(state, change) {
    if (state.readError) {
      showStatus(state, '댓글을 먼저 다시 불러와 주세요. 입력한 내용과 기존 데이터는 그대로 유지됩니다.', true);
      return false;
    }
    let candidate;
    try {
      // Re-read before each write to protect newer saved data and unreadable threads.
      candidate = readThread(state);
    } catch (error) {
      state.readError = true;
      showStatus(state, messageOf(error, '댓글을 불러오지 못해 저장하지 않았습니다. 입력한 내용은 그대로 유지됩니다.'), true);
      return false;
    }
    try {
      if (typeof store?.saveComments !== 'function') throw new Error('댓글 저장 기능을 사용할 수 없습니다.');
      if (change(candidate) === false) throw new Error('해당 댓글이 변경되었습니다. 다시 불러온 후 시도해주세요.');
      candidate.total = countComments(candidate.comments);
      const saved = store.saveComments(state.id, candidate);
      state.thread = copy(validThread(saved) ? saved : candidate);
      render(state);
      return true;
    } catch (error) {
      showStatus(state, `${messageOf(error, '댓글을 저장하지 못했습니다.')} 입력한 내용은 그대로 유지됩니다.`, true);
      return false;
    }
  }
  function newId(state, prefix) {
    let id;
    do { id = `${prefix}-${Date.now().toString(36)}-${(++sequence).toString(36)}`; }
    while (findComment(state.thread.comments, id));
    return id;
  }
  function previewText(text) {
    const lines = text.split('\n');
    if (lines.length > 6) {
      const paragraphs = lines.slice(0, 2).join('\n').trimEnd();
      if (paragraphs.trim() && paragraphs.length <= 360) return paragraphs;
    }
    if (text.length <= 360 && lines.length <= 6) return text;
    const boundaries = [...text.matchAll(/[.!?。！？](?=\s|$)|\n+/g)].map(match => match.index + match[0].length);
    const end = boundaries.filter(position => position <= 360).pop();
    const excerpt = end ? text.slice(0, end).trimEnd() : '';
    return excerpt.trim() && excerpt.split('\n').length <= 6 ? excerpt : '긴 댓글입니다. 전문을 펼쳐 읽어보세요.';
  }
  function syncText(view) {
    const text = view.item.text || '';
    const preview = previewText(text);
    const mention = view.item.mention || view.parentAuthor || '';
    const value = view.expanded ? text : preview;
    const key = JSON.stringify([value, mention]);
    if (view.textKey !== key) {
      view.text.replaceChildren();
      if (mention) {
        const tag = document.createElement('span'); tag.className = 'comment-mention'; tag.textContent = `@${mention} `;
        view.text.append(tag);
      }
      view.text.append(document.createTextNode(value));
      view.textKey = key;
    }
    view.expand.hidden = preview === text;
    view.expand.textContent = view.expanded ? '댓글 접기' : '댓글 전문 보기';
    view.expand.setAttribute('aria-expanded', String(view.expanded));
  }
  function flatReplies(item) {
    const result = [];
    function visit(parent) {
      (parent.replies || []).forEach(reply => { result.push({ item: reply, parentAuthor: parent.author || '' }); visit(reply); });
    }
    visit(item);
    return result;
  }
  function restoreFocus(snapshot) {
    if (!snapshot.element?.isConnected || snapshot.element.closest('[hidden]')) return;
    if (document.activeElement !== snapshot.element) snapshot.element.focus({ preventScroll: true });
    if (snapshot.start != null && typeof snapshot.element.setSelectionRange === 'function') snapshot.element.setSelectionRange(snapshot.start, snapshot.end, snapshot.direction);
  }
  function createItem(state, item, rootId, parentAuthor) {
    const node = document.createElement('article');
    node.className = 'comment-item'; node.dataset.commentId = String(item.id);
    node.innerHTML = '<img class="comments-avatar" alt=""><div class="comment-content"><div class="comment-meta"><strong></strong><small></small><span class="comment-author-badge" hidden>작성자</span><small class="comment-edited" hidden>수정됨</small></div><p class="comment-text"></p><button type="button" class="comment-text-toggle" data-comment-expand hidden aria-expanded="false">댓글 전문 보기</button><div class="comment-actions"><button type="button" data-reply>답글 달기</button><button type="button" data-comment-like aria-label="댓글 좋아요" aria-pressed="false"><i data-lucide="heart"></i><span></span></button><button type="button" data-comment-edit hidden>수정</button></div><button type="button" class="comment-replies-toggle" data-replies-toggle aria-expanded="false" hidden></button><div class="comment-replies" hidden></div></div>';
    const view = { node, item, rootId, parentAuthor, expanded: false, repliesOpen: false, repliesVisible: 10, forms: new Map(), text: node.querySelector('.comment-text'), expand: node.querySelector('[data-comment-expand]'), replies: node.querySelector('.comment-replies'), repliesToggle: node.querySelector('[data-replies-toggle]') };
    view.text.id = `comment-text-${++sequence}`;
    view.expand.setAttribute('aria-controls', view.text.id);
    view.replies.id = `comment-replies-${++sequence}`;
    view.repliesToggle.setAttribute('aria-controls', view.replies.id);
    view.expand.addEventListener('click', () => {
      const returning = view.expanded && view.node.getBoundingClientRect().top < 0;
      view.expanded = !view.expanded; syncText(view);
      if (returning) { view.node.scrollIntoView?.({ block: 'start' }); view.expand.focus({ preventScroll: true }); }
    });
    node.querySelector('[data-reply]').addEventListener('click', () => openForm(state, view, 'reply'));
    node.querySelector('[data-comment-edit]').addEventListener('click', () => openForm(state, view, 'edit'));
    node.querySelector('[data-comment-like]').addEventListener('click', () => {
      let liked = false;
      if (!persist(state, candidate => {
        const changed = findComment(candidate.comments, view.item.id); if (!changed) return false;
        liked = changed.liked = !Boolean(changed.liked);
        changed.likes = Math.max(0, (Number(changed.likes) || 0) + (liked ? 1 : -1));
      })) return;
      showStatus(state, liked ? '댓글에 좋아요를 표시했습니다.' : '댓글 좋아요를 취소했습니다.');
    });
    view.repliesToggle.addEventListener('click', () => { view.repliesOpen = !view.repliesOpen; render(state); });
    state.views.set(String(item.id), view);
    return view;
  }
  function syncItem(state, item, rootId, parentAuthor = '') {
    const view = state.views.get(String(item.id)) || createItem(state, item, rootId, parentAuthor);
    view.item = item; view.rootId = rootId; view.parentAuthor = parentAuthor;
    setImage(view.node.querySelector('.comments-avatar'), item.avatar || state.avatar || user.avatar);
    view.node.querySelector('.comment-meta strong').textContent = item.author || '';
    view.node.querySelector('.comment-meta > small').textContent = item.time || '';
    view.node.querySelector('.comment-author-badge').hidden = !(state.authorId ? item.authorId === state.authorId : state.author && item.author === state.author);
    view.node.querySelector('.comment-edited').hidden = !item.edited;
    const like = view.node.querySelector('[data-comment-like]');
    like.setAttribute('aria-pressed', String(Boolean(item.liked)));
    like.setAttribute('aria-label', item.liked ? '댓글 좋아요 취소' : '댓글 좋아요');
    like.querySelector('span').textContent = String(Number(item.likes) || 0);
    view.node.querySelector('[data-comment-edit]').hidden = !canEdit(item);
    syncText(view);
    return view;
  }
  function renderReplies(state, root) {
    const replies = flatReplies(root.item);
    root.repliesToggle.hidden = replies.length === 0;
    root.repliesToggle.textContent = root.repliesOpen ? '답글 접기' : `답글 ${replies.length}개 보기`;
    root.repliesToggle.setAttribute('aria-expanded', String(root.repliesOpen));
    root.replies.hidden = !root.repliesOpen;
    if (!root.repliesOpen) return;
    const start = Math.max(0, replies.length - root.repliesVisible);
    let position = 0;
    replies.forEach((entry, index) => {
      let view = state.views.get(String(entry.item.id));
      if (index < start && !view) return;
      view = syncItem(state, entry.item, root.item.id, entry.parentAuthor);
      view.node.hidden = index < start && ![...view.forms.values()].some(form => !form.hidden);
      if (root.replies.children[position] !== view.node) root.replies.insertBefore(view.node, root.replies.children[position] || null);
      position++;
    });
    let more = root.replies.querySelector(':scope > [data-replies-more]');
    if (!more) {
      more = document.createElement('button'); more.type = 'button'; more.className = 'comments-more'; more.dataset.repliesMore = '';
      more.addEventListener('click', () => { root.repliesVisible += 10; render(state); }); root.replies.append(more);
    }
    if (root.replies.firstElementChild !== more) root.replies.prepend(more);
    root.replies.querySelectorAll('textarea').forEach(resizeField);
    more.hidden = replies.length <= root.repliesVisible;
    more.textContent = `이전 답글 ${Math.min(10, Math.max(0, replies.length - root.repliesVisible))}개 더 보기`;
  }
  function render(state) {
    const active = document.activeElement;
    const snapshot = { element: state.section.contains(active) ? active : null, start: active?.selectionStart, end: active?.selectionEnd, direction: active?.selectionDirection };
    const sorted = [...state.thread.comments].sort((a, b) => state.sort.value === 'popular'
      ? (Number(b.likes) || 0) - (Number(a.likes) || 0) || (Number(b.order) || 0) - (Number(a.order) || 0)
      : (Number(b.order) || 0) - (Number(a.order) || 0));
    let position = 0;
    sorted.forEach((item, index) => {
      let view = state.views.get(String(item.id));
      if (index >= state.visible && !view) return;
      view = syncItem(state, item, item.id);
      const hasForm = [...state.views.values()].some(entry => String(entry.rootId) === String(item.id) && [...entry.forms.values()].some(form => !form.hidden));
      view.node.hidden = index >= state.visible && !hasForm && !view.node.contains(snapshot.element);
      if (state.list.children[position] !== view.node) state.list.insertBefore(view.node, state.list.children[position] || null);
      position++;
      renderReplies(state, view);
    });
    const actual = countComments(state.thread.comments);
    state.section.querySelector('[data-inline-comments-count]').textContent = String(actual);
    if (!state.readError) state.trigger.querySelector('[data-comments-count]')?.replaceChildren(String(actual));
    state.more.hidden = sorted.length <= state.visible;
    state.more.textContent = `댓글 ${Math.min(10, Math.max(0, sorted.length - state.visible))}개 더 보기`;
    state.empty.hidden = actual > 0 || state.readError;
    window.createMisamoIcons?.();
    restoreFocus(snapshot);
  }
  function openForm(state, view, type) {
    if (type === 'edit' && !canEdit(view.item)) return;
    let form = view.forms.get(type);
    if (form) { form.hidden = false; const field = form.querySelector('textarea'); resizeField(field); field.focus({ preventScroll: true }); return; }
    form = document.createElement('form');
    form.className = `comment-reply-form${type === 'edit' ? ' comment-edit-form' : ''}`;
    form.innerHTML = '<label></label><textarea required maxlength="2000" rows="2"></textarea><div class="comment-form-buttons"><button type="submit" class="comment-submit" disabled></button><button type="button" class="comment-cancel">취소</button></div>';
    const field = form.querySelector('textarea'); field.id = `comment-form-${++sequence}`;
    const label = form.querySelector('label'); label.htmlFor = field.id;
    label.textContent = type === 'edit' ? '댓글 수정' : `${view.item.author || ''}님에게 답글`;
    field.setAttribute('aria-label', type === 'edit' ? '댓글 수정 내용' : '답글 내용');
    field.placeholder = type === 'edit' ? '수정할 내용을 입력하세요' : '답글을 입력하세요';
    if (type === 'edit') field.value = view.item.text || '';
    const send = form.querySelector('[type="submit"]'); send.textContent = type === 'edit' ? '저장' : '등록';
    const update = () => { send.disabled = !field.value.trim() || (type === 'edit' && field.value.trim() === view.item.text); resizeField(field); };
    field.addEventListener('input', update);
    form.querySelector('.comment-cancel').addEventListener('click', () => {
      form.hidden = true; view.node.querySelector(type === 'edit' ? '[data-comment-edit]' : '[data-reply]').focus({ preventScroll: true });
    });
    form.addEventListener('submit', event => {
      event.preventDefault(); const value = field.value.trim(); if (!value) return;
      const saved = persist(state, candidate => {
        const target = findComment(candidate.comments, view.item.id); if (!target) return false;
        if (type === 'edit') {
          if (!canEdit(target)) return false;
          target.text = value; target.edited = true;
        } else {
          const root = findComment(candidate.comments, view.rootId); if (!root) return false;
          root.replies ||= [];
          root.replies.push({ id: newId(state, 'reply'), authorId: user.id, author: user.name, avatar: user.avatar, time: '방금 전', text: value, mention: target.author || '', likes: 0, liked: false, replies: [] });
        }
      });
      if (!saved) return;
      if (type === 'reply') {
        field.value = '';
        const root = state.views.get(String(view.rootId)); root.repliesOpen = true;
      }
      form.hidden = true; send.disabled = true; render(state);
      view.node.querySelector(type === 'edit' ? '[data-comment-edit]' : '[data-reply]').focus({ preventScroll: true });
      showStatus(state, type === 'edit' ? '댓글을 수정했습니다.' : '답글을 등록했습니다.');
    });
    view.forms.set(type, form); view.node.querySelector('.comment-actions').after(form);
    update(); field.focus({ preventScroll: true });
  }
  function attach(post) {
    if (controllers.has(post)) return;
    const trigger = post.querySelector('[data-comments-open]'); if (!trigger) return;
    const section = document.createElement('section'); section.className = 'comments-section'; section.hidden = true; section.id = `post-comments-${++sequence}`;
    const titleId = `${section.id}-title`; section.setAttribute('aria-labelledby', titleId);
    section.innerHTML = `<div class="comments-heading"><h3 id="${titleId}">댓글 <span data-inline-comments-count>0</span></h3><label class="comments-sort-row"><span class="comments-sr-only">댓글 정렬</span><select data-comments-sort aria-label="댓글 정렬"><option value="latest">최신순</option><option value="popular">인기순</option></select></label></div><form class="comments-compose"><img class="comments-avatar" alt=""><textarea aria-label="댓글 내용" placeholder="따뜻한 댓글을 남겨보세요 :)" maxlength="2000" required autocomplete="off" rows="1"></textarea><button class="comment-submit" type="submit" disabled>등록</button></form><div class="comments-status" role="status" aria-live="polite"><span></span><button type="button" data-comments-retry hidden>다시 불러오기</button></div><p class="comments-empty" hidden>첫 댓글을 남겨보세요.</p><div class="comments-list"></div><button type="button" class="comments-more" data-comments-more hidden></button>`;
    post.append(section);
    const avatar = post.querySelector('.post-head img');
    const state = { post, id: post.dataset.postId, authorId: post.dataset.authorId || '', author: post.querySelector('.post-head strong')?.textContent.trim() || '', avatar: avatar?.currentSrc || avatar?.getAttribute('src') || '', trigger, section, views: new Map(), visible: 2, readError: false, thread: null, list: section.querySelector('.comments-list'), sort: section.querySelector('[data-comments-sort]'), more: section.querySelector('[data-comments-more]'), empty: section.querySelector('.comments-empty'), status: section.querySelector('.comments-status'), statusText: section.querySelector('.comments-status > span'), retry: section.querySelector('[data-comments-retry]') };
    controllers.set(post, state);
    trigger.removeAttribute('aria-haspopup'); trigger.setAttribute('aria-controls', section.id); trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-label', '댓글 보기');
    trigger.addEventListener('click', () => {
      section.hidden = !section.hidden;
      trigger.setAttribute('aria-expanded', String(!section.hidden)); trigger.setAttribute('aria-label', section.hidden ? '댓글 보기' : '댓글 접기');
      if (!section.hidden) section.querySelectorAll('textarea').forEach(resizeField);
    });
    state.sort.addEventListener('change', () => render(state));
    state.more.addEventListener('click', () => { state.visible += 10; render(state); });
    state.retry.addEventListener('click', () => load(state));
    const compose = section.querySelector('.comments-compose'); const field = compose.querySelector('textarea'); const send = compose.querySelector('button');
    setImage(compose.querySelector('img'), user.avatar || state.avatar);
    field.addEventListener('input', () => { send.disabled = !field.value.trim(); resizeField(field); });
    compose.addEventListener('submit', event => {
      event.preventDefault(); const value = field.value.trim(); if (!value) return;
      if (!persist(state, candidate => {
        const order = candidate.comments.reduce((max, item) => Math.max(max, Number(item.order) || 0), 0) + 1;
        candidate.comments.push({ id: newId(state, 'comment'), order, authorId: user.id, author: user.name, avatar: user.avatar, time: '방금 전', text: value, likes: 0, liked: false, replies: [] });
      })) return;
      field.value = ''; send.disabled = true; resizeField(field);
      state.sort.value = 'latest'; render(state); field.focus({ preventScroll: true }); showStatus(state, '댓글을 등록했습니다.');
    });
    load(state);
  }
  function attachAll() { document.querySelectorAll('.post-card[data-post-id]').forEach(attach); }
  attachAll();
  window.addEventListener('misamo:post-rendered', attachAll);
  function resizeVisibleFields() { document.querySelectorAll('.comments-section textarea').forEach(resizeField); }
  window.addEventListener('resize', resizeVisibleFields);
  window.addEventListener('misamo:view', () => {
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(resizeVisibleFields);
    else resizeVisibleFields();
  });
})();
