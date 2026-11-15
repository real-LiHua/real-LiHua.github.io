# Spec Delta

## Purpose

Article pages expose conforming Open Graph article metadata so link unfurlers
and graph consumers can read a post's lifecycle, author, section, and tags.

## ADDED Requirements

### Requirement: Article pages declare the Open Graph article namespace

An article page MUST declare the `og:` and `article:` prefixes on the document
element so its `article:*` properties resolve.

#### Scenario: Post page is rendered

- **WHEN** a crawler requests a post page
- **THEN** the document element declares `og: https://ogp.me/ns#` and
  `article: https://ogp.me/ns/article#`

#### Scenario: Non-article page is rendered

- **WHEN** a crawler requests a hub, archive, search, or 404 page
- **THEN** the page emits no `article:*` properties

### Requirement: Article pages expose lifecycle times

An article page MUST emit `article:published_time` and
`article:modified_time` as ISO 8601 values derived from the post file's git
history, falling back to the frontmatter `publishedAt` when history is
unavailable.

#### Scenario: Tracked post with history

- **WHEN** git history contains multiple commits for a post
- **THEN** `article:published_time` is the oldest commit time and
  `article:modified_time` is the newest

#### Scenario: Post without usable git history

- **WHEN** the post is untracked, git is unavailable, or the history is
  shallow and yields no dates
- **THEN** both times equal the frontmatter `publishedAt`

### Requirement: Article pages expose author, section, and tags

An article page MUST emit `article:author` from the configured site author,
`article:section` from the post's series title, and one `article:tag` per topic
name, and MUST omit any property whose value is absent or blank.

#### Scenario: Post belongs to a series and has topics

- **WHEN** a post declares a series and multiple topics
- **THEN** `article:section` is the series title and each topic name appears in
  its own `article:tag` tag

#### Scenario: Post has no series

- **WHEN** a post declares topics but no series
- **THEN** the page emits `article:tag` entries and no `article:section`

### Requirement: Site-wide listing and feed dates follow git history

All pages and feeds that list articles (home page, article index, year/topic/series
archives, RSS feed, and OpenGraph card generation) MUST derive their visible dates
and sort order from each post file's git history, falling back to the frontmatter
`publishedAt` when history is unavailable.

#### Scenario: Home page and article index show git dates

- **WHEN** a crawler or reader views the home page or `/posts/`
- **THEN** each article's displayed date equals its git creation date and the list
  is sorted newest-first by that date

#### Scenario: Year, topic, and series archives use git dates

- **WHEN** an archive page lists articles
- **THEN** the visible date and ordering match git creation dates

#### Scenario: RSS feed uses git publication dates

- **WHEN** the RSS feed is generated
- **THEN** each `<pubDate>` equals the post's git creation date and items are
  sorted newest-first by that date
