# Proposal

## Why

The repository had no application source or UI specification, so there was
no existing site design to render faithfully. This change defines a
coherent, accessible reader-facing blog experience — navigation, article
discovery and reading, persistent light/dark themes, and the requested
draggable article outline — before implementation.

## What Changes

- Define the public blog reader experience across home, post
  listing/archive, site search, and article pages, backed by clearly
  identified sample articles stored as Markdown entries in an Astro Content
  Collection with validated frontmatter, plus a custom IIS-inspired 404
  page with truthful HTTP behavior.
- Establish the editorial visual direction, quiet eye-comfortable styling
  without a site-name wordmark or logo, and purposeful motion that honors
  reduced-motion preferences, recorded in the repository-root `PRODUCT.md`
  and `DESIGN.md`; use the locally installed Maple Mono Normal NF CN during
  development and optimized local font assets in GitHub Actions builds.
- Make articles accessible and readable: skip link, copyable heading
  anchors, responsive images and tables, language-badged code blocks with an
  accessible copy control, and `satteri` Markdown rendering replacing the
  Unified ecosystem (remark/rehype).
- Provide a consistent light/dark theme switch that persists across pages
  and reloads.
- Keep site search on the current page through a shared, accessible search
  dialog presenting Orama results with Mandarin tokenization, keep `/search/`
  as a direct-access fallback, and expose safe read-only post tools to
  compatible browser agents through Astro WebMCP.
- Specify a collapsible, hierarchically nested article outline with an
  accessible floating button readers can reposition without obscuring the
  outline, whose position persists across reloads, with ergonomic wide/narrow
  viewport defaults.
- Offer an explicit Internet Archive lookup beside eligible external links,
  without unreliable automatic dead-link detection.
- Require test-driven development, with behavior tests written and observed
  failing before the corresponding code, and focused responsive,
  interaction, accessibility, and persistence checks.

## Capabilities

### New Capabilities

- `blog-reader-ui`: Public blog pages, navigation, site search, reading
  controls, and persistent visual theme.

### Modified Capabilities

None.

## Impact

The checkout had no `src/`, Astro configuration, tests, or static assets,
and `openspec/specs/` contained no existing capability requirements.
Implementation adds the public site shell and reader pages using Astro 7,
Tailwind CSS 4, and shadcn/ui components initialized for Astro with the
declared shadcn CLI, plus tests or preview support as needed. The user
provided the [Maple Font download
page](https://font.subf.dev/zh-cn/download/), which links to official
GitHub releases including `MapleMonoNormal-NF-CN`: development uses the
font already installed on the developer's system, and GitHub Actions
fetches the latest stable official release, verifies its published
checksum, caches the source by release tag, and uses `vite-plugin-font` to
generate locally served optimized subsets. The font identifies as SIL OFL
1.1; preserve its license and attribution.
