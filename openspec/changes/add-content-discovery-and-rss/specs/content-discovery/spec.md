# Spec Delta

## Purpose

Content discovery helps readers move through the blog's own articles by chronology, year, topic, and explicitly ordered series. It relies on authored content relationships rather than browser-provided reading controls or speculative recommendations.

## ADDED Requirements

### Requirement: Readers can navigate to chronologically adjacent articles

An article page SHALL provide previous and next article links according to publication date, without presenting the current article as its own neighbor.

#### Scenario: An article has both neighbors

- **WHEN** a reader opens an article that is neither the oldest nor newest in chronological order
- **THEN** the page links to the immediately older and newer articles with their titles

#### Scenario: An article is at a chronological boundary

- **WHEN** a reader opens the oldest or newest article
- **THEN** the unavailable direction is omitted or clearly disabled and no link points to a nonexistent article

### Requirement: Readers can browse articles by publication year

The archive SHALL expose available publication years and allow readers to view the articles for a selected year in chronological order.

#### Scenario: Reader selects an available year

- **WHEN** a reader opens an archive year that contains articles
- **THEN** the page lists only articles from that year and links to each article

#### Scenario: Reader requests a year without articles

- **WHEN** a reader opens a year with no articles
- **THEN** the site returns a truthful not-found response or a clear empty state and provides a route back to the archive

### Requirement: Readers can browse articles by topic

Articles MAY declare one or more topics, and the archive SHALL expose available topics and provide a page listing articles for a selected topic.

#### Scenario: Reader selects an available topic

- **WHEN** a reader opens a topic that is assigned to articles
- **THEN** the page lists only articles assigned to that topic and links to each article

#### Scenario: Article has no topics

- **WHEN** an article has no topic metadata
- **THEN** it remains available in the main and year archives without being assigned an invented topic

### Requirement: Readers can follow an ordered article series

Articles MAY belong to an explicitly named series with a unique position, and series pages SHALL present their articles in that authored order.

#### Scenario: Reader opens a series

- **WHEN** a reader opens a series page
- **THEN** the page lists its member articles in series order with their positions

#### Scenario: Reader reads a series article

- **WHEN** a reader opens an article that belongs to a series
- **THEN** the page identifies the series and provides navigation to adjacent articles in that series when they exist

#### Scenario: Article is not part of a series

- **WHEN** a reader opens an article without series metadata
- **THEN** no series navigation is shown
