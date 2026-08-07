/*
  EDIT: Interactive behavior for the Misamo static GUI.
  Keep selectors tied to data-* attributes so HTML classes can stay focused on styling.
*/

const HERO_SLIDES = [
  {
    title: '\uBBF8\uB798 \uC0AC\uC7A5\uB2D8\uC758<br />\uC2DC\uC791\uC744 \uD568\uAED8\uD569\uB2C8\uB2E4 <span>\uD83D\uDC97</span>',
    description: '\uCC3D\uC5C5 \uC815\uBCF4\uBD80\uD130 \uCEE8\uC124\uD305, \uB124\uD2B8\uC6CC\uD0B9\uAE4C\uC9C0<br />\uC131\uACF5 \uCC3D\uC5C5\uC758 \uBAA8\uB4E0 \uC5EC\uC815\uC744 \uD568\uAED8\uD574\uC694.',
    kicker: 'Your<br />Success',
    desktopImage: './img/hero-pc-home.svg',
    mobileImage: './img/mobile-hero-home.svg',
    background:
      'radial-gradient(circle at 88% 25%, rgba(255, 255, 255, 0.7), transparent 22%), linear-gradient(105deg, #f2cdd2 0%, #f3d5e4 42%, #d7c9fb 100%)',
  },
  {
    title: '\uAC80\uC99D\uB41C \uCC3D\uC5C5 \uC815\uBCF4\uB85C<br />\uC900\uBE44 \uC2DC\uAC04\uC744 \uC904\uC774\uC138\uC694 <span>\u2728</span>',
    description: '\uC9C0\uC6D0 \uC0AC\uC5C5, \uBE44\uC6A9 \uACC4\uD68D, \uB9E4\uC7A5 \uC6B4\uC601 \uD301\uAE4C\uC9C0<br />\uD544\uC694\uD55C \uC815\uBCF4\uB9CC \uACE8\uB77C \uBE60\uB974\uAC8C \uD655\uC778\uD574\uC694.',
    kicker: 'Smart<br />Start',
    desktopImage: './img/hero-pc-info.svg',
    mobileImage: './img/mobile-hero-info.svg',
    background:
      'radial-gradient(circle at 88% 25%, rgba(255, 255, 255, 0.72), transparent 22%), linear-gradient(105deg, #d7e9ff 0%, #eff6ff 46%, #dff7ee 100%)',
  },
  {
    title: '\uD63C\uC790 \uACE0\uBBFC\uD558\uC9C0 \uB9D0\uACE0<br />\uD568\uAED8 \uC131\uC7A5\uD558\uC138\uC694 <span>\u25C6</span>',
    description: '\uCEE8\uC124\uD305 \uD6C4\uAE30\uC640 \uB124\uD2B8\uC6CC\uD0B9 \uC18C\uC2DD\uC73C\uB85C<br />\uAC19\uC740 \uAE38\uC744 \uAC77\uB294 \uC0AC\uB78C\uB4E4\uC744 \uB9CC\uB098\uBCF4\uC138\uC694.',
    kicker: 'Grow<br />Together',
    desktopImage: './img/hero-pc-community.svg',
    mobileImage: './img/mobile-hero-community.svg',
    background:
      'radial-gradient(circle at 88% 25%, rgba(255, 255, 255, 0.72), transparent 22%), linear-gradient(105deg, #ffe5cf 0%, #fff2d8 44%, #e6ddff 100%)',
  },
];

const COMMENT_SEED = [
  {
    id: 'comment-growth',
    author: 'growth_ceo',
    avatar: './img/profile-growth.jpg',
    time: '2\uC2DC\uAC04 \uC804',
    text: '\uC815\uB9D0 \uB3C4\uC6C0\uC774 \uB418\uB294 \uAE00\uC774\uC5D0\uC694! \uCD08\uAE30 \uBE44\uC6A9\uC740 \uC5B4\uB290 \uC815\uB3C4 \uB4E4\uC5C8\uB294\uC9C0 \uACF5\uC720\uD574\uC8FC\uC2E4 \uC218 \uC788\uC744\uAE4C\uC694?',
    likes: 12,
    replies: [],
  },
  {
    id: 'comment-dreamer',
    author: 'cafe_dreamer',
    avatar: './img/avatar-woman.jpg',
    time: '1\uC2DC\uAC04 \uC804',
    text: '\uC800\uB3C4 \uC9C0\uAE08 \uCE74\uD398 \uCC3D\uC5C5 \uC900\uBE44 \uC911\uC778\uB370 \uB9CE\uC740 \uB3C4\uC6C0\uC774 \uB410\uC5B4\uC694. \uCEE8\uC124\uD305\uC740 \uC5B4\uB5A4 \uACFC\uC815\uC73C\uB85C \uC9C4\uD589\uB418\uB098\uC694?',
    likes: 8,
    replies: [],
  },
  {
    id: 'comment-author',
    author: 'startup_hello',
    avatar: './img/profile-woman.jpg',
    time: '1\uC2DC\uAC04 \uC804',
    badge: '\uC791\uC131\uC790',
    text: '@cafe_dreamer \uB2D8, \uCEE8\uC124\uD305\uC740 \uC0C1\uAD8C \uBD84\uC11D\uBD80\uD130 \uBA54\uB274 \uAD6C\uC131, \uC778\uD14C\uB9AC\uC5B4, \uC6B4\uC601 \uC804\uB7B5\uAE4C\uC9C0 \uB2E8\uACC4\uBCC4\uB85C \uC9C4\uD589\uD588\uC5B4\uC694! \uC790\uC138\uD55C \uB0B4\uC6A9\uC740 \uB530\uB85C \uC815\uB9AC\uD574\uBCFC\uAC8C\uC694 :)',
    likes: 6,
    replies: [],
  },
  {
    id: 'comment-master',
    author: 'biz_master',
    avatar: './img/avatar-man.jpg',
    time: '55\uBD84 \uC804',
    text: '\uC0AC\uC5C5\uACC4\uD68D\uC11C \uC900\uBE44 \uD301\uB3C4 \uC774\uC5B4\uC11C \uC62C\uB824\uC8FC\uC2DC\uBA74 \uC88B\uACA0\uC2B5\uB2C8\uB2E4.',
    likes: 4,
    replies: [],
  },
];


