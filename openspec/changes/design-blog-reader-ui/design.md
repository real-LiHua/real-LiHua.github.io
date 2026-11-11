# Design

## Context

See `proposal.md` for motivation and `specs/blog-reader-ui/spec.md` for the
observable requirements. This change was planned against an empty checkout
(no `src/`, tests, or Astro configuration) and treated the reader interface
as greenfield work; the remaining open tasks are tracked in `tasks.md`.

The product direction and concrete design system now live in the
repository-root `PRODUCT.md` (North Star 「墨页 The Inked Page」) and
`DESIGN.md` (color, typography, component, and motion tokens plus named
rules), which are the authorities for visual detail. This document records
the decisions that shaped them.

Sample posts are clearly identified preview content, never presented as the
site's real archive. Maple Mono is SIL OFL 1.1 licensed: local development
uses the developer's installed font, and GitHub Actions builds download,
verify, and optimize the official `MapleMonoNormal-NF-CN` release.

## Goals / Non-Goals

**Goals:**

- Provide a coherent first-renderable UI across home, archive/list, search,
  and article routes.
- Make appearance, typography, navigation, and article controls consistent
  across those routes and responsive to narrow viewports.
- Make the browser preview useful even before real content is available.

**Non-Goals:**

- Invent a site logo, site-name wordmark, author profile, authentication,
  admin UI, comments, or publishing workflow.
- Redistribute Maple Mono font files without a licensed source.
- Reconstruct content or product behavior from deleted files or history.

## Decisions

### Give the reader an editorial visual direction

Follow the bookish, ink-and-paper direction defined in `PRODUCT.md` and
`DESIGN.md`: quiet navigation and controls over a consistent neutral
surface ramp with one restrained accent, letting article typography and
code examples carry visual emphasis. Avoid gradients, glows, decorative
blobs, emoji labels, and dashboard-style card grids that do not serve the
reading task. This direction does not change Maple Mono font sourcing or
licensing.

**Alternative considered:** A generic centered landing-page or dashboard
template. Rejected because the primary activity is reading long-form
content, not scanning metrics or responding to a sales hero.

### Keep motion purposeful and preference-aware

Use motion only when it clarifies a state change or gives immediate
interaction feedback, with panel dismissal quicker and quieter than
opening. When reduced motion is requested, remove nonessential transitions
while keeping state changes, focus, and controls perceivable and operable.
Durations, distances, and easing live in `DESIGN.md`.

**Alternative considered:** Entrance animations and hover movement applied
decoratively across the interface. Rejected because they distract from a
reading-focused experience and can conflict with visitor motion
preferences.

### Use test-driven development

Implement behavior changes with the Red-Green-Refactor cycle: add or update
an automated test for the expected observable behavior, run it and confirm
it fails for the intended reason, make the smallest implementation that
passes, then refactor with the suite green. Select unit, integration, or
browser tests according to the behavior under test, and assert user-visible
outcomes and meaningful contracts rather than private implementation
details. For build and configuration work, establish a failing validation or
integration test before changing the configuration whenever the behavior can
be exercised automatically.

### Use Astro pages and the declared styling stack

Build reader pages as Astro-rendered routes with a shared shell and semantic
HTML, styled with Tailwind CSS 4. Treat shadcn/ui as source components added
to the repository, not a runtime component package: initialize it with the
declared CLI for the supported Astro project shape and add only the
components the reader interface needs. Page-level restraint — whitespace,
readable line length, low-glare surfaces, a single subdued accent — follows
`DESIGN.md`. Do not place a logo or site name in the shared navigation; use
direct text links for home, archive, and search.

### Scope the UI to public reader journeys

Provide a home/feed, post listing/archive, search results, and
article-reading view. Store article bodies as Markdown files in an Astro
Content Collection, validate their frontmatter with a schema, and query
that collection to supply the home/feed, archive, and article routes.
Include several short sample articles for screenshots and browser checks,
labeled as preview content rather than claims about production posts. Keep
rendering through the configured `satteri` Astro processor. Include a custom
not-found page with an IIS-inspired visual treatment as a visitor-facing
design reference. No login, dashboard, or editor routes are in scope.

**Alternative considered:** Implement every domain mentioned in historical
repository notes. Rejected because no current specs or source establish
those features.

### Keep not-found presentation separate from server identity

Return the actual HTTP 404 status for missing routes and provide useful
navigation back to the home page or browser history. The IIS-inspired look
is presentation only: do not forge IIS `Server` headers, version strings, or
other server fingerprints, and do not implement scanner deception or
evasion.

### Provide a skip link and shareable heading anchors

Place a skip-to-main-content link before repeated navigation in keyboard
focus order, visibly styled when focused and targeting the main content
landmark. Generate unique, stable fragment IDs for article headings,
including repeated heading text, and provide a keyboard-accessible control
to copy each direct heading URL with accessible success or failure feedback.

