# Tasks

## 1. Wire the integration

- [x] 1.1 Add `astro-auto-import`; confirm its peer range accepts Astro 7.
- [x] 1.2 Register `@astrojs/mdx` after `AutoImport({ imports: ["./src/components/Icon.astro"] })` in `astro.config.ts`.
- [x] 1.3 Accept `**/*.{md,mdx}` in the posts collection.

## 2. Prove it works

- [x] 2.1 Add `src/pages/test/auto-import.mdx` with a `prerender` export that renders an icon without importing it.
- [x] 2.2 Add `tests/e2e/auto-import.spec.ts` and run it against the built site.
- [x] 2.3 Verify a temporary `.mdx` post builds through the collection and renders an auto-imported icon; remove the temporary post afterwards.
- [x] 2.4 Confirm `.md` posts still build and that the full site build succeeds.

## 3. Document and validate

- [x] 3.1 Document MDX authoring and auto-import in `README.md`.
- [x] 3.2 Validate the change with `openspec validate add-mdx-auto-import --strict` and lint the changed Markdown.
