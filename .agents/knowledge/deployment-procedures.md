# Deployment Procedures — Multi-Target Deployment Process

**Date:** 2026-09-02
**Last Updated:** 2026-10

**Tags:** deployment, ci-cd, tgcloud, codeberg-pages, github-pages, ipfs, pinata, github-actions

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

---

## Overview

项目部署到 **四个目标**，其中静态站点由 `.github/workflows/deploy.yml`在 push 到 `main` 时并行构建，tgcloud Telegram Bot 走独立部署通道。

| Target             | URL                            | Method                        | Job Name   |
| ------------------ | ------------------------------ | ----------------------------- | ---------- |
| **tgcloud**        | Telegram Mini App              | `pnpm deploy`（tgcloud push） | `tgcloud`  |
| **Codeberg Pages** | `https://lihua.codeberg.page`  | SSH bare repo push            | `codeberg` |
| **GitHub Pages**   | `https://real-LiHua.github.io` | `actions/deploy-pages`        | `github`   |
| **IPFS (Pinata)**  | Via Pinata gateway             | `ipfs add` + Pinata pin       | `ipfs`     |

> **历史说明**：本项目曾部署到 **Cloudflare Workers**（`wrangler.jsonc`

- `cloudflare/wrangler-action`）。自 `ci: migrate from Cloudflare Workers to tgcloud` 起，Cloudflare Workers 已退役，`wrangler.jsonc`、`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CF_PAGES_URL` 均不再使用。详见 `docs/adr/0012-tgcloud-migration.md`。

---

## Workflow Architecture

```yaml
jobs:
  tgcloud: # Runs on ubuntu-latest
  codeberg: # Runs on ubuntu-latest
  github: # Runs on ubuntu-latest, uses github-pages environment
  ipfs: # Runs on ubuntu-latest, currently disabled (if: false)
```

All jobs:

- Checkout with `fetch-depth: 0`
- Setup pnpm + Node 24
- Install `lychee` (link checker)
- Run `pnpm build` (includes type-check, Pagefind, vnu)
- Deploy to respective platform

---

## Job Details

### 1. tgcloud (`tgcloud`)

**Purpose:** Telegram Mini App + Bot 后端托管（V8 isolates）

**Steps:**

1. Checkout + pnpm setup
2. `pnpm build`
3. `pnpm deploy`（等同 `tgcloud push`）
4. `pnpm exec tgcloud migrate`（应用 DB schema）
5. `pnpm exec tgcloud webhook`（同步 Bot webhook）

**Required Secrets:**

- `TG_API_TOKEN`（tgcloud API token）
- `TELEGRAM_BOT_TOKEN`（Bot API 调用）
- `JWT_SECRET`（TelegramAuth JWT 签名）

**Config:** `tgcloud.jsonc`

```bash
# 本地/CI 部署命令
pnpm deploy                    # tgcloud push
pnpm exec tgcloud migrate      # DB schema 迁移
pnpm exec tgcloud webhook      # webhook 校验/同步
pnpm status                    # 本地 vs 云端状态
```

---

### 2. Codeberg Pages (`codeberg`)

**Purpose:** Static hosting on Codeberg Pages via Git push

**Steps:**

1. Checkout + pnpm setup
2. Install lychee
3. Build with `SITE_URL: https://lihua.codeberg.page`
4. Remove `dist/server` (static only)
5. Setup SSH key from `CODEBERG_PAGES` secret
6. Clone bare repo, commit, force-push to `main` **Required Secrets:**

- `CODEBERG_PAGES` (SSH private key)

**Known Hosts:** Pre-configured for `codeberg.org`

```yaml
- name: Push to Codeberg
  working-directory: ./dist/client
  run: |
    git clone --bare ssh://git@codeberg.org/lihua/pages .git
    git config unset core.bare
    git add .
    git commit -m "Update" || true
    git push -f origin main
```

---

### 3. GitHub Pages (`github`)

**Purpose:** Official GitHub Pages deployment via Astro action

**Steps:**

1. Checkout + pnpm setup
2. Install lychee
3. Use `withastro/action` for build + deploy
4. Deploy via `actions/deploy-pages` **Required:**

- `GITHUB_TOKEN` (automatic via `permissions.pages: write`)
- Environment: `github-pages` (for protection rules)

```yaml
- uses: withastro/action@v6.1.1
  env:
    SITE_URL: https://real-LiHua.github.io
  with:
    out-dir: dist/client

- uses: actions/deploy-pages@v5
```

