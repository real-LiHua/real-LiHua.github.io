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

- The change MUST NOT invent a site logo, site-name wordmark, author profile,
  authentication, admin UI, comments, or publishing workflow.
- The change MUST NOT redistribute Maple Mono font files without a licensed
  source.
- The change MUST NOT reconstruct content or product behavior from deleted
  files or history.

## Decisions

### Give the reader an editorial visual direction

The reader interface MUST follow the bookish, ink-and-paper direction
defined in `PRODUCT.md` and `DESIGN.md`: quiet navigation and controls over
a consistent neutral surface ramp with one restrained accent, letting
article typography and code examples carry visual emphasis. The interface
MUST avoid gradients, glows, decorative blobs, emoji labels, and
dashboard-style card grids that do not serve the reading task. This direction
does not change Maple Mono font sourcing or licensing.

**Alternative considered:** A generic centered landing-page or dashboard
template. Rejected because the primary activity is reading long-form
content, not scanning metrics or responding to a sales hero.

### Keep motion purposeful and preference-aware

The interface MUST use motion only when it clarifies a state change or
gives immediate interaction feedback, with panel dismissal quicker and
quieter than opening. When reduced motion is requested, the interface MUST
remove nonessential transitions while keeping state changes, focus, and
controls perceivable and operable. Durations, distances, and easing live in
`DESIGN.md`.

**Alternative considered:** Entrance animations and hover movement applied
decoratively across the interface. Rejected because they distract from a
reading-focused experience and can conflict with visitor motion
preferences.

### Use test-driven development

Developers MUST implement behavior changes with the Red-Green-Refactor
cycle: add or update an automated test for the expected observable behavior,
run it and confirm it fails for the intended reason, make the smallest
implementation that passes, then refactor with the suite green. Developers
MUST select unit, integration, or browser tests according to the behavior
under test, and MUST assert user-visible outcomes and meaningful contracts
rather than private implementation details. For build and configuration
work, developers MUST establish a failing validation or integration test
before changing the configuration whenever the behavior can be exercised
automatically.

### Use Astro pages and the declared styling stack

Reader pages MUST be built as Astro-rendered routes with a shared shell and
semantic HTML, styled with Tailwind CSS 4. shadcn/ui MUST be treated as
source components added to the repository, not a runtime component package:
initialize it with the declared CLI for the supported Astro project shape
and add only the components the reader interface needs. Page-level
restraint — whitespace, readable line length, low-glare surfaces, a single
subdued accent — follows `DESIGN.md`. A logo or site name MUST NOT be placed
in the shared navigation; direct text links MUST be used for home, archive,
and search.

### Scope the UI to public reader journeys

The site MUST provide a home/feed, post listing/archive, search results, and
article-reading view. The site MUST store article bodies as Markdown files in
an Astro Content Collection, validate their frontmatter with a schema, and
query that collection to supply the home/feed, archive, and article routes.
The site MUST include several short sample articles for screenshots and
browser checks, labeled as preview content rather than claims about
production posts. Rendering MUST stay on the configured `satteri` Astro
processor. The site MUST include a custom not-found page with an IIS-inspired
visual treatment as a visitor-facing design reference. No login, dashboard,
or editor routes are in scope.

**Alternative considered:** Implement every domain mentioned in historical
repository notes. Rejected because no current specs or source establish
those features.

### Keep not-found presentation separate from server identity

The site MUST return the actual HTTP 404 status for missing routes and MUST
provide useful navigation back to the home page or browser history. The
IIS-inspired look is presentation only: the site MUST NOT forge IIS `Server`
headers, version strings, or other server fingerprints, and MUST NOT
implement scanner deception or evasion.

### Provide a skip link and shareable heading anchors

A skip-to-main-content link MUST be placed before repeated navigation in
keyboard focus order, visibly styled when focused and targeting the main
content landmark. Unique, stable fragment IDs MUST be generated for article
headings, including repeated heading text, and a keyboard-accessible control
MUST be provided to copy each direct heading URL with accessible success or
failure feedback.

### Keep article images and wide tables usable on small screens

Article images MUST be constrained to the available content width,
preserving their intrinsic aspect ratio and author-provided alt semantics
(including empty alt text for decorative images). Wide tables MUST be wrapped
in their own keyboard-accessible, horizontally scrollable region with an
accessible name; scrolling a table MUST NOT create page-level horizontal
overflow.

### Persist theme choice in the browser

One shared theme switch MUST be provided in the reader shell: on first visit
it MUST follow the system color preference, MUST persist an explicit choice
in local storage and apply it on all routes and reloads, MUST apply the saved
theme before first paint where possible to avoid a flash, and MUST keep all
surfaces and controls on the same semantic theme tokens rather than styling
each route independently.

**Alternative considered:** Keep theme only in component memory or rely on
system preference forever. Rejected because the requested choice MUST
survive navigation and reload.