let commentModalState = null;

document.addEventListener('DOMContentLoaded', () => {
  initHeroCarousel();
  initFeedControls();
  initActionButtons();
  initCommentModal();
  initPageNavigation();
  initExploreControls();
  initButtonFeedback();
  initProfileMenu();
  initMobileRecommendationScroller();
});

function initHeroCarousel() {
  const carousel = document.querySelector('[data-hero-carousel]');
  if (!carousel) return;

  const title = carousel.querySelector('[data-hero-title]');
  const description = carousel.querySelector('[data-hero-description]');
  const kicker = carousel.querySelector('[data-hero-kicker]');
  const pcArt = carousel.querySelector('[data-hero-pc-art]');
  const mobileArt = carousel.querySelector('[data-hero-mobile-art]');
  const dots = Array.from(carousel.querySelectorAll('[data-slide-to]'));
  const prev = carousel.querySelector('[data-hero-prev]');
  const next = carousel.querySelector('[data-hero-next]');
  let activeIndex = 0;
  let timerId = null;

  const goToSlide = (nextIndex) => {
    activeIndex = (nextIndex + HERO_SLIDES.length) % HERO_SLIDES.length;
    renderHeroSlide(carousel, title, description, kicker, dots, activeIndex, mobileArt, pcArt);
  };

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      goToSlide(Number(dot.dataset.slideTo));
      restartHeroTimer();
    });
  });

  prev?.addEventListener('click', () => {
    goToSlide(activeIndex - 1);
    restartHeroTimer();
  });

  next?.addEventListener('click', () => {
    goToSlide(activeIndex + 1);
    restartHeroTimer();
  });

  function startHeroTimer() {
    if (timerId) return;
    timerId = setInterval(() => goToSlide(activeIndex + 1), 5000);
  }

  function stopHeroTimer() {
    window.clearInterval(timerId);
    timerId = null;
  }

  function restartHeroTimer() {
    stopHeroTimer();
    startHeroTimer();
  }

  renderHeroSlide(carousel, title, description, kicker, dots, activeIndex, mobileArt, pcArt);
  startHeroTimer();
}

function renderHeroSlide(carousel, title, description, kicker, dots, activeIndex, mobileArt, pcArt) {
  const slide = HERO_SLIDES[activeIndex];
  carousel.classList.add('is-changing');

  window.setTimeout(() => {
    title.innerHTML = slide.title;
    description.innerHTML = slide.description;
    if (kicker && slide.kicker) {
      kicker.innerHTML = slide.kicker;
    }
    if (pcArt && slide.desktopImage) {
      pcArt.src = slide.desktopImage;
    }
    if (mobileArt && slide.mobileImage) {
      mobileArt.src = slide.mobileImage;
    }
    carousel.style.setProperty('--hero-bg', slide.background);
    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
    carousel.classList.remove('is-changing');
  }, 120);
}

function initMobileRecommendationScroller() {
  const track = document.querySelector('.mobile-recommend-track');
  if (!track) return;

  let startX = 0;
  let startScrollLeft = 0;
  let isDragging = false;

  track.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, a')) return;
    isDragging = true;
    startX = event.clientX;
    startScrollLeft = track.scrollLeft;
    track.classList.add('is-dragging');
    track.setPointerCapture(event.pointerId);
  });

  track.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    event.preventDefault();
    track.scrollLeft = startScrollLeft - (event.clientX - startX);
  });

  const stopDragging = () => {
    isDragging = false;
    track.classList.remove('is-dragging');
  };

  track.addEventListener('pointerup', stopDragging);
  track.addEventListener('pointercancel', stopDragging);
  track.addEventListener('pointerleave', stopDragging);
}

