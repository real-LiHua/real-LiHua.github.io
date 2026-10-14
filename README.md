# blog

[![built with Astro](https://img.shields.io/badge/built%20with-Astro-FF5D01?logo=astro)](https://astro.build)

A personal blog built with Astro 7, deployed to Codeberg Pages, GitHub Pages, IPFS (Pinata), and tgcloud (Telegram Mini App).

> **Current state:** the `src/` tree, workflows, and scripts shown below were **rewritten from scratch** per [`REWRITE_PLAN.md`](./REWRITE_PLAN.md) (W0–W10 complete) — they are **not** restored from Git history. A few items are still not landed; those are marked `⏸`. See [`PROJECT_STATUS.md`](./PROJECT_STATUS.md).

## Features

- **Astro 7 + MDX** — static site generation with content collections
- **Tailwind CSS 4 + daisyUI 5** — utility-first styling with component library
- **Pagefind** — fully client-side search with zero-config indexing
- **Favicons** — managed with `astro-favicons` (replaces PWA integration)
- **RSS + Sitemap** — auto-generated feeds and SEO metadata
- **Rust CLI** — interactive post management tool (`pnpm post:edit`)

## Quick Start

```bash
pnpm install       # install dependencies
pnpm dev           # start dev server at localhost:4321
pnpm build         # build site (astro build)
pnpm preview       # build + local preview with tgcloud
```

## Project Structure

```text
src/
├── components/       # Astro components (Header, Footer, Navigation, PostCard, Tag, …)
├── layouts/          # BaseLayout (theme, OGP, ClientRouter, Pagefind)
├── modules/          # deep modules (content/build pipeline, theme, search, telegram-auth)
├── integrations/     # Astro integration: build-pipeline
├── plugins/          # Satteri plugin: satteri-external-links
├── pages/            # routes: index, about, posts/[id], tags/, telegram, api/
├── posts/            # .md / .mdx blog articles (content collections)
│   └── drafts/        # Drafts go here; draft status is determined by path (no frontmatter `draft` field)
├── post-edit/        # Rust CLI (`pnpm post:edit`)
├── scripts/          # client-side JS (client-entry + module registry)
├── styles/           # theme-tokens.css + global.css (Tailwind + daisyUI)
└── utils/            # date / content helpers (dayjs)
```

## Deployment

| Target         | URL                                             |
| -------------- | ----------------------------------------------- |
| Codeberg Pages | `https://lihua.codeberg.page`                   |
| GitHub Pages   | `https://real-LiHua.github.io`                  |
| IPFS (Pinata)  | `ipfs://<CID>` (Pinata pin, currently disabled) |
| tgcloud        | Telegram Mini App (`pnpm deploy`)               |

Push to `main` triggers the deploy workflow (`.github/workflows/deploy.yml` ) which builds and deploys to all targets. Changes to `.agents/`, `*.md`, `LICENSE.txt`, `src/post-edit/` , or `Cargo.toml` are excluded from triggering builds.

## Tech Stack

- **Runtime:** Node 24 + pnpm 11
- **Framework:** Astro 7 (node adapter, standalone mode)
- **Styling:** Tailwind CSS 4 + daisyUI 5 + `@tailwindcss/typography`
- **Lint / Format:** oxlint + oxfmt
- **CLI:** Rust (clap, chrono, skim, gray_matter, bat)
- **CI:** GitHub Actions → Codeberg Pages / GitHub Pages / IPFS / tgcloud（`.github/workflows/`）

## Documentation

| Document                                               | Purpose                                        |
| ------------------------------------------------------ | ---------------------------------------------- |
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)             | **Authoritative current state** of the repo    |
| [`REWRITE_PLAN.md`](./REWRITE_PLAN.md)                 | How the project will be rewritten from scratch |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md)                 | Setup, workflow, PR process                    |
| [`SECURITY.md`](./SECURITY.md)                         | Vulnerability disclosure policy                |
| [`CHANGELOG.md`](./CHANGELOG.md)                       | Release history                                |
| [`docs/GETTING_STARTED.md`](./docs/GETTING_STARTED.md) | Developer onboarding                           |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)           | Multi-target deployment guide                  |
| [`docs/TESTING.md`](./docs/TESTING.md)                 | Test strategy and quality gates                |
| [`docs/OPERATIONS.md`](./docs/OPERATIONS.md)           | Runbook: monitoring, backup, DR                |
| [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) | Symptom → cause → fix                          |
| [`docs/CONTENT_GUIDE.md`](./docs/CONTENT_GUIDE.md)     | Authoring posts and frontmatter                |
| [`docs/SEO.md`](./docs/SEO.md)                         | Metadata, sitemap, RSS                         |
| [`docs/ACCESSIBILITY.md`](./docs/ACCESSIBILITY.md)     | WCAG 2.2 AA baseline                           |
| [`docs/I18N.md`](./docs/I18N.md)                       | CJK + Latin typography strategy                |
| [`docs/POST_EDIT_CLI.md`](./docs/POST_EDIT_CLI.md)     | Rust `post-edit` CLI reference                 |
| [`docs/SEARCH_TUNING.md`](./docs/SEARCH_TUNING.md)     | Pagefind tuning                                |
| [`docs/adr/README.md`](./docs/adr/README.md)           | ADR index and conventions                      |
