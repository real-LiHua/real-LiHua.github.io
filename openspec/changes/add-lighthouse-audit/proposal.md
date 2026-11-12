# Proposal

## Why

The site has no automated lab measurement of how its built output performs, yet reader-facing decisions (fonts, hydration, CSS) affect load time, accessibility, and SEO directly. Checks today cover correctness (`astro check`, unit and Playwright tests) but nothing audits the shipped pages, so regressions in those dimensions are only caught manually, if at all.

## What Changes

- Add `lighthouse` as a devDependency (the GoogleChrome Lighthouse library, driven programmatically via its Node API and chrome-launcher).
- Add `scripts/lighthouse-audit.mjs`: builds the site, serves the production build with the standalone Node server, audits a set of built routes with the four Lighthouse categories (performance, accessibility, best-practices, seo), prints a per-route summary, and exits non-zero when an audit itself fails.
- Add a `pnpm` script to run the audit; write JSON/HTML reports under `.cache/lighthouse/` (already gitignored).
- Document the command in `README.md`.

## Capabilities

### New Capabilities

- `lighthouse-audit`: the repository provides a repeatable, local Lighthouse audit of the built site that serves the production build, audits representative built routes across the four categories, and surfaces the results without CI coupling.

### Modified Capabilities

None.

## Impact

- `package.json`, `pnpm-lock.yaml`: new `lighthouse` devDependency and a new script entry.
- `scripts/lighthouse-audit.mjs`: new audit driver.
- `README.md`: new row in the checks table.
- No runtime/site code changes; Lighthouse audits the existing build output only. No browser is downloaded beyond what the developer machine provides (uses system Chromium or Chrome via chrome-launcher).
