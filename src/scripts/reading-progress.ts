let ticking = false;

const setProgressWidth = (bar: HTMLDivElement, percent: number): void => {
  bar.style.width = `${percent}%`;
};

const getProgress = (): number => {
  const { documentElement } = document;
  const { scrollTop, scrollHeight, clientHeight } = documentElement;
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 0) {
    return 0;
  }
  return Math.min((scrollTop / maxScroll) * 100, 100);
};

const updateProgress = (): void => {
  const bar = document.querySelector<HTMLDivElement>("#reading-progress");
  if (!bar) {
    return;
  }
  setProgressWidth(bar, getProgress());
};

const onScroll = (): void => {
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
