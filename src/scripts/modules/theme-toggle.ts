// Theme toggle: flips `data-theme` and persists the choice.

import type { ClientContext } from "@/modules/types";

const STORAGE_KEY = "theme";

export const ThemeToggle = {
  init(ctx: ClientContext): void {
    const root = ctx.document.documentElement;
    const buttons = ctx.utils.queryAll<HTMLButtonElement>("[data-theme-toggle]");

    for (const button of buttons) {
      if (button.dataset.bound === "true") {
        continue;
      }
      button.dataset.bound = "true";
      ctx.utils.on(button, "click", () => {
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // storage unavailable — theme still applies for this session
        }
      });
    }
  },
};
