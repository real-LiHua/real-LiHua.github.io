---
name: real-LiHua blog reader
description: Bookish monospace-first long-form reading surface — ink on paper, one restrained moss accent, generous margins.
colors:
  background: "oklch(0.975 0.008 100)"
  foreground: "oklch(0.24 0.018 140)"
  card: "oklch(0.99 0.004 100)"
  card-foreground: "oklch(0.24 0.018 140)"
  primary: "oklch(0.46 0.065 143)"
  primary-foreground: "oklch(0.985 0.005 100)"
  muted: "oklch(0.945 0.01 100)"
  muted-foreground: "oklch(0.46 0.018 140)"
  accent: "oklch(0.93 0.018 140)"
  border: "oklch(0.87 0.012 105)"
  input: "oklch(0.84 0.014 105)"
  ring: "oklch(0.52 0.07 143)"
typography:
  display:
    fontFamily: "Maple Mono Normal NF CN, Noto Sans CJK SC, sans-serif"
    fontSize: "clamp(2rem, 6vw, 3rem)"
    lineHeight: 1.2
  headline:
    fontFamily: "Maple Mono Normal NF CN, Noto Sans CJK SC, sans-serif"
    fontSize: "1.35rem"
    lineHeight: 1.35
  title:
    fontFamily: "Maple Mono Normal NF CN, Noto Sans CJK SC, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "Maple Mono Normal NF CN, Noto Sans CJK SC, sans-serif"
    fontSize: "1.125rem"
    lineHeight: 1.85
  body-ui:
    fontFamily: "Maple Mono Normal NF CN, Noto Sans CJK SC, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.7
  label:
    fontFamily: "Maple Mono Normal NF CN, Noto Sans CJK SC, sans-serif"
    fontSize: "0.9rem"
  code:
    fontFamily: "Maple Mono Normal NF CN, Noto Sans CJK SC, sans-serif"
    fontSize: "0.9rem"
    lineHeight: 1.6
rounded:
  small-control: "0.2rem"
  control: "0.25rem"
  block: "0.35rem"
  panel: "0.5rem"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    padding: "0.65rem 1rem"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "0.3rem 0.6rem"
  button-quiet-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
  button-outline-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.small-control}"
    padding: "0.25rem 0.4rem"
  chip-preview:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.control}"
    padding: "0.25rem 0.5rem"
  input-search:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "0.7rem"
  outline-toggle-button:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "50%"
    size: "3.5rem"
---

# Design System: real-LiHua blog reader

## Overview

**Creative North Star: "墨页 The Inked Page"**

A printed page with ink, generous margins, and soft reading light. The interface MUST stay bookish, measured, and quietly precise: warm paper surfaces in light mode, ink-backed muted surfaces in dark mode, hairline rules instead of boxes, and exactly one restrained moss-green accent. Emphasis MUST be carried by article typography and well-framed code examples, never by decoration. Gradients, glows, decorative blobs, emoji labels, and dashboard-style card grids MUST be rejected by the openspec design decision.

The system is monospace-first: a single font family, Maple Mono Normal NF CN (with a Noto Sans CJK SC fallback), carries UI text, article prose, code, and even icons — icons are Nerd Font glyphs bundled inside that same font. `font-synthesis` MUST stay disabled, so size, color, and spacing do the emphasizing that fake bold would otherwise do. Latin and CJK glyphs share one rhythm, which gives the page its measured, typeset character.

The signature element is the movable article outline control: a small circular floating toggle that reads as a bookmark at the page edge — flat-page default position on the left at vertical center on wide viewports, lower-right on narrow ones, and it MUST be draggable and persisted per visitor.

**Key Characteristics:**

- Monospace-first editorial system; one family MUST carry text, code, and icons
- Warm paper light mode; ink-backed, muted-contrast dark mode
- One restrained moss-green accent, reserved for interaction and current location only
- Flat surfaces separated by hairline rules; shadows only on floating controls
- Generous margins: 48rem shell, 42rem reading measure
- Motion MUST be brief, quiet, and asymmetric: open 180ms ease-out, close 80ms ease-in