function initFeedControls() {
  const panel = document.querySelector('.feed-panel');
  if (!panel) return;

  const chips = Array.from(panel.querySelectorAll('[data-feed-filter]'));
  const posts = Array.from(panel.querySelectorAll('[data-post]'));
  const emptyState = panel.querySelector('[data-empty-state]');
  const searchInput = document.querySelector('[data-search-input]');
  const sortToggle = panel.querySelector('[data-sort-toggle]');
  const sortLabel = panel.querySelector('[data-sort-label]');
  const state = {
    filter: '?꾩껜',
    query: '',
    sort: 'latest',
  };

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      state.filter = chip.dataset.feedFilter;
      chips.forEach((item) => item.classList.toggle('active', item === chip));
      applyFeedState(panel, posts, emptyState, state);
    });
  });

  searchInput?.addEventListener('input', () => {
    state.query = searchInput.value.trim().toLowerCase();
    applyFeedState(panel, posts, emptyState, state);
  });

  sortToggle?.addEventListener('click', () => {
    state.sort = state.sort === 'latest' ? 'popular' : 'latest';
    sortLabel.textContent = state.sort === 'latest' ? '\uCD5C\uC2E0\uC21C' : '\uC778\uAE30\uC21C';
    applyFeedState(panel, posts, emptyState, state);
  });

  applyFeedState(panel, posts, emptyState, state);
}

function applyFeedState(panel, posts, emptyState, state) {
  const sortedPosts = [...posts].sort((a, b) => {
    if (state.sort === 'popular') {
      return Number(b.dataset.popularity) - Number(a.dataset.popularity);
    }
    return new Date(b.dataset.date) - new Date(a.dataset.date);
  });

  sortedPosts.forEach((post) => panel.appendChild(post));

  let visibleCount = 0;
  posts.forEach((post) => {
    const matchesFilter = state.filter === '?꾩껜' || post.dataset.category === state.filter;
    const matchesSearch = !state.query || post.textContent.toLowerCase().includes(state.query);
    const isVisible = matchesFilter && matchesSearch;
    post.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  if (emptyState) {
    emptyState.hidden = visibleCount > 0;
    panel.appendChild(emptyState);
  }
}

function initActionButtons() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    const count = button.querySelector('[data-action-count]');
    const initialCount = count ? Number(count.textContent) : 0;
    const initiallyPressed = button.getAttribute('aria-pressed') === 'true';
    const neutralCount = initialCount - (initiallyPressed ? 1 : 0);
    button.dataset.baseCount = String(neutralCount);

    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const isPressed = button.getAttribute('aria-pressed') === 'true';

      if (action === 'like') {
        button.classList.toggle('liked', !isPressed);
        button.setAttribute('aria-pressed', String(!isPressed));
        if (count) count.textContent = String(neutralCount + (isPressed ? 0 : 1));
        showToast(isPressed ? '醫뗭븘?붾? 痍⑥냼?덉뼱??' : '醫뗭븘?붾? ?뚮??댁슂.');
      }

      if (action === 'save') {
        button.classList.toggle('saved', !isPressed);
        button.setAttribute('aria-pressed', String(!isPressed));
        showToast(isPressed ? '??μ쓣 痍⑥냼?덉뼱??' : '??ν뻽?듬땲??');
      }

      if (action === 'share') {
        button.classList.add('shared');
        button.setAttribute('aria-pressed', 'true');
        if (count && !isPressed) count.textContent = String(neutralCount + 1);
        showToast('怨듭쑀 留곹겕瑜?以鍮꾪뻽?댁슂.');
      }

      if (action === 'comment') {
        openCommentModal(button);
      }
    });
  });
}

