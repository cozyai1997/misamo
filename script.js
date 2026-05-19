function initHeroCarousel() {
  const carousel = document.querySelector("[data-hero-carousel]");

  if (!carousel) {
    return;
  }

  const slides = Array.from(carousel.querySelectorAll("[data-hero-slide]"));
  const dots = Array.from(carousel.querySelectorAll("[data-hero-dot]"));
  const prevButton = carousel.querySelector("[data-hero-prev]");
  const nextButton = carousel.querySelector("[data-hero-next]");
  let currentIndex = Math.max(
    0,
    slides.findIndex((slide) => slide.classList.contains("is-active")),
  );

  const setSlide = (nextIndex) => {
    currentIndex = (nextIndex + slides.length) % slides.length;

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

initHeroCarousel();

if (window.lucide) {
  window.lucide.createIcons({
    attrs: {
      "aria-hidden": "true",
    },
  });
}
