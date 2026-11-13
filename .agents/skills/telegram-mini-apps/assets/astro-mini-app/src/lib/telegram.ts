/**
 * Minimal, dependency-free bridge to the Telegram Mini App SDK.
 *
 * The SDK is loaded by the layout as an inline script:
 *   <script is:inline src="https://telegram.org/js/telegram-web-app.js?65"></script>
 *
 * This module only covers the surface a typical app needs: init, chrome colors,
 * theme/safe-area/visibility events, and a safe browser fallback. Everything
 * else is documented in the skill references (sdk-core.md, ui-components.md).
 *
 * It is SSR-safe: every export tolerates `window.Telegram` being absent.
 */

export type ColorScheme = 'light' | 'dark';

export interface ThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  section_separator_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
  bottom_bar_bg_color?: string;
}

export interface SafeAreaInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

/** The parts of `initDataUnsafe` you may use for optimistic rendering only. */
export interface InitDataUnsafe {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: {
    id: number;
    type: 'group' | 'supergroup' | 'channel';
    title: string;
    username?: string;
    photo_url?: string;
  };
  chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date?: number;
  hash?: string;
  signature?: string;
}

export interface BottomButton {
  text: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText(text: string): this;
  show(): this;
  hide(): this;
  enable(): this;
  disable(): this;
  showProgress(leaveActive?: boolean): this;
  hideProgress(): this;
  onClick(callback: () => void): this;
  offClick(callback: () => void): this;
  setParams(params: {
    text?: string;
    color?: string;
    text_color?: string;
    is_active?: boolean;
    is_visible?: boolean;
    position?: 'left' | 'right' | 'top' | 'bottom';
  }): this;
}

/** Event payloads we consume directly. Unknown events get `unknown`. */
export interface TelegramEventMap {
  themeChanged: undefined;
  viewportChanged: {
    isExpanded: boolean;
    isStateStable: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
  };
  safeAreaChanged: undefined;
  contentSafeAreaChanged: undefined;
  fullscreenChanged: undefined;
  fullscreenFailed: { error: string };
  activated: undefined;
  deactivated: undefined;
}

export type TelegramEvent = keyof TelegramEventMap;

type Listener = (payload?: unknown) => void;

export interface TelegramWebApp {
  /* Launch data */
  initData: string;
  initDataUnsafe: InitDataUnsafe;

  /* Environment */
  version: string;
  platform: string;
  colorScheme: ColorScheme;
  themeParams: ThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  isActive: boolean;
  isFullscreen: boolean;
  safeAreaInset: SafeAreaInset;
  contentSafeAreaInset: SafeAreaInset;

  /* Capabilities */
  isVersionAtLeast(version: string): boolean;

  /* Lifecycle */
  ready(): void;
  expand(): void;
  close(): void;

  /* Fullscreen (Bot API 8.0+) */
  requestFullscreen?(): void;
  exitFullscreen?(): void;

  /* Native chrome */
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;

  /* Events */
  onEvent(event: string, callback: Listener): void;
  offEvent(event: string, callback: Listener): void;

