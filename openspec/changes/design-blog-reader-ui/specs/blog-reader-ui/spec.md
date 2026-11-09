# Spec Delta

## Purpose

The blog reader UI lets visitors discover, search, and read published posts through a consistent, responsive interface with persistent appearance preferences and accessible reading controls.

## ADDED Requirements

### Requirement: Public reader pages share a clear, responsive navigation

The site SHALL provide home, post-listing/archive, search, and article-reading pages with consistent navigation, and SHALL NOT display a site-name wordmark or logo in the shared interface.

#### Scenario: Navigate between reader pages

- **WHEN** a visitor uses the shared navigation on any reader page
- **THEN** the visitor can reach the home and post listings without relying on a logo or site-name link, and can open site search without leaving the current page

#### Scenario: Read on a narrow viewport

- **WHEN** a visitor opens a reader page on a narrow screen
- **THEN** navigation, post content, and available controls remain readable and operable without horizontal page scrolling

#### Scenario: Visitor searches without leaving the current page

- **WHEN** a visitor opens site search from the shared navigation and submits a query
- **THEN** a search dialog presents matching results while the current route remains unchanged

#### Scenario: Visitor dismisses site search

- **WHEN** a visitor closes the search dialog with Escape or its close control
- **THEN** the dialog closes and keyboard focus returns to the control that opened it

### Requirement: Missing pages show a truthful, helpful 404

The site SHALL render a custom, visitor-facing not-found page with an IIS-inspired visual treatment, preserve the actual HTTP 404 status for missing resources, and provide clear navigation back to the site. The visual treatment SHALL NOT impersonate IIS to mislead scanners or falsify server identity.

#### Scenario: Visitor requests a missing page

- **WHEN** a visitor requests a URL that does not exist
- **THEN** the site returns HTTP 404 and displays the custom not-found page with links to the home page and browser back navigation

#### Scenario: Automated client inspects the response

- **WHEN** an automated client inspects a missing-page response
- **THEN** the response retains truthful status and server identity and does not forge IIS-specific headers or protocol fingerprints

### Requirement: Readers can bypass repeated navigation

Reader pages SHALL provide a skip link as the first keyboard-focusable control, leading to the main content and remaining visibly identifiable when focused.

#### Scenario: Keyboard user skips shared navigation

- **WHEN** a keyboard user focuses the first page control and activates it
- **THEN** focus and reading position move to the main content without traversing repeated navigation links

### Requirement: Reader pages use a calm, consistent visual system

The site SHALL use a restrained, eye-comfortable visual style, use an installed Maple Mono Normal NF CN font during local development, and serve optimized local font assets in CI-built output, with a readable fallback if the font cannot be loaded.

#### Scenario: Local development uses the installed font

- **WHEN** a developer starts the local development server
- **THEN** the app requests the Maple Mono Normal NF CN family from the local system and does not download font files or make requests to a font provider

#### Scenario: CI acquires and optimizes the latest stable font

- **WHEN** GitHub Actions builds the site
- **THEN** CI resolves the latest stable Maple Mono Normal NF CN release from the official upstream, verifies the published SHA-256 checksum, uses `vite-plugin-font` to generate optimized local WOFF2 subsets, and emits no runtime font-provider URLs

#### Scenario: Local development does not download the font archive

- **WHEN** a developer starts or builds the site outside GitHub Actions
- **THEN** font processing uses the installed system font and does not resolve, download, or optimize the upstream release archive

#### Scenario: CI reuses a cached upstream font release

- **WHEN** GitHub Actions resolves a release tag whose verified font archive is already cached
- **THEN** CI reuses the verified archive instead of downloading it again and still runs the font optimization step

#### Scenario: Font release is unavailable or invalid

- **WHEN** CI cannot resolve the latest stable release, download its archive or checksum, or verify the checksum
- **THEN** the build reports the failed release or verification step and does not silently fall back to external runtime font requests

#### Scenario: Font is unavailable to a local developer or reader

- **WHEN** the system font is not installed locally or a reader cannot load a generated CI font asset
- **THEN** text remains legible using the defined fallback stack without breaking layout

### Requirement: Reader interactions respect motion preferences

The reader interface SHALL reserve motion for meaningful state changes and interaction feedback, avoid decorative or looping animation, and honor reduced-motion preferences without impairing operation or obscuring state.

#### Scenario: Reader uses an interactive control

- **WHEN** a reader opens or closes an interactive panel or changes a control state
- **THEN** any motion is limited to feedback that clarifies the change, and panel dismissal is quicker and quieter than opening

#### Scenario: Visitor requests reduced motion

- **WHEN** the visitor's system preference requests reduced motion
- **THEN** nonessential transitions and animations are suppressed while controls, focus, and state changes remain perceivable and operable

### Requirement: Article code blocks are identifiable, readable, and copyable

