# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Visitors who come to read long-form posts, primarily in Simplified Chinese (site language `zh-CN`). Two situations: discovering (home feed, archives by year/topic/series, on-page search dialog, RSS) and focused reading (article pages with outline, heading anchors, code copy, archive lookups).

## Product Purpose

A personal blog reader. It publishes Markdown posts through an Astro content collection and presents them in a calm, bookish, quietly precise reading experience. Success means any visitor can discover, search, and read posts comfortably on any viewport, with theme and reading-control preferences persisting across navigation and reload.

## Positioning

The reading experience itself is the product: a monospace-first editorial system where one font carries text, code, and icons, one restrained moss-green accent marks interaction, and no logo or site-name wordmark exists. Content, not chrome, is the identity.

## Operating Context

- Content lives as Markdown in `src/content/posts/` (Astro Content Collection, zod-validated frontmatter). Current entries are preview samples (`isPreview: true`) that must stay visibly labeled and excluded from RSS; real content sources arrive later.
- Routes: home feed, `/posts/` archive, year/topic/series archives, search, article pages, RSS (`/rss.xml`), custom not-found page.
- Search: Orama index at `/search-index.json`, Mandarin tokenizer shared by build and browser, native dialog without route change.
- Markdown renders through `satteri`; the unified/remark/rehype ecosystem is not used.
- Fonts: system-installed `Maple Mono Normal NF CN` in development; GitHub Actions fetches and verifies the official upstream release and emits local WOFF2 subsets (SIL OFL 1.1, attribution preserved).
- WebMCP exposes read-only post tools to compatible browsers; optional at runtime.
- The same site works as a read-only Telegram Mini App: inside Telegram the palette follows the client theme (forced, across in-app navigations), chrome syncs to the client, and the WebApp SDK loads after `window.load`; browsers are unaffected. A labeled test page (`/test/group-popup/`) exercises the native-popup path with the user's nickname, without any group-membership check.
- Site URL is configured as `https://real-lihua.github.io`.

## Capabilities and Constraints

- Light/dark theme persisted in `localStorage` (`reader-theme`); system preference by default; applied before first paint.
- Draggable article outline control with persisted, viewport-clamped position; code blocks with language badge and copy control; shareable heading anchors; explicit Internet Archive lookup beside external links, never automatic probing or retrying.
- Missing pages return a truthful HTTP 404 with an IIS-inspired presentation only — no forged server identity.
- OpenSpec (`pnpm run openspec`) is the source of truth for requirements; behavior changes follow TDD.
- Out of scope: logo or wordmark, author profile, comments, authentication, admin or editor UI.

## Brand Commitments

- No logo and no site-name wordmark anywhere in the shared interface.
- Simplified Chinese UI copy.
- Maple Mono Normal NF CN is the identity font (Noto Sans CJK SC fallback) with `font-synthesis: none`.
- Visual direction: bookish, measured, quietly precise — a printed page with ink, generous margins, and soft reading light. Avoid gradients, glows, decorative blobs, emoji labels, and dashboard-style card grids.

## Evidence on Hand

- Implemented reader UI: `src/layouts/SiteLayout.astro`, `src/pages/**`, `src/styles/global.css`, `src/lib/**`.
- Four preview posts in `src/content/posts/`. No real published content exists yet — never fabricate published articles or present preview entries as real.
- OpenSpec changes: `design-blog-reader-ui`, `add-content-discovery-and-rss`, `document-project-dependency-baseline`.

## Product Principles

1. Reading first — article typography and code examples carry emphasis; navigation and controls stay quiet.
2. Truthful states — preview labels, real 404, honest search and availability feedback.
3. Calm persistence — theme and outline-position choices survive navigation and reload.
4. Accessible by default — keyboard operation, visible focus, reduced motion, CJK legibility, no page-level overflow.
5. Restraint — one accent; motion only for state changes; dismissal quicker than opening.

## Accessibility & Inclusion

Keyboard-operable controls with visible 2px focus rings at 3px offset, skip link as the first focusable control, reduced-motion honored, CJK-aware search tokenization and fonts, muted-contrast dark mode.
