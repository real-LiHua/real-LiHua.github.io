# Tasks

Implement each behavior task using TDD: write or update its automated test
first, run it and confirm the expected failure, implement the smallest
passing change, then refactor with tests remaining green. Use a focused test
type appropriate to each behavior; reserve the final verification task for
integrated regression checks.

## 1. Create the reader site foundation

- [x] 1.1 First add failing route and not-found browser tests, then implement the minimal Astro configuration, shared semantic page shell, clearly identified sample posts, and IIS-inspired visitor-facing 404 page with truthful HTTP status; make the tests pass.
- [x] 1.2 First add failing checks for local no-download behavior, release checksum handling, and same-tag cache reuse; then configure local `dev` and `build` to use the system font and add the GitHub Actions step to resolve the latest stable `MapleMonoNormal-NF-CN` release, verify SHA-256, cache by release tag, and extract the needed TTF/OTF.
- [ ] 1.3 First add failing checks for font output and browser network behavior, then configure `vite-plugin-font` as build-only tooling to scan sources and emit optimized local WOFF2 subsets/CSS with SIL OFL attribution; make the checks pass for same-origin URLs and no external font requests.
- [x] 1.4 First add failing responsive and visual behavior tests, then initialize shadcn/ui for Astro with Tailwind CSS 4 using the declared CLI and add only required source components; style the shared shell and reader routes, omit the site-name/logo, and implement the calm high-legibility layout and Maple Mono fallback. Make the tests pass at desktop and narrow widths, then update README for the working preview.
- [x] 1.5 First add failing Markdown rendering and dependency-tree checks, then implement rendering with the declared `satteri` renderer and its Astro processor; make the checks pass with no direct `unified`, `remark-*`, or `rehype-*` dependencies and no configured remark/rehype rendering integration, while preserving existing packages and their transitive dependencies.
- [x] 1.6 First add failing browser tests for language badge visibility, copied text, keyboard access, and clipboard failure feedback; then implement accessible language badges and copy controls, keep long code horizontally scrollable within each block, and make the tests pass without page overflow.
- [x] 1.7 First add failing browser tests for skip navigation, stable/copyable heading anchors, and narrow-screen images/tables; then implement focus-visible skip link, unique heading anchors with accessible copy feedback, responsive images preserving alt semantics, and keyboard-accessible horizontally scrollable table regions.
- [x] 1.8 First add failing checks for collection schema, collection-backed routes, and preview content labels; then migrate article data to validated Markdown entries in an Astro Content Collection, add several sample articles, and source the home feed, archive, article detail, and generated search index from the collection while preserving `satteri` rendering.

## 2. Add persistent appearance preferences

- [x] 2.1 First add failing browser tests for system-preference default, explicit theme toggle, navigation, and reload restoration; then implement the shared light/dark switch and local-storage persistence and make the tests pass.

## 3. Add site search

- [x] 3.1 First add failing browser tests for matching results, empty query, no results, and unavailable index; then connect search to the generated Pagefind index and make the tests pass.
- [x] 3.2 First add failing browser tests for opening search from shared navigation, submitting results without changing the current route, and closing with Escape while restoring focus; then add the shared native search dialog and keep `/search/` as a direct-access fallback.
- [x] 3.3 First add failing browser tests for the WebMCP manifest and feature-detected tool registration; then configure Astro WebMCP for public post routes and make the tests pass without affecting unsupported browsers.
- [x] 3.4 First update the search unit and browser tests to require an Orama-backed index with Mandarin tokenization, preview labels, and unavailable-index handling; then generate a prerendered Orama index from the posts collection, load it on demand in the search UI, and remove the Pagefind build tooling.
- [x] 3.5 First add a failing browser test where WebMCP `search_content` answers a body-only term from a synthetic Orama index; then bundle the aliased Orama client with the Mandarin tokenizer and remove the manifest body-text tags so Orama is the only body-search source.

## 4. Add the article outline control

- [x] 4.1 First add failing browser tests for outline generation, open/close, anchor navigation, pointer/touch dragging, viewport clamping, and narrow-screen operation; then implement the accessible collapsible floating control and make the tests pass.
- [x] 4.2 First add failing browser tests for current-section highlighting and viewport-specific initial state; then highlight the section at the current reading position, expose it as the current location, open the outline by default on wide viewports, and keep it collapsed by default on narrow viewports.
- [x] 4.3 First add failing browser tests for outline placement and long-list tracking; then keep the outline beside article content when space permits, bound and internally scroll it when floating, and keep the active entry visible without unexpectedly scrolling the article.
- [x] 4.4 First add failing browser tests for nested heading hierarchy and panel placement with the toggle near both viewport edges; then build an accessible nested outline and position its panel opposite the toggle without obscuring the toggle or overflowing the viewport.
- [x] 4.5 First add failing browser tests for restoring the dragged outline control position after reload and safely handling invalid stored values; then persist and restore its in-viewport position.
- [x] 4.6 First add failing browser tests for the ergonomic wide/narrow viewport defaults; then place the initial toggle on the left at mid-height on wide screens and on the right in the lower half on narrow screens while retaining saved positions.

## 5. Add external-link archive lookups

- [x] 5.1 First add failing browser tests for original and Archive links, URL encoding, excluded link types, and no retry/redirect behavior; then implement eligible external-link controls and make the tests pass.

## 6. Respect motion preferences

- [x] 6.1 First add failing browser tests for theme and outline transitions with normal and reduced-motion preferences, confirming panel state and focus remain usable; then suppress nonessential motion when reduced motion is requested and verify panel dismissal is quicker and quieter than opening.

## 7. Verify the integrated preview

- [ ] 7.1 Run OpenSpec strict validation, the relevant Astro checks, Playwright coverage, and Markdown lint; build and serve the indexed site and verify home, archive, search, and article pages in the browser preview after all implementation tasks are complete.
