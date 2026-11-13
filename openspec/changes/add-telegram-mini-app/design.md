# Design

## Context

The reader ships a single self-contained page shell (`SiteLayout.astro`) with a
class-toggle light/dark theme applied before first paint by an inline head
script, persisted as `reader-theme` in `localStorage`. Styles consume shared
CSS custom properties (`--background`, `--foreground`, `--primary`, …) defined
in `src/styles/global.css`, so re-theming the whole site reduces to re-binding
those properties.

## Decisions

### D1. Detect Telegram from the URL fragment, not the SDK

The launch URL fragment carries `tgWebAppPlatform`, `tgWebAppData`,
`tgWebAppColorScheme`, and `tgWebAppThemeParams`. The inline head script
parses it synchronously, so the `telegram` class, the forced scheme, and the
injected `--tg-theme-*` (snake_case → kebab-case, e.g. `bg_color` →
`--tg-theme-bg-color`) land before first paint. This makes the palette
independent of the SDK's network latency or availability. Only when the
fragment indicates a Telegram launch is the SDK injected — after
`window.load`, so the external request never delays rendering or the load
event; regular browsers never contact telegram.org.

### D2. A `telegram` class on `<html>` switches the token source

The inline head script adds `telegram` to `<html>` synchronously, before the
stylesheet can paint, and mirrors the client's `colorScheme` onto the existing
`dark` class and `color-scheme` meta. Token mapping lives in a single
`:root.telegram` block that overrides the shared custom properties with
`--tg-theme-*` values (each with the site's current value as fallback, so
older clients missing a field still render sanely). `:root.telegram` (0,2,0)
outranks the `.dark` token block (0,1,0) regardless of source order. The
`.dark` toggle remains meaningful for client schemes that report dark/light
and for the shadcn `@custom-variant dark` utilities.

### D3. Telegram colors are forced, not an override preference

Inside Telegram the site palette is replaced; `reader-theme` is neither read
nor written there, and `themeChanged` from the client re-applies scheme,
meta, and chrome colors immediately. The theme toggle is hidden under
`.telegram` (forced follow was chosen; no in-client escape hatch).

### D4. Browser fallback is the absence of the class

No `telegram` class ⇒ the stylesheet and head script are byte-for-byte the
current behavior; no SDK request is ever issued. If the SDK fails to load
inside Telegram (offline, CSP, CDN hiccup), the head bootstrap has already
applied the client palette and injected the theme variables — only `ready()`,
chrome sync, and live `themeChanged` are lost. A Telegram-side script error
must not break rendering.

### D5. Chrome colors use keywords, not hex

`setHeaderColor("bg_color")` / `setBackgroundColor("bg_color")` follow the
user's theme automatically; `setBottomBarColor("bottom_bar_bg_color")` is
gated on `isVersionAtLeast("7.10")`. Hard-coded hex would fight D3.

### D6. No view transitions, no rebinding

The site does not use Astro `<ClientRouter />`. `themeChanged` is bound inside
`initTelegram()`, which runs once per full page load (guarded against double
invocation by the immediate call, the SDK `onload`, and the late-load retry),
so nothing leaks across navigations.

### D7. No server component, no identity handling

The Mini App is read-only presentation on the existing GitHub Pages URL.
`initData` is not consumed anywhere, so there is nothing to validate and no
attack surface to add.

## Token mapping

| Site token                                | Telegram variable (fallback)                                    |
| ----------------------------------------- | --------------------------------------------------------------- |
| `--background`                            | `--tg-theme-bg-color` (site light default)                      |
| `--foreground`                            | `--tg-theme-text-color`                                         |
| `--card`, `--popover`                     | `--tg-theme-secondary-bg-color` → `--tg-theme-section-bg-color` |
| `--secondary`, `--muted`, `--accent`      | `--tg-theme-secondary-bg-color`                                 |
| `--primary`, `--ring`                     | `--tg-theme-accent-text-color` → `--tg-theme-link-color`        |
| `--primary-foreground`                    | `--tg-theme-button-text-color`                                  |
| `--muted-foreground`                      | `--tg-theme-hint-color`                                         |
| `--border`, `--input`, `--sidebar-border` | `--tg-theme-section-separator-color`                            |
| `--destructive`                           | `--tg-theme-destructive-text-color`                             |

Code blocks stay GitHub Dark by existing design; the mermaid/outline/search
surfaces all consume the shared tokens and follow automatically.

## Risks

- Client palettes vary per user; contrast of client combos (e.g. muted text on
  bg) is the client's responsibility — we keep our own focus rings (`--ring` →
  accent) visible on all themes.
- `?65` pins the SDK build; bump deliberately.
