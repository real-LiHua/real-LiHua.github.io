# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Visitors who come to read long-form posts, primarily in Simplified Chinese (site language `zh-CN`). Two situations: discovering (home feed, archives by year/topic/series, on-page search dialog, RSS) and focused reading (article pages with outline, heading anchors, code copy, archive lookups).

## Product Purpose

A personal blog reader. It publishes Markdown posts through an Astro content collection and presents them in a calm, bookish, quietly precise reading experience. Success means any visitor can discover, search, and read posts comfortably on any viewport, with theme and reading-control preferences persisting across navigation and reload.

## Positioning

The reading experience itself is the product: a monospace-first editorial system where one font carries text, code, and icons, one restrained moss-green accent marks interaction, and no logo or site-name wordmark exists. Content, not chrome, MUST be the identity.

## Operating Context

- Content MUST live as Markdown in `src/content/posts/` (Astro Content Collection, zod-validated frontmatter), which is mounted as a git submodule. Preview sample posts live in `tests/fixtures/posts/`, MUST stay visibly labeled and MUST be excluded from RSS; they MUST NOT be part of CI builds (`src/content.config.ts` excludes them when `CI` is set).
- Routes: home feed, `/posts/` archive, year/topic/series archives, search, article pages, RSS (`/rss.xml`), custom not-found page.
- Search: Orama index at `/search-index.json`, with the Mandarin tokenizer shared by build and browser, presented as a native dialog without route change.
- Markdown MUST render through `satteri`; the unified/remark/rehype ecosystem MUST NOT be used.
- Fonts: system-installed `Maple Mono Normal NF CN` in development; GitHub Actions MUST fetch and verify the official upstream release and emit local WOFF2 subsets (SIL OFL 1.1, attribution preserved).
- WebMCP MAY expose read-only post tools to compatible browsers; this MUST stay optional at runtime.
- The same site MUST work as a read-only Telegram Mini App: inside Telegram the palette MUST follow the client theme (forced, across in-app navigations), chrome MUST sync to the client, and the WebApp SDK MUST load after `window.load`; browsers MUST stay unaffected. A labeled test page (`/test/group-popup/`) MAY exercise the native-popup path with the user's nickname, without any group-membership check.
- Site URL MUST be configured as `https://real-lihua.github.io`.

## Capabilities and Constraints

- Light/dark theme MUST persist in `localStorage` (`reader-theme`), default to the system preference, and be applied before first paint.
- The article outline control MUST be draggable with a persisted, viewport-clamped position; code blocks MUST carry a language badge and copy control; heading anchors MUST be shareable; the Internet Archive lookup beside external links MUST be explicit and MUST NOT probe or retry automatically.
- Missing pages MUST return a truthful HTTP 404 with an IIS-inspired presentation only — server identity MUST NOT be forged.
- OpenSpec (`pnpm run openspec`) MUST remain the source of truth for requirements; behavior changes MUST follow TDD.
- Out of scope: logo or wordmark, author profile, comments, authentication, admin or editor UI.

## Brand Commitments

- No logo and no site-name wordmark MUST NOT appear anywhere in the shared interface.
- UI copy MUST be Simplified Chinese.
- Maple Mono Normal NF CN MUST remain the identity font (Noto Sans CJK SC fallback) with `font-synthesis: none`.
- Visual direction MUST stay bookish, measured, quietly precise — a printed page with ink, generous margins, and soft reading light. Gradients, glows, decorative blobs, emoji labels, and dashboard-style card grids MUST NOT be introduced.

## Evidence on Hand

- Implemented reader UI: `src/layouts/SiteLayout.astro`, `src/pages/**`, `src/styles/global.css`, `src/lib/**`.
- Four preview posts in `tests/fixtures/posts/`; `src/content/posts/` is empty until the content submodule is mounted. No real published content exists yet — published articles MUST NOT be fabricated and preview entries MUST NOT be presented as real.
- OpenSpec changes: `design-blog-reader-ui`, `add-content-discovery-and-rss`, `document-project-dependency-baseline`.

## Product Principles

1. Reading first — article typography and code examples MUST carry emphasis; navigation and controls MUST stay quiet.
2. Truthful states — preview labels MUST be explicit, 404 MUST be real, and search and availability feedback MUST be honest.
3. Calm persistence — theme and outline-position choices MUST survive navigation and reload.
4. Accessible by default — keyboard operation, visible focus, reduced motion, CJK legibility, and no page-level overflow MUST be maintained.
5. Restraint — one accent only; motion MUST serve state changes; dismissal MUST be quicker than opening.

## Accessibility & Inclusion

Controls MUST be keyboard-operable with visible 2px focus rings at 3px offset, the skip link MUST be the first focusable control, reduced motion MUST be honored, search tokenization and fonts MUST be CJK-aware, and dark mode MUST retain muted contrast.

Normative keywords (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY) follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119); see `AGENTS.md`.
