// Gravatar fallback: swaps a broken avatar for the local placeholder.

import type { ClientContext } from "@/modules/types";

export const GravatarFallback = {
  init(ctx: ClientContext): void {
    const images = ctx.utils.queryAll<HTMLImageElement>("img[data-avatar]");
    for (const image of images) {
      if (image.dataset.avatarBound === "true") {
        continue;
      }
      image.dataset.avatarBound = "true";
      ctx.utils.on(image, "error", () => {
        image.src = "/favicon.svg";
      });
    }
  },
};