function initCommentModal() {
  const modal = document.querySelector('[data-comment-modal]');
  if (!modal) return;

  commentModalState = {
    modal,
    dialog: modal.querySelector('[data-comment-dialog]'),
    count: modal.querySelector('[data-comment-count]'),
    avatar: modal.querySelector('[data-comment-post-avatar]'),
    author: modal.querySelector('[data-comment-post-author]'),
    time: modal.querySelector('[data-comment-post-time]'),
    title: modal.querySelector('[data-comment-post-title]'),
    body: modal.querySelector('[data-comment-post-body]'),
    image: modal.querySelector('[data-comment-post-image]'),
    likeCount: modal.querySelector('[data-comment-preview-like]'),
    commentCount: modal.querySelector('[data-comment-preview-comment]'),
    shareCount: modal.querySelector('[data-comment-preview-share]'),
    form: modal.querySelector('[data-comment-form]'),
    input: modal.querySelector('[data-comment-input]'),
    list: modal.querySelector('[data-comment-list]'),
    sort: modal.querySelector('[data-comment-sort]'),
    sortLabel: modal.querySelector('[data-comment-sort-label]'),
    commentThreads: new WeakMap(),
    activeThread: null,
    comments: [],
    sortMode: 'latest',
    activeButton: null,
    activeCountElement: null,
    totalCount: 0,
    lastFocused: null,
    activeReplyTarget: null,
  };

  modal.querySelectorAll('[data-comment-close]').forEach((control) => {
    control.addEventListener('click', closeCommentModal);
  });

  commentModalState.form?.addEventListener('submit', submitComment);
  commentModalState.sort?.addEventListener('click', () => {
    commentModalState.sortMode = commentModalState.sortMode === 'latest' ? 'popular' : 'latest';
    commentModalState.sortLabel.textContent = commentModalState.sortMode === 'latest' ? '최신순' : '인기순';
    renderCommentList();
  });

  commentModalState.list?.addEventListener('click', (event) => {
    const cancelButton = event.target.closest('[data-reply-cancel]');
    if (cancelButton) {
      closeReplyComposer();
      return;
    }

    const likeButton = event.target.closest('[data-comment-like]');
    if (likeButton) {
      const item = likeButton.closest('[data-reply-root-id]');
      const reaction = findCommentReactionTarget(item?.dataset.replyRootId, item?.dataset.replyTargetId);
      if (!reaction) return;

      const isLiked = !Boolean(reaction.liked);
      reaction.liked = isLiked;
      reaction.likes = Math.max(0, Number(reaction.likes || 0) + (isLiked ? 1 : -1));
      likeButton.classList.toggle('liked', isLiked);
      likeButton.setAttribute('aria-pressed', String(isLiked));
      const count = likeButton.querySelector('[data-comment-like-count]');
      if (count) count.textContent = String(reaction.likes);
      return;
    }

    const replyButton = event.target.closest('[data-comment-reply]');
    if (replyButton) {
      const item = replyButton.closest('[data-reply-root-id]');
      const rootComment = findCommentById(item?.dataset.replyRootId);
      if (item && rootComment) {
        openReplyComposer(item, {
          rootCommentId: rootComment.id,
          targetId: item.dataset.replyTargetId,
          targetAuthor: item.dataset.replyTargetAuthor,
          targetAvatar: item.querySelector(':scope > img')?.getAttribute('src') || rootComment.avatar,
          triggerButton: replyButton,
        });
      }
    }
  });
  commentModalState.list?.addEventListener('submit', submitReply);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !commentModalState.modal.hidden) {
      if (commentModalState.activeReplyTarget) {
        closeReplyComposer();
        return;
      }
      closeCommentModal();
    }
  });
}

function openCommentModal(button) {
  if (!commentModalState) return;

  const post = button.closest('[data-post]');
  if (!post) return;

  const head = post.querySelector('.post-head');
  const avatar = head?.querySelector('img');
  const author = head?.querySelector('strong');
  const time = head?.querySelector('small');
  const title = post.querySelector('.post-copy h2');
  const body = post.querySelector('.post-copy p');
  const image = post.querySelector('.post-image');
  const actionCounts = Array.from(post.querySelectorAll('.post-actions [data-action-count]'));

  closeReplyComposer({ restoreFocus: false });

  commentModalState.activeButton = button;
  commentModalState.activeCountElement = button.querySelector('[data-action-count]');
  const initialTotal = Number(commentModalState.activeCountElement?.textContent || 0);
  const thread = getCommentThread(post, initialTotal);
  commentModalState.activeThread = thread;
  commentModalState.comments = thread.comments;
  commentModalState.totalCount = thread.totalCount;
  commentModalState.lastFocused = document.activeElement;

  commentModalState.sortMode = 'latest';
  commentModalState.sortLabel.textContent = '최신순';

  commentModalState.count.textContent = String(commentModalState.totalCount);
  commentModalState.commentCount.textContent = String(commentModalState.totalCount);
  commentModalState.likeCount.textContent = actionCounts[0]?.textContent?.trim() || '0';
  commentModalState.shareCount.textContent = actionCounts[2]?.textContent?.trim() || '0';
  commentModalState.avatar.src = avatar?.getAttribute('src') || './img/profile-woman.jpg';
  commentModalState.author.textContent = author?.textContent?.trim() || 'misamo_user';
  commentModalState.time.textContent = time?.textContent?.trim() || '';
  commentModalState.title.textContent = title?.textContent?.trim() || '';
  commentModalState.body.textContent = body?.textContent?.trim() || '';
  commentModalState.image.src = image?.getAttribute('src') || './img/post-cafe.jpg';
  commentModalState.image.alt = image?.getAttribute('alt') || '';
  commentModalState.input.value = '';

  renderCommentList();
  commentModalState.modal.hidden = false;
  document.body.classList.add('comment-modal-open');

  window.setTimeout(() => {
    commentModalState.dialog?.focus();
    commentModalState.input?.focus();
  }, 30);
}

function closeCommentModal() {
  if (!commentModalState || commentModalState.modal.hidden) return;

  closeReplyComposer({ restoreFocus: false });
  commentModalState.modal.hidden = true;
  document.body.classList.remove('comment-modal-open');
  commentModalState.lastFocused?.focus?.();
}

function cloneComment(comment) {
  return {
    ...comment,
    replies: (comment.replies || []).map((reply) => ({ ...reply })),
  };
}

function getCommentThread(post, initialTotal) {
  if (!commentModalState || !post) return null;

  let thread = commentModalState.commentThreads.get(post);
  if (!thread) {
    thread = {
      comments: COMMENT_SEED.map(cloneComment),
      totalCount: initialTotal,
    };
    commentModalState.commentThreads.set(post, thread);
  }
  return thread;
}

