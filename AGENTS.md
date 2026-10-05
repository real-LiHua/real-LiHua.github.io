# AGENTS.md

## Project Overview

A personal blog built with **Astro 7** using **MDX** for content, **Tailwind CSS 4** + **daisyUI 5** for styling, and **Pagefind** for client-side search. The blog is deployed to **Cloudflare Workers**, **Codeberg Pages**, **GitHub Pages**, and **IPFS** via Pinata.

### Key Technologies

- **Framework:** Astro 7 (Node adapter, standalone mode)
- **Content:** MDX with Astro Content Collections (glob loader)
- **Styling:** Tailwind CSS 4 + daisyUI 5 + @tailwindcss/typography
- **Search:** Pagefind (zero-config static search)
- **Lint/Format:** oxlint + oxfmt (via lint-staged + Husky)
- **CLI Tool:** Rust (post-edit) for interactive post management
- **CI/CD:** GitHub Actions with 4 parallel deployment jobs

### Architecture

```
src/
├── components/       # Astro components (Header, Footer, CodeCopy, etc.)
├── layouts/          # BaseLayout (theme, OGP, ClientRouter, Pagefind)
├── pages/            # Routes: index, about, posts/[id], tags/, meow.ts, etc.
├── posts/            # .md / .mdx blog articles (content collections)
│   └── drafts/       # Drafts determined by path (no frontmatter `draft` field)
├── scripts/          # Client-side JS (theme-toggle, scroll-reveal, tilt-card, etc.)
├── styles/           # global.css — Tailwind + daisyUI theme vars
├── utils/            # Date helpers (dayjs), content utilities
├── integrations/     # Custom Astro integrations (build-hooks, satteri-config, mermaid)
├── plugins/          # Remark/Rehype plugins (mdast-toc)
├── post-edit/        # Rust CLI source (post-edit binary)
├── modules/          # Deep modules with explicit interfaces (types, pipelines, runtime)
└── .agents/          # Sub-agent orchestration (tasks, scripts, contracts, lifecycle)
```

### Deep Module Boundaries

| Module | Interface | Implementation | Consumers |
|--------|-----------|----------------|-----------|
| `content-pipeline` | `getPublishedPosts()`, `renderPost()` | Astro Content Collections + Zod + satteri | Pages, RSS, Sitemap, Search |
| `build-pipeline` | `execute(distDir)`, `registerStage()` | 5 stages: Pagefind → lychee → vnu → Mermaid → Watermark | `astro:build:done` hook |
| `theme-system` | `init()`, `toggleTheme()`, CSS tokens | `theme-tokens.css` + daisyUI `@plugin` | BaseLayout, Navbar, PagefindSearch |
| `search` | `generateIndex()`, `<PagefindSearch />` | Pagefind CLI + modular UI | BuildPipeline, Post pages |
| `client-runtime` | `registerModule()`, `start()` | 9 ClientModules + lifecycle dispatch | BaseLayout (single entry) |
| `telegram-auth` | `initClient()`, `AuthWallProps`, `pollAuthStatus()` | Frontend wall + JWT polling + Bot API | Post page, ClientRuntime |
| `ui-components` | Composite components (Navbar, PostCardGrid/List, Tag, PagefindSearch, BaseLayout) | daisyUI + Tailwind + Astro slots | All pages |

---

## Setup Commands

```bash
# Install dependencies (Node 24 + pnpm 11)
pnpm install

# Start development server at http://localhost:4321
pnpm dev

# Type-check + build + Pagefind index + HTML validation
pnpm build

# Preview production build with Wrangler (Cloudflare Workers simulator)
pnpm preview

# Run Astro CLI commands
pnpm astro <command>

# Run the Rust post management CLI
pnpm post:edit

# Audit dependencies
pnpm audit
```

---

## Development Workflow

### Start Development Server

```bash
pnpm dev
# Runs: astro dev
# Available at: http://localhost:4321
```

### Build for Production

```bash
pnpm build
# Runs: astro build
# Includes:
#   - TypeScript type checking (astro check)
#   - Static site generation
#   - Pagefind search index generation
#   - HTML validation (vnu-jar)
# Output: ./dist/
```

