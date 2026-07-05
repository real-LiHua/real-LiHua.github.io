const REVEAL_ROOT_MARGIN = "0px 0px -60px 0px";
const THRESHOLD = 0.1;

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    }
  },
  { rootMargin: REVEAL_ROOT_MARGIN, threshold: THRESHOLD },
);

const initScrollReveal = (): void => {
  for (const el of document.querySelectorAll(".reveal")) {
    observer.observe(el);
  }
};

document.addEventListener("astro:page-load", initScrollReveal);