  /* Native UI */
  MainButton: BottomButton;
  SecondaryButton?: BottomButton;
  BackButton: {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export interface InitTelegramOptions {
  /** Expand to the maximum available height. Default `true`. */
  expand?: boolean;
  /**
   * Request fullscreen (Bot API 8.0+). Falls back to `expand()` when the
   * client does not support it. Default `false`.
   */
  fullscreen?: boolean;
  /** Sync header, background, and bottom bar colors. Default `true`. */
  chromeColors?: boolean;
  /** Bind theme/viewport/fullscreen/visibility listeners. Default `true`. */
  bindEvents?: boolean;
  /**
   * Called when fullscreen is requested but the client rejects it, so the app
   * can restore a non-fullscreen layout. Defaults to `expand()`.
   */
  onFullscreenFailed?: (error: string) => void;
}

export interface TelegramHandle {
  tg: TelegramWebApp;
  /** Apply current theme + chrome colors again (e.g. after a manual theme switch). */
  sync(): void;
  /** Remove this caller's listeners. Cleanup runs when the last handle is destroyed. */
  destroy(): void;
}

/* -------------------------------------------------------------------------- */
/* Environment helpers                                                        */
/* -------------------------------------------------------------------------- */

export function getTelegram(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

export function isTelegram(): boolean {
  return getTelegram() !== null;
}

export function isVersionAtLeast(version: string): boolean {
  const tg = getTelegram();
  if (!tg) return false;
  try {
    return tg.isVersionAtLeast(version);
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Singleton state                                                            */
/* -------------------------------------------------------------------------- */

interface Session {
  tg: TelegramWebApp;
  refs: number;
  teardown: () => void;
}

let session: Session | null = null;

/** Mirror SDK state onto <html> so CSS can react without JS. */
function applyAttributes(tg: TelegramWebApp): void {
  const root = document.documentElement;
  root.dataset.tgScheme = tg.colorScheme;
  root.dataset.tgPlatform = tg.platform;
  root.dataset.tgExpanded = String(tg.isExpanded);
  root.dataset.tgFullscreen = String(tg.isFullscreen);
  root.dataset.tgActive = String(tg.isActive);
}

/**
 * Re-apply chrome colors. Keywords are preferred over hex values: Telegram
 * resolves them against the current theme, so they stay correct after
 * `themeChanged` and in both color schemes.
 */
export function syncChrome(tg: TelegramWebApp): void {
  const safe = (fn: () => void) => {
    try {
      fn();
    } catch (error) {
      // One unsupported chrome call must not abort the rest of init.
      console.warn('[telegram] chrome update failed', error);
    }
  };

  safe(() => tg.setHeaderColor('bg_color'));
  safe(() => tg.setBackgroundColor('bg_color'));

  const setBottomBarColor = tg.setBottomBarColor?.bind(tg);
  if (setBottomBarColor && tg.isVersionAtLeast('7.10')) {
    safe(() => setBottomBarColor('bottom_bar_bg_color'));
  }
}

/* -------------------------------------------------------------------------- */
/* Initialization                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Initialize the Mini App. Safe to call from several components: listeners are
 * reference-counted, so the first call binds them and the last `destroy()`
 * removes them.
 *
 * Returns `null` outside Telegram (SSR or a plain browser tab); callers should
 * render a labelled preview in that case.
 */
export function initTelegram(
  options: InitTelegramOptions = {},
): TelegramHandle | null {
  const tg = getTelegram();
  if (!tg) return null;

  if (session) {
    session.refs += 1;
    return makeHandle(session.tg);
  }

  const {
    expand = true,
    fullscreen = false,
    chromeColors = true,
    bindEvents = true,
    onFullscreenFailed,
  } = options;

  const listeners: Array<[string, Listener]> = [];
  const on = (event: string, listener: Listener) => {
    tg.onEvent(event, listener);
    listeners.push([event, listener]);
  };

  // 1. Reveal the app once the first screen exists.
  tg.ready();

  // 2. Size the viewport. Fullscreen implies expand; never call both blindly.
  if (fullscreen && tg.isVersionAtLeast('8.0') && tg.requestFullscreen) {
    if (bindEvents) {
      on('fullscreenFailed', (payload) => {
        const error = (payload as { error?: string } | undefined)?.error ?? 'unknown';
        console.warn('[telegram] fullscreen failed:', error);
        tg.expand();
        onFullscreenFailed?.(error);
      });
    }
    try {
      tg.requestFullscreen();
    } catch {
      tg.expand();
    }
  } else if (expand && !tg.isExpanded) {
    tg.expand();
  }

  // 3. Match native chrome to the app surface, then keep it in sync.
  if (chromeColors) syncChrome(tg);
  applyAttributes(tg);

  if (bindEvents) {
    on('themeChanged', () => {
      applyAttributes(tg);
      if (chromeColors) syncChrome(tg);
    });
    on('viewportChanged', (payload) => {
      const next = payload as TelegramEventMap['viewportChanged'] | undefined;
      // Only react to settled state; intermediate gesture values cause churn.
      if (next?.isStateStable) applyAttributes(tg);
    });
    on('safeAreaChanged', () => applyAttributes(tg));
    on('contentSafeAreaChanged', () => applyAttributes(tg));
    on('fullscreenChanged', () => {
      applyAttributes(tg);
      if (chromeColors) syncChrome(tg);
    });
    on('activated', () => applyAttributes(tg));
    on('deactivated', () => applyAttributes(tg));
  }

  session = {
    tg,
    refs: 1,
    teardown: () => {
      for (const [event, listener] of listeners) tg.offEvent(event, listener);
      listeners.length = 0;
    },
  };

  return makeHandle(tg);
}

function makeHandle(tg: TelegramWebApp): TelegramHandle {
  // Bind the handle to the session that existed when it was created, so a
  // stale handle cannot tear down a newer session.
  const owner = session;

  return {
    tg,
    sync() {
      applyAttributes(tg);
      syncChrome(tg);
    },
    destroy() {
      if (!owner || session !== owner) return;
      owner.refs -= 1;
      if (owner.refs > 0) return;
      owner.teardown();
      session = null;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Astro view transitions                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Keep Telegram state correct across Astro view transitions.
 *
 * `astro:page-load` fires on the initial load too, so this covers both cases.
 * Returns a cleanup function for `astro:before-swap`.
 *
 * Usage in a client script:
 *   const stop = observeTelegram();
 *   document.addEventListener('astro:before-swap', stop, { once: true });
 */
export function observeTelegram(): () => void {
  if (typeof document === 'undefined') return () => {};

  let handle: TelegramHandle | null = null;

  const start = () => {
    handle?.destroy();
    handle = initTelegram();
  };

  document.addEventListener('astro:page-load', start);
  start();

  return () => {
    document.removeEventListener('astro:page-load', start);
    handle?.destroy();
    handle = null;
  };
}
