function createMisamoIcons() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "aria-hidden": "true",
      },
    });
  }
}

window.createMisamoIcons = createMisamoIcons;

function initViewNavigation() {
  const links = Array.from(document.querySelectorAll("[data-view-link]"));
  const pages = Array.from(document.querySelectorAll("[data-page]"));
  const rails = Array.from(document.querySelectorAll("[data-rail]"));
  const sidebarPanels = Array.from(document.querySelectorAll("[data-sidebar-panel]"));

  if (!links.length || !pages.length) {
    return;
  }

  const setView = (view) => {
    const route = String(view || "home");
    const base = route.split("/")[0];
    const nextView = pages.some((page) => page.dataset.page === base) ? base : "home";

    pages.forEach((page) => {
      page.classList.toggle("is-active", page.dataset.page === nextView);
    });

    rails.forEach((rail) => {
      rail.classList.toggle("is-active", rail.dataset.rail === nextView);
    });

    sidebarPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.sidebarPanel === nextView);
    });

    links.forEach((link) => {
      const isActive = link.dataset.viewTarget === nextView;
      link.classList.toggle("active", isActive);
      link.setAttribute("aria-current", isActive ? "page" : "false");
    });

    window.history.replaceState(null, "", `#${nextView === "profile" && route.startsWith("profile/") ? route : nextView}`);
    document.body.classList.toggle('is-writing', nextView === 'write');
    window.dispatchEvent(new CustomEvent('misamo:view', { detail: nextView }));
  };

  window.misamoNavigate = setView;

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setView(link.dataset.viewTarget);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  const initialView = window.location.hash.replace("#", "") || "home";
  if (initialView.startsWith('post/')) window.misamoInitialPost = initialView.slice(5);
  setView(initialView);
  window.addEventListener("hashchange", () => {
    if (location.hash.startsWith("#post/") || document.body.classList.contains("is-reading-post")) return;
    setView(location.hash.slice(1));
  });
}