### Use Orama for built-site search

An Orama index MUST be built from the `posts` content collection during the
production build and served from a prerendered `/search-index.json`
endpoint. The default tokenizer does not segment Chinese text, so the build
MUST tokenize with the Mandarin tokenizer from `@orama/tokenizers` and its
stop-word list, keeping the same configuration when the browser loads the
index. The site navigation MUST provide a shared search control that opens a
native dialog on the current page — query field, matching article links,
preview labels, empty-query guidance, no-results feedback, and a visible
unavailable state — without changing the current route, with native Escape
dismissal and focus returned to the opener. `/search/` MUST remain a directly
accessible fallback page using the same search behavior. The index MUST load
only when a search is submitted so ordinary page views do not pay for the
search bundle.

**Alternative considered:** Keep Pagefind. Rejected because its Chinese
search has no stemming and requires a separate WASM indexing step whose
metadata and preview labeling are harder to derive from the validated
content collection.

### Expose public post tools through Astro WebMCP

The site MUST use the declared `astro-webmcp` integration with the `posts`
collection allowlist: it MUST keep its built-in read-only post search, section
listing, and current-page metadata tools; navigation MAY target only manifest
entries and uses the browser's user-confirmation hook when available; there
MUST be no cross-origin exposure or custom mutating tools. WebMCP stays
optional at runtime — browsers without `document.modelContext` or
`navigator.modelContext` use the ordinary site normally. The browser-side
search client MUST reuse the same Mandarin tokenizer that built the index
(otherwise queries segment differently and the integration silently falls
back to manifest substring matching), and the Orama index MUST be the only
source for article body matches rather than copied manifest body-text tags.
The site uses Astro's Node adapter with prerendered post pages: the
build-generated static manifest MUST be preferred over a dynamic SSR manifest
that cannot enumerate the prerendered collection, and the generated manifest
and served endpoint MUST be verified to contain only the allowlisted public
post routes.

### Use satteri for Markdown rendering

Article content MUST be rendered with the repository's declared `satteri`
renderer and its Astro-compatible integration, replacing the Unified
ecosystem used by remark and rehype. Direct `unified`, `remark-*`, or
`rehype-*` dependencies MUST NOT be added, and rendering integrations based
on that ecosystem MUST NOT be configured; existing Markdown-related packages
MUST stay reserved for later reader features, with their transitive
dependencies permitted. Verification MUST confirm that the active Astro
Markdown processor is `satteri` and no remark or rehype rendering
integration is configured.

### Load Markdown articles with Astro Content Collections

The article collection MUST be defined in `src/content.config.ts` using
Astro's `defineCollection`, `glob` loader, `astro/zod` schema, and Markdown
files under `src/content/posts/`. Frontmatter MUST be limited to the metadata
the reader needs — title, description, publication date, and reading-time
label — and each content entry's stable ID MUST serve as its article slug.
The collection MUST be queried for the home feed and archive, detail routes
MUST be resolved from collection entries so missing slugs remain not-found
responses, and entry bodies MUST be rendered through Astro's content rendering
API with the configured `satteri` processor. Preview entries MUST be marked
explicitly and the preview label MUST be shown wherever those entries are
presented, including search results.

### Present identifiable, readable, copyable code blocks

A compact language badge MUST be shown at the upper-right of each labeled
article code block, driven by fenced-code language metadata; it MAY subtly
fade on pointer hover but MUST remain visible when the block or its controls
receive keyboard focus, and unlabeled blocks MUST NOT get an invented
language label. A copy control MUST be rendered positioned so it does not
overlap the badge, keyboard-operable with a descriptive accessible name,
copying the block's plain text rather than syntax-highlighting DOM or markup,
and announcing the result through an accessible status message; the Clipboard
API MUST be used where available, and if access is denied or copying fails,
the interface MUST report failure and MUST NOT show success feedback. Long
lines MUST stay inside the code block's own horizontally scrollable region
without wrapping or clipping source code in a way that changes its readable
content, and without page-level horizontal overflow. The badge MUST be driven
from code-fence metadata and existing rendered output, preserving the
`satteri` rendering decision; the linked example MUST be treated as a visual
reference, not a requirement to add its specific plugin.

### Make the article outline a bounded floating control

The outline MUST be derived from article headings, nesting each heading
beneath its nearest preceding heading at a shallower level, skipping missing
levels without inserting empty entries. The outline MUST be expanded by
default on wide viewports and collapsed on narrow ones, preferring the
adjacent whitespace beside the article; when there is not enough room, it
MUST render a viewport-bounded floating panel with a maximum height and its
own scrollable contents, or a compact overlay/drawer on narrow screens.

