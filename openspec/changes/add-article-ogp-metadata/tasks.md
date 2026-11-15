# Tasks

## 1. Prove the metadata helpers

- [x] 1.1 Add failing unit tests for git date parsing and article metadata mapping, including fallbacks and blank values.
- [x] 1.2 Implement `src/lib/git-times.ts`, `src/lib/article-metadata.ts`, and `src/lib/site-metadata.ts` until the tests pass.

## 2. Emit the article graph

- [x] 2.1 Add the site author to `package.json`.
- [x] 2.2 Emit the `og:`/`article:` prefix plus `article:*` and `og:image:type` from `SiteLayout`, and wire post pages to the metadata builder.
- [x] 2.3 Set `fetch-depth: 0` on both deploy checkouts so git times are complete.
- [x] 2.4 Switch home, archive, RSS, and OpenGraph routes to git-derived dates and order (`src/lib/post-dates.ts`).

## 3. Verify and document

- [x] 3.1 Build the site and run the Open Graph checker over `dist/client`; confirm a post emits both article namespaces and a hub page emits none.
- [x] 3.2 Confirm git-derived times match `git log` for a post with multiple commits and that fallback uses `publishedAt`.
- [x] 3.3 Document the author and git-time behavior in `README.md`; run `pnpm run check`, `pnpm run test:unit`, and `openspec validate add-article-ogp-metadata --strict`.
