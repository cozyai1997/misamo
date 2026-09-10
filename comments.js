(function () {
  'use strict';

  function initComments() {
    if (window.__misamoCommentsInitialized) return;
    window.__misamoCommentsInitialized = true;

    const store = window.MisamoStore;
    const user = store?.USER || { id: 'demo-me', name: 'misamo_korea', avatar: '' };
    const threads = new Map();
    let context = null;
    let thread = null;
    let trigger = null;
    let sortMode = 'latest';
    let activeForm = null;
    let idSequence = 0;

    const dialog = document.createElement('dialog');
    dialog.className = 'comments-dialog';
    dialog.setAttribute('aria-labelledby', 'comments-title');
    dialog.innerHTML = `
      <div class="comments-shell">
        <header class="comments-header"><h2 id="comments-title">댓글 <span data-dialog-count></span></h2><button type="button" class="icon-button" data-comments-close aria-label="댓글 창 닫기" autofocus><i data-lucide="x"></i></button></header>
        <div class="comments-scroll">
          <section class="comments-summary" aria-label="게시글 요약">
            <div class="comments-author"><img class="comments-avatar" alt=""><span><strong></strong><small></small></span></div>
            <div class="comments-post"><div><h3></h3><p></p></div><img alt="게시글 이미지"></div>
            <div class="comments-metrics"><button type="button" class="action-button" data-dialog-like aria-label="좋아요" aria-pressed="false"><i data-lucide="heart"></i><span data-like-count></span></button><span><i data-lucide="message-circle"></i><span data-dialog-count></span></span><span><i data-lucide="send"></i>15</span></div>
          </section>
          <form class="comments-compose"><img class="comments-avatar" alt=""><input aria-label="댓글 내용" placeholder="따뜻한 댓글을 남겨보세요 :)" maxlength="2000" required autocomplete="off"><button class="comment-submit" type="submit" disabled>등록</button></form>
          <div class="comments-sort-row"><select aria-label="댓글 정렬"><option value="latest">최신순</option><option value="popular">인기순</option></select></div>
          <div class="comments-list"></div>
        </div>
        <span class="comments-status" role="status" aria-live="polite"></span>
      </div>`;
    document.body.append(dialog);

    const list = dialog.querySelector('.comments-list');
    const compose = dialog.querySelector('.comments-compose');
    const input = compose.querySelector('input');
    const submit = compose.querySelector('button');
    const status = dialog.querySelector('[role="status"]');
    const modalLike = dialog.querySelector('[data-dialog-like]');
    const sort = dialog.querySelector('select');

    const copy = value => JSON.parse(JSON.stringify(value));
    const validThread = value => Boolean(value) && Number.isFinite(Number(value.total)) && Number(value.total) >= 0 && Array.isArray(value.comments);
    const messageOf = (error, fallback) => error && typeof error.message === 'string' && error.message.trim() ? error.message : fallback;

    document.querySelectorAll('.post-card[data-post-id]').forEach(post => {
      try {
        const saved = store?.readComments(post.dataset.postId);
        if (validThread(saved)) post.querySelector('[data-comments-count]')?.replaceChildren(String(saved.total));
      } catch (_) { /* Preserve the visible seed count when saved data is unavailable. */ }
    });

    function initialThread(post) {
      if (post.postId !== 'demo-cafe') return { total: 0, comments: [] };
      return {
        total: 23,
        comments: [
          { id: 'demo-1', authorId: 'growth-ceo', author: 'growth_ceo', time: '2시간 전', order: 1, text: '정말 도움이 되는 글이에요! 혹시 초기 비용은 어느 정도 들었는지 자세히 공유해주실 수 있을까요?', likes: 12, replies: [] },
          { id: 'demo-2', authorId: 'cafe-dreamer', author: 'cafe_dreamer', time: '1시간 전', order: 2, text: '저도 지금 카페 창업 준비 중인데 많은 도움이 됐어요 😊\n컨설팅은 어떤 과정으로 진행되나요?', likes: 8, replies: [
            { id: 'demo-3', authorId: post.authorId || 'startup-hello', author: post.author || 'startup_hello', time: '1시간 전', text: '컨설팅은 상권 분석부터 메뉴 구성, 인테리어, 운영 전략까지 단계별로 진행됐어요! 자세한 내용은 따로 정리해볼게요 :)', mention: 'cafe_dreamer', likes: 6, replies: [] },
          ] },
          { id: 'demo-4', authorId: 'biz-master', author: 'biz_master', time: '55분 전', order: 3, text: '준비 과정을 공유해주셔서 감사합니다. 앞으로의 창업도 응원합니다!', likes: 3, replies: [] },
        ],
      };
    }

    function showStatus(message, isError = false) {
      status.textContent = message;
      status.removeAttribute('style');
      status.removeAttribute('data-status-error');
      if (!isError) return;
      status.dataset.statusError = 'true';
      Object.assign(status.style, {
        position: 'static', width: 'auto', height: 'auto', overflow: 'visible', clipPath: 'none', display: 'block',
        margin: '0 26px 16px', padding: '10px 12px', borderRadius: '7px', background: '#fff0f3', color: '#a5233c', fontSize: '12px', lineHeight: '1.5',
      });
    }

    function loadThread(post) {
      if (threads.has(post.postId)) return { value: threads.get(post.postId), error: '' };
      try {
        const stored = store?.readComments(post.postId) ?? null;
        if (stored !== null && !validThread(stored)) throw new Error('저장된 댓글 형식을 확인할 수 없습니다. 기존 데이터는 변경하지 않았습니다.');
        const value = stored === null ? initialThread(post) : { total: Number(stored.total), comments: stored.comments };
        const cloned = copy(value);
        threads.set(post.postId, cloned);
        return { value: cloned, error: '' };
      } catch (error) {
        return { value: initialThread(post), error: messageOf(error, '댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.') };
      }
    }

    function saveThread(candidate) {
      try {
        if (!store?.saveComments) throw new Error('댓글 저장 기능을 사용할 수 없습니다.');
        const saved = store.saveComments(context.postId, candidate);
        thread = copy(validThread(saved) ? saved : candidate);
        threads.set(context.postId, thread);
        return true;
      } catch (error) {
        showStatus(messageOf(error, '댓글을 저장하지 못했습니다. 입력한 내용은 그대로 두었습니다.'), true);
        return false;
      }
    }

    function imageSource(image) {
      return image ? image.currentSrc || image.getAttribute('src') || '' : '';
    }

    function setImage(image, source, alt = '') {
      if (!source) {
        image.hidden = true;
        image.removeAttribute('src');
        image.alt = '';
        return;
      }
      image.hidden = false;
      image.src = source;
      image.alt = alt;
    }

    function readContext(openButton) {
      const post = openButton.closest('.post-card[data-post-id]');
      if (!post) return null;
      return {
        postId: post.dataset.postId,
        authorId: post.dataset.authorId || '',
        author: post.querySelector('.post-head strong')?.textContent?.trim() || '',
        avatar: imageSource(post.querySelector('.post-head img')),
        time: post.querySelector('.post-head small')?.textContent?.trim() || '',
        title: post.querySelector('.post-copy h2')?.textContent?.trim() || '',
        body: (post.querySelector('.post-rich-body') || post.querySelector('.post-copy p'))?.textContent?.trim() || '',
        image: post.querySelector('.post-image, .post-rich-body .posting-inline-image'),
        like: post.querySelector('[data-like-button]'),
      };
    }

    function updateSummary() {
      setImage(dialog.querySelector('.comments-author .comments-avatar'), context.avatar);
      setImage(compose.querySelector('.comments-avatar'), user.avatar || context.avatar);
      dialog.querySelector('.comments-author strong').textContent = context.author;
      dialog.querySelector('.comments-author small').textContent = context.time;
      dialog.querySelector('.comments-post h3').textContent = context.title;
      dialog.querySelector('.comments-post p').textContent = context.body;
      setImage(dialog.querySelector('.comments-post > img'), imageSource(context.image), context.image?.alt || '');
    }

    function updateTotals() {
      const count = String(thread.total);
      trigger?.querySelector('[data-comments-count]')?.replaceChildren(count);
      dialog.querySelectorAll('[data-dialog-count]').forEach(element => { element.textContent = count; });
    }

    function syncPostLike() {
      const count = context?.like?.querySelector('[data-like-count]');
      if (!context?.like || !count) {
        modalLike.hidden = true;
        modalLike.disabled = true;
        return;
      }
      modalLike.hidden = false;
      modalLike.disabled = false;
      modalLike.setAttribute('aria-pressed', context.like.getAttribute('aria-pressed') || 'false');
      modalLike.setAttribute('aria-label', context.like.getAttribute('aria-label') || '좋아요');
      modalLike.classList.toggle('liked', context.like.classList.contains('liked'));
      modalLike.querySelector('[data-like-count]').textContent = count.textContent;
    }

    function findComment(comments, id) {
      for (const comment of comments) {
        if (String(comment.id) === String(id)) return comment;
        const nested = findComment(comment.replies || [], id);
        if (nested) return nested;
      }
      return null;
    }

    function newId(prefix) {
      let id;
      do {
        idSequence += 1;
        id = `${prefix}-${Date.now().toString(36)}-${idSequence.toString(36)}`;
      } while (findComment(thread.comments, id));
      return id;
    }

    function isPostAuthor(comment) {
      return context.authorId ? comment.authorId === context.authorId : Boolean(context.author) && comment.author === context.author;
    }

    const canEdit = comment => Boolean(comment.authorId) && comment.authorId === user.id;

    function renderItem(comment, rootId) {
      const item = document.createElement('article');
      item.className = 'comment-item';
      item.dataset.commentId = String(comment.id);
      item.innerHTML = '<img class="comments-avatar" alt=""><div class="comment-content"><div class="comment-meta"><strong></strong><small></small></div><p class="comment-text"></p><div class="comment-actions"><button type="button" data-reply>답글 달기</button><button type="button" data-comment-like aria-label="댓글 좋아요" aria-pressed="false"><i data-lucide="heart"></i><span></span></button></div><div class="comment-replies"></div></div>';
      setImage(item.querySelector('img'), comment.avatar || context.avatar || user.avatar);
      item.querySelector('strong').textContent = comment.author || '';
      item.querySelector('small').textContent = comment.time || '';
      if (comment.edited) {
        const edited = document.createElement('small');
        edited.className = 'comment-edited';
        edited.textContent = '수정됨';
        item.querySelector('.comment-meta').append(edited);
      }
      if (isPostAuthor(comment)) {
        const badge = document.createElement('span');
        badge.className = 'comment-author-badge';
        badge.textContent = '작성자';
        item.querySelector('.comment-meta').append(badge);
      }
      const text = item.querySelector('.comment-text');
      if (comment.mention) {
        const mention = document.createElement('span');
        mention.className = 'comment-mention';
        mention.textContent = `@${comment.mention} `;
        text.append(mention);
      }
      text.append(document.createTextNode(comment.text || ''));

      const like = item.querySelector('[data-comment-like]');
      like.setAttribute('aria-pressed', String(Boolean(comment.liked)));
      like.querySelector('span').textContent = String(Number(comment.likes) || 0);
      like.addEventListener('click', () => {
        const candidate = copy(thread);
        const changed = findComment(candidate.comments, comment.id);
        if (!changed) return;
        changed.liked = !Boolean(changed.liked);
        changed.likes = Math.max(0, (Number(changed.likes) || 0) + (changed.liked ? 1 : -1));
        if (!saveThread(candidate)) return;
        render();
        showStatus(changed.liked ? '댓글에 좋아요를 표시했습니다.' : '댓글 좋아요를 취소했습니다.');
      });
      item.querySelector('[data-reply]').addEventListener('click', () => openReply(item, comment.id, rootId || comment.id));
      if (canEdit(comment)) {
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.dataset.commentEdit = '';
        edit.textContent = '수정';
        edit.addEventListener('click', () => openEdit(item, comment.id));
        item.querySelector('.comment-actions').append(edit);
      }
      (comment.replies || []).forEach(reply => item.querySelector('.comment-replies').append(renderItem(reply, rootId || comment.id)));
      return item;
    }

    function render() {
      activeForm = null;
      const sorted = [...thread.comments].sort((a, b) => sortMode === 'popular'
        ? (Number(b.likes) || 0) - (Number(a.likes) || 0)
        : (Number(b.order) || 0) - (Number(a.order) || 0));
      list.replaceChildren(...sorted.map(comment => renderItem(comment, comment.id)));
      window.createMisamoIcons?.();
    }

    function openReply(item, targetId, rootId) {
      activeForm?.remove();
      const currentTarget = findComment(thread.comments, targetId);
      if (!currentTarget) return;
      const form = document.createElement('form');
      activeForm = form;
      form.className = 'comment-reply-form';
      form.innerHTML = '<label></label><input aria-label="답글 내용" maxlength="2000" required placeholder="답글을 입력하세요"><button class="comment-submit" type="submit" disabled>등록</button><button class="comment-cancel" type="button">취소</button>';
      form.querySelector('label').textContent = `${currentTarget.author || ''}님에게 답글`;
      const field = form.querySelector('input');
      const send = form.querySelector('[type="submit"]');
      field.addEventListener('input', () => { send.disabled = !field.value.trim(); });
      form.querySelector('[type="button"]').addEventListener('click', () => { form.remove(); item.querySelector('[data-reply]')?.focus(); });
      form.addEventListener('submit', event => {
        event.preventDefault();
        const value = field.value.trim();
        if (!value) return;
        const candidate = copy(thread);
        const root = findComment(candidate.comments, rootId);
        const target = findComment(candidate.comments, targetId);
        if (!root || !target) return;
        root.replies ||= [];
        root.replies.push({ id: newId('reply'), authorId: user.id, author: user.name, avatar: user.avatar, time: '방금 전', text: value, mention: target.author || '', likes: 0, liked: false, replies: [] });
        candidate.total += 1;
        if (!saveThread(candidate)) return;
        updateTotals();
        render();
        input.focus();
        showStatus('답글을 등록했습니다.');
      });
      item.querySelector('.comment-content').append(form);
      field.focus();
    }

    function openEdit(item, commentId) {
      const current = findComment(thread.comments, commentId);
      if (!current || !canEdit(current)) return;
      activeForm?.remove();
      const form = document.createElement('form');
      activeForm = form;
      form.className = 'comment-reply-form comment-edit-form';
      form.innerHTML = '<label>댓글 수정</label><textarea aria-label="댓글 수정 내용" maxlength="2000" required rows="3"></textarea><button class="comment-submit" type="submit" disabled>저장</button><button class="comment-cancel" type="button">취소</button>';
      const field = form.querySelector('textarea');
      const save = form.querySelector('[type="submit"]');
      field.value = current.text || '';
      field.addEventListener('input', () => { save.disabled = !field.value.trim() || field.value.trim() === current.text; });
      form.querySelector('[type="button"]').addEventListener('click', () => { form.remove(); item.querySelector('[data-comment-edit]')?.focus(); });
      form.addEventListener('submit', event => {
        event.preventDefault();
        const value = field.value.trim();
        const latest = findComment(thread.comments, commentId);
        if (!latest || !canEdit(latest) || !value || value === latest.text) return;
        const candidate = copy(thread);
        const changed = findComment(candidate.comments, commentId);
        if (!changed || !canEdit(changed)) return;
        changed.text = value;
        changed.edited = true;
        if (!saveThread(candidate)) return;
        render();
        Array.from(list.querySelectorAll('[data-comment-id]')).find(node => node.dataset.commentId === String(commentId))?.querySelector('[data-comment-edit]')?.focus();
        showStatus('댓글을 수정했습니다.');
      });
      item.querySelector('.comment-actions').after(form);
      field.focus();
    }

    input.addEventListener('input', () => { submit.disabled = !input.value.trim(); });
    compose.addEventListener('submit', event => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value || !thread) return;
      const candidate = copy(thread);
      const order = thread.comments.reduce((max, comment) => Number.isFinite(Number(comment.order)) ? Math.max(max, Number(comment.order)) : max, 0) + 1;
      candidate.comments.push({ id: newId('comment'), order, authorId: user.id, author: user.name, avatar: user.avatar, time: '방금 전', text: value, likes: 0, liked: false, replies: [] });
      candidate.total += 1;
      if (!saveThread(candidate)) return;
      updateTotals();
      input.value = '';
      submit.disabled = true;
      sortMode = 'latest';
      sort.value = sortMode;
      render();
      input.focus();
      showStatus('댓글을 등록했습니다.');
    });
    sort.addEventListener('change', event => { sortMode = event.target.value; render(); });
    modalLike.addEventListener('click', () => { if (context?.like) { context.like.click(); syncPostLike(); } });

    document.addEventListener('click', event => {
      const openButton = event.target.closest?.('[data-comments-open]');
      if (!openButton) return;
      const nextContext = readContext(openButton);
      if (!nextContext?.postId) return;
      if (context && context.postId !== nextContext.postId) {
        input.value = '';
        submit.disabled = true;
      }
      context = nextContext;
      trigger = openButton;
      const loaded = loadThread(context);
      thread = loaded.value;
      showStatus('');
      updateSummary();
      updateTotals();
      syncPostLike();
      render();
      if (!dialog.open) dialog.showModal();
      document.body.classList.add('comments-open');
      dialog.querySelector('.comments-scroll').scrollTop = 0;
      if (loaded.error) showStatus(loaded.error, true);
    });
    dialog.querySelector('[data-comments-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('comments-open');
      if (trigger?.isConnected) trigger.focus();
    });
  }

  initComments();
})();