function createCommentId(prefix = 'comment') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function findCommentById(id) {
  if (!id || !commentModalState) return null;
  return commentModalState.comments.find((comment) => comment.id === id) || null;
}

function findCommentReactionTarget(rootCommentId, targetId) {
  const rootComment = findCommentById(rootCommentId);
  if (!rootComment || !targetId) return null;
  if (rootComment.id === targetId) return rootComment;
  return rootComment.replies?.find((reply) => reply.id === targetId) || null;
}

function updateCommentTotals(delta) {
  if (!commentModalState) return;

  commentModalState.totalCount += delta;
  if (commentModalState.activeThread) {
    commentModalState.activeThread.totalCount = commentModalState.totalCount;
  }
  commentModalState.count.textContent = String(commentModalState.totalCount);
  commentModalState.commentCount.textContent = String(commentModalState.totalCount);
  if (commentModalState.activeCountElement) {
    commentModalState.activeCountElement.textContent = String(commentModalState.totalCount);
  }
}

function submitComment(event) {
  event.preventDefault();
  if (!commentModalState) return;

  const text = commentModalState.input.value.trim();
  if (!text) {
    commentModalState.input.focus();
    return;
  }

  commentModalState.comments.unshift({
    id: createCommentId(),
    author: 'startup_hello',
    avatar: './img/profile-woman.jpg',
    time: '방금 전',
    badge: '작성자',
    text,
    likes: 0,
    replies: [],
  });

  updateCommentTotals(1);
  commentModalState.input.value = '';
  commentModalState.sortMode = 'latest';
  commentModalState.sortLabel.textContent = '최신순';
  renderCommentList();
  showToast('댓글을 등록했어요.');
}

function openReplyComposer(item, target) {
  if (!commentModalState?.list) return;

  const currentTarget = commentModalState.activeReplyTarget;
  const currentForm = commentModalState.list.querySelector('[data-reply-form]');
  if (currentForm && currentTarget?.targetId === target.targetId) {
    currentForm.querySelector('[data-reply-input]')?.focus();
    return;
  }

  closeReplyComposer({ restoreFocus: false });

  const host = item.querySelector('[data-comment-reply-host]');
  if (!host) return;

  const form = document.createElement('form');
  form.className = 'comment-reply-form';
  form.setAttribute('data-reply-form', '');
  form.dataset.rootCommentId = target.rootCommentId;
  form.dataset.targetId = target.targetId;
  form.setAttribute('aria-label', `${target.targetAuthor}\uB2D8\uC5D0\uAC8C \uB2F5\uAE00 \uC791\uC131`);

  const context = document.createElement('div');
  context.className = 'comment-reply-context';
  context.setAttribute('data-reply-context', '');

  const avatar = document.createElement('img');
  avatar.src = target.targetAvatar;
  avatar.alt = '';

  const targetLabel = document.createElement('span');
  targetLabel.className = 'comment-reply-target comment-reply-to';
  targetLabel.setAttribute('data-reply-target', '');
  targetLabel.id = createCommentId('reply-target');
  targetLabel.textContent = `${target.targetAuthor}\uB2D8\uC5D0\uAC8C \uB2F5\uAE00`;

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'comment-reply-cancel';
  cancel.setAttribute('data-reply-cancel', '');
  cancel.setAttribute('aria-label', '\uB2F5\uAE00 \uC791\uC131 \uCDE8\uC18C');
  cancel.innerHTML = '<span class="lucide-icon icon-x" aria-hidden="true"></span>';
  context.append(avatar, targetLabel, cancel);

  const input = document.createElement('input');
  input.type = 'text';
  input.setAttribute('data-reply-input', '');
  input.setAttribute('aria-label', '\uB2F5\uAE00 \uB0B4\uC6A9');
  input.setAttribute('aria-describedby', targetLabel.id);
  input.value = '';
  input.placeholder = '\uB2F5\uAE00\uC744 \uC785\uB825\uD558\uC138\uC694...';
  input.autocomplete = 'off';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'comment-reply-submit';
  submit.setAttribute('data-reply-submit', '');
  submit.textContent = '\uAC8C\uC2DC';
  syncReplySubmitState(input, submit);
  input.addEventListener('input', () => syncReplySubmitState(input, submit));

  form.append(context, input, submit);
  host.replaceChildren(form);
  commentModalState.activeReplyTarget = target;

  window.setTimeout(() => {
    input.focus();
    scrollReplyComposerIntoView(form);
  }, 20);
}

function closeReplyComposer({ restoreFocus = true } = {}) {
  if (!commentModalState) return;

  const target = commentModalState.activeReplyTarget;
  commentModalState.list?.querySelector('[data-reply-form]')?.remove();
  commentModalState.activeReplyTarget = null;

  if (restoreFocus && target?.triggerButton?.isConnected) {
    target.triggerButton.focus();
  }
}

function syncReplySubmitState(input, submit) {
  submit.disabled = !input.value.trim();
}

