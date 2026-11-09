# Tasks

## 1. Model content relationships

- [x] 1.1 First add failing collection validation tests, then extend the post schema with topic and optional series metadata, add representative topic/series frontmatter to preview posts, and reject duplicate series positions; verify `pnpm check` and focused schema tests.

## 2. Add year and topic archives

- [x] 2.1 First add failing browser tests for year/topic indexes, filtered results, and empty or unknown routes; then implement collection-backed year and topic archive pages and links from the archive/article views; verify the focused Playwright tests and truthful not-found behavior.

## 3. Add article and series navigation

- [x] 3.1 First add failing browser tests for chronological previous/next links and boundary articles; then derive neighbors deterministically from publication date and entry ID and implement the links; verify both interior and boundary cases.
- [x] 3.2 First add failing browser tests for series ordering and adjacent series navigation; then add collection-backed series pages and article series context using authored order; verify series and non-series articles.

## 4. Publish RSS

- [x] 4.1 First add failing endpoint tests for valid RSS fields, absolute canonical URLs, chronological ordering, and preview exclusion; then generate `/rss.xml` from non-preview collection entries with `@astrojs/rss`; verify an empty published collection yields a valid zero-item feed.

## 5. Verify integrated content discovery

- [x] 5.1 Run OpenSpec strict validation, Astro checks, Markdown lint, focused and full Playwright suites, then build and verify year/topic/series pages, article navigation, and the RSS endpoint from the indexed preview.
