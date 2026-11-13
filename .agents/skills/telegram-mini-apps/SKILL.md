---
name: telegram-mini-apps
description: >
  Build, debug, and review Telegram Mini Apps (also called Telegram Web Apps) — web apps
  that run inside Telegram's WebView. Use this skill whenever the user mentions Telegram
  Mini Apps/Web Apps, telegram-web-app.js, window.Telegram.WebApp, initData or
  initDataUnsafe, MainButton/SecondaryButton/BackButton, CloudStorage, BotFather menu
  buttons, startapp/startattach links, or wants a web app to work inside Telegram. Also
  use it for server-side initData validation, theme/safe-area/layout problems, fullscreen
  mode, haptics, payments, device features, and Mini App testing or debugging — even if
  the user only says "Telegram bot app", "mini app", "TMA", "Telegram 小程序", or
  "Telegram 迷你应用".
---

# Telegram Mini Apps

A Mini App is a web app rendered in Telegram's WebView, wrapped in native chrome (header,
bottom buttons, context menu). The SDK `telegram-web-app.js` exposes
`window.Telegram.WebApp`, which bridges the page to the Telegram client.

Two constraints explain most bugs and design mistakes:

1. **The launch context decides what the app can do.** A Mini App opened from a keyboard
   button can call `sendData()`; one opened from a menu button cannot. Attachment-menu
   launches get `receiver`/`chat` data and clipboard access; most others do not. Check the
   matrix below before promising a feature.
2. **`initData` is the only trustworthy identity**, and only after the server validates
   it. `initDataUnsafe` is a convenience copy for optimistic rendering, not authentication.

Official docs: <https://core.telegram.org/bots/webapps> · SDK:
<https://telegram.org/js/telegram-web-app.js> · Bot API:
<https://core.telegram.org/bots/api> · Serverless: <https://core.telegram.org/bots/serverless>

## Launch context matrix

| Launch | How it opens | `initData` | Capabilities and gotchas |
|---|---|---|---|
| Main Mini App | Profile **Launch app** or `t.me/bot?startapp=...` | Yes | Full app in chat context; `chat_type`/`chat_instance`; opens at full height by default (`mode=compact` for half height). |
| Keyboard button | `web_app` reply-keyboard button | **Empty** | `sendData()` works and **closes** the app. Best for simple input forms. |
| Inline button | `web_app` inline keyboard button | Yes | `query_id` lets the bot reply with `answerWebAppQuery`; basic user info. |
| Menu button | BotFather `/setmenubutton` or `setChatMenuButton` | Yes | Same as inline button, but always one tap away. |
| Direct link | `t.me/bot/appname?startapp=...` | Yes | `start_param`, `chat_type`, `chat_instance`; no chat read/write access. |
| Inline mode | `web_app` button in `answerInlineQuery` | No | No chat access; return with `switchInlineQuery`. |
| Attachment menu | `t.me/bot?startattach`, then Attach menu | Yes | Adds `receiver`/`chat`, `readTextFromClipboard`; **MainButton stays hidden until first interaction**. Requires test server unless you are a major advertiser. |
| Chat join request | `sendChatJoinRequestWebApp` (Bot API 10.1) | Yes | `chat_join_request_query_id`; finish with `answerChatJoinRequestQuery`. |

`startapp`/`startattach` values arrive as `start_param` **and** the GET parameter
`tgWebAppStartParam`, so the page can render the right screen before the SDK finishes
parsing the hash.

## Bootstrap sequence

Do these in this order; each step depends on the previous one.

1. **Load the SDK in `<head>` before app scripts.** Unlike most scripts, this one attaches
   event listeners and parses launch parameters at execution time. Astro's default
   `<script>` is bundled and deferred, so use `is:inline`:

   ```astro
   <script is:inline src="https://telegram.org/js/telegram-web-app.js?65"></script>
   ```

   The `?65` query pins the SDK build used by the current docs. Update it deliberately;
   the client's Bot API version is separate and exposed as `Telegram.WebApp.version`.

2. **Call `ready()` after the essential UI exists**, not at module top. It hides the
   loading placeholder. Calling it before the first screen renders produces a flash of
   empty content; calling it too late makes the app feel stuck.