Article code blocks SHALL show a language badge derived from the fenced-code language when available, keep long lines within the code-block area without causing page-level horizontal overflow, and provide an accessible, keyboard-operable control to copy the code text without syntax-highlighting markup.

#### Scenario: Reader views a language-labeled code block

- **WHEN** an article code fence declares a language
- **THEN** its code block displays that language in a badge at the upper-right without covering the code or copy control

#### Scenario: Reader views a long code block on a narrow screen

- **WHEN** a code line is wider than the available article or viewport width
- **THEN** the code block can be scrolled horizontally within its own area without causing page-level horizontal overflow

#### Scenario: Reader copies a code block

- **WHEN** a reader activates the copy control for a code block
- **THEN** the plain code text is copied to the clipboard and a successful result is announced accessibly

#### Scenario: Clipboard copy fails

- **WHEN** clipboard access is unavailable or the copy operation is rejected
- **THEN** the interface communicates that copying failed and does not announce success

### Requirement: Article headings have shareable anchors

Article headings SHALL have stable, unique fragment identifiers and a keyboard-accessible way to copy a direct link to each heading.

#### Scenario: Reader copies a heading link

- **WHEN** a reader activates the link-copy control for an article heading
- **THEN** the URL containing that heading's fragment is copied and the result is announced accessibly

#### Scenario: Article contains repeated heading text

- **WHEN** multiple headings have the same visible text
- **THEN** each heading receives a distinct, stable fragment identifier

### Requirement: Article images and tables fit narrow screens

Article images SHALL stay within the content width while preserving aspect ratio and meaningful alternative-text semantics. Wide tables SHALL scroll within their own labeled region without causing page-level horizontal overflow, and the region SHALL be keyboard-accessible.

#### Scenario: Reader views an image on a narrow screen

- **WHEN** an article image is wider than the available content area
- **THEN** it scales to fit without distortion or horizontal page overflow and retains its alternative text

#### Scenario: Reader views a wide table on a narrow screen

- **WHEN** an article table exceeds the available content width
- **THEN** the table can be scrolled horizontally within its own accessible region without causing page-level horizontal overflow

### Requirement: Appearance mode is consistent and persistent

The site SHALL provide light and dark appearance modes, apply the selected mode consistently to all reader pages and controls, and preserve an explicit visitor choice across navigation and reloads.

#### Scenario: Visitor changes appearance

- **WHEN** a visitor switches between light and dark mode
- **THEN** the current page and subsequent reader pages use the selected appearance

#### Scenario: Visitor reloads after selecting a mode

- **WHEN** a visitor reloads or revisits the site after choosing an appearance
- **THEN** the previously selected appearance is restored

#### Scenario: No saved preference exists

- **WHEN** a visitor opens the site without a saved appearance choice
- **THEN** the site uses the visitor's system color preference until the visitor chooses a mode

### Requirement: Visitors can search published site content

The site SHALL provide a shared search entry point that returns matching published content and communicates empty-query, no-result, and unavailable-search states.

#### Scenario: Search finds matching posts

- **WHEN** a visitor submits a non-empty query that matches published content
- **THEN** the search page presents matching posts with links to their articles

#### Scenario: Search has no matches

- **WHEN** a visitor submits a valid query with no matching published content
- **THEN** the search page communicates that no results were found and allows the visitor to change the query

#### Scenario: Search query is empty

- **WHEN** a visitor submits a query containing only whitespace
- **THEN** the site requests a non-empty query and does not present it as a successful search

### Requirement: Compatible browser agents can discover public post tools

The site SHALL progressively expose public post search, section listing, page navigation, and current-page metadata through Astro WebMCP. WebMCP tools SHALL be limited to post routes and SHALL NOT mutate article content or expose non-public data.

#### Scenario: Browser does not support WebMCP

- **WHEN** a visitor opens the site in a browser without the WebMCP API
- **THEN** the site remains fully usable and does not show WebMCP-related errors or depend on the API for normal search and navigation

#### Scenario: Agent discovers available post sections and pages

- **WHEN** a compatible browser agent inspects the site tools and manifest
- **THEN** it can discover post sections and public post pages without unrelated routes such as the home page or search page

#### Scenario: Agent searches public posts

- **WHEN** an agent searches for a term in the public posts collection
- **THEN** the search tool returns matching post metadata and links without changing the current page

#### Scenario: Agent requests navigation

- **WHEN** an agent requests navigation to a post
- **THEN** navigation is restricted to a page present in the public post manifest and the browser can request user confirmation before changing location

### Requirement: Article pages are sourced from a validated content collection

The site SHALL store article bodies as Markdown entries in an Astro Content Collection with validated frontmatter, and SHALL derive the home feed, article archive, and article detail routes from those entries. Preview articles SHALL be visibly identified as examples and SHALL NOT be represented as published real posts.

#### Scenario: Reader browses collection-backed articles

- **WHEN** a visitor opens the home feed or article archive
- **THEN** the site presents entries queried from the article collection and each entry links to its matching article route

