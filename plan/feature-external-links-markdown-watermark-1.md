---
goal: "Implement external link accessibility hints, pre-commit markdown (GFM) format detection, and blind watermark for original articles"
version: "1.0"
date_created: "2026-08-26"
last_updated: "2026-08-26"
owner: "real-LiHua"
status: "Planned"
tags: ["feature", "accessibility", "linting", "security", "content"]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan covers three independent features to improve the blog's accessibility, code quality, and content protection:

1. **External Link Accessibility Hints** - Add visual indicators and `rel` attributes for external links to improve accessibility and security
2. **Pre-commit Markdown (GFM) Format Detection** - Integrate markdown linting/formatting into Husky pre-commit hooks using markdownlint
3. **Blind Watermark for Original Articles** - Automatically embed invisible watermarks in articles where the `authors` frontmatter field is empty (indicating original content)

## 1. Requirements & Constraints

- **REQ-001**: External links must have `rel="noopener noreferrer"` and visual indicator (icon/tooltip) for accessibility
- **REQ-002**: Pre-commit hooks must validate markdown files for GFM compliance and formatting
- **REQ-003**: Blind watermark must be applied only to articles with empty `authors` frontmatter field
- **REQ-004**: Watermark must be invisible to human readers but detectable programmatically
- **REQ-005**: All changes must pass existing CI pipeline (oxlint, oxfmt, typecheck, build)
- **SEC-001**: External links must not leak referrer information
- **SEC-002**: Watermark must not affect content readability or SEO
- **CON-001**: Must use existing tooling (oxlint, oxfmt, Husky) where possible
- **CON-002**: Cannot add heavy dependencies; prefer zero-config solutions
- **CON-003**: Content collections schema in `src/content.config.ts` must not be modified
- **CON-004**: Use satteri (via `@astrojs/markdown-satteri`) for markdown/HTML AST transformations instead of deprecated remark/rehype
- **GUD-001**: Follow existing code patterns in `src/components/`, `src/scripts/`, `.husky/`
- **GUD-002**: Use daisyUI components for UI elements where applicable
- **PAT-001**: Follow satteri plugin pattern in `src/integrations/satteri-config.ts` (defineHastPlugin/defineMdastPlugin)
- **PAT-002**: Follow existing client-side script pattern in `src/scripts/`

## 2. Implementation Steps

### Implementation Phase 1: External Link Accessibility Hints

- GOAL-001: Add `rel="noopener noreferrer"` and visual indicators to all external links in MDX content

| Task     | Description                                                                                                                                                                                                                                             | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Create satteri Hast plugin in `src/plugins/satteri-external-links.ts` using `defineHastPlugin` to transform external links in HTML AST: add `rel="noopener noreferrer"`, `target="_blank"`, `data-external="true"`, and `aria-label` for screen readers |           |      |
| TASK-002 | Add CSS styles in `src/styles/global.css` for external link indicator (icon via `::after` pseudo-element) using daisyUI color tokens                                                                                                                    |           |      |
| TASK-003 | Update `src/integrations/satteri-config.ts` to register the Hast plugin in the `hastPlugins` array                                                                                                                                                      |           |      |
| TASK-004 | Test with existing posts containing external links                                                                                                                                                                                                      |           |      |

### Implementation Phase 2: Pre-commit Markdown (GFM) Format Detection

- GOAL-002: Integrate markdown linting and formatting into Husky pre-commit hooks

| Task     | Description                                                                             | Completed | Date |
| -------- | --------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-005 | Add `markdownlint-cli2` and `markdownlint-cli2-formatter` as devDependencies            |           |      |
| TASK-006 | Create `.markdownlint-cli2.jsonc` config file with GFM-compatible rules                 |           |      |
| TASK-007 | Update `.husky/pre-commit.ts` to run markdownlint on staged `*.md` and `*.mdx` files    |           |      |
| TASK-008 | Update `package.json` lint-staged config to include markdown files for oxfmt formatting |           |      |
| TASK-009 | Verify pre-commit runs markdownlint and oxfmt on staged markdown files                  |           |      |

### Implementation Phase 3: Blind Watermark for Original Articles

- GOAL-003: Implement invisible watermark embedding for original articles (empty `authors` field)