---

### 4. IPFS via Pinata (`ipfs`) — 当前禁用

**Purpose:** Decentralized hosting via IPFS, pinned to Pinata

**Steps:**

1. Checkout + pnpm setup
2. Install lychee
3. Build, remove `dist/server`
4. Install Kubo (IPFS CLI) via action
5. `ipfs init`
6. Generate pin name: `repo-name-commitSha`
7. `ipfs add -r .` → get CID
8. Add Pinata remote service + pin CID

**Required Secrets:**

- `PINATA_JWT_TOKEN`

```yaml
- uses: ipfs/download-ipfs-distribution-action@v1

- name: Pin CID to Pinata
  run: |
    CID=$(ipfs add --cid-version 1 --chunker size-1048576 -Q -r .)
    ipfs pin remote service add pinata "https://api.pinata.cloud/psa" ${{ secrets.PINATA_JWT_TOKEN }}
    ipfs pin remote add --service=pinata --background --name="${pin_name}" $CID
```

> `if: false` 暂时禁用，等待 Pinata 配置与成本评估（见 `docs/adr/0003-deployment-strategy.md`）。

---

## Build Pipeline (Shared by Static Jobs)

```bash
pnpm build
# Runs:
# 1. astro check          # TypeScript + Astro types
# 2. astro build          # SSG → dist/client + dist/server
# 3. Pagefind indexing    # dist/client/pagefind/
# 4. lychee dist/client   # Link checking
# 5. vnu validation       # HTML validation with filterfile
```

**Output Structure:**

```text
dist/
├── client/          # Static assets (deployed to Pages targets)
│   ├── _astro/
│   ├── pagefind/
│   ├── posts/
│   ├── tags/
│   └── index.html
└── server/          # Server bundle (Node standalone adapter → tgcloud)
    └── entry.mjs
```

---

## Environment Variables

| Variable             | Description                    | Required For    |
| -------------------- | ------------------------------ | --------------- |
| `SITE_URL`           | Base URL for sitemap, RSS, OGP | All builds      |
| `TG_API_TOKEN`       | tgcloud API token              | tgcloud deploy  |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API               | tgcloud runtime |
| `JWT_SECRET`         | TelegramAuth JWT 签名          | tgcloud runtime |
| `CODEBERG_PAGES`     | SSH private key                | Codeberg deploy |
| `PINATA_JWT_TOKEN`   | Pinata API JWT                 | IPFS deploy     |

> **Legacy（已退役）**：`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`、`CF_PAGES_URL` — 随 Cloudflare Workers 迁移至 tgcloud 后不再使用。

---

## Local Preview Commands

```bash
# Build + local preview (tgcloud dev)
pnpm preview
# → astro build && pnpm exec tgcloud dev

# Static preview (any static server)
npx serve dist/client
```

---

## Related Files

| File                                 | Purpose                              |
| ------------------------------------ | ------------------------------------ |
| `.github/workflows/deploy.yml`       | Main CI/CD workflow                  |
| `tgcloud.jsonc`                      | tgcloud project config               |
| `astro.config.ts`                    | Astro config (adapter, integrations) |
| `src/integrations/build-hooks.ts` ⏸  | Pagefind, lychee, vnu hooks          |
| `package.json`                       | Build scripts, dependencies          |
| `pagefind.yaml`                      | Pagefind config                      |
| `docs/adr/0012-tgcloud-migration.md` | Cloudflare → tgcloud 迁移决策        |
| `docs/DEPLOYMENT.md`                 | 权威部署指南                         |

---

## Prevention Rules / Checklist

- [ ] **Critical jobs must pass** — Static deploy 与 tgcloud deploy 任一失败即阻断合并
- [ ] **Secrets rotation** — 定期轮换 SSH keys、`TG_API_TOKEN`、`JWT_SECRET`
- [ ] **Build reproducibility** — 确保 `pnpm build` 本地通过后再 push
- [ ] **Monitor deploy URLs** — 校验各目标部署后可访问
- [ ] **IPFS pin verification** — 启用后检查 Pinata dashboard 成功 pin
- [ ] **tgcloud status** — `pnpm status` 确认本地与云端一致
- [ ] **lychee link check** — 0 broken links
- [ ] **vnu validation** — 0 errors（按 filterfile 过滤）
- [ ] **SITE_URL correctness** — 每个 job 使用对应目标的 canonical URL