function scrollReplyComposerIntoView(form) {
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function submitReply(event) {
  const form = event.target.closest('[data-reply-form]');
  if (!form || !commentModalState?.list?.contains(form)) return;

  event.preventDefault();

  const input = form.querySelector('[data-reply-input]');
  const parent = findCommentById(form.dataset.rootCommentId);
  const target = commentModalState.activeReplyTarget;
  const text = input?.value.trim() || '';
  if (!input || !parent || !target || !text) {
    input?.focus();
    return;
  }

  parent.replies = parent.replies || [];
  const newReply = {
    id: createCommentId('reply'),
    author: 'startup_hello',
    avatar: './img/profile-woman.jpg',
    time: '\uBC29\uAE08 \uC804',
    badge: '\uC791\uC131\uC790',
    text,
    likes: 0,
    replyToId: target.targetId,
    replyToAuthor: target.targetAuthor,
  };
  parent.replies.push(newReply);

  updateCommentTotals(1);
  closeReplyComposer({ restoreFocus: false });
  renderCommentList();
  focusSubmittedReply(newReply.id);
  showToast('\uB2F5\uAE00\uC744 \uB4F1\uB85D\uD588\uC5B4\uC694.');
}

function focusSubmittedReply(replyId) {
  if (!commentModalState?.list || !replyId) return;

  const replyItem = Array.from(commentModalState.list.querySelectorAll('[data-reply-target-id]')).find(
    (item) => item.dataset.replyTargetId === replyId,
  );
  const replyButton = replyItem?.querySelector('[data-comment-reply]');
  if (!replyButton) return;

  try {
    replyButton.focus({ preventScroll: true });
  } catch {
    replyButton.focus();
  }
}

function renderCommentList() {
  if (!commentModalState?.list) return;

  closeReplyComposer({ restoreFocus: false });

  const comments = [...commentModalState.comments];
  if (commentModalState.sortMode === 'popular') {
    comments.sort((a, b) => b.likes - a.likes);
  }

  commentModalState.list.replaceChildren(...comments.map(renderCommentItem));
}

function renderCommentItem(comment) {
  const item = document.createElement('article');
  item.className = 'comment-item';
  item.setAttribute('data-comment-id', comment.id);
  item.dataset.replyRootId = comment.id;
  item.dataset.replyTargetId = comment.id;
  item.dataset.replyTargetAuthor = comment.author;

  const avatar = document.createElement('img');
  avatar.src = comment.avatar;
  avatar.alt = '';

  const content = document.createElement('div');
  const head = document.createElement('header');

  const author = document.createElement('strong');
  author.textContent = comment.author;
  head.append(author);

  if (comment.badge) {
    const badge = document.createElement('em');
    badge.textContent = comment.badge;
    head.append(badge);
  }

  const time = document.createElement('small');
  time.textContent = comment.time;
  head.append(time);

  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'icon-button flat';
  more.setAttribute('aria-label', '댓글 옵션');
  more.innerHTML = '<span class="lucide-icon icon-more-horizontal" aria-hidden="true"></span>';
  head.append(more);

  const text = document.createElement('p');
  text.textContent = comment.text;

  const meta = document.createElement('footer');
  const reply = document.createElement('button');
  reply.type = 'button';
  reply.setAttribute('data-comment-reply', '');
  reply.setAttribute('aria-label', `${comment.author}\uB2D8\uC5D0\uAC8C \uB2F5\uAE00 \uB2EC\uAE30`);
  reply.textContent = '\uB2F5\uAE00 \uB2EC\uAE30';

  const like = document.createElement('button');
  like.type = 'button';
  like.dataset.commentLike = '';
  like.setAttribute('aria-label', '\uB313\uAE00 \uC88B\uC544\uC694');
  like.classList.toggle('liked', Boolean(comment.liked));
  like.setAttribute('aria-pressed', String(Boolean(comment.liked)));
  like.innerHTML = '<span class="lucide-icon icon-heart" aria-hidden="true"></span><span data-comment-like-count></span>';
  like.querySelector('[data-comment-like-count]').textContent = String(comment.likes);

  meta.append(reply, like);

  const replyHost = document.createElement('div');
  replyHost.className = 'comment-reply-host';
  replyHost.setAttribute('data-comment-reply-host', '');

  const replies = document.createElement('div');
  replies.className = 'comment-replies';
  replies.setAttribute('data-comment-replies', '');
  if (comment.replies?.length) {
    replies.append(...comment.replies.map((reply) => renderReplyItem(reply, comment.id)));
  }

  content.append(head, text, meta, replyHost, replies);
  item.append(avatar, content);
  return item;
}

function renderReplyItem(reply, rootCommentId) {
  const item = document.createElement('article');
  item.className = 'comment-reply-item';
  item.dataset.replyRootId = rootCommentId;
  item.dataset.replyTargetId = reply.id;
  item.dataset.replyTargetAuthor = reply.author;

  const avatar = document.createElement('img');
  avatar.src = reply.avatar;
  avatar.alt = '';

  const content = document.createElement('div');
  const head = document.createElement('header');

  const author = document.createElement('strong');
  author.textContent = reply.author;
  head.append(author);

  if (reply.badge) {
    const badge = document.createElement('em');
    badge.textContent = reply.badge;
    head.append(badge);
  }

  const time = document.createElement('small');
  time.textContent = reply.time;
  head.append(time);

  let replyContext = null;
  if (reply.replyToAuthor) {
    replyContext = document.createElement('div');
    replyContext.className = 'comment-reply-context';
    replyContext.setAttribute('data-reply-context', '');

    const replyTo = document.createElement('span');
    replyTo.className = 'comment-reply-to';
    replyTo.textContent = `${reply.replyToAuthor}\uB2D8\uC5D0\uAC8C \uB2F5\uAE00`;
    replyContext.append(replyTo);
  }

  const text = document.createElement('p');
  text.textContent = reply.text;

  const meta = document.createElement('footer');
  const replyButton = document.createElement('button');
  replyButton.type = 'button';
  replyButton.setAttribute('data-comment-reply', '');
  replyButton.setAttribute('aria-label', `${reply.author}\uB2D8\uC5D0\uAC8C \uB2F5\uAE00 \uB2EC\uAE30`);
  replyButton.textContent = '\uB2F5\uAE00 \uB2EC\uAE30';

  const like = document.createElement('button');
  like.type = 'button';
  like.dataset.commentLike = '';
  like.setAttribute('aria-label', '\uB2F5\uAE00 \uC88B\uC544\uC694');
  like.classList.toggle('liked', Boolean(reply.liked));
  like.setAttribute('aria-pressed', String(Boolean(reply.liked)));
  like.innerHTML = '<span class="lucide-icon icon-heart" aria-hidden="true"></span><span data-comment-like-count></span>';
  like.querySelector('[data-comment-like-count]').textContent = String(reply.likes);

  meta.append(replyButton, like);

  const replyHost = document.createElement('div');
  replyHost.className = 'comment-reply-host';
  replyHost.setAttribute('data-comment-reply-host', '');

  content.append(head);
  if (replyContext) content.append(replyContext);
  content.append(text, meta, replyHost);
  item.append(avatar, content);
  return item;
}

function initNavigationState() {
  initPageNavigation();
}

function initExploreControls() {
  const explorePage = document.querySelector('[data-view="explore"]');
  if (!explorePage) return;

  const form = explorePage.querySelector('[data-explore-search]');
  const input = explorePage.querySelector('[data-explore-input]');
  const keywordButtons = Array.from(explorePage.querySelectorAll('[data-explore-keyword]'));
  const categoryButtons = Array.from(explorePage.querySelectorAll('[data-explore-category]'));
  const cards = Array.from(explorePage.querySelectorAll('[data-explore-recommendation], [data-explore-resource]'));
  const openItems = Array.from(document.querySelectorAll('[data-explore-open]'));
  const topicItems = Array.from(document.querySelectorAll('[data-explore-topic]'));
  const emptyState = explorePage.querySelector('[data-explore-empty]');

  const applyExploreQuery = (query) => {
    const normalizedQuery = normalizeExploreQuery(query);
    let visibleCards = 0;

    cards.forEach((card) => {
      const haystack = `${card.dataset.exploreText || ''} ${card.textContent}`.toLowerCase();
      const isVisible = !normalizedQuery || haystack.includes(normalizedQuery);
      card.hidden = !isVisible;
      if (isVisible) visibleCards += 1;
    });

    keywordButtons.forEach((button) => {
      const keyword = normalizeExploreQuery(button.dataset.exploreKeyword || button.textContent);
      button.classList.toggle('active', keyword === normalizedQuery && normalizedQuery !== '');
    });

    if (emptyState) emptyState.hidden = visibleCards > 0;
    return visibleCards;
  };

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const visibleCount = applyExploreQuery(input?.value || '');
    showToast(`${visibleCount}媛쒖쓽 ?먯깋 寃곌낵瑜?李얠븯?댁슂.`);
  });

  input?.addEventListener('input', () => {
    applyExploreQuery(input.value);
  });

  keywordButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const keyword = (button.dataset.exploreKeyword || button.textContent).replace('#', '').trim();
      if (input) input.value = keyword;
      const visibleCount = applyExploreQuery(keyword);
      showToast(`${keyword} 寃??寃곌낵 ${visibleCount}媛쒕? ?쒖떆?덉뼱??`);
    });
  });

  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.textContent.trim();
      if (button.classList.contains('category-gray')) {
        if (input) input.value = '';
        applyExploreQuery('');
        showToast('?꾩껜 ?먯깋 肄섑뀗痢좊? ?쒖떆?덉뼱??');
        return;
      }

      if (input) input.value = category;
      const visibleCount = applyExploreQuery(category);
      showToast(`${category} 肄섑뀗痢?${visibleCount}媛쒕? ?쒖떆?덉뼱??`);
    });
  });

  topicItems.forEach((topic) => {
    const activateTopic = () => {
      const query = topic.dataset.topicQuery || topic.textContent.replace('#', '').trim();
      if (input) input.value = query;
      const visibleCount = applyExploreQuery(query);
      topicItems.forEach((item) => item.classList.toggle('active', item === topic));
      showToast(`${query} 二쇱젣 寃곌낵 ${visibleCount}媛쒕? ?쒖떆?덉뼱??`);
      explorePage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    topic.addEventListener('click', activateTopic);
    topic.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activateTopic();
    });
  });

  openItems.forEach((item) => {
    const openItem = (event) => {
      if (event?.target?.closest('button, a, input')) return;
      openExploreDetail(item);
    };

    item.addEventListener('click', openItem);
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openExploreDetail(item);
    });
  });

  const detail = document.querySelector('[data-explore-detail]');
  detail?.querySelector('[data-explore-detail-close]')?.addEventListener('click', closeExploreDetail);
  detail?.addEventListener('click', (event) => {
    if (event.target === detail) closeExploreDetail();
  });
}