### Preview Production Build

```bash
pnpm preview
# Runs: astro build && wrangler dev
# Simulates Cloudflare Workers environment locally
```

### Hot Reload / Watch Mode

- `pnpm dev` includes hot module replacement for components, styles, and content
- Content changes in `src/posts/` trigger automatic rebuild
- Rust CLI changes require rebuilding the binary: `cargo build --release -p post-edit`

---

## Testing Instructions

### End-to-End Tests (Playwright)

```bash
# Run all E2E tests
pnpm playwright test

# Run tests with UI
pnpm playwright test --ui

# Run tests in headed mode
pnpm playwright test --headed

# Debug tests
pnpm playwright test --debug
```

### Type Checking

```bash
# Run Astro type checking (includes content collection types)
pnpm check
# Runs: astro check
```

### Linting & Formatting

```bash
# Run oxlint (all files)
pnpm oxlint

# Run oxfmt (format check)
pnpm oxfmt --check

# Fix formatting
pnpm oxfmt --write

# Run both via lint-staged (used in pre-commit)
pnpm lint-staged
```

### CI Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on push to `main`:
1. **cloudflare** — Build + deploy to Cloudflare Workers
2. **codeberg** — Build + deploy to Codeberg Pages (SSH push)
3. **github** — Build + deploy to GitHub Pages via `withastro/action`
4. **ipfs** — Build + pin to IPFS via Pinata

All jobs install lychee for link checking and run `pnpm build`.

---

## Code Style Guidelines

### Linting (oxlint)

- **Config:** `.oxlintrc.json`
- **Rules:** All categories set to `error` (correctness, suspicious, pedantic, perf, style, restriction, nursery)
- **Overrides:** Relaxed rules for `.astro`, `astro.config.ts`, `src/pages/**/*.ts`, `src/integrations/**/*.ts`, `.husky/*.ts`
- **Run:** `pnpm oxlint` or via lint-staged on commit

### Formatting (oxfmt)

- **Config:** `oxfmt.config.ts`
- **Options:** JSDoc enabled, Tailwind CSS class sorting enabled
- **Run:** `pnpm oxfmt --check` (verify) or `pnpm oxfmt --write` (fix)

### Pre-commit Hooks (Husky + lint-staged)

- **Config:** `package.json` → `lint-staged` + `.husky/pre-commit.ts`
- **Runs on staged files:**
  - `*.{js,mjs,jsx,ts,tsx}` → oxlint + oxfmt
  - `*.astro` → oxlint
  - `*.css` → oxlint + oxfmt
  - Other files → oxfmt only

### File Organization

- **Components:** PascalCase (e.g., `CodeCopy.astro`, `PostCard.astro`)
- **Pages:** Kebab-case routes (e.g., `posts/[id].astro`, `tags/[tag].astro`)
- **Scripts:** Kebab-case (e.g., `theme-toggle.ts`, `scroll-reveal.ts`)
- **Styles:** `global.css` for Tailwind + daisyUI imports
- **Utilities:** camelCase functions in `src/utils/`
- **Modules:** `src/modules/` — each exports a single interface object

### Import Patterns

```typescript
// Astro built-ins
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

// External packages
import { z } from "astro/zod";
import dayjs from "dayjs";

// Internal modules (use @ alias if configured, otherwise relative)
import { contentPipeline } from "@/modules";
import { formatDate } from "../utils/date";
```

---

## Build and Deployment

### Build Process

```bash
pnpm build
```

**Output structure:**
```
dist/
├── client/          # Static assets for Pages deployments
│   ├── _astro/
│   ├── pagefind/
│   ├── posts/
│   ├── tags/
│   ├── index.html
│   └── ...
├── server/          # Server bundle (Cloudflare Workers)
│   └── entry.mjs
└── _worker.js       # Worker entry (if applicable)
```

### Deployment Targets

