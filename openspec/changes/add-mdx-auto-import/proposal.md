# Proposal

## Why

MDX is installed but never registered, and authors must import shared
components in every MDX file. Enabling `astro-auto-import` removes that
boilerplate and makes the MDX path usable for content and pages.

## What Changes

- Add `astro-auto-import` as a dependency.
- Register `@astrojs/mdx` in the integrations list, immediately after
  `AutoImport`, which injects `src/components/Icon.astro` into MDX modules.
- Allow `.mdx` posts alongside `.md` in the posts collection.
- Add a labeled demo page at `/test/auto-import/` and a Playwright check that
  the icon renders without an import.
- Document MDX authoring and auto-import in `README.md`.

## Capabilities

### New Capabilities

- `mdx-auto-import`: MDX pages and posts can use the site's auto-imported
  components without explicit imports, while `.md` rendering is unchanged.

### Modified Capabilities

None.

## Impact

- `package.json`, `pnpm-lock.yaml`: new `astro-auto-import` dependency.
- `astro.config.ts`: MDX integration and auto-import configuration.
- `src/content.config.ts`: posts pattern now accepts `.mdx`.
- `src/pages/test/auto-import.mdx`, `tests/e2e/auto-import.spec.ts`, `README.md`.
- `.md` output, including the satteri processor and Mermaid handling, is
  unchanged because the injection plugin only runs for MDX sources.