3. **Expand or go fullscreen deliberately.** `expand()` gives the maximum available
   height. `requestFullscreen()` (Bot API 8.0+) is for immersive media/games and requires
   handling safe areas. Do not call both blindly.

4. **Sync chrome colors.** Set header, background, and bottom bar so fullscreen and status
   bar contrast are correct. Telegram applies theme CSS variables automatically, but
   native chrome colors need explicit values.

5. **Bind events once.** `themeChanged`, `viewportChanged`, `safeAreaChanged`,
   `contentSafeAreaChanged`, `activated`, `deactivated`. Rebind after Astro view
   transitions (`astro:page-load`), or listeners point at removed DOM.

```ts
// src/lib/telegram.ts — minimal, framework-agnostic init
export function initTelegram() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;

  tg.ready();
  if (!tg.isExpanded) tg.expand();

  const syncChrome = () => {
    // Keywords are safer than hard-coded hex: they follow the user's theme.
    tg.setHeaderColor('bg_color');
    tg.setBackgroundColor('bg_color');
    if (tg.isVersionAtLeast('7.10')) tg.setBottomBarColor('bottom_bar_bg_color');
  };

  syncChrome();
  tg.onEvent('themeChanged', syncChrome);
  tg.onEvent('viewportChanged', ({ isStateStable }) => {
    if (isStateStable) syncChrome();
  });

  return tg;
}
```

Wrap version-gated calls in `isVersionAtLeast` and a `try/catch` when the feature is
optional. The SDK warns and no-ops on older clients, but an exception in one feature should
not abort the rest of your init.

## Use native chrome instead of rebuilding it

MainButton, SecondaryButton, BackButton, and SettingsButton are rendered by Telegram. They
handle safe areas, theme colors, loading states, and haptics for free, and they look native
on every platform. A custom sticky footer duplicates that work and usually overlaps the
home indicator.

```ts
const { MainButton, BackButton, HapticFeedback } = window.Telegram.WebApp;

MainButton.setText('Save');
MainButton.show();
MainButton.onClick(async () => {
  MainButton.showProgress();          // disables the button by default
  try {
    await save();
    HapticFeedback.notificationOccurred('success');
    MainButton.hide();
  } catch {
    HapticFeedback.notificationOccurred('error');
    MainButton.hideProgress();
  }
});

// Only show back when there is somewhere to go.
BackButton.show();
BackButton.onClick(() => navigateBack());
```

Rules that prevent surprises:

- Buttons are **singletons**. Bind handlers once and update text/state; do not create a
  handler per render.
- `MainButton.show()` is ignored on attachment-menu launches until the user interacts with
  the page. If the button must exist immediately, provide an in-page fallback action too.
- `hideProgress()` does **not** re-enable a button disabled by `showProgress()`; call
  `enable()` when the operation finishes.
- SecondaryButton `position` (`left`/`right`/`top`/`bottom`) only matters when both bottom
  buttons are visible.
- The back button belongs to the Mini App's own navigation, not browser history. Hide it at
  the root screen.

## Identity and server validation

Send the raw `Telegram.WebApp.initData` string to your backend — usually in an
`Authorization` header or a POST body — then validate it before trusting `user.id`.
Validation is an HMAC-SHA-256 over a sorted `key=value` string, keyed by
`HMAC_SHA256(bot_token, "WebAppData")`. Also reject stale `auth_date` values, otherwise a
captured payload works forever.

```ts
// Client: send once, keep the session server-side.
await fetch('/api/auth/telegram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData: window.Telegram.WebApp.initData }),
});
```

The full algorithm, Node/Python implementations, third-party Ed25519 validation, and a
runnable CLI live in `references/validation.md` and `scripts/validate-init-data.mjs`.
Never validate in the browser: the bot token must not ship to clients, and client-side
checks are trivially bypassed.

Other identity paths:

- `sendData(data)` (keyboard-button launches only) sends up to 4096 bytes to the bot as a
  service message and closes the Mini App. The bot receives it as `web_app_data`.
- `query_id` + Bot API `answerWebAppQuery` sends a message on the user's behalf for inline,
  menu, and attachment launches. `can_send_after` tells you when sending becomes allowed.
- `chat_join_request_query_id` + `answerChatJoinRequestQuery` handles guard-bot join
  requests.

