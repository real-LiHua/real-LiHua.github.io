let ticking = false;

const setProgressWidth = (bar: HTMLDivElement, percent: number): void => {
    bar.style.width = `${percent}%`;
  },
  getProgress = (): number => {
    const { documentElement } = document,
      { scrollTop, scrollHeight, clientHeight } = documentElement,
      maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 0) {
      return 0;
    }
    return Math.min((scrollTop / maxScroll) * 100, 100);
  },
  updateProgress = (): void => {
    const bar = document.querySelector<HTMLDivElement>("#reading-progress");
    if (!bar) {
      return;
    }
    setProgressWidth(bar, getProgress());
  },
  onScroll = (): void => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        updateProgress();
        ticking = false;
      });
    }
  };

document.addEventListener("astro:page-load", () => {
  const bar = document.querySelector<HTMLDivElement>("#reading-progress");
  if (!bar) {
    return;
  }
  updateProgress();
  document.addEventListener("scroll", onScroll, { passive: true });
});
