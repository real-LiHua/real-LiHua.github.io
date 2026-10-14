// Theme System — deep module.
//
// Owns the theme contract shared by the server (no-flash inline script, initial
// `data-theme`) and the client (`theme-toggle` module). The palette itself lives
// in `src/styles/theme-tokens.css`; this module only resolves which theme wins.
// (docs/adr/0005-theme-token-strategy.md)

import type { ThemeMode } from "./types";

export const DEFAULT_THEME: ThemeMode = "light";
export const THEME_STORAGE_KEY = "theme";

export interface ThemeSystem {
  /** Decide the active theme from a stored preference + OS preference. */
  resolve(stored: string | null | undefined, prefersDark?: boolean): ThemeMode;
  /** Type guard for persisted values. */
  isThemeMode(value: unknown): value is ThemeMode;
  /** The opposite theme. */
  invert(mode: ThemeMode): ThemeMode;
  /**
   * Inline, render-blocking script that applies the theme before first paint to avoid a flash of
   * the wrong theme. Safe to inject as `is:inline`.
   */
  inlineScript(): string;
}

export const themeSystem: ThemeSystem = {
  resolve(stored, prefersDark = false) {
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return prefersDark ? "dark" : "light";
  },

  isThemeMode(value): value is ThemeMode {
    return value === "light" || value === "dark";
  },

  invert(mode) {
    return mode === "dark" ? "light" : "dark";
  },

  inlineScript() {
    return `(function(){try{var k="${THEME_STORAGE_KEY}",s=localStorage.getItem(k),d=window.matchMedia("(prefers-color-scheme: dark)").matches,t=(s==="light"||s==="dark")?s:(d?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="${DEFAULT_THEME}";}})();`;
  },
};
