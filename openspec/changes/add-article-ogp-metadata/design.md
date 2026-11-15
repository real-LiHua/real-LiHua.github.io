# Design

## Context

`SiteLayout` already owns the document head and emits canonical, `og:*`, and
`twitter:*` tags. Post pages have `publishedAt` frontmatter plus optional
`series` and `topics`; there is no author or modification field. See
proposal.md — Why.

## Goals / Non-Goals

- Goals: conforming article namespace and properties, no duplicated tags, no
  fabricated values.
- Non-Goals: profile pages for authors, automated freshness ranking, or
  changing the visible publication date on the page.

## Decisions

- **Git history is the time source.** Run `git log --follow --format=%aI` once
  per post file at build time, cache the result, and use the newest commit as
  `article:modified_time` and the oldest as `article:published_time`.
  Filesystem mtime was rejected as unstable across checkouts; a frontmatter
  `updatedAt` was rejected because it drifts unless authors remember to edit it.
- **Fallback keeps the page truthful.** When git is unavailable, the file is
  untracked, or history is shallow and returns no dates, both times fall back to
  the frontmatter `publishedAt`.
- **Author comes from `package.json`.** The manifest is the existing site-wide
  identity source, so one configured value serves future bylines too. An empty
  or missing value omits `article:author` rather than emitting an empty tag.
- **Series is the section; topics are tags.** A series is the single high-level
  grouping; topics are already repeatable labels. A post without a series omits
  `article:section`.
- **Declare the namespace only on article pages.** The `prefix` attribute adds
  `article: https://ogp.me/ns/article#` when `type` is `article`, keeping hub
  pages unchanged.
- **Full history in CI.** Both deploy jobs set `fetch-depth: 0`; a shallow clone
  would report every file as created and modified by the HEAD commit.

## Risks / Trade-offs

- Git unavailable in an unusual build sandbox → fallback to `publishedAt`.
- Very old history makes `git log` slower → results are cached per file and the
  post count is small.
- `article:author` is typed as a profile in OGP, but the repository has no
  author profile URL → emit the configured name, which consumers commonly
  accept; a profile URL can replace it if one exists later.

## Migration Plan

No data migration. Rebuild the site to replace cached previews; rollback is a
revert of the change and a rebuild.
