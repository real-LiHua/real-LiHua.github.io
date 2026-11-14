# Tasks

## 1. Add the dependency and card renderer

- [x] 1.1 Install `astro-og-canvas` and `canvaskit-wasm`; confirm the build no longer throws the `__dirname` CanvasKit error.
- [x] 1.2 Add `src/lib/og-font.ts` to resolve Maple Mono Normal NF CN from `MAPLE_FONT_PATH`, the CI-ready `.cache/maple-font/input`, or installed system fonts, failing with an actionable message otherwise.
- [x] 1.3 Add `src/lib/og-image.ts` with the `DESIGN.md` colour tokens, font family and sizes for 1200×630 cards.

## 2. Generate and advertise the cards

- [x] 2.1 Add `src/pages/open-graph/[...route].ts` with `prerender = true`, building pages for the home, article, series and topic indexes, each series, each topic and each post; prefix preview post descriptions with `预览示例 ·`.
- [x] 2.2 Set `Content-Type: image/png` on the route response so dev requests and static builds agree.
- [x] 2.3 Emit canonical, `og:*`, and `twitter:*` tags from `SiteLayout`, with `/open-graph/index.png` as the default image.
- [x] 2.4 Pass per-page image paths from the post, series, topic, and index pages.

## 3. Test and document

- [x] 3.1 Add `tests/unit/og-font.test.ts` covering the env override, missing override, CI cache, system fallback, and no-font failure.
- [x] 3.2 Verify `pnpm run build` writes all cards to `dist/client/open-graph/` and that a post page advertises its card; check Chinese glyphs with an OCR pass.
- [x] 3.3 Document the endpoint and font resolution in `README.md`; validate the change with `openspec validate add-open-graph-images --strict` and lint the Markdown.
