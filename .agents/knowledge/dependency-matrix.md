# Dependency Matrix — Key Dependencies & Update Policies

**Date:** 2026-09-02  
**Tags:** dependencies, package-management, update-policy, security, maintenance, pnpm

---

## Overview

This document catalogs the project's **critical dependencies**, their update policies, and maintenance procedures. The project uses **pnpm 11** with **Node 24** and enforces strict version pinning via `pnpm-lock.yaml`.

---

## Dependency Categories

### 1. Core Framework (Astro 7 Ecosystem)

| Package              | Current  | Policy                                | Notes                                                         |
| -------------------- | -------- | ------------------------------------- | ------------------------------------------------------------- |
| `astro`              | ^7.2.10  | **Major: Manual** / Minor/Patch: Auto | Core framework; major upgrades require migration guide review |
| `@astrojs/check`     | ^0.9.10  | Follows Astro                         | Type-checking integration                                     |
| `@astrojs/mdx`       | ^7.0.8   | Follows Astro                         | MDX support                                                   |
| `@astrojs/node`      | ^11.1.5  | Follows Astro                         | Node adapter for Cloudflare Workers                           |
| `@astrojs/rss`       | ^4.0.19  | Minor/Patch: Auto                     | RSS feed generation                                           |
| `@astrojs/sitemap`   | ^3.7.4   | Minor/Patch: Auto                     | Sitemap generation                                            |
| `@astrojs/ts-plugin` | ^1.10.11 | Follows Astro                         | VS Code TS plugin                                             |

### 2. Content Pipeline (MDX / Markdown / Mermaid)

| Package                        | Current  | Policy            | Notes                                                         |
| ------------------------------ | -------- | ----------------- | ------------------------------------------------------------- |
| `@astrojs/markdown-satteri`    | ^0.3.8   | Minor/Patch: Auto | Satteri markdown processor                                    |
| `satteri`                      | ^0.10.5  | Minor/Patch: Auto | Core markdown processor                                       |
| `@xingwangzhe/satteri-mermaid` | ^0.7.7   | **Pin Minor**     | Mermaid integration; breaking changes possible                |
| `mermaid`                      | ^11.17.2 | **Pin Minor**     | Diagram rendering; SVG output issues (see mermaid-svg-fix.md) |
| `@mermaid-js/mermaid-cli`      | ^11.16.0 | Follows mermaid   | CLI for build-time rendering                                  |
| `mermaid-wasm-renderer`        | ^0.3.1   | **Pin Patch**     | WASM renderer; known SVG bug; consider fork/fix               |
| `mdast-util-toc`               | ^7.1.0   | Minor/Patch: Auto | Table of contents generation                                  |

### 3. Styling (Tailwind CSS 4 + daisyUI 5)

| Package                   | Current | Policy             | Notes                                                       |
| ------------------------- | ------- | ------------------ | ----------------------------------------------------------- |
| `tailwindcss`             | ^4.3.3  | **Major: Manual**  | CSS-first config (no tailwind.config.js); v4 is major shift |
| `@tailwindcss/vite`       | ^4.3.3  | Follows Tailwind   | Vite plugin for Tailwind 4                                  |
| `@tailwindcss/typography` | ^0.5.20 | Minor/Patch: Auto  | Prose styling                                               |
| `daisyui`                 | ^5.7.24 | **Minor: Caution** | Component library; class name changes between minors        |
| `animate.css`             | ^4.1.1  | Minor/Patch: Auto  | Animations                                                  |

### 4. Build & Validation Tools

| Package                 | Current  | Policy            | Notes                                                           |
| ----------------------- | -------- | ----------------- | --------------------------------------------------------------- |
| `pagefind`              | ^1.5.2   | Minor/Patch: Auto | Search indexing; CLI stable                                     |
| `vnu-jar`               | ^26.8.30 | **Pin Minor**     | HTML validator; Java-based; version = validator.nu release date |
| `lychee`                | (binary) | **Manual**        | Link checker; installed in CI via curl; update via release tag  |
| `astro-minify-html-swc` | ^0.1.12  | Minor/Patch: Auto | HTML minification                                               |
| `astro-favicons`        | ^3.1.6   | Minor/Patch: Auto | Favicon generation                                              |

### 5. Code Quality (Lint/Format/Type)

| Package        | Current | Policy            | Notes                                     |
| -------------- | ------- | ----------------- | ----------------------------------------- |
| `oxlint`       | ^1.80.0 | Minor/Patch: Auto | Linter; fast Rust-based                   |
| `oxfmt`        | ^0.57.0 | Minor/Patch: Auto | Formatter; JSDoc + Tailwind class sorting |
| `typescript`   | ^6.0.3  | **Major: Manual** | TS 6 is beta; pin until stable            |
| `@types/hast`  | ^3.0.5  | Follows hast      | Type definitions                          |
| `@types/mdast` | ^4.0.4  | Follows mdast     | Type definitions                          |

### 6. Deployment & Runtime

| Package                   | Current  | Policy            | Notes                  |
| ------------------------- | -------- | ----------------- | ---------------------- |
| `wrangler`                | ^4.127.1 | Minor/Patch: Auto | Cloudflare Workers CLI |
| `@cloudflare/vite-plugin` | ^1.54.2  | Follows wrangler  | Vite plugin for CF     |
| `pinata`                  | ^2.5.6   | Minor/Patch: Auto | IPFS pinning SDK       |
| `helia`                   | ^6.1.4   | Minor/Patch: Auto | IPFS implementation    |
| `@helia/strings`          | ^5.1.1   | Follows helia     | String utilities       |