| Target | URL | Method |
|--------|-----|--------|
| **Cloudflare Workers** | `https://<your-worker>.pages.dev` | `wrangler deploy` |
| **Codeberg Pages** | `https://lihua.codeberg.page` | SSH bare repo push |
| **GitHub Pages** | `https://real-LiHua.github.io` | `actions/deploy-pages` |
| **IPFS** | Via Pinata gateway | `ipfs add` + Pinata pin |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SITE_URL` | Base URL for sitemap, RSS, OGP | Yes (build) |
| `CF_PAGES_URL` | Cloudflare Pages URL (fallback) | No |
| `CLOUDFLARE_ACCOUNT_ID` | CF account ID | Deploy only |
| `CLOUDFLARE_API_TOKEN` | CF API token | Deploy only |
| `CODEBERG_PAGES` | SSH private key for Codeberg | Deploy only |
| `PINATA_JWT_TOKEN` | Pinata API JWT | IPFS deploy only |

### Local Preview of Deployed Builds

```bash
# Cloudflare Workers preview
pnpm preview

# Static preview (any static server)
pnpm exec serve dist/client
```

---

## Pull Request Guidelines

### Branch & Commit

- Work on feature branches off `main`
- Conventional commit format encouraged:
  - `feat: add search highlighting`
  - `fix: resolve theme toggle hydration`
  - `chore: update dependencies`

### Required Checks Before Merge

All must pass in CI:

```bash
# Local equivalents
pnpm check          # TypeScript + Astro types
pnpm build          # Full build + validation
pnpm oxlint         # Linting
pnpm oxfmt --check  # Formatting
```

### PR Title Format

```
[component] Brief description

# Examples:
[posts] Add reading progress indicator
[layout] Fix OGP image generation
[cli] Add draft filtering to post-edit
```

### Review Requirements

- At least 1 approval for non-trivial changes
- No CI failures
- No lint/type errors
- New features should include tests (Playwright for E2E)

---

## Content Management

### Creating Posts

Posts live in `src/posts/` as `.md` or `.mdx` files:

```markdown
---
title: "Post Title"
publishDate: 2026-08-26
description: "Optional description"
tags: ["tag1", "tag2"]
authors: ["author"]
image: "/path/to/image.png"
updatedDate: 2026-08-27
---

Content here...
```

**Drafts:** Place in `src/posts/drafts/` — they are excluded from production builds automatically (no `draft: true` frontmatter needed).

> **Note:** Draft isolation via private Git submodule is planned (see `docs/adr/0002-draft-isolation-submodule.md`). Currently uses path-based filtering.

### Rust CLI: Post Management

```bash
# Interactive menu
pnpm post:edit

# Commands available:
# - new: Create new post (prompts for frontmatter)
# - edit: Edit existing post (fuzzy search via skim)
# - list: List all posts with metadata
# - delete: Delete a post
# - publish: Move draft to published
# - unpublish: Move published to drafts
```

### Content Collections Schema

Defined in `src/content.config.ts`:
- `title` (required, string)
- `publishDate` (optional, date)
- `updatedDate` (optional, date)
- `description` (optional, string)
- `tags` (optional, string[])
- `authors` (optional, string[])
- `image` (optional, string)
- `telegramAuth` (optional, object with `enabled`, `groupId`, `groupName`, `customMessage`)

Types exported from `src/modules/types.ts` for cross-module reuse.

---

## Common Tasks

### Add a New Component

1. Create `src/components/MyComponent.astro`
2. Import and use in layouts/pages
3. Add styles in component `<style>` or `global.css`
4. Run `pnpm check` to verify types

### Add a New Page Route

1. Create `src/pages/new-route.astro` or `src/pages/new-route/[param].astro`
2. Export `getStaticPaths()` for dynamic routes
3. Use `BaseLayout` for consistent structure
4. Run `pnpm dev` to test

### Modify Theme / Styling

- **Colors/theme:** Edit `src/styles/theme-tokens.css` (single source of truth for light/dark/prose tokens)
- **Tailwind config:** Uses Tailwind CSS 4 (no config file, uses CSS-first)
- **Typography:** `@tailwindcss/typography` for prose content (variables in theme-tokens.css)
- **Syntax highlighting:** `src/styles/shiki.css` (Expressive Code theme)

### Update Dependencies

```bash
# Check for updates
pnpm audit