function normalizeExploreQuery(value) {
  return String(value).replace(/#/g, '').trim().toLowerCase();
}

function openExploreDetail(item) {
  const detail = document.querySelector('[data-explore-detail]');
  if (!detail) return;

  const kind = detail.querySelector('[data-explore-detail-kind]');
  const title = detail.querySelector('[data-explore-detail-title]');
  const description = detail.querySelector('[data-explore-detail-description]');

  if (kind) kind.textContent = item.dataset.exploreKind || '?먯깋';
  if (title) title.textContent = item.dataset.exploreTitle || item.querySelector('h3, strong')?.textContent || '?먯깋 ?곸꽭';
  if (description) {
    description.textContent =
      item.dataset.exploreDescription ||
      item.querySelector('p')?.textContent?.trim() ||
      '?좏깮???먯깋 ??ぉ???곸꽭 ?뺣낫瑜?以鍮꾪뻽?댁슂.';
  }

  detail.hidden = false;
  detail.querySelector('[data-explore-detail-close]')?.focus();
  showToast(`${title?.textContent || '?먯깋 ??ぉ'} ?곸꽭瑜??댁뿀?댁슂.`);
}

function closeExploreDetail() {
  const detail = document.querySelector('[data-explore-detail]');
  if (!detail) return;
  detail.hidden = true;
}

function initButtonFeedback() {
  document.querySelectorAll('[data-feedback]').forEach((control) => {
    control.addEventListener('click', (event) => {
      const href = control.getAttribute('href');
      if (href === '#') event.preventDefault();

      control.classList.add('is-acknowledged');
      window.setTimeout(() => control.classList.remove('is-acknowledged'), 180);
      showToast(control.dataset.feedback);
    });
  });

  document.querySelectorAll('[data-notification-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const badge = button.querySelector('.badge-count');
      if (badge) badge.hidden = true;
      button.classList.remove('has-badge');
    });
  });
}