## Colors

A warm near-neutral ramp of paper and ink tones with a single moss-green accent; saturated colors MUST be avoided, and pure black and pure white MUST NOT be used.

### Primary

- **Moss Green** (oklch(0.46 0.065 143), dark mode oklch(0.72 0.08 145)): the only accent. Used for interactive emphasis — link hover color, the search submit button, the current outline entry, the not-found error code, archive-lookup links. With its near-white text color (oklch(0.985 0.005 100)) it forms the one filled button in the system.

### Neutral

- **Warm Paper** (oklch(0.975 0.008 100), dark oklch(0.19 0.012 140)): page background; softly warm off-white in light mode, ink-backed and warm in dark mode.
- **Ink** (oklch(0.24 0.018 140), dark oklch(0.91 0.012 100)): primary text color.
- **Raised Card** (oklch(0.99 0.004 100), dark oklch(0.23 0.014 140)): slightly lighter surface for controls, chips, floating panels, and the not-found panel.
- **Mist** (oklch(0.945 0.01 100), dark oklch(0.29 0.016 140)): quiet fill for hover states and the current outline entry background.
- **Fog Text** (oklch(0.46 0.018 140), dark oklch(0.72 0.015 110)): secondary text — metadata, eyebrows, footers, status lines.
- **Hairline** (oklch(0.87 0.012 105), dark oklch(1 0 0 / 10%)): 1px rules that separate header, footer, list rows, and panel edges; in dark mode the rule is translucent white.
- **Input Edge** (oklch(0.84 0.014 105), dark oklch(1 0 0 / 15%)): slightly firmer border for text inputs.
- **Focus Ring** (oklch(0.52 0.07 143), dark oklch(0.556 0 0)): 2px visible focus outline at 3px offset for every interactive control.

### Color Rules

**The One Ink Rule.** Moss green MUST appear only on interactive emphasis and the current reading location — at most a tenth of any view. Its rarity is the point; it MUST NOT fill large surfaces or decorate.

**The Ink Swap Rule.** Dark mode MUST swap paper for ink-backed surfaces at muted chroma (background oklch(0.19 0.012 140), text oklch(0.91 0.012 100)). Pure black and pure white MUST NOT be used; contrast MUST stay legible but low-glare.

The shadcn base theme (initialized via `components.json`) still defines dormant semantic slots (popover, secondary, destructive, chart, sidebar) for future source components; the reader UI described here uses only the tokens above.

## Typography

**Display Font:** Maple Mono Normal NF CN (with Noto Sans CJK SC fallback)
**Body Font:** Maple Mono Normal NF CN (with Noto Sans CJK SC fallback)
**Label/Mono Font:** the same family — code, labels, and icons share it

**Character:** A single monospace voice for everything — Latin and CJK on one grid, UI and code indistinguishable in kind. The system-font pairing MUST read as typeset rather than templated; with `font-synthesis: none`, hierarchy MUST come from size, color, and space rather than synthetic bold.

### Hierarchy

- **Display** (regular weight, clamp(2rem, 6vw, 3rem), line-height 1.2): page and article titles; the one large voice on every page.
- **Headline** (regular weight, 1.35rem, line-height 1.35): post titles in lists, article section headings (2rem top margin, 0.75rem below).
- **Title** (weight 500, 1.2rem, line-height 1.4): archive section headings and the search dialog heading.
- **Body** (regular weight, 1.125rem, line-height 1.85): article prose, held to a 42rem measure with 1.5rem paragraph spacing.
- **Body UI** (regular weight, 1rem, line-height 1.7): base interface text everywhere outside articles.
- **Label** (regular weight, 0.9rem, Fog Text color): metadata lines, eyebrows, preview notes, footer.
- **Code** (regular weight, 0.9rem, line-height 1.6): article code blocks in the same family — the monospace identity is not a special case, it is the norm.