# Update all (interactive)
pnpm update --interactive

# Update specific
pnpm add -D package@latest
```

### Debugging

| Issue | Solution |
|-------|----------|
| Build fails on types | Run `pnpm check` for detailed errors |
| Styles not applying | Check daisyUI class names, run `pnpm build` |
| Content not showing | Verify frontmatter matches schema in `content.config.ts` |
| Search not working | Ensure `pnpm build` ran (generates Pagefind index) |
| Hydration errors | Check client scripts for `isBrowser` guards |
| Rust CLI not found | Run `cargo build --release -p post-edit` |

---

## Security Considerations

- **Secrets:** Never commit secrets; use GitHub Actions secrets for deploy credentials
- **Origin check:** `astro.config.ts` has `security: { checkOrigin: false }` for dev flexibility
- **Content Security Policy:** Strict CSP via meta tags in `BaseLayout.astro` (see `docs/SECURITY_WHITEPAPER.md`)
- **Dependencies:** `pnpm audit` runs in CI; review advisories before merging
- **Link checking:** lychee runs in CI to catch broken links
- **Telegram Bot Token:** Only in Cloudflare Workers secret, never in repo or build output
- **Watermark:** Zero-width character blind watermark on original articles (build pipeline stage)

Full security baseline: `docs/SECURITY_WHITEPAPER.md`

---

## Performance Notes

- **Images:** Use Astro's `<Image />` component or optimize manually
- **Fonts:** `@fontsource/twinkle-star` self-hosted; consider `preload`
- **CSS:** `lightningcss` minification in production (`astro.config.ts`)
- **HTML:** `astro-minify-html-swc` minifies production output
- **Search:** Pagefind index is ~100KB gzipped; loads async
- **JS:** Minimal client-side JS; most interactivity via small vanilla modules via `client-runtime`

---

## Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf '.astro' 'dist' 'node_modules'
pnpm install
pnpm build
```

### Port Already in Use

```bash
# Kill process on 4321
lsof -ti:4321 | xargs kill -9
```

### Type Errors After Dependency Update

```bash
pnpm check  # Shows exact errors
# Fix types or add @types/ packages
```

### Husky Pre-commit Fails

```bash
# Run manually to see errors
pnpm lint-staged

# Or fix formatting
pnpm oxfmt --write
```

### Pagefind Search Not Working

- Ensure `pagefind` runs during build (included in `astro build`)
- Check `dist/client/pagefind/` exists
- Verify `BaseLayout` includes Pagefind UI via `<PagefindSearch />` component

---

## Technical Reference (from Official Docs)

### Astro 7 Content Collections
- **Glob Loader** (`astro/loaders`): `glob({ pattern: "**/*.{md,mdx}", base: "./src/posts" })` — 支持 `generateId`、`retainBody` (v5.17+)、`pattern` 数组
- **Schema** (`astro/zod`): Zod 4 语法，`z.coerce.date()`、`z.array(z.string())`、`.optional()`、`.nullable()`，自动生成 TS 类型
- **Markdown 处理器**: **Satteri** (`@astrojs/markdown-satteri`) 替代已弃用的 remark/rehype，提供 `MdastPlugin`/`HastPlugin` 插件系统（heading IDs、外链标记、Mermaid 渲染、日期自动填充、表格对齐）
- **Render**: `render(entry)` → `{ Content, headings, remarkPluginFrontmatter }`，`Content` 为 Astro 组件
- **查询**: `getCollection("blog", filter?)`、`getEntry("blog", id)`、`getEntries()`
- **RSS**: `@astrojs/rss` + `pagesGlobToRssItems(import.meta.glob)` 或 `rssSchema` 强制字段
- **Sitemap**: `@astrojs/sitemap` v3.7+ 支持 `chunks` 分片、`namespaces` 排除、`ChangeFreqEnum`

### Astro Integrations & Hooks
- **钩子**: `astro:config:setup` (配置)、`astro:build:start` (构建前)、`astro:build:done` (构建后)、`astro:routes:resolved` (路由解析后)
- **IntegrationResolvedRoute**: `pattern`、`component`、`prerender`、`params`、`generateId`
- **Logger**: `astro:build:done` 等钩子接收 `logger: AstroIntegrationLogger`

