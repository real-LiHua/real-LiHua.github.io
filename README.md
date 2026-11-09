# 李华的博客

An Astro 7 blog reader preview styled for quiet, long-form reading. Preview
posts are sample content only; they are not published articles.

## Run locally

```sh
pnpm install
pnpm run dev
```

Open `http://localhost:4321`. The preview includes the home page, article
index, search entry point, sample article routes, and a custom 404 page. Use
the navigation to move between reader pages.

Local development uses the installed Maple Mono Normal NF CN system font and
does not download font files. GitHub Actions resolves and verifies the latest
stable official font release, caches it by release tag, then prepares it for
build-time WOFF2 optimization.

## Checks

| Command                     | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `pnpm exec astro check`     | Check Astro and TypeScript files                       |
| `pnpm run build`            | Build the site and generate the Orama search index     |
| `pnpm test`                 | Run Playwright browser tests                           |
| `pnpm run test:font`        | Test local font-download, checksum, and cache behavior |
| `pnpm run test:font-output` | Test generated font-output validation                  |
| `pnpm run lint:md`          | Lint Markdown                                          |
| `pnpm run openspec`         | Run OpenSpec                                           |

The repository also contains tooling for the Rust `post-edit` CLI and tgcloud.
Its source and deployment workflows are outside the current reader preview.

OpenSpec uses the `spec-driven` workflow. The active
[`design-blog-reader-ui`](openspec/changes/design-blog-reader-ui/) change tracks
the reader experience and its remaining implementation work.