### Type Rules

**The Single Voice Rule.** One family MUST carry UI, prose, code, and icons (Nerd Font glyphs from Maple Mono NF). A second decorative face MUST NOT be introduced, and bold MUST NOT be faked with synthesis — emphasis MUST come from size, color, and space.

## Layout

One column, centered. The shell (header, footer, main) MUST be `min(100% - 2rem, 48rem)` wide with 1.5rem vertical padding at the header and footer; main content MUST get 3rem top and 5rem bottom (2rem/3rem below 32rem). Articles MUST tighten to a 42rem measure. The minimum supported viewport is 20rem, and no page MAY scroll horizontally: wide tables and code blocks MUST scroll inside their own labeled regions.

Navigation MUST stay a single quiet row of icon-only controls (home, posts, search, theme) with 1.5rem gaps (1rem below 32rem). Lists MUST be hairline-separated rows, not cards: post rows 1.25rem apart with a 1px bottom rule, descriptions under titles. The archive browse area MUST be a two-column grid that collapses to one column below 32rem. The outline control MUST anchor left at vertical center on viewports at least 64rem wide, and lower-right below that. Focus rings MUST be 2px at 3px offset.

## Elevation & Depth

Flat by default. Depth on the page MUST be expressed by hairline rules and tonal steps between Warm Paper, Raised Card, and Mist — not by shadows. Only elements that float above the page MAY cast shadows, and each MUST have exactly one: the draggable outline toggle (0 2px 12px rgb(0 0 0 / 12%)), the outline panel (0 4px 20px rgb(0 0 0 / 14%)), and the search dialog's dim scrim (rgb(0 0 0 / 45%) on the native dialog backdrop). In dark mode, layering MUST be tonal: Raised Card (0.23 lightness) sits a step above the page (0.19) with translucent white hairlines.

### Elevation Rules

**The Floating Ink Rule.** Shadows MUST belong only to elements that float above the page — the outline toggle, its panel, and the search dialog scrim. A surface that is part of the page MUST NOT get a shadow.

## Shapes

Small, almost-square radii and hairline edges. Controls MUST be rounded at 0.25rem (0.2rem for tiny copy buttons), blocks like code fences and the outline panel at 0.35rem, the search dialog at 0.5rem. The one deliberate exception is the outline toggle: a perfect circle (3.5rem, 50% radius) — the bookmark silhouette. Borders MUST be 1px and always Hairline-colored. Images and code MUST keep their intrinsic ratios; nothing MAY be cropped.

## Components

Quiet controls with a single filled button; the article body MUST be where visual interest lives.

### Buttons

- **Shape:** MUST be gently rounded (0.25rem), inline-flex centered.
- **Quiet (default):** transparent background, Ink text, 0.3rem 0.6rem padding — the header navigation and theme toggle.
- **Hover/Focus:** quiet buttons MUST fill with the accent wash (oklch(0.93 0.018 140)) on hover; all buttons MUST show the 2px focus ring at 3px offset. State colors MUST transition in 180ms ease-out.
- **Primary:** the one filled button — Moss Green background with near-white text and a 1px same-color border (0.65rem 1rem padding); it MUST be used only for the search submit action.
- **Ghost copy controls:** transparent, Fog Text color, tiny (0.25rem 0.4rem, 0.2rem radius); on hover or focus they MUST gain a Hairline border and Raised Card background. Used for code-copy and heading-link copy.

### Chips

- **Preview note:** inline-block, Hairline border, Raised Card background, Fog Text text, 0.25rem 0.5rem padding, 0.25rem radius. It MUST label preview content wherever that content appears.

### Cards / Containers

- **Post rows:** MUST NOT be cards — hairline-separated list rows with Fog Text metadata above the title.
- **Not-found panel:** a single bordered panel (Hairline border, Raised Card background, no radius) with generous padding (clamp(1.25rem, 5vw, 2.5rem)) and the HTTP status code in Moss Green.
- **Outline panel:** floating bordered panel (0.35rem radius, Raised Card background, 0.5rem inner padding), viewport-clamped, with its own scroll and a 1px left rule guiding nested heading levels.