### 7. CLI Tool (Rust)

| Package                | Current | Policy            | Notes                                                 |
| ---------------------- | ------- | ----------------- | ----------------------------------------------------- |
| `post-edit`            | (local) | **Manual**        | Cargo workspace; `cargo build --release -p post-edit` |
| `grammy`               | ^1.46.0 | Minor/Patch: Auto | Telegram bot framework (for post-edit bot)            |
| `@grammyjs/auto-retry` | ^2.0.2  | Follows grammy    | Retry middleware                                      |

### 8. Testing

| Package           | Current | Policy            | Notes                    |
| ----------------- | ------- | ----------------- | ------------------------ |
| `playwright`      | ^1.62.1 | Minor/Patch: Auto | E2E testing              |
| `@playwright/mcp` | ^0.0.77 | **Pin Patch**     | MCP server; experimental |

---

## Update Policies

### General Rules

| Policy Level | Description                                              | Applies To                            |
| ------------ | -------------------------------------------------------- | ------------------------------------- |
| **Auto**     | Dependabot/pnpm update --interactive safe; run `pnpm up` | Patch/minor for stable libs           |
| **Caution**  | Review changelog; test build + visual regression         | daisyUI, mermaid ecosystem            |
| **Manual**   | Read migration guide; allocate time for breaking changes | Astro major, Tailwind major, TS major |
| **Pin**      | Lock to specific version; update only with PR            | mermaid-wasm-renderer, vnu-jar        |

### Update Cadence

| Frequency       | Action                                                 |
| --------------- | ------------------------------------------------------ |
| **Weekly**      | `pnpm audit` → review advisories                       |
| **Bi-weekly**   | `pnpm update --interactive` → apply safe updates       |
| **Monthly**     | Review pinned deps for upstream fixes                  |
| **Per Release** | Update Astro ecosystem together (Astro + integrations) |

---

## Security & Auditing

```bash
# Audit for vulnerabilities
pnpm audit

# Audit with registry override (faster)
pnpm audit --registry https://registry.npmjs.org/

# Fix automatically (patch only)
pnpm audit --fix
```

**CI Integration:** `pnpm audit` runs in all 4 deployment jobs via `.github/workflows/deploy.yml`

---

## Dependency Health Checks

| Check                 | Command                          | Frequency        |
| --------------------- | -------------------------------- | ---------------- |
| Outdated packages     | `pnpm outdated`                  | Weekly           |
| Audit vulnerabilities | `pnpm audit`                     | Per PR + Weekly  |
| Lockfile integrity    | `pnpm install --frozen-lockfile` | CI (every build) |
| Bundle size impact    | `pnpm build` + analyze dist      | Per major update |

---

## Special Considerations

### mermaid-wasm-renderer (v0.3.1)

- **Known Issue:** Generates invalid SVG with empty `stroke-` attributes
- **Workaround:** vnu filterfile regex `.*stroke-.*` (see mermaid-svg-fix.md)
- **Action:** Monitor for v0.3.2+; consider forking/patching if unmaintained
- **Alternative:** Evaluate `@mermaid-js/mermaid-cli` direct SVG output

### Tailwind CSS 4

- **Config:** CSS-first (`@import "tailwindcss"` in `global.css`)
- **No `tailwind.config.js`** — migration from v3 complete
- **Breaking Changes:** Watch for `@theme` syntax changes in minors

### TypeScript 6 (Beta)

- **Current:** ^6.0.3 (beta)
- **Risk:** Breaking changes possible before stable
- **Policy:** Pin to latest beta; migrate to stable when released

### vnu-jar Versioning

- **Version = Date:** `26.8.30` = 2026-08-30 (validator.nu release)
- **Update:** Monthly or when HTML spec changes
- **Filterfile:** Must be reviewed after vnu updates (new error codes)

---

## Related Files

| File                           | Purpose                             |
| ------------------------------ | ----------------------------------- |
| `package.json`                 | Dependencies, scripts, lint-staged  |
| `pnpm-lock.yaml`               | Locked versions (committed)         |
| `pnpm-workspace.yaml`          | Workspace config (Rust + Node)      |
| `.github/workflows/deploy.yml` | CI runs audit + build               |
| `oxfmt.config.ts`              | Formatter config (Tailwind sorting) |
| `.oxlintrc.json`               | Linter config (all error)           |

---

## Prevention Rules / Checklist

- [ ] **Lockfile committed** — `pnpm-lock.yaml` always in git
- [ ] **No `*` versions** — All deps use `^` or `~` or exact
- [ ] **Audit in CI** — `pnpm audit` runs on every deploy
- [ ] **Review changelogs** — Before updating daisyUI, mermaid, Astro major
- [ ] **Test build locally** — `pnpm build` must pass before PR
- [ ] **Visual regression** — Check daisyUI components after update
- [ ] **Mermaid SVG test** — Verify vnu passes after mermaid updates
- [ ] **Rust toolchain** — `cargo build --release -p post-edit` after Rust dep updates
- [ ] **Document pins** — Reason for each pinned dependency in this file
