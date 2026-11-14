# Dependency candidates

Astro ecosystem projects published by members of the `withastro` organization,
filtered to what this repository could adopt. A shortlist with decisions, not a
wish list: nothing here is installed unless its row says so.

Scan performed **2026-11-14**. Stars, last-push dates, and npm peer ranges are
point-in-time; re-check before acting on an old entry.

## How the list was produced

1. `gh api orgs/withastro/members` → 36 logins.
2. `gh api users/<login>/repos` per member, dropping forks and archived repos →
   1,585 repositories.
3. Keyword filter on name, description, and topics (`astro`, `satteri`,
   `starlight`) → 386 repositories.
4. `npm view <package> peerDependencies` against this repo's `astro ^7.4.11`.

To refresh:

```sh
gh api orgs/withastro/members --jq '.[].login' > /tmp/members.txt
cat /tmp/members.txt | xargs -P 4 -I{} gh api \
  "users/{}/repos?per_page=100&sort=updated" --paginate \
  --jq '.[] | select(.fork == false and .archived == false)'
```

## satteri is not a member project

`satteri` lives under the `bruits` organization (1,307★), whose members are
`delucis`, `goulvenclech`, and `Princesseuh`. `ematipico/satteri`,
`HiDeoo/satteri`, and `morinokami/satteri` are forks only.

So there is no member-published satteri plugin to adopt. The site keeps the
community package `@xingwangzhe/satteri-mermaid`, and remark/rehype plugins are
out of scope: `src/lib/markdown.ts` runs a satteri processor, not a unified
pipeline.

## Already adopted

| Package             | Version   | Source                           |
| ------------------- | --------- | -------------------------------- |
| `astro-og-canvas`   | `^0.13.3` | `delucis/astro-og-canvas` (289★) |
| `astro-auto-import` | `^0.6.0`  | `delucis/astro-auto-import`      |

## Recommended

| Package     | ★   | Last push  | Astro 7 peer | Why                           |
| ----------- | --- | ---------- | ------------ | ----------------------------- |
| `astro-og`  | 35  | 2026-03-09 | `>=5.0.0`    | Dev-toolbar OpenGraph preview |
| `astro-mcp` | 61  | 2026-05-01 | `>=5.0.0`    | MCP server for Astro projects |

Both are development-only. `astro-og` costs nothing in the build; `astro-mcp`
is optional tooling for agent workflows.

## Conditional

Adopt only when the prerequisite becomes true.

| Package                   | ★ · pushed      | Astro 7 peer | Prerequisite                    |
| ------------------------- | --------------- | ------------ | ------------------------------- |
| `astro-embed`             | 405 · 2026-11   | `^7.0.0`     | Posts embed media               |
| `astro-emit-asset`        | 10 · 2026-11    | `^7.0.0`     | An endpoint emits a static file |
| `@inox-tools/sitemap-ext` | 145\* · 2026-10 | `^7`         | Per-route sitemap metadata      |
| `astro-loading-indicator` | 112 · 2026-07   | `^4`–`^7`    | `ClientRouter` is adopted       |
| `astro-vtbot`             | 365 · 2026-09   | 7            | `ClientRouter` is adopted       |
| `astro-content-devtools`  | 21 · 2024-01    | `>=4.0.0`    | Adding Solid is acceptable      |
| `astro-remote`            | 203 · 2025-03   | none         | Remote content to render        |

- `astro-embed`: low-JavaScript YouTube, Vimeo, Bluesky, Mastodon, Twitter, and
  link-preview components. No post contains an embed today.
- `astro-emit-asset`: prerendered endpoints already cover current needs.
- `*` inox-tools is a monorepo. `sitemap-ext` 0.11.0, `cut-short` 3.0.0,
  `content-utils` 0.16.0, `astro-when` 3.0.0 all target `^7`;
  `@inox-tools/git-redirect` returns 404 on the npm registry.
- `astro-content-devtools` requires `@astrojs/solid-js` and `solid-js`.
- `astro-remote`: last push 2025-03.

## Not a fit

- `astro-icon` (1,449★): duplicates `Icon.astro`, which draws icons from the
  Maple Mono glyph subset.
- `astro-ai-robots-txt` (20★): `src/pages/robots.txt.ts` is 15 lines already.
- `astro-imagetools` (431★): last push 2024-09, Astro 2/3 era.
- `astro-spa` (398★) and `astro-capo` (83★): last push 2022 and 2023.
- `astro-typed-links` (57★): peer range stops at `^6`.
- `satori-astro` (35★): `astro-og-canvas` already covers OG cards.
- `astro-d2`, `remark-auto-diff`, `remark-code-title`,
  `astro-remark-description` (60/7/26/7★): remark plugins, and the satteri
  processor is not a unified pipeline.
- `starlight-llms-txt` (117★) and HiDeoo's 20+ Starlight plugins: not a
  Starlight site.
- `brutal` (475★), `spectre` (164★), and other themes or starters: templates,
  not libraries.