### Inputs / Fields

- **Search input:** Hairline-to-Input-Edge border (1px, Input Edge color), Raised Card background, 0.7rem padding, 0.25rem radius, inheriting the body font.
- **Focus:** MUST use the 2px Focus Ring outline at 3px offset — the same treatment as every control.

### Navigation

- **Style:** icon-only links and buttons in one quiet row (Nerd Font glyphs), transparent until hovered; links MUST underline with a 0.2em offset and dim underline that turns current-color on hover. A logo or site-name wordmark MUST NOT appear — only direct text/icon links.
- **Mobile:** the row MUST wrap with 1rem gaps; nothing MAY hide behind a hamburger.

### Outline Widget (signature)

The movable bookmark: a 3.5rem circular toggle (Raised Card background, Hairline border, its soft 0 2px 12px shadow, grab cursor) fixed at the page edge — left vertical-center on wide viewports, lower-right on narrow ones. It MUST be draggable by pointer/touch with a 6px movement threshold that distinguishes drag from click, MUST clamp to the viewport, and MUST persist its position. The panel it opens MUST nest headings beneath their nearest preceding parent with a 1px left rule per level; the current reading position MUST be highlighted with a Mist background, Moss Green text, and `aria-current="location"`, and the panel MUST keep that entry scrolled into view without scrolling the article.

**The Quick Close Rule.** Panels MUST open in 180ms ease-out (a 0.25rem rise and fade) and close in 80ms ease-in (a 0.05rem settle) — dismissal MUST always be quicker and quieter than opening. With reduced motion, nonessential transitions MUST be removed entirely while state changes, focus, and controls stay perceivable; the theme cross-fade (`body` background/color and the theme toggle, 180ms) MUST be retained as an essential state change.

### Code Block (signature)

A 0.35rem-radius block with 2.75rem top padding reserving room for its controls: a compact language badge derived from the fenced-code language at the upper right, and a ghost copy control beside it. Long lines MUST scroll horizontally inside the block's own area; code MUST NOT be wrapped or clipped, and the page MUST NOT overflow. The block's surface MUST be the syntax highlighter's fixed dark ink (GitHub Dark, #24292e with light text) in both themes — printed ink regardless of page theme. The block's controls (language badge, copy button) MUST use a fixed light ink (#e1e4e8) on the dark surface in both themes, never the theme foreground. Mermaid diagrams MUST render beside code as a hairline-bordered Raised Card block whose fills and lines reuse the site tokens (Mist fills, Moss Green lines) so they follow the active theme.

## Do's and Don'ts

### Do

- **Do** keep exactly one accent, and spend it on interaction and current location only (The One Ink Rule).
- **Do** let the single Maple Mono voice carry everything — text, code, labels, and Nerd Font icons (The Single Voice Rule).
- **Do** use hairline rules and tonal steps for structure; shadow only what floats (The Floating Ink Rule).
- **Do** keep the open/close asymmetry: 180ms ease-out in, 80ms ease-in out, removed under reduced motion.
- **Do** keep the 42rem article measure and 48rem shell; generous margins are the design.
- **Do** contain wide code and tables in their own labeled, keyboard-accessible scroll regions.
- **Do** label preview content clearly wherever it appears.

### Don't

- **Don't** add gradients, glows, decorative blobs, emoji labels, or dashboard-style card grids.
- **Don't** add a logo or site-name wordmark to the shared interface.
- **Don't** use looping, bouncing, large-distance, or layout-shifting animation.
- **Don't** introduce a second font family or synthetic bold for emphasis.
- **Don't** create page-level horizontal overflow at any viewport down to 20rem.
- **Don't** present preview articles as published content.

Normative keywords (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY) follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119); see `AGENTS.md`.