### View Transitions (SPA Mode)
- **ClientRouter**: `<ClientRouter fallback="animate|swap|none" />`，`animate` 默认模拟转场
- **生命周期**: `astro:before-preparation` → `astro:after-preparation` → `astro:before-swap` → `astro:after-swap` → `astro:page-load`
- **脚本重执行**: `<script is:inline data-astro-rerun>` 强制每次导航执行，或监听 `astro:page-load`
- **转场指令**: `transition:name`、`transition:animate` (fade/slide/custom)、`transition:persist`
- **表单**: `<form data-astro-reload>` 退出 SPA 模式

### Middleware
- `src/middleware/index.ts` 导出 `onRequest(context, next)`，可读写 `context.locals` 跨组件共享
- 预渲染时运行，按需渲染时每请求运行，Cookie/Headers 仅 SSR 可用

### Image Optimization
- **Sharp** (默认): `image.service.entrypoint: 'astro/assets/services/sharp'`，配置 `limitInputPixels`、`webp`/`jpeg`/`avif`/`png` encoder 选项
- **Passthrough**: `passthroughImageService()` 绕过处理，适配 Cloudflare Workers 等边缘环境
- **Endpoint**: `image.endpoint.route` 自定义图片服务路由

### Tailwind CSS 4 + daisyUI 5
- **CSS-first**: `@import "tailwindcss"; @plugin "@tailwindcss/typography"; @plugin "daisyui";`
- **主题**: `@plugin "daisyui/theme" { name: "light"; prefersdark: false; color-scheme: "light"; --color-*: ... }`
- **Typography**: `@tailwindcss/typography` 通过 `--tw-prose-*` CSS 变量控制，`[data-theme="dark"]` 覆盖
- **Vite 插件**: `@tailwindcss/vite` 集成

### Pagefind
- **模块化 UI**: `Instance({ bundlePath })` + `Input({ containerElement })` + `ResultList({ containerElement, resultTemplate })`
- **声明式**: `<pagefind-config base-url="/" bundle-path="/pagefind/"><pagefind-input><pagefind-results>`
- **CSS 变量**: `--pagefind-ui-primary`、`--pagefind-ui-background`、`--pagefind-ui-text`、`body.dark` 覆盖
- **结果模板**: `<script type="text/pagefind-template">` 内部 `{{ meta.title }}`、`{{ url | safeUrl }}`、`{{+ excerpt +}}`

### Oxlint / Oxfmt
- **配置**: `.oxlintrc.json` (ESLint 兼容) 或 `oxlint.config.ts` (`defineConfig`)，支持 `overrides` 按 glob 差异化
- **类型感知**: `typeAware: true` 需 `oxlint-tsgolint`，规则前缀 `typescript/`
- **Oxfmt**: `oxfmt.config.ts` (`defineConfig`)，`embeddedLanguageFormatting: "auto"`，Tailwind class 排序内置
- **忽略**: `.oxfmtrc.json` `ignorePatterns: ["dist/**", "*.min.js"]`

---

## Sub-Agent Orchestration

This project uses a **sub-agent framework** for parallel development across 6 specialized roles.

### Quick Start

```bash
# View task board
ls .agents/tasks/phase-1/

# Claim a task (example)
pnpm exec tsx .agents/scripts/task-claim.ts 1.1 --assignee content-engineer

# Update progress (every 30 min)
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 50 --msg "Exported types"

# Report blocker (>15 min stuck)
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 --blocked "Need schema" --help-from quality-dx-guardian

# Complete task (runs quality gates)
pnpm exec tsx .agents/scripts/task-complete.ts 1.1
```

### Roles

| Role ID | Type | Focus | Quality Gate |
|---------|------|-------|--------------|
| `frontend-architect` | Stream | Components, Theme, View Transitions | Playwright Chromium |
| `content-engineer` | Stream | Content Collections, MDX, Zod, RSS | Content pipeline + RSS |
| `build-deploy-engineer` | Platform | BuildPipeline, Pagefind, CI/CD | lychee + vnu |
| `cli-tool-engineer` | Platform | post-edit (Rust), CLI, publishing | cargo test/clippy/audit |
| `search-discovery-engineer` | Complicated | Pagefind index, Search UI, algorithms | Pagefind index exists |
| `quality-dx-guardian` | Enabling | oxlint/oxfmt/TS/Playwright/ADR | Full Playwright suite |

