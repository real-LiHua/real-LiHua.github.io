# Proposal

## Why

Article pages currently emit only generic Open Graph tags. They do not declare
the article namespace or expose article lifecycle and category properties, so
link unfurlers and graph consumers cannot read when an article was published or
updated, who wrote it, or which section and tags it belongs to.

## What Changes

- Declare the `og:` and `article:` namespaces on article pages.
- Emit `article:published_time`, `article:modified_time`, `article:author`,
  `article:section`, and `article:tag` on post pages.
- Derive publication and modification times from each post file's `git log`
  history, falling back to the frontmatter `publishedAt` when history is
  unavailable.
- Read the site author from `package.json`; map the optional series title to
  `article:section` and topic names to `article:tag`.
- Add `og:image:type` to the existing image metadata.
- Check out full git history in deploy workflows so commit times stay truthful.

## Capabilities

### New Capabilities

- `article-ogp-metadata`: Article pages expose conforming Open Graph article
  metadata with truthful lifecycle, author, section, and tag values.

### Modified Capabilities

None.

## Impact

- `src/layouts/SiteLayout.astro` and `src/pages/posts/[slug].astro`: head tags.
- `src/lib/git-times.ts`, `src/lib/post-dates.ts`, `src/lib/article-metadata.ts`, and
  `src/lib/site-metadata.ts`: new metadata helpers.
- `src/pages/**` (home, post lists, archives, RSS) and
  `src/pages/open-graph/[...route].ts`: git-derived dates and order.
- `package.json`: site author.
- `.github/workflows/deploy.yml`: full-history checkout.
- `tests/unit/*`: helper coverage; `README.md`: authoring notes.
