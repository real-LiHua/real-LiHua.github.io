# Architecture Decision Record: 部署策略 - 多平台同步部署

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

## Status

Accepted

## Last Updated

2026-09-02

## Context

博客需部署到四个平台：

- **Codeberg Pages** - 开源友好、欧洲节点、Git 原生
- **GitHub Pages** - 生态完善、Actions 原生、全球 CDN
- **IPFS (Pinata)** - 去中心化、内容寻址、抗审查
- **tgcloud** - Telegram Mini App 托管平台

要求：单次 push 触发多端同步部署，任一失败即报警。构建一次，部署多端。

## Decision

### 1. 构建产物

`pnpm build` → `dist/client/` (Astro node standalone adapter 产物)

### 2. GitHub Actions Workflow (`.github/workflows/deploy.yml`)

**Trigger**: push to `main`，排除 `.agents/**`、`*.md`、`LICENSE.txt`、`src/post-edit/**`、`Cargo.toml` **4 个并行 Job**：

| Job        | 目标平台       | 部署方式                                                   |
| ---------- | -------------- | ---------------------------------------------------------- |
| `codeberg` | Codeberg Pages | SSH 推 `dist/client` 到 `git@codeberg.org:lihua/pages`     |
| `github`   | GitHub Pages   | `withastro/action` 构建 → `actions/deploy-pages` 部署      |
| `ipfs`     | IPFS (Pinata)  | `ipfs add` → Pinata pin (当前 `if: false` 禁用)            |
| `tgcloud`  | tgcloud        | 独立 pipeline：`pnpm deploy` + `pnpm exec tgcloud migrate` |

### 3. 环境变量

| 变量                 | 用途                                  | 存储位置                      |
| -------------------- | ------------------------------------- | ----------------------------- |
| `SITE_URL`           | 覆盖 `astro.config.ts` 的 `site` 配置 | GitHub Secrets / 各 Job env   |
| `TELEGRAM_BOT_TOKEN` | Bot API 调用                          | GitHub Secrets                |
| `CODEBERG_PAGES`     | SSH 私钥                              | GitHub Secrets                |
| `PINATA_JWT_TOKEN`   | Pinata API 认证                       | GitHub Secrets                |
| `TG_API_TOKEN`       | tgcloud API token                     | GitHub Secrets (tgcloud 专用) |

### 4. 质量门禁 (构建后自动运行)

- Pagefind 索引生成 + symlink 到 `public/pagefind` ⏸
- `lychee dist/client` 链接检查 (非 0 退出码阻断)
- `vnu` HTML 验证 (带 filterfile 过滤已知误报)

### 5. tgcloud 独立部署

```bash
# 代码部署
pnpm deploy           # 等同于 tgcloud push
# 数据库迁移
pnpm exec tgcloud migrate
# 本地运行
pnpm run <module>     # tgcloud run
# Webhook 管理
pnpm exec tgcloud webhook
```

---

## Consequences

### 正面

- 多平台冗余，单点故障不影响访问
- 构建一次部署多端，CI 时间可控 (~5-8 min)
- 质量门禁内嵌，防止损坏部署
- tgcloud 独立演进，不阻塞静态站点部署

### 负面/风险

- 多平台同步复杂度高，需维护多套部署配置
- Codeberg SSH 密钥轮换需人工操作 (90 天周期)
- GitHub Pages 免费额度有限制
- IPFS 暂时禁用，等待 Pinata 配置与成本评估
- 已退役的 Cloudflare Workers 配置（`wrangler.jsonc`）可能残留在历史文档中，需持续清理 ⏸

### 后续工作

- [ ] 部署状态聚合仪表盘
- [ ] 探索 tgcloud D1/KV 存储评论/访问统计
- [ ] 完善 tgcloud 部署回滚与部署后健康检查
- [ ] 启用 IPFS 部署 (Pinata JWT 配置完成后)

---

## References

- `.github/workflows/deploy.yml`

- `.github/workflows/knowledge-guard.yml`

- `astro.config.ts` (adapter 配置)
- `tgcloud.jsonc` (tgcloud 项目配置)
- `src/integrations/build-hooks.ts` ⏸ (构建管线集成)
- `CONTEXT.md` (术语: DeployTarget)
