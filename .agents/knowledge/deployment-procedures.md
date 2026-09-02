# Deployment Procedures — 4-Target Deployment Process

**Date:** 2026-09-02  
**Tags:** deployment, ci-cd, cloudflare-workers, codeberg-pages, github-pages, ipfs, pinata, github-actions

---

## Overview

The project deploys to **four platforms in parallel** via a single GitHub Actions workflow (`.github/workflows/deploy.yml`) triggered on push to `main`. Each job is independent and runs the full build pipeline.

| Target                 | URL                            | Method                  | Job Name     |
| ---------------------- | ------------------------------ | ----------------------- | ------------ |
| **Cloudflare Workers** | `https://<worker>.pages.dev`   | Wrangler deploy         | `cloudflare` |
| **Codeberg Pages**     | `https://lihua.codeberg.page`  | SSH bare repo push      | `codeberg`   |
| **GitHub Pages**       | `https://real-LiHua.github.io` | `actions/deploy-pages`  | `github`     |
| **IPFS (Pinata)**      | Via Pinata gateway             | `ipfs add` + Pinata pin | `ipfs`       |

---

## Workflow Architecture

```yaml
jobs:
  cloudflare: # Runs on ubuntu-latest
  codeberg: # Runs on ubuntu-latest
  github: # Runs on ubuntu-latest, uses github-pages environment
  ipfs: # Runs on ubuntu-latest
```

All jobs:

- Checkout with `fetch-depth: 0`
- Setup pnpm + Node 24
- Install `lychee` (link checker)
- Run `pnpm build` (includes type-check, Pagefind, vnu)
- Deploy to respective platform

---

## Job Details

### 1. Cloudflare Workers (`cloudflare`)

**Purpose:** Edge deployment via Cloudflare Workers

**Steps:**

1. Checkout + pnpm setup
2. Install lychee
3. Build with `SITE_URL` from `CF_PAGES_URL` var or fallback
4. Deploy via `cloudflare/wrangler-action@v4`

**Required Secrets:**

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

**Config:** `wrangler.jsonc` (compatibility_date, entry point)

```yaml
- uses: cloudflare/wrangler-action@v4
  with:
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
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
6. Clone bare repo, commit, force-push to `main`

**Required Secrets:**

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
3. Use `withastro/action@v6.1.1` for build + deploy
4. Deploy via `actions/deploy-pages@v5`

**Required:**

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

### 4. IPFS via Pinata (`ipfs`)

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

---

## Build Pipeline (Shared by All Jobs)

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

```
dist/
├── client/          # Static assets (deployed to Pages targets)
│   ├── _astro/
│   ├── pagefind/
│   ├── posts/
│   ├── tags/
│   └── index.html
├── server/          # Server bundle (Cloudflare Workers only)
│   └── entry.mjs
└── _worker.js       # Worker entry (if applicable)
```

---

## Environment Variables

| Variable                | Description                    | Required For      |
| ----------------------- | ------------------------------ | ----------------- |
| `SITE_URL`              | Base URL for sitemap, RSS, OGP | All builds        |
| `CF_PAGES_URL`          | Fallback for Cloudflare        | Cloudflare job    |
| `CLOUDFLARE_ACCOUNT_ID` | CF account ID                  | Cloudflare deploy |
| `CLOUDFLARE_API_TOKEN`  | CF API token                   | Cloudflare deploy |
| `CODEBERG_PAGES`        | SSH private key                | Codeberg deploy   |
| `PINATA_JWT_TOKEN`      | Pinata API JWT                 | IPFS deploy       |

---

## Local Preview Commands

```bash
# Cloudflare Workers simulation
pnpm preview
# → astro build && wrangler dev

# Static preview (any static server)
npx serve dist/client
```

---

## Related Files

| File                              | Purpose                              |
| --------------------------------- | ------------------------------------ |
| `.github/workflows/deploy.yml`    | Main CI/CD workflow                  |
| `wrangler.jsonc`                  | Cloudflare Workers config            |
| `astro.config.ts`                 | Astro config (adapter, integrations) |
| `src/integrations/build-hooks.ts` | Pagefind, lychee, vnu hooks          |
| `package.json`                    | Build scripts, dependencies          |
| `pagefind.yaml`                   | Pagefind config                      |

---

## Prevention Rules / Checklist

- [ ] **All 4 jobs must pass** — Merge blocked if any deployment fails
- [ ] **Secrets rotation** — Rotate SSH keys, API tokens periodically
- [ ] **Build reproducibility** — Ensure `pnpm build` passes locally before pushing
- [ ] **Monitor deploy URLs** — Verify all 4 targets serve content correctly post-deploy
- [ ] **IPFS pin verification** — Check Pinata dashboard for successful pins
- [ ] **wrangler.jsonc compatibility_date** — Update weekly (automate via cron)
- [ ] **lychee link check** — Must pass (0 broken links) in all jobs
- [ ] **vnu validation** — Must pass (0 errors after filterfile) in all jobs
- [ ] **SITE_URL correctness** — Each job uses correct canonical URL for its target
