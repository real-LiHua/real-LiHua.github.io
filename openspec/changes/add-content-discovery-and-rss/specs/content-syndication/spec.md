# Spec Delta

## Purpose

Content syndication lets readers follow newly published blog articles through standard external feed readers, using the same authored content as the website.

## ADDED Requirements

### Requirement: The site provides an RSS feed of published articles

The site SHALL provide a valid RSS feed containing published articles and stable links to their canonical article pages.

#### Scenario: Reader subscribes to the feed

- **WHEN** an RSS client requests the feed
- **THEN** the site returns a valid RSS document with article titles, descriptions, publication dates, and absolute canonical links

#### Scenario: Preview articles exist

- **WHEN** the feed is generated while preview articles are present in the collection
- **THEN** preview articles are excluded from the feed

#### Scenario: No published articles are available

- **WHEN** the collection contains only preview articles
- **THEN** the site returns a valid feed with no article items rather than representing previews as published updates
