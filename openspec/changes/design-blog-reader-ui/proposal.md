# Proposal

## Why

The repository currently has no application source or UI specification, so there is no existing site design to render faithfully. Define a coherent, accessible reader-facing blog experience before implementation, covering navigation, article discovery and reading, persistent light/dark themes, and the requested draggable article outline control.

## What Changes

- Introduce requirements for the public blog reader experience across the home page, post listings/archive, site search, and article detail pages.
- Store preview articles as Markdown entries in an Astro Content Collection with validated frontmatter, and derive the home feed, archive, and article routes from that collection.
- Add several clearly identified sample articles so collection-backed navigation, search, and reader interactions can be exercised with realistic content.
- Add a custom 404 page with an IIS-inspired visual treatment for visitors while preserving truthful HTTP behavior.
- Establish a product-specific editorial visual direction and keep motion purposeful and responsive to reduced-motion preferences.
- Improve reader accessibility and narrow-screen content handling with a skip link, copyable heading anchors, and responsive images/tables.
- Define a quiet, eye-comfortable visual direction without a site-name wordmark or logo, using locally installed Maple Mono Normal NF CN during development and optimized local font assets in GitHub Actions builds.
- Use `satteri` for Markdown rendering, replacing the Unified ecosystem (remark/rehype).
- Present article code blocks with a language badge and an accessible copy control, including readable handling for long code examples.
- Specify a consistent light/dark theme switch that persists across pages and reloads.
- Keep site search on the current page with a shared, accessible search dialog that presents Orama results without route navigation.
- Integrate Astro WebMCP so compatible browser agents can discover and use safe tools to search and navigate public post content.
- Specify a collapsible, hierarchically nested article outline with an accessible floating button that readers can reposition without obscuring the outline, whose position persists across reloads, and whose wide/narrow viewport defaults favor ergonomic reach.
- Provide article readers with an explicit Internet Archive lookup beside external links, without unreliable automatic dead-link detection.
- Require test-driven development for implementation, with behavior tests written and observed failing before the corresponding code.
- Plan a browser-preview implementation and focused responsive, interaction, accessibility, and persistence checks.

## Capabilities

### New Capabilities

- `blog-reader-ui`: Public blog pages, navigation, site search, reading controls, and persistent visual theme.

### Modified Capabilities

None.

## Impact

The checkout has no `src/`, Astro configuration, tests, or static assets, and `openspec/specs/` contains no existing capability requirements. Implementation is expected to add the public site shell and reader pages using Astro 7, Tailwind CSS 4, and shadcn/ui components initialized for Astro with the declared shadcn CLI, plus tests or preview support as needed. The component configuration and source are not yet present. The user provided the [Maple Font download page](https://font.subf.dev/zh-cn/download/), which links to official GitHub releases including `MapleMonoNormal-NF-CN`. Development uses the font already installed on the developer's system. GitHub Actions will fetch the latest stable official release, verify its published checksum, cache the source by release tag, and use `vite-plugin-font` to generate locally served optimized subsets. The font identifies as SIL OFL 1.1; preserve its license and attribution.