function initProfileMenu() {
  const toggle = document.querySelector('[data-profile-toggle]');
  const menu = document.querySelector('[data-profile-menu]');
  if (!toggle || !menu) return;

  const closeMenu = () => {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const shouldOpen = menu.hidden;
    menu.hidden = !shouldOpen;
    toggle.setAttribute('aria-expanded', String(shouldOpen));
  });

  menu.addEventListener('click', (event) => {
    event.stopPropagation();
    if (event.target.closest('button')) closeMenu();
  });

  document.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

function showToast(message) {
  const region = document.querySelector('[data-toast-region]');
  if (!region || !message) return;

  const toast = document.createElement('p');
  toast.className = 'toast-message';
  toast.textContent = message;
  region.appendChild(toast);

  window.setTimeout(() => toast.classList.add('is-visible'), 20);
  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 220);
  }, 2200);
}

function initPageNavigation() {
  const links = Array.from(document.querySelectorAll('[data-nav-target]'));

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const targetName = link.dataset.navTarget;
      const pageName = link.dataset.pageTarget || 'home';

      showPage(pageName);
      syncNavigationState(links, targetName);
      window.history.replaceState(null, '', targetName === 'home' ? window.location.pathname : `#${targetName}`);

      const section = document.querySelector(`[data-section="${targetName}"]`);
      if (section) {
        window.setTimeout(() => {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
      }
    });
  });

  const initialTarget = window.location.hash.replace('#', '');
  const initialLink = links.find((link) => link.dataset.navTarget === initialTarget);
  if (initialLink) {
    showPage(initialLink.dataset.pageTarget || 'home');
    syncNavigationState(links, initialTarget);
  }
}

function showPage(pageName) {
  document.querySelectorAll('[data-view]').forEach((view) => {
    const isActive = view.dataset.view === pageName;
    view.hidden = !isActive;
    view.classList.toggle('active', isActive);
  });

  document.querySelectorAll('[data-rail-view]').forEach((view) => {
    const isActive = view.dataset.railView === pageName;
    view.hidden = !isActive;
    view.classList.toggle('active', isActive);
  });

  document.querySelectorAll('[data-sidebar-view]').forEach((view) => {
    const isActive = view.dataset.sidebarView === pageName;
    view.hidden = !isActive;
  });
}

function syncNavigationState(links, targetName) {
  links.forEach((link) => {
    link.classList.toggle('active', link.dataset.navTarget === targetName);
  });
}