### Keep article images and wide tables usable on small screens

Constrain article images to the available content width, preserving their
intrinsic aspect ratio and author-provided alt semantics (including empty
alt text for decorative images). Wrap wide tables in their own
keyboard-accessible, horizontally scrollable region with an accessible name;
scrolling a table must not create page-level horizontal overflow.

### Persist theme choice in the browser

Provide one shared theme switch in the reader shell: on first visit follow
the system color preference, persist an explicit choice in local storage and
apply it on all routes and reloads, apply the saved theme before first paint
where possible to avoid a flash, and keep all surfaces and controls on the
same semantic theme tokens rather than styling each route independently.

**Alternative considered:** Keep theme only in component memory or rely on
system preference forever. Rejected because the requested choice must
survive navigation and reload.

### Use Orama for built-site search

Build an Orama index from the `posts` content collection during the
production build and serve it from a prerendered `/search-index.json`
endpoint. The default tokenizer does not segment Chinese text, so tokenize
with the Mandarin tokenizer from `@orama/tokenizers` and its stop-word list,
keeping the same configuration when the browser loads the index. Provide a
shared search control in the site navigation that opens a native dialog on
the current page — query field, matching article links, preview labels,
empty-query guidance, no-results feedback, and a visible unavailable state —
without changing the current route, with native Escape dismissal and focus
returned to the opener. Keep `/search/` as a directly accessible fallback
page using the same search behavior. Load the index only when a search is
submitted so ordinary page views do not pay for the search bundle.

**Alternative considered:** Keep Pagefind. Rejected because its Chinese
search has no stemming and requires a separate WASM indexing step whose
metadata and preview labeling are harder to derive from the validated
content collection.

### Expose public post tools through Astro WebMCP

Use the declared `astro-webmcp` integration with the `posts` collection
allowlist: keep its built-in read-only post search, section listing, and
current-page metadata tools; navigation may only target manifest entries and
uses the browser's user-confirmation hook when available; no cross-origin
exposure or custom mutating tools. WebMCP stays optional at runtime —
browsers without `document.modelContext` or `navigator.modelContext` use the
ordinary site normally. The browser-side search client must reuse the same
Mandarin tokenizer that built the index (otherwise queries segment
differently and the integration silently falls back to manifest substring
matching), and the Orama index is the only source for article body matches
rather than copied manifest body-text tags. The site uses Astro's Node
adapter with prerendered post pages: prefer the build-generated static
manifest over a dynamic SSR manifest that cannot enumerate the prerendered
collection, and verify the generated manifest and served endpoint contain
only the allowlisted public post routes.

### Use satteri for Markdown rendering

Render article content with the repository's declared `satteri` renderer and
its Astro-compatible integration, replacing the Unified ecosystem used by
remark and rehype. Do not add direct `unified`, `remark-*`, or `rehype-*`
dependencies or configure rendering integrations based on that ecosystem;
keep existing Markdown-related packages reserved for later reader features,
with their transitive dependencies permitted. Verify that the active Astro
Markdown processor is `satteri` and no remark or rehype rendering
integration is configured.

### Load Markdown articles with Astro Content Collections

Define the article collection in `src/content.config.ts` using Astro's
`defineCollection`, `glob` loader, `astro/zod` schema, and Markdown files
under `src/content/posts/`. Keep frontmatter limited to the metadata the
reader needs — title, description, publication date, and reading-time label
— and use each content entry's stable ID as its article slug. Query the
collection for the home feed and archive, resolve detail routes from
collection entries so missing slugs remain not-found responses, and render
entry bodies through Astro's content rendering API with the configured
`satteri` processor. Mark preview entries explicitly and show the preview
label wherever those entries are presented, including search results.

### Present identifiable, readable, copyable code blocks

Show a compact language badge at the upper-right of each labeled article
code block, driven by fenced-code language metadata; it may subtly fade on
pointer hover but must remain visible when the block or its controls receive
keyboard focus, and unlabeled blocks get no invented language label. Render
a copy control positioned so it does not overlap the badge, keyboard-operable
with a descriptive accessible name, copying the block's plain text rather
than syntax-highlighting DOM or markup, and announcing the result through an
accessible status message; use the Clipboard API where available, and if
access is denied or copying fails, report failure and never show success
feedback. Keep long lines inside the code block's own horizontally
scrollable region without wrapping or clipping source code in a way that
changes its readable content, and without page-level horizontal overflow.
Drive the badge from code-fence metadata and existing rendered output,
preserving the `satteri` rendering decision; treat the linked example as a
visual reference, not a requirement to add its specific plugin.

### Make the article outline a bounded floating control

