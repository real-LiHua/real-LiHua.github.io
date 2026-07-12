# blog

[![built with Astro](https://img.shields.io/badge/built%20with-Astro-FF5D01?logo=astro)](https://astro.build)

A personal blog built with Astro 7, deployed to Cloudflare Workers, Codeberg Pages, and GitHub Pages.

## Features

- **Astro 7 + MDX** — static site generation with content collections
- **Tailwind CSS 4 + daisyUI 5** — utility-first styling with component library
- **Pagefind** — fully client-side search with zero-config indexing
- **astro-shield** — proof-of-work gate and content obfuscation for bot protection
- **PWA** — offline support via `@vite-pwa/astro`
- **RSS + Sitemap** — auto-generated feeds and SEO metadata
- **Rust CLI** — interactive post management tool (`pnpm post:edit`)

## Quick Start

```bash
pnpm install       # install dependencies
pnpm dev           # start dev server at localhost:4321
pnpm build         # type-check + build + pagefind index + html validation
pnpm preview       # build + preview with wrangler
```

## Project Structure

```
src/
├── components/       # Astro components (Header, Footer, CodeCopy, …)
├── layouts/          # BaseLayout (theme, OGP, ClientRouter, Pagefind)
├── pages/            # routes: index, about, posts/[id], tags/, meow.ts, …
├── posts/            # .md / .mdx blog articles (content collections)
│   └── drafts/        # Drafts go here; draft status is determined by path (no frontmatter `draft` field)
├── scripts/          # client-side JS (theme-toggle, scroll-reveal, tilt-card, …)
├── styles/           # global.css — Tailwind + daisyUI theme vars
└── utils/            # date helpers (dayjs)
```

## Deployment

| Target             | URL                               |
| ------------------ | --------------------------------- |
| Cloudflare Workers | `https://<your-worker>.pages.dev` |
| Codeberg Pages     | `https://lihua.codeberg.page`     |
| GitHub Pages       | `https://real-LiHua.github.io`    |

Push to `main` triggers the [deploy workflow](.github/workflows/deploy.yml) which builds and deploys to all three targets. Changes to `.agents/`, `*.md`, `LICENSE.txt`, `src/post-edit/`, or `Cargo.toml` are excluded from triggering builds.

## Tech Stack

- **Runtime:** Node 24 + pnpm 11
- **Framework:** Astro 7 (node adapter, standalone mode)
- **Styling:** Tailwind CSS 4 + daisyUI 5 + `@tailwindcss/typography`
- **Lint / Format:** oxlint + oxfmt
- **CLI:** Rust (clap, chrono, skim, gray_matter, bat)
- **CI:** GitHub Actions → Cloudflare Workers / Codeberg Pages / GitHub Pages
