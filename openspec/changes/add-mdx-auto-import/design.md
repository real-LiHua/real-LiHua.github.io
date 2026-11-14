# Design

## Patch the shared satteri processor

`astro-auto-import` supports Astro's satteri processor and appends an mdast
plugin to `markdown.processor.options.mdastPlugins`. That plugin only inserts
`mdxjsEsm` imports when `ctx.sourceFormat === "mdx"`, so `.md` files keep the
existing pipeline, including Mermaid and code highlighting.

The integration is declared before `mdx()` to satisfy the ordering requirement
the package documents for the unified processor; satteri reads processor options
lazily, so the order is not strictly required there.

## Keep the import surface small

The only content-suitable component in the repository is `Icon.astro`, so it is
the only auto-import. Importing more modules would inject unused imports into
every MDX file.

**Alternative considered:** auto-import a namespace of content components.
Rejected because `src/components/content/registry.ts` referenced by the
`@content` alias does not exist yet; a missing module would break every MDX
build.

## Make MDX a first-class content format

The posts collection accepts `**/*.{md,mdx}` so auto-import benefits articles,
not only standalone pages. Both formats share the existing frontmatter schema,
sorting, series validation, RSS, and search behavior.

## Prerender MDX pages

The site is served on demand by the Node adapter, but deployment publishes the
static client output. MDX pages therefore set `export const prerender = true`,
like the existing reader pages.
