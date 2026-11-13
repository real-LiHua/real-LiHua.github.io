# Spec Delta

## Purpose

The blog MUST work as a read-only Telegram Mini App: opened inside the
Telegram client it adopts the user's Telegram color scheme and theme palette,
and opened in a regular browser it behaves exactly as before.

## ADDED Requirements

### Requirement: Shared pages bootstrap inside Telegram

The shared layout SHALL detect a Telegram launch from the URL fragment (`tgWebAppPlatform` or `tgWebAppData`) in an inline head script, apply the client palette before first paint, and mark `<html>` with a `telegram` class. The SDK SHALL load asynchronously after `window.load`, only for Telegram launches.

#### Scenario: Palette is applied before first paint

- **WHEN** the launch fragment carries `tgWebAppColorScheme` and `tgWebAppThemeParams`
- **THEN** `<html>` has the `telegram` class and `--tg-theme-*` variables before the first paint, matching the client's color scheme and palette

#### Scenario: Opened from a Telegram chat

- **WHEN** a visitor opens the site from a Telegram menu button or link inside the Telegram client
- **THEN** `<html>` carries the `telegram` class before first paint, and `ready()` and `expand()` are called once the SDK loads

#### Scenario: Opened in a regular browser

- **WHEN** a visitor opens the site in a desktop or mobile browser (no launch fragment)
- **THEN** the `telegram` class is absent, no `ready()` or `expand()` call is made, and no request to telegram.org is issued

#### Scenario: SDK fails to load

- **WHEN** the SDK request fails or is blocked inside Telegram
- **THEN** the page still renders with the client palette applied from the launch fragment

### Requirement: Telegram client colors take precedence inside Telegram

When the `telegram` class is present, the shared design tokens SHALL resolve
to the client-provided `--tg-theme-*` variables (with the site's light values
as fallback for missing fields), the `dark` class and `color-scheme` meta
SHALL mirror the client's `colorScheme`, and a `themeChanged` event SHALL
re-apply scheme, tokens, and chrome colors without a reload. The site theme
toggle SHALL be hidden inside Telegram, and the `reader-theme` preference
SHALL be neither read nor written.

#### Scenario: Client is in dark mode

- **WHEN** the Telegram client reports `colorScheme: "dark"` with theme params
- **THEN** `<html>` has `dark` (and `telegram`), the `color-scheme` meta reports `dark`, and page surfaces resolve to the client's theme colors

#### Scenario: Client is in light mode

- **WHEN** the Telegram client reports `colorScheme: "light"`
- **THEN** the `dark` class is absent, the `color-scheme` meta reports `light`, and surfaces resolve to the client's light theme colors

#### Scenario: Client theme changes while reading

- **WHEN** the visitor switches the Telegram client between light and dark (or edits the client color palette)
- **THEN** the page follows the new scheme and colors without a reload

#### Scenario: Theme toggle is not offered inside Telegram

- **WHEN** a visitor views any page inside Telegram
- **THEN** the light/dark toggle is not visible and cannot change the presented palette

#### Scenario: Browser view is unaffected

- **WHEN** a visitor opens the site outside Telegram
- **THEN** the light/dark toggle, the `reader-theme` persistence, and the system-preference default behave exactly as before

### Requirement: Telegram chrome colors match the page background

Inside Telegram, the bootstrap SHALL call `setHeaderColor("bg_color")` and
`setBackgroundColor("bg_color")`, and SHALL call
`setBottomBarColor("bottom_bar_bg_color")` when the client supports Bot API
≥ 7.10.

#### Scenario: Client supports Bot API 7.10 or later

- **WHEN** the Mini App bootstraps on a capable client
- **THEN** header, background, and bottom bar are set to Telegram's `bg_color` keyword

#### Scenario: Client is older than Bot API 7.10

- **WHEN** the Mini App bootstraps on an older client
- **THEN** header and background are still set and the bottom bar call is skipped without throwing
