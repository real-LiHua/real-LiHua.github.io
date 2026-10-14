// Tilt card: pointer-driven 3D tilt for `[data-tilt]` elements.

import type { ClientContext } from "@/modules/types";

const MAX_TILT_DEG = 6;

export const TiltCard = {
  init(ctx: ClientContext): void {
    if (ctx.window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const cards = ctx.utils.queryAll<HTMLElement>("[data-tilt]");
    for (const card of cards) {
      if (card.dataset.tiltBound === "true") {
        continue;
      }
      card.dataset.tiltBound = "true";

      ctx.utils.on(card, "pointermove", (event) => {
        const pointer = event as PointerEvent;
        const rect = card.getBoundingClientRect();
        const rotateY = ((pointer.clientX - rect.left) / rect.width - 0.5) * MAX_TILT_DEG * 2;
        const rotateX = -((pointer.clientY - rect.top) / rect.height - 0.5) * MAX_TILT_DEG * 2;
        card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
      });

      ctx.utils.on(card, "pointerleave", () => {
        card.style.transform = "";
      });
    }
  },
};