Derive the outline from article headings, nesting each heading beneath its
nearest preceding heading at a shallower level, skipping missing levels
without inserting empty entries. Show the outline expanded by default on
wide viewports and collapsed on narrow ones, preferring the adjacent
whitespace beside the article; when there is not enough room, render a
viewport-bounded floating panel with a maximum height and its own
scrollable contents, or a compact overlay/drawer on narrow screens.

Distinguish a drag from a click with a movement threshold, and clamp both
the control and its panel to the visible viewport so neither hides the
other or the reading area. Persist a valid dragged position in browser
storage and restore it clamped to the current viewport; ignore malformed
saved values or unavailable storage in favor of the default position.
Track the article section at the current reading position: highlight its
outline entry, expose that entry as the current location to assistive
technology, and keep it visible by scrolling the outline itself, not the
article. Toggle placement defaults, keyboard operation, and the remaining
scenario detail are specified in `specs/blog-reader-ui/spec.md`.

**Alternative considered:** Keep the position ephemeral and reset it after
each reload. Rejected because readers would need to reposition the control
repeatedly; restored coordinates are clamped to the viewport to account for
screen-size and orientation changes.

### Use system font locally and optimize the official release in CI

Local development CSS requests the `Maple Mono Normal NF CN` system family
with a readable system CJK monospace fallback; the dev server does not
download fonts or depend on a font provider. The GitHub Actions production
build resolves the latest stable release from `subframe7536/maple-font`,
selects the `MapleMonoNormal-NF-CN.zip` archive and matching `.sha256`
asset, verifies the checksum before extraction, caches the verified archive
by release tag (the upstream archive is about 159 MB), and extracts only the
Normal NF CN TTF/OTF input required by the build. Configure the declared
`vite-plugin-font` as build-only tooling — never loaded or run in the local
development server or ordinary local builds — to scan reader source files
and emit optimized WOFF2 subsets and generated CSS into the production
output, using the font-family metadata produced by the actual font input and
keeping the system CJK stack as fallback. The emitted production CSS and
HTML must not reference the upstream GitHub release or a font provider.
Preserve the SIL OFL 1.1 license and attribution in the generated output or
accompanying license documentation. Pinning the latest release at each CI
run is intentional: record the resolved tag in build logs and cache keys,
and if release discovery, download, or checksum verification fails, fail the
font preparation step rather than falling back to runtime external font
requests.

**Alternative considered:** Mirror the ZeoSeven CSS and its already-split
WOFF2 subsets. Rejected because the developer requested local-system fonts
for development and CI-only download/optimization from the official Maple
Font release.

### Offer an explicit Internet Archive lookup for article links

Render eligible external HTTP(S) article links so the original link opens in
a new browsing context, with an adjacent accessible control labeled
“查看 Internet Archive 快照” that opens the Internet Archive lookup page for
the original URL in its own new browsing context, using safe URL encoding and
`noopener noreferrer` for links opened in a new browsing context. Do not
probe destinations automatically: a browser cannot reliably distinguish a
dead cross-origin page from CORS rejection or network restrictions, and
automatic checks would add requests during reading. Internal links,
non-HTTP(S) links, and links already hosted by Internet Archive do not
receive an archive control. The original page remains open while the reader
checks the destination or archive; if either destination is unavailable, do
not automatically redirect, retry, or generate another archive lookup.

**Alternative considered:** Detect dead links in the browser and
automatically redirect them to a snapshot. Rejected because cross-origin
restrictions make the detection unreliable and automatic retries can loop or
stall in restricted network environments.

## Risks / Trade-offs

- [The official latest release archive is large and changes over time] →
  Cache the verified archive by upstream release tag, log the resolved tag,
  and verify the checksum before extracting or optimizing it.
- [The build depends on external font-source availability] → Fetch only in
  GitHub Actions at build time, report failures explicitly, and ship
  generated font URLs locally so browser requests are same-origin.
- [Orama index or package install may be unavailable] → Report search
  preview as blocked rather than silently substituting a different search
  behavior.
- [Chinese segmentation can differ between build and browser] → Use the
  same Orama Mandarin tokenizer and stop-word configuration when creating
  the index and when loading it for queries, and cover a multi-word Chinese
  query in tests.
- [No real content exists] → Use small, clearly labeled preview fixtures and
  keep route components ready to receive real post data later.
- [Internet Archive may be blocked or have no snapshot] → Keep its lookup
  optional and user-initiated, leave the original article open, and never
  retry or redirect automatically.

## Migration Plan

1. Keep local development on the system font; GitHub Actions resolves,
   caches, and verifies the latest stable upstream release and runs
   `vite-plugin-font` only in CI, emitting local optimized output assets.
2. Implement the shared shell, sample-backed reader routes, appearance
   preference, Orama search, outline control, and archive lookups, with
   focused Playwright coverage plus OpenSpec and Markdown checks.
3. Build and serve the indexed output for browser preview; verify generated
   font URLs are local and no external font requests occur. No production
   data migration is required; replace preview fixtures when a real content
   source is defined.
