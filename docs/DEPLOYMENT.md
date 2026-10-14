# 部署指南 (Deployment Guide)

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

本文是部署的**权威来源**。部署策略决策见 [`docs/adr/0003-deployment-strategy.md`](adr/0003-deployment-strategy.md)。

---

## 1. 架构总览

本仓库包含两个**独立部署**的子系统：

| 子系统                   | 说明                                           | 部署目标                                      |
| ------------------------ | ---------------------------------------------- | --------------------------------------------- |
| **Astro 7 个人博客**     | SSG + MDX + Content Collections + Pagefind     | Codeberg Pages / GitHub Pages / IPFS (Pinata) |
| **tgcloud Telegram Bot** | Telegram Mini App，运行于 V8 isolates 无服务器 | tgcloud                                       |

一次 push 到 `main` 触发 `deploy.yml` 多端同步部署：**构建一次、部署多端**，任一 Job 失败即报警。

---

## 2. 部署目标与当前状态

### 2.1 目标清单

| 目标               | URL                            | 部署方式                                             | Job（⏸）   |
| ------------------ | ------------------------------ | ---------------------------------------------------- | ---------- |
| **Codeberg Pages** | `https://lihua.codeberg.page`  | SSH 强制推送 `dist/client` 到 Pages 仓库             | `codeberg` |
| **GitHub Pages**   | `https://real-LiHua.github.io` | `withastro/action` 构建 → `actions/deploy-pages`     | `github`   |
| **IPFS (Pinata)**  | `ipfs://<CID>` / Pinata 网关   | `ipfs add` 生成 CID → Pinata pin（`if: false` 禁用） | `ipfs`     |
| **tgcloud**        | Telegram Mini App              | `pnpm deploy`（`tgcloud push`）+ `tgcloud migrate`   | `tgcloud`  |

### 2.2 目标状态

| 目标                   | 状态          | 备注                                                 |
| ---------------------- | ------------- | ---------------------------------------------------- |
| **tgcloud**            | ✅ 主部署路径 | 当前首选；承载 Bot + Mini App + Telegram Auth        |
| **Codeberg Pages**     | ✅ 活跃       | Git 原生、欧洲节点                                   |
| **GitHub Pages**       | ✅ 活跃       | 生态完善、全球 CDN                                   |
| **IPFS (Pinata)**      | ⏸ 禁用        | 等待 Pinata JWT 配置与成本评估后启用                 |
| **Cloudflare Workers** | ❌ **已退役** | 迁移前目标；`wrangler.jsonc` / `CLOUDFLARE_*` 已废弃 |

