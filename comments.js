function initComments() {
  const trigger = document.querySelector('[data-comments-open]');
  if (!trigger) return;
  const post = trigger.closest('.post-card');
  const postLike = post.querySelector('[data-like-button]');
  const avatarUrl = post.querySelector('.post-head img').src;
  const authorName = post.querySelector('.post-head strong').textContent;
  let total = Number(trigger.querySelector('[data-comments-count]').textContent);
  let nextId = 10;
  let sortMode = 'latest';
  let replyForm;
  const comments = [
    { id: 1, author: 'growth_ceo', time: '2시간 전', order: 1, text: '정말 도움이 되는 글이에요! 혹시 초기 비용은 어느 정도 들었는지 자세히 공유해주실 수 있을까요?', likes: 12, replies: [] },
    { id: 2, author: 'cafe_dreamer', time: '1시간 전', order: 2, text: '저도 지금 카페 창업 준비 중인데 많은 도움이 됐어요 😊\n컨설팅은 어떤 과정으로 진행되나요?', likes: 8, replies: [
      { id: 3, author: authorName, time: '1시간 전', text: '컨설팅은 상권 분석부터 메뉴 구성, 인테리어, 운영 전략까지 단계별로 진행됐어요! 자세한 내용은 따로 정리해볼게요 :)', mention: 'cafe_dreamer', likes: 6 }
    ] },
    { id: 4, author: 'biz_master', time: '55분 전', order: 3, text: '준비 과정을 공유해주셔서 감사합니다. 앞으로의 창업도 응원합니다!', likes: 3, replies: [] }
  ];
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
          <div class="comments-metrics"><button type="button" class="action-button" data-like-button data-dialog-like aria-label="좋아요" aria-pressed="false"><i data-lucide="heart"></i><span data-like-count></span></button><span><i data-lucide="message-circle"></i><span data-dialog-count></span></span><span><i data-lucide="send"></i>15</span></div>
        </section>
        <form class="comments-compose"><img class="comments-avatar" alt=""><input aria-label="댓글 내용" placeholder="따뜻한 댓글을 남겨보세요 :)" maxlength="2000" required autocomplete="off"><button class="comment-submit" type="submit" disabled>등록</button></form>
        <div class="comments-sort-row"><select aria-label="댓글 정렬"><option value="latest">최신순</option><option value="popular">인기순</option></select></div>
        <div class="comments-list"></div>
      </div>
      <span class="comments-status" role="status" aria-live="polite"></span>
    </div>`;
  document.body.append(dialog);
  dialog.querySelectorAll('.comments-avatar').forEach(img => { img.src = avatarUrl; });
  dialog.querySelector('.comments-author strong').textContent = authorName;
  dialog.querySelector('.comments-author small').textContent = post.querySelector('.post-head small').textContent;
  dialog.querySelector('.comments-post h3').textContent = post.querySelector('.post-copy h2').textContent;
  dialog.querySelector('.comments-post p').textContent = post.querySelector('.post-copy p').textContent.trim();
  dialog.querySelector('.comments-post > img').src = post.querySelector('.post-image').src;
  const list = dialog.querySelector('.comments-list');
  const compose = dialog.querySelector('.comments-compose');
  const input = compose.querySelector('input');
  const submit = compose.querySelector('button');
  const status = dialog.querySelector('[role="status"]');
  const modalLike = dialog.querySelector('[data-dialog-like]');

  function updateTotals() {
    trigger.querySelector('[data-comments-count]').textContent = String(total);
    dialog.querySelectorAll('[data-dialog-count]').forEach(el => { el.textContent = String(total); });
  }
  function syncPostLike() {
    modalLike.setAttribute('aria-pressed', postLike.getAttribute('aria-pressed'));
    modalLike.setAttribute('aria-label', postLike.getAttribute('aria-label'));
    modalLike.querySelector('[data-like-count]').textContent = postLike.querySelector('[data-like-count]').textContent;
  }
  modalLike.addEventListener('click', () => { postLike.click(); syncPostLike(); });

  function renderItem(comment, root) {
    const item = document.createElement('article');
    item.className = 'comment-item';
    item.dataset.commentId = String(comment.id);
    item.innerHTML = `<img class="comments-avatar" alt=""><div class="comment-content"><div class="comment-meta"><strong></strong><small></small></div><p class="comment-text"></p><div class="comment-actions"><button type="button" data-reply>답글 달기</button><button type="button" data-comment-like aria-label="댓글 좋아요" aria-pressed="false"><i data-lucide="heart"></i><span></span></button></div><div class="comment-replies"></div></div>`;
    item.querySelector('img').src = avatarUrl;
    item.querySelector('strong').textContent = comment.author;
    item.querySelector('small').textContent = comment.time;
    if (comment.edited) {
      const edited = document.createElement('small');
      edited.className = 'comment-edited'; edited.textContent = '수정됨';
      item.querySelector('.comment-meta').append(edited);
    }
    if (comment.author === authorName) {
      const badge = document.createElement('span'); badge.className = 'comment-author-badge'; badge.textContent = '작성자';
      item.querySelector('.comment-meta').append(badge);
    }
    const text = item.querySelector('.comment-text');
    if (comment.mention) {
      const mention = document.createElement('span'); mention.className = 'comment-mention'; mention.textContent = `@${comment.mention} `; text.append(mention);
    }
    text.append(document.createTextNode(comment.text));
    const like = item.querySelector('[data-comment-like]');
    like.setAttribute('aria-pressed', String(Boolean(comment.liked)));
    like.querySelector('span').textContent = String(comment.likes);
    like.addEventListener('click', () => {
      comment.liked = !comment.liked; comment.likes += comment.liked ? 1 : -1;
      like.setAttribute('aria-pressed', String(comment.liked));
      like.querySelector('span').textContent = String(comment.likes);
    });
    item.querySelector('[data-reply]').addEventListener('click', () => openReply(item, comment, root || comment));
    if (comment.author === authorName) {
      const edit = document.createElement('button');
      edit.type = 'button'; edit.dataset.commentEdit = ''; edit.textContent = '수정';
      edit.addEventListener('click', () => openEdit(item, comment));
      item.querySelector('.comment-actions').append(edit);
    }
    (comment.replies || []).forEach(reply => item.querySelector('.comment-replies').append(renderItem(reply, comment)));
    return item;
  }
  function render() {
    replyForm = null;
    const sorted = [...comments].sort((a, b) => sortMode === 'popular' ? b.likes - a.likes : b.order - a.order);
    list.replaceChildren(...sorted.map(c => renderItem(c)));
    createMisamoIcons();
  }
  function openReply(item, target, root) {
    replyForm?.remove();
    const form = document.createElement('form'); replyForm = form; form.className = 'comment-reply-form';
    form.innerHTML = '<label></label><input aria-label="답글 내용" maxlength="2000" required placeholder="답글을 입력하세요"><button class="comment-submit" type="submit" disabled>등록</button><button class="comment-cancel" type="button">취소</button>';
    form.querySelector('label').textContent = `${target.author}님에게 답글`;
    const field = form.querySelector('input'); const send = form.querySelector('[type="submit"]');
    field.addEventListener('input', () => { send.disabled = !field.value.trim(); });
    form.querySelector('[type="button"]').addEventListener('click', () => { form.remove(); item.querySelector('[data-reply]').focus(); });
    form.addEventListener('submit', event => {
      event.preventDefault(); const value = field.value.trim(); if (!value) return;
      root.replies.push({ id: nextId++, author: authorName, time: '방금 전', text: value, mention: target.author, likes: 0 });
      total++; updateTotals(); render(); input.focus(); status.textContent = '답글을 등록했습니다.';
    });
    item.querySelector('.comment-content').append(form); field.focus();
  }
  function openEdit(item, comment) {
    if (comment.author !== authorName) return;
    replyForm?.remove();
    const form = document.createElement('form');
    replyForm = form; form.className = 'comment-reply-form comment-edit-form';
    form.innerHTML = '<label>댓글 수정</label><textarea aria-label="댓글 수정 내용" maxlength="2000" required rows="3"></textarea><button class="comment-submit" type="submit" disabled>저장</button><button class="comment-cancel" type="button">취소</button>';
    const field = form.querySelector('textarea');
    const save = form.querySelector('[type="submit"]');
    field.value = comment.text;
    field.addEventListener('input', () => {
      save.disabled = !field.value.trim() || field.value.trim() === comment.text;
    });
    form.querySelector('[type="button"]').addEventListener('click', () => {
      form.remove(); item.querySelector('[data-comment-edit]').focus();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = field.value.trim();
      if (comment.author !== authorName || !value || value === comment.text) return;
      comment.text = value; comment.edited = true;
      render();
      list.querySelector(`[data-comment-id="${comment.id}"] [data-comment-edit]`).focus();
      status.textContent = '댓글을 수정했습니다.';
    });
    item.querySelector('.comment-actions').after(form); field.focus();
  }
  input.addEventListener('input', () => { submit.disabled = !input.value.trim(); });
  compose.addEventListener('submit', event => {
    event.preventDefault(); const value = input.value.trim(); if (!value) return;
    const id = nextId++;
    comments.push({ id, order: id, author: authorName, time: '방금 전', text: value, likes: 0, replies: [] });
    total++; updateTotals(); input.value = ''; submit.disabled = true;
    sortMode = 'latest'; dialog.querySelector('select').value = sortMode; render();
    input.focus(); status.textContent = '댓글을 등록했습니다.';
  });
  dialog.querySelector('select').addEventListener('change', event => { sortMode = event.target.value; render(); });
  trigger.addEventListener('click', () => {
    updateTotals(); syncPostLike(); render(); dialog.showModal(); document.body.classList.add('comments-open');
    dialog.querySelector('.comments-scroll').scrollTop = 0;
  });
  dialog.querySelector('[data-comments-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('comments-open'); trigger.focus(); });
}

initComments();
