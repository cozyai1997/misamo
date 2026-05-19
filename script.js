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
    const nextView = pages.some((page) => page.dataset.page === view) ? view : "home";

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

    window.history.replaceState(null, "", `#${nextView}`);
  };

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setView(link.dataset.viewTarget);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  setView(window.location.hash.replace("#", "") || "home");
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

initViewNavigation();
initHeroCarousel();
createMisamoIcons();
