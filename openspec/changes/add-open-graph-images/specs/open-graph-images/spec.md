# Spec Delta

## Purpose

Share links to the blog unfurl into a branded card that states the page's real
title and description, using the site's own monospace CJK typeface and palette.

## ADDED Requirements

### Requirement: Reader pages advertise a share image

The site SHALL emit `og:image` and `twitter:image` tags pointing at a
prerendered 1200×630 PNG for the home page, article index, series index, each
series, each topic, and each post, alongside `og:title`, `og:description`,
`og:url`, and a canonical link built from the configured site URL.

#### Scenario: Link unfurler reads a post

- **WHEN** a crawler requests a post page
- **THEN** the page advertises the post's title, description, canonical URL, and an image URL that resolves to an existing 1200×630 PNG

#### Scenario: Post is a preview sample

- **WHEN** a post has `isPreview: true`
- **THEN** its card description starts with `预览示例` so the card does not present the sample as a published article

#### Scenario: Page has no dedicated card

- **WHEN** a page such as search or the 404 route renders without an explicit image
- **THEN** it advertises the site card at `/open-graph/index.png`

### Requirement: Cards use the reader's visual language

Cards SHALL use the paper and ink palette from `DESIGN.md`, the Maple Mono
Normal NF CN family for all card text, and SHALL NOT depend on remote font or
image providers at render time.

#### Scenario: Chinese title is rendered

- **WHEN** a card is generated for a Chinese title
- **THEN** the title and description render with Maple Mono Normal NF CN glyphs rather than missing-glyph boxes

### Requirement: Card generation reuses the existing font strategy

Card rendering SHALL resolve the font from `MAPLE_FONT_PATH` when set, the
checksum-verified release prepared by CI, or the installed system font, and
SHALL fail with an actionable message when none is available.

#### Scenario: Developer builds locally

- **WHEN** a developer without the CI-prepared release builds the site
- **THEN** cards use the installed Maple Mono Normal NF CN system font

#### Scenario: Font cannot be found

- **WHEN** no font path, cached release, or system font is available
- **THEN** the build fails with a message naming `MAPLE_FONT_PATH` and the searched locations rather than emitting Latin-only or missing-glyph cards