### Key Directories

```
.agents/
├── scripts/           # Core scripts (task-claim, task-progress, task-complete, run-gate, check-regression)
├── tasks/phase-1..8/  # Task cards (from REFACTOR_PLAN.md)
├── lifecycle/         # Monthly performance reviews
├── team/              # Skills matrix, capacity planning
├── contracts/         # Interface contracts (TypeScript/Zod)
└── tech-debt/         # Technical debt register
```

### Workflow Rules

1. **Read task card first** — `.agents/tasks/phase-X/N.md`
2. **Heartbeat every 30 min** — `task-progress <id> <percent> --msg "..."`
3. **Block >15 min → report** — `task-progress --blocked "..." --help-from <role>`
4. **Declare outputs before complete** — list files in task card
5. **Gate auto-runs on complete** — common + role-specific

Full operations guide: `docs/SUBAGENT_OPERATIONS.md`

---

## Architecture References

| Document | Purpose |
|----------|---------|
| `CONTEXT.md` | Domain glossary (33 core terms) |
| `docs/adr/0001-functional-architecture.md` | C4 model + deep module boundaries |
| `docs/adr/0002-draft-isolation-submodule.md` | Draft isolation via private Git submodule |
| `docs/adr/0003-subagent-responsibilities-controls.md` | 6 roles, lifecycle, comms, quality gates |
| `docs/adr/0004-agents-knowledge-base-architecture.md` | Knowledge base 3-tier architecture + context pointers |
| `docs/adr/0005-knowledge-update-process.md` | L0-L3 trigger layers, automation scripts, CI guards |
| `docs/architecture-map.md` | Mermaid dependency graph, data flows, seam decisions |
| `docs/SECURITY_WHITEPAPER.md` | Threat model, CSP, auth, build pipeline security, incident response |
| `REFACTOR_PLAN.md` | 8-phase refactor plan with verification & rollback |
| `src/modules/index.ts` | Unified module exports |

---

## Additional Context

### Monorepo Notes

This is a single-package repository. No workspace commands needed.

### Key Files for Agents

| File | Purpose |
|------|---------|
| `astro.config.ts` | Astro configuration, integrations, adapter |
| `src/content.config.ts` | Content collections schema |
| `package.json` | Scripts, dependencies, lint-staged config |
| `.oxlintrc.json` | Linting rules |
| `oxfmt.config.ts` | Formatting config |
| `.github/workflows/deploy.yml` | CI/CD pipeline (4-platform deploy) |
| `.github/workflows/knowledge-guard.yml` | Knowledge base guards (pointers, terms, contracts, regression) |
| `.github/pull_request_template.md` | PR template with KB impact checklist |
| `wrangler.jsonc` | Cloudflare Workers config |
| `Cargo.toml` | Rust CLI project config |
| `src/modules/*.ts` | Deep module interfaces |

### Useful Commands Reference

```bash
# Development
pnpm dev              # Start dev server
pnpm check            # Type check
pnpm build            # Production build

# Code quality
pnpm oxlint           # Lint
pnpm oxfmt --check    # Check formatting
pnpm oxfmt --write    # Fix formatting

# Content
pnpm post:edit        # Manage posts (Rust CLI)

# Testing
pnpm playwright test  # E2E tests

# Deploy (local preview)
pnpm preview          # Wrangler dev

# Sub-agent ops
pnpm exec tsx .agents/scripts/task-claim.ts <id> --assignee <role>
pnpm exec tsx .agents/scripts/run-gate.ts <role>
pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1

# Knowledge Base Guards
pnpm exec tsx .agents/scripts/scan-pointers.ts [--fix] [--report]
pnpm exec tsx .agents/scripts/check-terms.ts [--report]
pnpm exec tsx .agents/scripts/sync-contracts.ts [--report]
```