# Proposal

## Why

The site is deployed at `https://real-lihua.github.io` and should double as a
Telegram Mini App. Inside the Telegram client the reader must present colors
that match the user's Telegram theme instead of the site's own light/dark
palette; outside Telegram the existing appearance behavior stays unchanged.

## What Changes

- Detect a Telegram launch from the URL fragment (`tgWebAppPlatform` /
  `tgWebAppData`) — synchronously, in the inline head script — and mark `<html>`
  with a `telegram` class before first paint.
- The head bootstrap also parses `tgWebAppColorScheme` and `tgWebAppThemeParams`
  from the fragment and copies them onto the root element as `--tg-theme-*`
  variables, so client colors apply pre-paint with zero network dependency.
- Inside Telegram, force the color scheme and all shared design tokens to the
  client-provided `--tg-theme-*` variables (token-level mapping with the
  site's current values as fallback); follow `themeChanged` events live.
- The Telegram WebApp SDK (pinned `?65`) is injected dynamically after
  `window.load` — only when the launch fragment is present — and handles
  `ready()`/`expand()`, version-gated chrome sync, and `themeChanged`. The SDK
  never blocks rendering or the load event, and regular browsers make no
  external request to telegram.org.
- Inside Telegram, hide the reader theme toggle (client colors are forced);
  the `reader-theme` localStorage preference is untouched and still governs
  browser viewing.
- Use the existing GitHub Pages URL as the Mini App URL in BotFather; no bot
  backend, no authentication — the Mini App is read-only presentation.

## Capabilities

### New Capabilities

- `telegram-mini-app`: Telegram WebApp bootstrap, forced client-color theme
  mapping, chrome sync, and browser fallback.

## Impact

- `src/layouts/SiteLayout.astro` (head scripts, theme bootstrap, toggle),
  `src/styles/global.css`, new `src/lib/telegram.ts`, new
  `tests/e2e/telegram-mini-app.spec.ts`, `README.md`.
