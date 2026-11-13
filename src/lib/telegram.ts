/**
 * Telegram Mini App bootstrap. A regular browser never carries a real launch, so every entry point
 * degrades to a no-op outside Telegram.
 */

export interface TelegramWebApp {
  platform: string;
  version: string;
  initData: string;
  colorScheme: "light" | "dark";
  themeParams?: Record<string, string>;
  isExpanded: boolean;
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  isVersionAtLeast: (required: string) => boolean;
  onEvent: (event: string, handler: () => void) => void;
}

const readWebApp = (): TelegramWebApp | null => {
  const tg = (window as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  if (!tg) {
    return null;
  }
  // The SDK defines WebApp even in a plain browser (platform "unknown", empty
  // initData); only a real launch may flip the page into Telegram mode.
  if (tg.platform === "unknown" && !tg.initData) {
    return null;
  }
  return tg;
};

export const getTelegram = (): TelegramWebApp | null => {
  try {
    return readWebApp();
  } catch {
    return null;
  }
};

export const isTelegram = (): boolean => getTelegram() !== null;

const applyScheme = (tg: TelegramWebApp) => {
  const dark = tg.colorScheme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.content = dark ? "dark" : "light";
  }
};

let initialized = false;

const TGLAUNCH_KEY = "tg-launch";

// Keep the sessionStorage launch record in sync with the client's latest
// color scheme and theme parameters. In-app navigations are full page loads
// that drop the URL fragment; the head bootstrap restores Telegram mode from
// this record, so it must reflect themeChanged updates.
const persistLaunch = (tg: TelegramWebApp) => {
  try {
    const stored = new URLSearchParams(sessionStorage.getItem(TGLAUNCH_KEY) ?? "");
    stored.set("tgWebAppColorScheme", tg.colorScheme);
    if (tg.platform && tg.platform !== "unknown") {
      stored.set("tgWebAppPlatform", tg.platform);
    }
    if (tg.initData) {
      stored.set("tgWebAppData", tg.initData);
    }
    if (tg.themeParams && typeof tg.themeParams === "object") {
      stored.set("tgWebAppThemeParams", JSON.stringify(tg.themeParams));
    }
    if (stored.has("tgWebAppPlatform") || stored.has("tgWebAppData")) {
      sessionStorage.setItem(TGLAUNCH_KEY, stored.toString());
    }
  } catch {
    // Storage unavailable (private mode, quota) — page works with in-memory state only.
  }
};

export const initTelegram = (): TelegramWebApp | null => {
  if (initialized) {
    return getTelegram();
  }
  const tg = getTelegram();
  if (!tg) {
    return null;
  }
  initialized = true;

  try {
    tg.ready();
    if (!tg.isExpanded) {
      tg.expand();
    }
  } catch {
    // A client-side SDK error must not break the reader.
  }

  const syncChrome = () => {
    try {
      tg.setHeaderColor("bg_color");
    } catch {
      // Older clients may not know the keyword; header just stays default.
    }
    try {
      tg.setBackgroundColor("bg_color");
    } catch {
      // Same degradation path as the header.
    }
    if (tg.isVersionAtLeast("7.10")) {
      try {
        tg.setBottomBarColor?.("bottom_bar_bg_color");
      } catch {
        // Bottom bar color is optional chrome.
      }
    }
  };

  applyScheme(tg);
  syncChrome();
  persistLaunch(tg);

  tg.onEvent("themeChanged", () => {
    // The client re-injects --tg-theme-* before this fires; re-mirror the
    // scheme and chrome onto our meta/class/chrome state, and persist them
    // so the next in-app navigation restores the client's latest palette.
    applyScheme(tg);
    syncChrome();
    persistLaunch(tg);
  });

  return tg;
};
