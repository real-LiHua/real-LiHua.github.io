# Spec Delta

## Purpose

Authors can write MDX pages and posts and use the site's shared components
without repeating import statements.

## ADDED Requirements

### Requirement: MDX can use auto-imported components

The site SHALL register the MDX integration and auto-import
`src/components/Icon.astro`, so MDX modules can render `<Icon name="…" />`
without an import statement.

#### Scenario: MDX page uses an icon

- **WHEN** an MDX page renders `<Icon name="book" />` with no import
- **THEN** the page builds and renders the icon glyph

#### Scenario: MDX post uses an icon

- **WHEN** a post in `src/content/posts` is authored as `.mdx` with an icon
- **THEN** the post builds through the posts collection and renders the icon in the article

#### Scenario: Markdown post is rendered

- **WHEN** a post is authored as `.md`
- **THEN** it builds with the unchanged satteri pipeline and no MDX imports are injected

### Requirement: MDX support does not change existing content behavior

The posts collection SHALL accept both `.md` and `.mdx` files with the same
frontmatter schema, ordering, series validation, RSS, search indexing, and card
generation.

#### Scenario: Mixed content collection

- **WHEN** the collection contains both `.md` and `.mdx` posts
- **THEN** listings, series and topic pages, RSS, search, and OpenGraph cards treat them consistently