| Task     | Description                                                                                                                                                                                              | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-010 | Create Astro integration in `src/integrations/watermark.ts` that hooks into `astro:build:done`                                                                                                           |           |      |
| TASK-011 | Implement watermark logic: detect posts with empty `authors` array in content collection, inject zero-width characters (U+200B, U+200C, U+200D, U+FEFF) at deterministic positions based on content hash |           |      |
| TASK-012 | Register integration in `astro.config.ts` (production only)                                                                                                                                              |           |      |
| TASK-013 | Add CLI command to verify watermark presence in built HTML                                                                                                                                               |           |      |
| TASK-014 | Test with draft and published posts, verify watermark survives build pipeline                                                                                                                            |           |      |

## 3. Alternatives

- **ALT-001**: Use `rehype-external-links` package instead of custom satteri plugin — rejected: less control, additional dependency, rehype deprecated
- **ALT-002**: Use `markdownlint` instead of `markdownlint-cli2` — rejected: cli2 has better performance and GFM support
- **ALT-003**: Use visible watermark (CSS background pattern) — rejected: violates REQ-004 (must be invisible)
- **ALT-004**: Add watermark at content authoring time via Rust CLI — rejected: would require modifying source files, breaks git history
- **ALT-005**: Use remark/rehype plugins — rejected: both deprecated, use satteri instead

## 4. Dependencies

- **DEP-001**: `markdownlint-cli2` ^0.17.0 (devDependency)
- **DEP-002**: `markdownlint-cli2-formatter` ^0.0.5 (devDependency)
- **DEP-003**: No new runtime dependencies for watermark (uses built-in crypto/subtle APIs)
- **DEP-004**: Existing: `oxlint`, `oxfmt`, `husky`, `lint-staged`, `astro`, `@astrojs/markdown-satteri`, `satteri`

## 5. Files

- **FILE-001**: `src/plugins/satteri-external-links.ts` (new) — Satteri Hast plugin for external link transformation
- **FILE-002**: `src/styles/global.css` (modify) — Add external link indicator styles
- **FILE-003**: `src/integrations/satteri-config.ts` (modify) — Register satteri external links Hast plugin
- **FILE-004**: `.markdownlint-cli2.jsonc` (new) — Markdownlint configuration
- **FILE-005**: `.husky/pre-commit.ts` (modify) — Add markdownlint to pre-commit
- **FILE-006**: `package.json` (modify) — Add devDependencies, update lint-staged
- **FILE-007**: `src/integrations/watermark.ts` (new) — Astro integration for blind watermark
- **FILE-008**: `src/scripts/verify-watermark.ts` (new) — CLI script to verify watermarks

## 6. Testing

- **TEST-001**: Verify external links in `src/posts/*.md` have correct `rel`, `target`, `data-external`, and `aria-label` attributes in built HTML
- **TEST-002**: Verify external link indicator renders correctly in light/dark themes
- **TEST-003**: Run `pnpm lint-staged` with staged markdown file containing formatting errors — should fail
- **TEST-004**: Run `pnpm lint-staged` with properly formatted markdown — should pass
- **TEST-005**: Build site and verify watermarked posts (empty authors) contain zero-width characters in output HTML
- **TEST-006**: Verify non-watermarked posts (with authors) have no zero-width characters
- **TEST-007**: Run full CI pipeline (`pnpm check && pnpm build && pnpm oxlint && pnpm oxfmt --check`) — all pass

## 7. Risks & Assumptions

- **RISK-001**: Zero-width characters may be stripped by some CDNs or HTML minifiers — mitigation: test with `astro-minify-html-swc` and Cloudflare Workers
- **RISK-002**: Markdownlint rules may conflict with existing MDX content — mitigation: start with minimal rule set, adjust based on existing content
- **RISK-003**: Watermark detection may fail if content is copy-pasted without preserving zero-width chars — assumption: acceptable risk, watermark is for programmatic detection only
- **ASSUMPTION-001**: Content collection `authors` field is optional array; empty array = original content
- **ASSUMPTION-002**: External links are absolute URLs starting with `http://` or `https://` and not matching site domain
- **ASSUMPTION-003**: Node 24+ supports required crypto APIs for watermark generation

## 8. Related Specifications / Further Reading

- [Astro markdown-satteri Integration](https://github.com/withastro/astro/tree/main/packages/integrations/markdown-satteri)
- [Satteri Plugin API](https://github.com/satteri/satteri)
- [markdownlint-cli2 Config](https://github.com/DavidAnson/markdownlint-cli2)
- [Husky Pre-commit Hooks](https://typicode.github.io/husky/)
- [Zero-width Character Watermarking](https://en.wikipedia.org/wiki/Zero-width_space)
- [Web Content Accessibility Guidelines (WCAG) 2.1 - Link Purpose](https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html)
