# ADR 003: 部署策略 - 三端同步 + Cloudflare 优先边缘能力

## Status

Accepted

## Context

博客需部署到三个平台：

- **Cloudflare Workers** - 边缘计算、D1/KV/DO、零冷启动
- **Codeberg Pages** - 开源友好、欧洲节点、Git 原生
- **GitHub Pages** - 生态完善、Actions 原生、全球 CDN

要求：单次 push 触发三端同步部署，任一失败即报警。

## Decision

1. **构建产物**：`pnpm build` → `dist/client/` (Astro node standalone adapter)
2. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`)：
   - Trigger: push to `main`，排除 `.agents/**`、`*.md`、`LICENSE.txt`、`src/post-edit/**`、`Cargo.toml`
   - 4 个并行 Job：
     - **Cloudflare Workers**: `pnpm build` → `wrangler deploy`
     - **Codeberg Pages**: `pnpm build` → SSH 推 `dist/client` 到 `git@codeberg.org:lihua/pages`
     - **GitHub Pages**: `withastro/action` 构建 → `actions/deploy-pages` 部署 `dist/client`
     - **IPFS**: `pnpm build` → `ipfs` pin 到 Pinata（当前 `if: false` 禁用）

3. **环境变量**：
   - `SITE_URL` 覆盖 `astro.config.ts` 的 `site` 配置
   - `CLOUDFLARE_API_TOKEN`、`CODEBERG_SSH_KEY` 等密钥存 GitHub Secrets

4. **Cloudflare Workers 优化**：
   - `adapter: node({ mode: "standalone" })`
   - `wrangler.jsonc` 含 `compatibility_date`（pre-commit 每日更新为昨天）
   - `security: { checkOrigin: false }` 关闭 CSRF（API 路由自行验证 User-Agent）

5. **质量门禁**（构建后自动运行）：
   - Pagefind 索引生成 + symlink 到 `public/pagefind`
   - `lychee dist/client` 链接检查
   - `vnu` HTML 验证（带 filterfile 过滤已知误报）

## Consequences

### 正面

- 多平台冗余，单点故障不影响访问
- Cloudflare 边缘能力可扩展动态功能（API、鉴权、A/B 测试）
- 构建一次部署三端，CI 时间可控
- 质量门禁内嵌，防止损坏部署

### 负面/风险

- 三端同步复杂度高，需维护 3 套部署配置
- Codeberg SSH 密钥轮换需人工操作
- GitHub Pages 免费额度有限制
- IPFS 暂时禁用，未来可能启用

### 后续工作

- 部署状态聚合仪表盘
- 渐进式迁移动态功能到 Cloudflare Workers
- 探索 Cloudflare D1 存储评论/访问统计

## References

- `.github/workflows/deploy.yml`
- `astro.config.ts`
- `wrangler.jsonc`
- `src/integrations/build-hooks.ts`
- `src/pages/meow.ts` (API 路由示例)