A drag MUST be distinguished from a click with a movement threshold, and both
the control and its panel MUST be clamped to the visible viewport so neither
hides the other or the reading area. A valid dragged position MUST be
persisted in browser storage and restored clamped to the current viewport;
malformed saved values or unavailable storage MUST be ignored in favor of the
default position. The article section at the current reading position MUST be
tracked: its outline entry MUST be highlighted, exposed as the current
location to assistive technology, and kept visible by scrolling the outline
itself, not the article. Toggle placement defaults, keyboard operation, and
the remaining scenario detail are specified in `specs/blog-reader-ui/spec.md`.

**Alternative considered:** Keep the position ephemeral and reset it after
each reload. Rejected because readers would need to reposition the control
repeatedly; restored coordinates are clamped to the viewport to account for
screen-size and orientation changes.

### Use system font locally and optimize the official release in CI

Local development CSS requests the `Maple Mono Normal NF CN` system family
with a readable system CJK monospace fallback; the dev server does not
download fonts or depend on a font provider. The GitHub Actions production
build MUST resolve the latest stable release from `subframe7536/maple-font`,
select the `MapleMonoNormal-NF-CN.zip` archive and matching `.sha256`
asset, verify the checksum before extraction, cache the verified archive
by release tag (the upstream archive is about 159 MB), and extract only the
Normal NF CN TTF/OTF input required by the build. The declared
`vite-plugin-font` MUST be configured as build-only tooling — it MUST NOT be
loaded or run in the local development server or ordinary local builds — to
scan reader source files and emit optimized WOFF2 subsets and generated CSS
into the production output, using the font-family metadata produced by the
actual font input and keeping the system CJK stack as fallback. The emitted
production CSS and HTML MUST NOT reference the upstream GitHub release or a
font provider. The SIL OFL 1.1 license and attribution MUST be preserved in
the generated output or accompanying license documentation. Pinning the
latest release at each CI run is intentional: the resolved tag MUST be
recorded in build logs and cache keys, and if release discovery, download, or
checksum verification fails, the font preparation step MUST fail rather than
falling back to runtime external font requests.

**Alternative considered:** Mirror the ZeoSeven CSS and its already-split
WOFF2 subsets. Rejected because the developer requested local-system fonts
for development and CI-only download/optimization from the official Maple
Font release.

### Offer an explicit Internet Archive lookup for article links

Eligible external HTTP(S) article links MUST be rendered so the original link
opens in a new browsing context, with an adjacent accessible control labeled
“查看 Internet Archive 快照” that opens the Internet Archive lookup page for
the original URL in its own new browsing context, using safe URL encoding and
`noopener noreferrer` for links opened in a new browsing context. The site
MUST NOT probe destinations automatically: a browser cannot reliably
distinguish a dead cross-origin page from CORS rejection or network
restrictions, and automatic checks would add requests during reading.
Internal links, non-HTTP(S) links, and links already hosted by Internet
Archive MUST NOT receive an archive control. The original page MUST remain
open while the reader checks the destination or archive; if either
destination is unavailable, the site MUST NOT automatically redirect, retry,
or generate another archive lookup.

**Alternative considered:** Detect dead links in the browser and
automatically redirect them to a snapshot. Rejected because cross-origin
restrictions make the detection unreliable and automatic retries can loop or
stall in restricted network environments.

## Risks / Trade-offs

- [The official latest release archive is large and changes over time] →
  The verified archive MUST be cached by upstream release tag, the resolved
  tag MUST be logged, and the checksum MUST be verified before extracting or
  optimizing it.
- [The build depends on external font-source availability] → Fonts MUST be
  fetched only in GitHub Actions at build time, failures MUST be reported
  explicitly, and generated font URLs MUST be shipped locally so browser
  requests are same-origin.
- [Orama index or package install may be unavailable] → Search preview MUST
  be reported as blocked rather than silently substituting a different search
  behavior.
- [Chinese segmentation can differ between build and browser] → The same
  Orama Mandarin tokenizer and stop-word configuration MUST be used when
  creating the index and when loading it for queries, and a multi-word Chinese
  query MUST be covered in tests.
- [No real content exists] → Small, clearly labeled preview fixtures MUST be
  used, and route components MUST stay ready to receive real post data later.
- [Internet Archive may be blocked or have no snapshot] → Its lookup MUST stay
  optional and user-initiated, the original article MUST stay open, and the
  site MUST NOT retry or redirect automatically.

## Migration Plan

1. Local development MUST stay on the system font; GitHub Actions MUST
   resolve, cache, and verify the latest stable upstream release and MUST run
   `vite-plugin-font` only in CI, emitting local optimized output assets.
2. The shared shell, sample-backed reader routes, appearance preference, Orama
   search, outline control, and archive lookups MUST be implemented, with
   focused Playwright coverage plus OpenSpec and Markdown checks.
3. The indexed output MUST be built and served for browser preview, and it
   MUST be verified that generated font URLs are local and no external font
   requests occur. No production data migration is required; preview fixtures
   MUST be replaced when a real content source is defined.