#### Scenario: Reader opens a Markdown article

- **WHEN** a visitor opens an article route for a valid collection entry
- **THEN** the Markdown body renders with the configured `satteri` processor and the collection metadata supplies its title and article information

#### Scenario: Article metadata is invalid

- **WHEN** an article entry does not satisfy the collection schema
- **THEN** Astro reports the content validation error during development or build rather than silently accepting invalid metadata

#### Scenario: Preview article is shown

- **WHEN** a visitor sees a sample article in a feed, archive, search result, or article page
- **THEN** the interface clearly identifies it as preview content and does not claim it is a published real post

### Requirement: Article outline is collapsible and repositionable

Article pages SHALL provide an outline derived from article headings, with a collapsible control that visitors can reposition without obscuring article content or losing keyboard access.

#### Scenario: Wide viewport uses an ergonomic default position

- **WHEN** a visitor opens an article on a wide viewport without a saved outline position
- **THEN** the outline toggle starts at the left side near the vertical center of the viewport

#### Scenario: Narrow viewport uses an ergonomic default position

- **WHEN** a visitor opens an article on a narrow viewport without a saved outline position
- **THEN** the outline toggle starts at the right side in the lower half of the viewport

#### Scenario: Wide article page opens with the outline expanded

- **WHEN** a visitor opens an article on a wide viewport
- **THEN** the outline is expanded by default

#### Scenario: Narrow article page opens with the outline collapsed

- **WHEN** a visitor opens an article on a narrow viewport
- **THEN** the outline is collapsed by default so it does not obscure the reading area

#### Scenario: Outline identifies the current article section

- **WHEN** a visitor reads or navigates to a section in the article
- **THEN** the matching outline entry is visibly highlighted and programmatically identified as the current location

#### Scenario: Outline stays clear of the reading area

- **WHEN** an article is shown on a wide viewport with room beside its content
- **THEN** the outline uses that adjacent space instead of covering the article; when there is not enough room, it uses a bounded panel whose own contents can scroll

#### Scenario: Outline panel avoids the repositioned toggle

- **WHEN** a visitor repositions the outline toggle near either horizontal edge and opens the outline
- **THEN** the panel opens on the side with sufficient space, remains within the viewport, and does not overlap the toggle

#### Scenario: Outline reflects heading hierarchy

- **WHEN** an article contains headings at different levels
- **THEN** the outline nests each heading beneath its nearest preceding parent heading and presents the hierarchy accessibly

#### Scenario: Current outline entry stays visible without moving the article

- **WHEN** the current section changes while the outline is open
- **THEN** the current entry remains visible within the outline, scrolling the outline if needed without unexpectedly scrolling the article

#### Scenario: Visitor opens and closes the outline

- **WHEN** a visitor activates the outline control
- **THEN** the outline visibility toggles and its expanded state is announced accessibly

#### Scenario: Visitor follows an outline entry

- **WHEN** a visitor selects an outline heading
- **THEN** the article navigates to the matching section and the outline remains usable

#### Scenario: Visitor drags the outline control

- **WHEN** a visitor drags the outline control with a pointer or touch input
- **THEN** the control moves within the visible viewport and a completed drag does not accidentally toggle the outline

#### Scenario: Visitor reloads after repositioning the outline control

- **WHEN** a visitor reloads an article after dragging the outline control
- **THEN** the control returns to its saved position, clamped within the current viewport

#### Scenario: Saved outline position is invalid or unavailable

- **WHEN** the saved outline position is malformed, outside the viewport, or browser storage is unavailable
- **THEN** the control remains visible and usable at a safe in-viewport position

#### Scenario: Visitor operates the outline without dragging

- **WHEN** a visitor uses a keyboard or assistive technology to operate the outline
- **THEN** the outline can be opened, closed, and navigated without pointer dragging

### Requirement: Article external links offer an explicit archive lookup

Article pages SHALL open external HTTP(S) links in a separate browsing context and provide an adjacent, accessible Internet Archive lookup control for each eligible external link. The site SHALL NOT automatically probe external destinations or recursively retry archive links.

#### Scenario: Reader opens an external article link

- **WHEN** a reader activates an external HTTP(S) link in an article
- **THEN** the original destination opens in a separate browsing context while the article remains available

#### Scenario: Reader chooses the archive lookup

- **WHEN** a reader activates the adjacent “查看 Internet Archive 快照” control
- **THEN** an Internet Archive lookup for that original URL opens in a separate browsing context

#### Scenario: Original destination or archive lookup is unavailable

- **WHEN** the original destination or the Internet Archive lookup cannot be reached
- **THEN** the article page remains available, and the site does not automatically retry, redirect, or recursively create another archive lookup

#### Scenario: Link is not eligible for archive lookup

- **WHEN** an article link is internal, uses a non-HTTP(S) scheme, or already points to an Internet Archive host
- **THEN** the site does not add an archive lookup control to that link
