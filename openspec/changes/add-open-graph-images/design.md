# Design

## Prerender the cards

The site is served on demand by the Node adapter, but cards only change when
content changes, so the route exports `prerender = true` and every image is
written into the static client output during the build. Rendering on request
would keep CanvasKit and a 20 MB font in the server bundle for no benefit.

## Reuse the site font strategy

Maple Mono Normal NF CN carries both the brand look and the Chinese titles.
`resolveMapleFontPath()` checks, in order: `MAPLE_FONT_PATH`, the verified
release prepared by CI at `.cache/maple-font/input`, and the installed system
font. Local development therefore needs no download, matching the existing
font spec; CI uses the same checksum-verified release as the web font build.
The checks are rooted at `process.cwd()` because the route module is bundled
into `dist/server/.prerender`, where `import.meta.url` no longer points at the
project.

**Alternative considered:** a Latin-only fallback font. Rejected because every
title in this blog is Chinese and would render as missing glyphs.

## Match the reader palette

`src/lib/og-image.ts` converts the `DESIGN.md` tokens to RGB: a paper gradient,
ink title, muted description, and a moss border on the inline start edge.
Cards are intentionally static and do not follow the reader's light/dark
preference; a share image is rendered once, not per viewer.

## Label previews

Posts with `isPreview: true` prefix their card description with
`预览示例 ·`, matching the on-page preview note so a shared card never implies a
published article.

## Serve a content type

`OGImageRoute` returns the encoded PNG without headers. The build serves the
prerendered file with `image/png`, but the dev server and any on-demand
rendering need `Content-Type: image/png`, which the route sets before returning
the response.