> **Cloudflare 与 tgcloud 的冲突澄清**：本项目部署已从 **Cloudflare Workers 迁移至 tgcloud**。
> Cloudflare **不再是当前部署目标**。`wrangler.jsonc` ⏸、`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`
> 均属历史遗留，不得出现在新的部署配置中。旧文档中仍列 Cloudflare 的段落视为过期内容，
> 见文末[过期文档说明](#10-过期文档说明-stale-documentation)。

---

## 3. 构建产物

`pnpm build`（`astro build`

- BuildPipeline）产出：

```text
dist/
├── client/          # 静态资源（部署到 Pages / IPFS / tgcloud）
│   ├── _astro/
│   ├── pagefind/    # Pagefind 搜索索引
│   ├── posts/
│   ├── tags/
│   └── index.html
└── server/          # Node standalone 服务端产物（tgcloud 运行时）
    └── entry.mjs
```

| 目标       | 使用产物                             |
| ---------- | ------------------------------------ |
| Pages/IPFS | `dist/client/`（移除 `dist/server`） |
| tgcloud    | `dist/client` + `dist/server`        |

构建管线（Pagefind / lychee / vnu / Mermaid / Watermark）由 `buildPipelineIntegration` 在 `astro:build:done` 挂载（`src/integrations/build-pipeline.ts`）。

---

## 4. CI 工作流 `deploy.yml` **触发**：push 到 `main`。

**路径排除**（不触发构建）：`.agents/**`、`*.md`、`LICENSE.txt`、`src/post-edit/**` 、`Cargo.toml`。

**4 个并行 Job**：

| Job        | 目标           | 关键步骤                                                        |
| ---------- | -------------- | --------------------------------------------------------------- |
| `codeberg` | Codeberg Pages | checkout → pnpm/Node 24 → lychee → build → SSH 推 `dist/client` |
| `github`   | GitHub Pages   | checkout → pnpm/Node 24 → `withastro/action` → `deploy-pages`   |
| `ipfs`     | IPFS (Pinata)  | checkout → build → `ipfs add` → Pinata pin（`if: false`）       |
| `tgcloud`  | tgcloud        | 独立 pipeline：`pnpm deploy` + `pnpm exec tgcloud migrate`      |

**共享步骤**：`actions/checkout`（`fetch-depth: 0`）→ `pnpm/action-setup` → Node 24 → 安装 lychee → `pnpm build`。

**内嵌质量门禁（构建后自动跑）**：

- Pagefind 索引生成（`dist/client/pagefind/`）
- `lychee dist/client` 链接检查（非 0 退出码阻断）
- `vnu --skip-non-html --filterfile message-filters.txt dist/client` ⏸（已知误报过滤，非阻断）

---

## 5. 各目标部署步骤

### 5.1 Codeberg Pages（SSH 推送）

1. `pnpm build`，`SITE_URL: https://lihua.codeberg.page`
2. 删除 `dist/server`（仅静态）
3. 写入 `CODEBERG_PAGES`（SSH 私钥），known_hosts 预置 `codeberg.org`
4. 在 `dist/client` 内 bare clone + 强制推送：

```bash
git clone --bare ssh://git@codeberg.org/lihua/pages .git
git config unset core.bare
git add .
git commit -m "Update" || true
git push -f origin main
```

### 5.2 GitHub Pages（`withastro/action`

- `deploy-pages`）

```yaml
- uses: withastro/action@v6.1.1
  env:
    SITE_URL: "https://real-LiHua.github.io"
  with:
    out-dir: "dist/client"
- uses: actions/deploy-pages@v5
```

- 权限：`contents: read`、`pages: write`、`id-token: write`（OIDC）
- 环境：`github-pages`（支持保护规则）
- 凭证：自动 `GITHUB_TOKEN`

### 5.3 IPFS (Pinata) ⏸ 禁用

1. `pnpm build`，删除 `dist/server`
2. 安装 Kubo（IPFS CLI）→ `ipfs init`
3. 生成 pin 名：`<repo-name>-<commitSha>`
4. `ipfs add --cid-version 1 --chunker size-1048576 -Q -r .` → 得到 CID
5. 添加 Pinata remote service 并 pin：`ipfs pin remote add --service=pinata --background --name="..." <CID>`

> 当前 Job 以 `if: false` 禁用；启用条件见 [`docs/adr/0003-deployment-strategy.md`](adr/0003-deployment-strategy.md#后续工作)。

### 5.4 tgcloud（`pnpm deploy`

- `tgcloud migrate`）

tgcloud 为**当前主部署路径**，独立于静态站点 pipeline：

```bash
pnpm deploy                   # 等同 tgcloud push：部署代码
pnpm exec tgcloud migrate     # 应用数据库 schema 变更
pnpm exec tgcloud webhook sync   # 同步 bot webhook
pnpm status                   # 本地 vs 云端状态
```

- 配置：`tgcloud.jsonc`

- 数据库 schema：`schema.js`

- SDK 用法见 [`docs/tgcloud-sdk.md`](tgcloud-sdk.md)

---

## 6. 环境变量

| 变量                 | 用途                                                | 存储位置                 | 目标     |
| -------------------- | --------------------------------------------------- | ------------------------ | -------- |
| `SITE_URL`           | 覆盖 `astro.config.ts` 的 `site`（sitemap/RSS/OGP） | GitHub Secrets / Job env | 静态目标 |
| `CODEBERG_PAGES`     | Codeberg 部署 SSH 私钥                              | GitHub Secrets           | Codeberg |
| `PINATA_JWT_TOKEN`   | Pinata API JWT                                      | GitHub Secrets           | IPFS     |
| `TG_API_TOKEN`       | tgcloud API token                                   | GitHub Secrets           | tgcloud  |
| `TELEGRAM_BOT_TOKEN` | Bot API 调用                                        | tgcloud Secret           | tgcloud  |
| `JWT_SECRET`         | Telegram Auth JWT 签名密钥                          | tgcloud Secret           | tgcloud  |
| ~~`CLOUDFLARE_*`~~   | ❌ 已退役（Cloudflare 迁移前的遗留）                | —                        | —        |

> 引号规范：`env:` 值与 `run:` 中的变量引用均需双引号包裹，详见 [`docs/SECURITY_WHITEPAPER.md`](SECURITY_WHITEPAPER.md#10-命令参数引号规范)。
> `astro.config.ts` 当前硬编码 `site: "https://real-lihua.github.io"`；`SITE_URL` 覆盖机制属原 CI 设计 ⏸。

---

## 7. 手动 / 本地部署与验证

```bash
# 本地构建
pnpm build                    # astro build + BuildPipeline

# 静态产物预览
npx serve dist/client

# tgcloud 本地预览（构建 + tgcloud dev）
pnpm preview                  # astro build && pnpm exec tgcloud dev

# tgcloud 手动部署
pnpm deploy
pnpm exec tgcloud migrate
pnpm exec tgcloud webhook sync
pnpm status
```

### 部署后验证清单

- [ ] 各目标 URL 可访问且内容一致（SHA-256 对比关键页面）
- [ ] `dist/client/pagefind/` 索引存在，站内搜索可用
- [ ] `lychee` 0 死链、`vnu` 0 Error（filterfile 过滤后）
- [ ] Telegram Bot `/start`、Mini App 认证流程可用
- [ ] Bot Token 未出现在任何构建产物中
- [ ] tgcloud 云端状态与本地一致（`pnpm status`）

---

## 8. 回滚程序

| 目标      | 回滚方式                                                                      |
| --------- | ----------------------------------------------------------------------------- |
| tgcloud   | `pnpm exec tgcloud rollback`（[响应流程](SECURITY_WHITEPAPER.md#7-事件响应)） |
| Pages     | `git revert <sha>` 并重新触发部署 ⏸，或重新运行上次成功的工作流               |
| IPFS      | CID 不可变；将网关/DNS 指回旧 CID 即可                                        |
| 构建/代码 | `git revert` + `pnpm check && pnpm build` 本地验证后重推                      |

回滚后必须：撤销疑似受损 Secret（见密钥轮换）→ 重新部署 → 复盘并记录 ADR。

---

## 9. 密钥轮换

完整密钥管理策略（存储、周期、撤销流程）见
[`docs/SECURITY_WHITEPAPER.md` 附录 C](SECURITY_WHITEPAPER.md#c-密钥管理策略)。
运维节奏见 [`docs/OPERATIONS.md`](OPERATIONS.md#4-密钥轮换节奏)。

---

## 10. 过期文档说明 (Stale Documentation)

以下文档片段曾**早于 tgcloud 迁移**、与当前部署目标不一致。**2026-10-09 已完成清理**，保留记录以备回溯：

| 文件                                          | 原过期内容                                                      | 处理结果                                        |
| --------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| `.agents/knowledge/deployment-procedures.md`  | 将 **Cloudflare Workers** 列为目标 #1，含 `wrangler.jsonc`      | ✅ 已重写为 tgcloud 优先                        |
| `docs/SECURITY_WHITEPAPER.md` §5 部署示例     | YAML 示例含 `cloudflare:` job 与 `CLOUDFLARE_*` secrets         | ✅ 已改为 `tgcloud:` job                        |
| `docs/adr/0003-deployment-strategy.md` 风险段 | `wrangler.jsonc compatibility_date` 维护项                      | ✅ 已替换为 tgcloud 部署项                      |
| `.agents/onboarding/04-tools-access.md` §4    | Secrets 表仍列 `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | ✅ 已改用 `TG_API_TOKEN` / `TELEGRAM_BOT_TOKEN` |
| `.opencode/agents/build-deploy-engineer.md`   | `wrangler.jsonc`、`cloudflare-workers` 技能项                   | ✅ 已改为 `tgcloud.jsonc` / `tgcloud-deploy`    |

**当前权威目标 = Codeberg Pages / GitHub Pages / IPFS (Pinata) / tgcloud**（与 `CONTEXT.md` 的 `DeployTarget` 一致）。

---

## 相关文档

- [`docs/adr/0003-deployment-strategy.md`](adr/0003-deployment-strategy.md) — 部署策略决策
- [`docs/adr/0002-draft-isolation-submodule.md`](adr/0002-draft-isolation-submodule.md) — 草稿私有子模块
- [`docs/SECURITY_WHITEPAPER.md`](SECURITY_WHITEPAPER.md) — 构建/部署管线安全、密钥轮换
- [`docs/OPERATIONS.md`](OPERATIONS.md) — 运维 runbook
- [`docs/TESTING.md`](TESTING.md) — 部署前质量门禁
- [`docs/GETTING_STARTED.md`](GETTING_STARTED.md) — 本地环境
- [`docs/tgcloud-sdk.md`](tgcloud-sdk.md) — tgcloud SDK 与命令