function initMobileSwipeNavigation() {
  const nav = document.querySelector('.mobile-nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('[data-view-target]')];
  const order = links.map(link => link.dataset.viewTarget);
  let gesture = null, suppressClickUntil = 0;
  const isMobile = () => window.matchMedia?.('(max-width: 980px)').matches;
  const modalOpen = () => Boolean(document.fullscreenElement || document.querySelector('dialog[open], [aria-modal="true"]:not([hidden])'));
  function hasSelection() { const selection = window.getSelection(); return selection && !selection.isCollapsed; }
  function ownsGesture(target) {
    if (target.closest('input,textarea,select,button,a,[contenteditable],video,audio,.write-view,.posting-editor-block,.misamo-carousel,.stories,[data-hero-carousel],[role="slider"],[data-no-page-swipe]')) return true;
    for (let node = target; node && node !== document.body; node = node.parentElement) {
      const overflow = getComputedStyle(node).overflowX;
      if (/(auto|scroll)/.test(overflow) && node.scrollWidth > node.clientWidth + 2) return true;
    }
    return false;
  }
  document.addEventListener('touchstart', event => {
    gesture = null;
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const onNav = Boolean(target?.closest('.mobile-nav'));
    if (!isMobile() || event.touches.length !== 1 || modalOpen() || hasSelection()) return;
    if (!onNav && (!target?.closest('.page-view.is-active') || ownsGesture(target))) return;
    // Keep operating-system edge gestures and post-detail navigation intact.
    if (location.hash.startsWith('#post/')) return;
    const route = location.hash.slice(1).split('/')[0] || 'home';
    const index = order.indexOf(route); if (index < 0) return;
    const touch = event.touches[0];
    if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
    gesture = {id:touch.identifier,x:touch.clientX,y:touch.clientY,index,route:location.hash,time:Date.now(),horizontal:false};
  }, {passive:true});
  document.addEventListener('touchmove', event => {
    if (!gesture) return;
    if (event.touches.length !== 1) { gesture = null; return; }
    const touch = event.touches[0];
    const dx = touch.clientX - gesture.x, dy = touch.clientY - gesture.y;
    if (!gesture.horizontal) {
      if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { gesture = null; return; }
      if (Math.abs(dx) >= 18 && Math.abs(dx) > Math.abs(dy) * 1.5) gesture.horizontal = true;
    }
    if (gesture.horizontal && event.cancelable) event.preventDefault();
  }, {passive:false});
  document.addEventListener('touchend', event => {
    const current = gesture; gesture = null;
    if (!current || !current.horizontal || !isMobile() || modalOpen() || hasSelection() || current.route !== location.hash || event.touches.length) return;
    const touch = [...event.changedTouches].find(item => item.identifier === current.id); if (!touch) return;
    const dx = touch.clientX-current.x, dy = touch.clientY-current.y;
    if (Math.abs(dx) < Math.min(96,Math.max(60,window.innerWidth * .15)) || Math.abs(dx) <= Math.abs(dy)*1.5 || Date.now()-current.time > 900) return;
    suppressClickUntil = Date.now()+500;
    const next = current.index + (dx < 0 ? 1 : -1);
    if (next < 0 || next >= links.length) return;
    // Use the same route handlers as a tap, including the user's own profile.
    links[next].click();
  }, {passive:true});
  document.addEventListener('touchcancel', () => { gesture = null; }, {passive:true});
  document.addEventListener('click', event => {
    if (event.isTrusted && Date.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
}

function initHeroCarousel() {
  const carousel = document.querySelector("[data-hero-carousel]");

  if (!carousel) {
    return;
  }

  const slides = Array.from(carousel.querySelectorAll("[data-hero-slide]"));
  const dots = Array.from(carousel.querySelectorAll("[data-hero-dot]"));
  const prevButton = carousel.querySelector("[data-hero-prev]");
  const nextButton = carousel.querySelector("[data-hero-next]");
  const sceneText = carousel.querySelector("[data-hero-scene-text]");
  let currentIndex = Math.max(
    0,
    slides.findIndex((slide) => slide.classList.contains("is-active")),
  );

  const setSlide = (nextIndex) => {
    currentIndex = (nextIndex + slides.length) % slides.length;
    const activeSlide = slides[currentIndex];
    const heroTheme = activeSlide?.dataset.heroTheme || "support";
    const sceneLabel = activeSlide?.dataset.heroSceneLabel || "Your Success";

    carousel.dataset.heroTheme = heroTheme;

    if (sceneText) {
      sceneText.innerHTML = sceneLabel.replace(" ", "<br />");
    }

    slides.forEach((slide, index) => {
      const isActive = index === currentIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    dots.forEach((dot, index) => {
      const isActive = index === currentIndex;
      dot.classList.toggle("active", isActive);
      dot.setAttribute("aria-selected", String(isActive));
    });
  };

  prevButton?.addEventListener("click", () => setSlide(currentIndex - 1));
  nextButton?.addEventListener("click", () => setSlide(currentIndex + 1));

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => setSlide(index));
  });

  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSlide(currentIndex - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setSlide(currentIndex + 1);
    }
  });

  setSlide(currentIndex);
}

function initLikeButtons() {
  function display(button, state) {
    button.setAttribute('aria-pressed', String(state.liked));
    button.setAttribute('aria-label', state.liked ? '좋아요 취소' : '좋아요');
    button.classList.toggle('liked', state.liked);
    button.querySelector('[data-like-count]').textContent = String(state.count);
  }
  document.querySelectorAll('.post-card [data-like-button]').forEach(button => {
    const id = button.closest('.post-card').dataset.postId;
    if (id && window.MisamoStore) {
      try { display(button, window.MisamoStore.getPostLike(id)); } catch (_) { /* Keep the visible count if storage is unavailable. */ }
    }
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('.post-card [data-like-button]');
    if (!button) return;
    const count = button.querySelector('[data-like-count]');
    if (!count) return;
      const liked = button.getAttribute("aria-pressed") !== "true";
      const currentCount = Number(count.textContent);
      if (!Number.isFinite(currentCount)) return;
      const id = button.closest('.post-card').dataset.postId;
      try {
        const state = id && window.MisamoStore ? window.MisamoStore.setPostLike(id, liked) : { liked, count: currentCount + (liked ? 1 : -1) };
        display(button, state);
      } catch (error) { window.alert(error.message); }
  });
}

initLikeButtons();
initViewNavigation();
initMobileSwipeNavigation();
initHeroCarousel();
createMisamoIcons();
