// Scroll reveal: fades elements marked `[data-reveal]` into view once.

import type { ClientContext } from "@/modules/types";

export const ScrollReveal = {
  init(ctx: ClientContext): void {
    const targets = ctx.utils.queryAll<HTMLElement>("[data-reveal]:not([data-revealed])");
    if (targets.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = "true";
            obs.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    for (const target of targets) {
      const index = Number.parseInt(target.dataset.revealIndex ?? "0", 10);
      target.style.transitionDelay = `${Math.min(index, 8) * 60}ms`;
      observer.observe(target);
    }
  },
};
