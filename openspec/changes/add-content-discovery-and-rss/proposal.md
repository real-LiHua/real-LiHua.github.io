# Proposal

## Why

The blog now has a validated Markdown content collection, but readers cannot navigate between posts, browse older content by year or topic, follow a deliberate series, or subscribe from an external feed reader. These content relationships are site-specific and can be supported directly from existing collection entries without building browser-provided reading controls.

## What Changes

- Add chronological previous/next navigation to article pages.
- Add year and topic archive routes backed by validated article metadata.
- Support ordered article series with navigable series context.
- Generate an RSS feed from published collection entries.
- Exclude preview entries from RSS so sample content is never presented as a real publication.
- Add representative preview metadata and browser coverage for these content journeys.

## Capabilities

### New Capabilities

- `content-discovery`: Chronological archives, topic browsing, article neighbors, and ordered series navigation sourced from the article collection.
- `content-syndication`: RSS feed generation from published articles while excluding preview content.

### Modified Capabilities

None.

## Impact

- Extends the `posts` Astro Content Collection schema with topics and optional series metadata.
- Adds archive and topic routes and updates article detail pages with previous/next and series navigation.
- Adds an RSS endpoint using the existing `@astrojs/rss` dependency and configured site URL.
- Updates preview Markdown frontmatter and adds Playwright coverage for navigation, filters, series order, and feed contents.
