# Design

## Context

See `proposal.md` for motivation and the capability specs for observable
requirements. The site uses an Astro `posts` content collection with Markdown
entries, a publication date, and an `isPreview` flag. Astro's configured site
URL is available for canonical links, and `@astrojs/rss` is already installed.
All current sample entries are preview content.

## Goals / Non-Goals

**Goals:**

- Represent authored topic and series relationships in validated article
  metadata.
- Derive archive and navigation views from the existing collection.
- Keep chronological navigation distinct from authored series order.
- Publish RSS only for articles explicitly marked as non-preview.

**Non-Goals:**

- Generate automatic related-article recommendations.
- Add a CMS, remote content source, or separate database.
- Include preview entries in RSS or present them as published content.

## Decisions

### Extend the existing article collection

Add optional `topics` metadata as a list of `{ slug, name }` values and
optional `series` metadata containing a stable series ID, display title, and
positive item order. Keep the existing preview flag and publication date.
Stable topic slugs and series IDs make URLs independent of display-name
changes; the visible name/title remains authored in frontmatter.

**Alternative considered:** Infer topics and series from Markdown headings or
directory names. Rejected because those structures are presentation/content
organization, not reliable relationships, and would make links fragile.

### Derive archive pages and neighbors from collection queries

Use the collection as the only source for the year index, year pages, topic
index and topic pages, series pages, and article neighbor links. Sort the
main archive newest-first. On an article page, “上一篇” means the
immediately older article and “下一篇” the immediately newer one; omit a
neighbor at either end. Series membership is sorted by authored series order
and shown separately from chronological neighbors.

Use static route generation for year, topic, and series routes. A topic route
is keyed by its stable slug; a series route is keyed by its stable ID. A
missing year/topic/series route must not be generated and remains a truthful 404.

### Generate a published-only RSS feed

Create `/rss.xml` with `@astrojs/rss`, mapping non-preview entries to title,
description, publication date, and canonical article path. Keep deterministic
date ordering. The feed remains valid with zero items while the collection
contains only preview entries; it does not expose sample posts as updates.

**Alternative considered:** Include preview entries with a preview label.
Rejected because RSS clients may surface feed items as real publication
notifications and do not consistently present custom labels.

### Use focused browser and feed validation

Use Playwright to verify year/topic archive filtering, chronological boundary
links, series ordering and adjacent navigation, and the archive entry points.
Request `/rss.xml` directly and parse the XML in tests to assert its content
type, absolute item URLs, publication metadata, and exclusion of preview
entries. Keep schema validation in Astro's existing `astro check` and build
pipeline.

## Risks / Trade-offs

- [Duplicate series positions can make ordering ambiguous] → Validate
  collection-wide series IDs and positions during the build and fail with
  the conflicting entries identified.
- [Display names can change after links are shared] → Use authored stable
  topic slugs and series IDs as route keys, not labels.
- [Preview-only content produces an empty feed] → Keep the feed valid and
  clearly link to it; do not misrepresent preview fixtures as published
  articles.
- [Date ties make chronological neighbors ambiguous] → Use a deterministic
  secondary sort by collection ID and apply it consistently across archive
  and neighbor calculations.

## Migration Plan

1. Extend the content schema and add topics/series metadata to selected
   preview entries without changing their preview status.
2. Add year/topic/series collection-backed pages and chronological/series
   navigation to article pages.
3. Generate and expose the RSS endpoint, filtering preview entries.
4. Run focused browser/feed tests, Astro checks, the production build, and
   the full regression suite.

No persisted production data migration is required; metadata is authored in
Markdown frontmatter.