## Storage: pick by lifetime and sensitivity

| API | Scope | Limits | Use for |
|---|---|---|---|
| `CloudStorage` | Per bot, per user, synced across devices | 1,024 keys; key 1–128 chars (`A-Za-z0-9_-`); value ≤ 4,096 chars | Small preferences, progress, drafts that must follow the user |
| `DeviceStorage` | Per bot, per user, local device (Bot API 9.0+) | 5 MB | Caches, offline data, large local state |
| `SecureStorage` | iOS Keychain / Android Keystore (Bot API 9.0+) | 10 items | Tokens, secrets, auth state |
| `localStorage` | Web origin only | Browser quota | Non-critical UI state; do not treat as identity or secure storage |

All three Telegram storages are callback-based (`(error, value)`) and asynchronous. Wrap
them in promises so failures are handled rather than silently swallowed. CloudStorage is
**not** encrypted and is readable by the bot's backend; keep secrets out of it.

## Version gating

`Telegram.WebApp.isVersionAtLeast('8.0')` checks the client's Bot API version. Use it for
optional features; core flows should degrade to an in-page equivalent. The SDK no-ops and
logs a warning when a method is newer than the client, so a missing button is often a
version issue rather than a logic bug. `platform` (`ios`, `android`, `tdesktop`, `web`, …)
and `version` are the first things to log in a bug report.

Major gates: 6.1 back/settings buttons and invoices · 6.2 popups and closing confirmation ·
6.4 QR/clipboard/Instant View · 6.7 inline query switching · 6.9 CloudStorage,
write/contact requests · 7.0 SettingsButton, theme fields · 7.2 biometrics · 7.7 vertical
swipes · 7.8 stories · 7.10 SecondaryButton and bottom bar color · 8.0 fullscreen, safe
areas, sensors, emoji status, story/message sharing, home screen · 9.0 DeviceStorage and
SecureStorage · 9.1 `hideKeyboard` · 9.5 button icon emoji · 9.6 `requestChat` · 10.1 join
request query id.

## Astro + Tailwind specifics

**SDK placement.** Use `<script is:inline src="...">` in the layout `<head>`. Astro
processes normal `<script>` tags (bundling, `type="module"`, deferral), which violates the
"before any other scripts" requirement.

**Theme tokens.** Telegram injects `--tg-theme-*`, `--tg-color-scheme`, and
`--tg-safe-area-inset-*` on the root element. Map them once with Tailwind 4's `@theme
inline`; then use normal utilities and keep browser-preview fallbacks:

```css
/* src/styles/global.css */
@import "tailwindcss";

