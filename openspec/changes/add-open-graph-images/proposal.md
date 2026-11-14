# Proposal

## Why

Shared links to the blog currently have no preview image, so posts and section
pages appear as plain text in chat clients and social feeds. The reader uses a
monospace CJK typeface, so a generic Latin-only image generator would render the
Chinese titles as missing glyphs.

## What Changes

- Add `astro-og-canvas` and `canvaskit-wasm` as dependencies.
- Add a prerendered `/open-graph/**` endpoint that renders a 1200×630 card for
  the home page, article index, series index, each series, each topic, and each
  post, using titles and descriptions from the content collection.
- Add a shared card style derived from `DESIGN.md` (paper background, ink text,
  moss accent border) and a Maple Mono Normal NF CN font resolver that reuses
  the site's existing font strategy: the CI-prepared release, the installed
  system font, or `MAPLE_FONT_PATH`.
- Mark preview posts on their cards, matching the preview labelling on the site.
- Emit `og:*`, `twitter:*`, and canonical meta tags from `SiteLayout`.
- Document the endpoint and font resolution in `README.md`.

## Capabilities

### New Capabilities

- `open-graph-images`: the site provides truthful, branded OpenGraph share
  images for its reader pages and advertises them to link unfurlers.

### Modified Capabilities

None.

## Impact

- `package.json`, `pnpm-lock.yaml`: new `astro-og-canvas` and `canvaskit-wasm`
  dependencies.
- `src/lib/og-font.ts`, `src/lib/og-image.ts` and
  `src/pages/open-graph/[...route].ts`: new card rendering.
- `src/layouts/SiteLayout.astro` plus reader pages: share and canonical meta
  tags.
- `tests/unit/og-font.test.ts`: font-resolution checks.
- `README.md`: usage notes. Build time grows slightly; the integration caches
  rendered cards by content hash in `node_modules/.astro-og-canvas`.
