# Design

## Context

See `proposal.md` for motivation and `specs/blog-reader-ui/spec.md` for the
observable requirements.

The checkout declares Astro 7, Tailwind CSS 4, the shadcn CLI, Orama,
Playwright, Markdown rendering dependencies, and `vite-plugin-font` 5.1.2,
but has no `src/`, `tests/`, Astro configuration, `components.json`, local
Maple Mono font files, or published-content files. The shadcn CLI is
available as development tooling, but its project configuration and UI
component source have not yet been initialized. The user supplied the [Maple Font download
page](https://font.subf.dev/zh-cn/download/), which links to official
`MapleMonoNormal-NF-CN` GitHub release archives. The upstream font is
licensed under SIL Open Font License 1.1. Local development uses the
developer's installed font; GitHub Actions downloads and verifies the latest
stable release, optimizes it, and emits local WOFF2 assets. Treat this as a
greenfield reader interface. Use clearly identified sample posts for the
preview; do not imply that they are the site's real archive.

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

- **Product:** A personal blog reader for people who want to discover and
  focus on long-form posts.
- **Character:** Bookish, measured, and quietly precise.
- **World:** A printed page with ink, generous margins, and soft reading
  light.
- **Moments:** Careful long-form typography and legible, well-framed code
  examples.
- **Signature:** The movable outline control reads as a small bookmark at
  the page edge.

Keep navigation and controls quiet, with a consistent neutral surface ramp
and one restrained accent. Let the article typography and code examples
carry visual emphasis. Avoid gradients, glows, decorative blobs, emoji
labels, and dashboard-style card grids that do not serve the reading task.
Keep the existing Maple Mono font acquisition and licensing requirements;
this direction does not change font sourcing.

**Alternative considered:** Use a generic, centered landing-page or
dashboard template. Rejected because the primary activity is reading
long-form content, not scanning metrics or responding to a sales hero.

### Keep motion purposeful and preference-aware

Use motion only when it clarifies a state change or gives immediate
interaction feedback. Keep hover feedback direct, avoid looping, bouncing,
large-distance, or layout-shifting animation, and make panel dismissal
quicker and quieter than opening. When reduced motion is requested, remove
nonessential transitions while keeping state changes, focus, and controls
fully perceivable and operable.

**Alternative considered:** Apply entrance animations and hover movement
decoratively across the interface. Rejected because they add distraction to
a reading-focused experience and can conflict with visitor motion
preferences.

### Use test-driven development

Implement behavior changes with the Red-Green-Refactor cycle: first add or
update an automated test for the expected observable behavior and run it to
confirm it fails for the intended reason; then make the smallest
implementation that passes; finally refactor while keeping the test suite
green. Select unit, integration, or browser tests according to the behavior
under test. Tests should assert user-visible outcomes and meaningful
contracts rather than private implementation details. For build and
configuration work, establish a failing validation or integration test
before changing the configuration whenever the behavior can be exercised
automatically.

### Use Astro pages and the declared styling stack

Build reader pages as Astro-rendered routes with a shared shell and semantic
HTML. Use Tailwind CSS 4 and initialize shadcn/ui for the Astro project with
the declared CLI. Treat shadcn/ui as source components added to the
repository, not as a runtime component package: configure the supported
Astro project shape and add only the components needed by the reader
interface. Keep page-level presentation restrained: generous whitespace,
readable line length, warm low-glare light surfaces, muted contrast in dark
mode, and a single subdued accent. Do not place a logo or site name in the
shared navigation; use direct text links for home, archive, and search.

### Scope the UI to public reader journeys

Create a home/feed, post listing/archive, search results, and article-reading
view. Store article bodies as Markdown files in an Astro Content Collection,
validate their frontmatter with a schema, and query that collection to supply
the home/feed, archive, and article routes. Include several short sample
articles for screenshots and browser checks; label them as preview content,
not claims about production posts. Keep rendering through the configured
`satteri` Astro processor. Include a custom not-found page with an IIS-inspired
visual treatment as a visitor-facing design reference. No login, dashboard,
or editor routes are in scope.

**Alternative considered:** Implement every domain mentioned in historical
repository notes. Rejected because no current specs or source establish those
features.

### Keep not-found presentation separate from server identity

Return the actual HTTP 404 status for missing routes and provide useful
navigation back to the home page or browser history. The IIS-inspired look
is presentation only: do not forge IIS `Server` headers, version strings,
or other server fingerprints, and do not implement scanner deception or
evasion.

### Provide a skip link and shareable heading anchors

Place a skip-to-main-content link before repeated navigation in keyboard
focus order. Keep it visibly styled when focused and target the main content
landmark. Generate unique, stable fragment IDs for article headings,
including repeated heading text, and provide a keyboard-accessible control
to copy each direct heading URL with accessible success or failure feedback.

### Keep article images and wide tables usable on small screens

Constrain article images to the available content width and preserve their
intrinsic aspect ratio. Preserve meaningful alt text and empty alt text for
decorative images rather than replacing author-provided semantics. Wrap wide
tables in their own horizontally scrollable region with an accessible name
and keyboard access; scrolling a table must not create page-level horizontal
overflow.

### Persist theme choice in the browser

Provide one shared theme switch in the reader shell. On first visit, follow
the system color preference; when the visitor makes an explicit choice,
persist it in local storage and apply it on all routes and reloads. Apply the
saved theme before first paint where possible to avoid a flash. Keep all
surfaces and controls on the same semantic theme tokens rather than styling
each route independently.

**Alternative considered:** Keep theme only in component memory or rely on
system preference forever. Rejected because the requested choice must survive
navigation and reload.

### Use Orama for built-site search

Build an Orama index from the `posts` content collection during the
production build and serve it from a prerendered `/search-index.json`
endpoint. Tokenize with the Mandarin tokenizer from `@orama/tokenizers` and
its stop-word list because the default tokenizer does not segment Chinese
text; keep the same tokenizer configuration when the browser loads the index.
Provide a shared search control in the site navigation that opens a native
dialog on the current page. Render the query field, matching article links,
preview labels, empty-query guidance, no-results feedback, and a visible
unavailable state in that dialog without changing the current route. Support
the native Escape dismissal behavior and return focus to the opener. Keep
`/search/` as a directly accessible fallback page using the same search
behavior. Load the index only when a search is submitted so ordinary page
views do not pay for the search bundle.

**Alternative considered:** Keep Pagefind. Rejected because its Chinese
search has no stemming and requires a separate WASM indexing step whose
metadata and preview labeling are harder to derive from the validated
content collection. Orama runs in the same JavaScript runtime as the page,
segments Mandarin queries consistently at build and search time, and lets the
index carry the collection's preview state directly.

### Expose public post tools through Astro WebMCP

Use the declared `astro-webmcp` integration with the `posts` collection
allowlist. Keep its built-in read-only post search, section listing, and
current-page metadata tools; navigation may only target manifest entries
and uses the browser's user-confirmation hook when available. Do not enable
cross-origin exposure or custom mutating tools. Keep WebMCP optional at
runtime: browsers without `document.modelContext` or `navigator.modelContext`
continue to use the ordinary site normally.

The browser-side search client must reuse the same Mandarin tokenizer that
built `/search-index.json`. Without it, queries segment differently and the
integration silently falls back to manifest substring matching. Keep the
Orama index as the only source for article body matches instead of copying
rendered text into manifest tags.

The site uses Astro's Node adapter with prerendered post pages. Verify the
generated manifest and served endpoint contain only the allowlisted public
post routes. In this deployment mode, prefer the build-generated static
manifest over a dynamic SSR manifest that cannot enumerate the prerendered
collection.

### Use satteri for Markdown rendering

Use the repository's declared `satteri` Markdown renderer and its
Astro-compatible integration for article content. This replaces the Unified
ecosystem used by remark and rehype. Do not add direct `unified`, `remark-*`,
or `rehype-*` dependencies or configure rendering integrations based on that
ecosystem. Keep existing Markdown-related packages that are reserved for
later reader features; their transitive dependencies are permitted. Verify
that the active Astro Markdown processor is `satteri` and no remark or rehype
renderer integration is configured.

### Load Markdown articles with Astro Content Collections

Define the article collection in `src/content.config.ts` using Astro's
`defineCollection`, `glob` loader, `astro/zod` schema, and Markdown files under
`src/content/posts/`. Keep frontmatter limited to the metadata needed by the
reader, including a title, description, publication date, and reading-time
label. Use each content entry's stable ID as its article slug. Query the
collection for the home feed and archive, and resolve detail routes from
collection entries so missing slugs remain not-found responses. Render entry
bodies through Astro's content rendering API while retaining the configured
`satteri` Markdown processor. Mark preview entries explicitly and show the
preview label wherever those entries are presented, including search results.

### Present identifiable, readable, copyable code blocks

Use fenced-code language metadata to show a compact language badge at the
upper-right of each labeled article code block, following the visual
reference provided by the user. The badge may subtly fade on pointer hover,
but must remain visible when the code block or its controls receive keyboard
focus. Leave unlabeled code blocks without an invented language label.

Render a copy control with each article code block, positioned so it does not
overlap the language badge. Copy the block's plain text content, not the
syntax-highlighting DOM or markup. Make the control keyboard-operable with a
descriptive accessible name, and announce the result through an accessible
status message. Use the Clipboard API where available; if access is denied
or copying fails, report failure and never show success feedback.

Keep long lines inside the code block's own horizontally scrollable region;
do not wrap or clip source code in a way that changes its readable content,
and do not let wide code blocks create page-level horizontal overflow. Treat
the linked example as a visual reference, not a requirement to add its
specific plugin. Drive the badge from code-fence metadata and existing
rendered output, preserving the `satteri` rendering decision.

### Make the article outline a bounded floating control

Derive the outline from article headings. Nest each heading beneath its
nearest preceding heading at a shallower level, skipping missing levels
without inserting empty entries. Place the toggle on the left near vertical
center on wide viewports and on the right in the lower half on narrow
viewports. Allow pointer/touch dragging and clamp its position to the visible
viewport, and distinguish a drag from a click so moving the control does not
accidentally toggle the panel. Persist a valid dragged position in browser
storage and restore it on page load, clamping it to the current viewport so
resized screens cannot hide the control. Ignore malformed saved values and
continue using the default position when browser storage is unavailable. On
wide viewports, show the outline expanded by
default; on narrow screens, keep it collapsed by default and prefer the
adjacent whitespace beside the article when available. If there is not
enough room, render the expanded outline as a viewport-bounded floating
panel with a maximum height and its own scrollable contents; on narrow
screens use a compact overlay/drawer that does not obscure the reading area
unnecessarily or force horizontal scrolling. Position the panel on the side
of the toggle with enough room, accounting for the toggle's current dragged
position, and clamp the panel to the viewport so it never covers the toggle.
Track the article section at the current reading position and visibly
highlight its outline entry while exposing that entry as the current location
to assistive technology. Keep the current entry visible within a long outline
by scrolling the outline itself, without unexpectedly scrolling the article.
Provide a clear accessible name, expanded state, focus styling, and keyboard
operation for opening, closing, and following outline links.

**Alternative considered:** Keep the position ephemeral and reset it after
each reload. Rejected because readers would need to reposition the control
repeatedly. Restored coordinates are clamped to the viewport to account for
screen-size and orientation changes.

### Use system font locally and optimize the official release in CI

Local development CSS requests the `Maple Mono Normal NF CN` system family
and uses a readable system CJK monospace fallback. The dev server does not
download fonts or depend on a font provider.

The GitHub Actions production build resolves the latest stable release from
`subframe7536/maple-font` using its official releases endpoint, selects the
`MapleMonoNormal-NF-CN.zip` archive and matching `.sha256` asset, and
verifies the archive before extraction. It caches the verified archive keyed
by the release tag so repeated builds do not repeatedly download the large
upstream package; a newly published tag naturally gets a new cache entry.
The current upstream archive is about 159 MB, so cache the archive by its
resolved tag and avoid downloading it again on subsequent CI runs with that
tag. Extract only the Normal NF CN TTF/OTF input required by the build.
Configure the declared `vite-plugin-font` Vite integration to scan reader
source files and emit optimized WOFF2 subsets and generated CSS into the
production output. Run this font processing only in GitHub Actions, not in
the local development server or ordinary local builds. Use the font-family
metadata produced by the actual font input, and keep the system CJK stack as
a fallback. The emitted production CSS and HTML must not reference the
upstream GitHub release or font provider.

The upstream font is SIL OFL 1.1. Preserve its license and attribution in
the generated output or accompanying license documentation. Pinning the
latest release at each CI run is intentional; record the resolved tag in
build logs and cache keys. If release discovery, download, or checksum
verification fails, fail the font preparation step rather than falling
back to runtime external font requests.

**Alternative considered:** Mirror the ZeoSeven CSS and its already-split
WOFF2 subsets. Rejected because the developer requested local-system fonts
for development and CI-only download/optimization from the official Maple
Font release.

### Offer an explicit Internet Archive lookup for article links

Render eligible external HTTP(S) article links so the original link opens in
a new browsing context and provide an adjacent accessible control labeled
“查看 Internet Archive 快照”. That control opens the Internet Archive
lookup page for the original URL in its own new browsing context. Construct
the lookup URL with safe URL encoding; use `noopener noreferrer` for links
opened with a new browsing context.

Do not probe destinations automatically. A browser cannot reliably
distinguish a dead cross-origin page from CORS rejection or network
restrictions, and automatic checks would add requests during reading.
Internal links, non-HTTP(S) links, and links already hosted by Internet
Archive do not receive an archive control. The original page remains open
while the reader checks the destination or archive; if either destination
is unavailable, do not automatically redirect, retry, or generate another
archive lookup.

**Alternative considered:** Detect dead links in the browser and
automatically redirect them to a snapshot. Rejected because cross-origin
restrictions make the detection unreliable and automatic retries can loop
or stall in restricted network environments.

## Risks / Trade-offs

- [The official latest release archive is large and changes over time] →
  Cache the verified archive by upstream release tag, log the resolved tag,
  and verify the checksum before extracting or optimizing it.
- [The build depends on external font-source availability] → Fetch only in
  GitHub Actions at build time, report failures explicitly, and ship
  generated font URLs locally so browser requests are same-origin.
- [The font plugin is only required by build tooling] → Move it to
  `devDependencies` during implementation and do not load or run it in the
  local development server.
- [Orama index or package install may be unavailable] → Report search
  preview as blocked rather than silently substituting a different search
  behavior.
- [Chinese segmentation can differ between build and browser] → Use the same
  Orama Mandarin tokenizer and stop-word configuration when creating the index
  and when loading it for queries, and cover a multi-word Chinese query in
  tests.
- [No real content exists] → Use small, clearly labeled preview fixtures and
  keep route components ready to receive real post data later.
- [Dragging can conflict with click and touch scrolling] → Use a movement
  threshold, clamp the button, and test pointer, touch, keyboard, and narrow
  viewport behavior.
- [Internet Archive may be blocked or have no snapshot] → Keep its lookup
  optional and user-initiated, leave the original article open, and never
  retry or redirect automatically.
- [The source tree and configuration are absent] → Build the minimal site
  scaffold required by this UI change and keep the work limited to reader
  experience requirements.

## Migration Plan

1. Reconfirm current files and dependency/script availability before adding
   the application scaffold.
2. Keep local development on the system font. Add a GitHub Actions build
   step to resolve/cache/verify the latest stable upstream archive and use
   `vite-plugin-font` to create local optimized output assets; ensure local
   dev and build commands do not attempt to retrieve the font archive.
3. Implement the shared shell, sample-backed reader routes, appearance
   preference, Orama search, outline control, and explicit archive
   lookups for eligible external article links.
4. Validate routes, interactions, and responsive states with focused
   Playwright coverage, including external-link and archive behavior, and
   OpenSpec/Markdown checks.
5. Build and serve the indexed output for browser preview. Verify generated
   font URLs are local and that the browser makes no requests to external
   font hosts. If dependency install, font acquisition, or generated
   indexing is blocked, report the exact blocker.
6. No production data migration is required. Remove or replace preview
   fixtures when a real content source is defined.