@theme inline {
  --color-tg-bg: var(--tg-theme-bg-color, #ffffff);
  --color-tg-text: var(--tg-theme-text-color, #000000);
  --color-tg-hint: var(--tg-theme-hint-color, #707579);
  --color-tg-link: var(--tg-theme-link-color, #2481cc);
  --color-tg-button: var(--tg-theme-button-color, #2481cc);
  --color-tg-button-text: var(--tg-theme-button-text-color, #ffffff);
  --color-tg-secondary-bg: var(--tg-theme-secondary-bg-color, #f4f4f5);
  --color-tg-section: var(--tg-theme-section-bg-color, #ffffff);
  --color-tg-destructive: var(--tg-theme-destructive-text-color, #e53935);
}

/* Respect device and Telegram chrome in fullscreen mode. */
.tg-safe-top {
  padding-top: max(0.75rem, var(--tg-content-safe-area-inset-top, 0px));
}
.tg-safe-bottom {
  padding-bottom: max(0.75rem, var(--tg-content-safe-area-inset-bottom, 0px));
}
```

Use `bg-tg-bg text-tg-text` on `<body>` and section surfaces, not hard-coded grays, or dark
mode will be half-styled.

**SSR and hydration.** `window.Telegram` does not exist during SSR. Read it in client
scripts, `onMount`, or `useEffect`; render Telegram-dependent branches after hydration.
For components that cannot render a meaningful server fallback, use `client:only`. Do not
branch on `initDataUnsafe` during SSR — the markup will not match.

**View transitions.** With Astro's `<ClientRouter />`, page scripts may not re-run the way
you expect. Bind Telegram listeners on `astro:page-load` and remove them on
`astro:before-swap`; otherwise you leak handlers across navigations.

**Dev preview.** Outside Telegram the SDK is undefined. Keep a small fallback (mock user,
light theme) so the page is still usable in a browser, but label it as a preview and never
let it bypass server auth.

**Generated-code hygiene.** Code you write against this skill must build as-is:

- `.astro` files use `interface Props` and Astro components only. Never `import … from 'svelte'`
  (or any other framework) — Astro has no such module.
- Import only symbols that are actually exported. The starter's `src/lib/telegram.ts` exports
  `initTelegram` (returning `{ tg, sync, destroy }`), `getTelegram`, `isTelegram`,
  `isVersionAtLeast`, `syncChrome`, `observeTelegram`, plus types. It does **not** export
  display-name helpers — build full name/handle inline
  (`` `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` ``) or write and export
  the helper yourself.
- Before returning, resolve every import/export you used: check the imported file for that exact
  symbol. A broken import chain means the page cannot compile, whatever the assertions say.

## Debugging quickly

| Symptom | Likely cause | Fix |
|---|---|---|
| `Telegram.WebApp` is `undefined` | SDK not loaded, blocked, or loaded after app code | Move the inline SDK tag to `<head>`; check CSP/network |
| MainButton never appears | Attachment-menu launch before interaction, or `show()` called before SDK ready | Show after `ready()`; add an in-page fallback |
| App stays half height | `expand()` not called, or `mode=compact` | Call `expand()`; remove `mode=compact` |
| Bottom UI under the home indicator | Using `viewportHeight` or fixed `bottom: 0` | Use `viewportStableHeight` and safe-area insets |
| White flash / wrong colors in dark mode | Hard-coded colors, or chrome colors not set | Use `--tg-theme-*`; call `setHeaderColor`/`setBackgroundColor` |
| `initData` is empty | Keyboard-button or inline-mode launch | Use the correct launch type; do not require `initData` there |
| `openLink` does nothing | Called outside a user gesture | Call from a click/tap handler |
| Auth works in browser, fails in Telegram | Sending `initDataUnsafe` or validating client-side | Send raw `initData`; validate on the server |
| Old client ignores a feature | Bot API version too low | Gate with `isVersionAtLeast`; degrade gracefully |
| Back button does nothing | No handler, or handler bound before SDK ready | Bind after `ready()`; hide at root |

For device debugging (iOS Safari, `chrome://inspect`, Desktop beta), test-server accounts,
and a pre-release checklist, read `references/testing.md`.

## Code review checklist

When reviewing a Mini App, check in this order:

1. SDK script is inline in `<head>` and pinned.
2. `ready()` runs after the first screen; `expand()`/fullscreen is intentional.
3. No authentication decision relies on `initDataUnsafe`.
4. `initData` is validated server-side with HMAC and `auth_date` freshness.
5. Native buttons are used for primary actions; handlers are bound once.
6. Theme uses `--tg-theme-*`; safe-area insets are respected in fullscreen.
7. Version-gated features degrade instead of crashing.
8. Storage choice matches sensitivity and size limits.
9. `sendData` is only used for keyboard-button launches.
10. The app has a browser-preview fallback that cannot bypass auth.

## References

| File | Read when |
|---|---|
| `references/sdk-core.md` | Full `WebApp` fields/methods, events, theme, safe areas, `initData` shape |
| `references/ui-components.md` | Bottom/back/settings buttons, popups, haptics, QR, stories, emoji status, downloads |
| `references/storage-and-device.md` | Cloud/device/secure storage, biometrics, accelerometer, gyroscope, orientation, location, Serverless |
| `references/launching.md` | BotFather setup, all launch modes, links, chat context, attachment menu, design guidelines |
| `references/validation.md` | HMAC and Ed25519 validation with Node/Python, auth freshness, failure modes |
| `references/testing.md` | Test server, device debug modes, release checklist |
| `references/versions.md` | Feature-to-Bot-API version map and migration notes |
| `assets/astro-mini-app/` | Copyable Astro layout, typed init helper, Tailwind theme tokens |
| `scripts/validate-init-data.mjs` | Runnable CLI to validate an `initData` string |
