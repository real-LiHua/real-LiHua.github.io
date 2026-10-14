// Reading progress bar: drives the `--reading-progress` custom property used by
// `#reading-progress` in global.css.

import type { ClientContext } from "@/modules/types";

export const ReadingProgress = {
  init(ctx: ClientContext): void {
    const bar = ctx.document.querySelector<HTMLElement>("#reading-progress");
    const article = ctx.utils.query<HTMLElement>("[data-article]");
    if (!bar || !article) {
      return;
    }

    const update = (): void => {
      const { top } = article.getBoundingClientRect();
      const scrolled = -top;
      const total = article.offsetHeight - ctx.window.innerHeight;
      const ratio = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
      bar.style.setProperty("--reading-progress", ratio.toFixed(4));
    };

    update();
    ctx.window.addEventListener("scroll", update, { passive: true });
  },
};
