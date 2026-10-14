# Architecture Decision Record: tgcloud 迁移 - Telegram Bot 后端从 Cloudflare Workers 迁至 tgcloud

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

## Status

Accepted

## Last Updated

2026-10

## Context

博客系统由两个独立部署的子系统组成（边界见 `docs/adr/0001-functional-architecture.md`）：

1. **Astro 7 静态博客** —— SSG，部署至 Codeberg Pages / GitHub Pages / IPFS (Pinata)
2. **Telegram Bot 后端** —— 提供 Telegram 认证（Deep Link + Login Widget + Mini App `initData` → JWT）与受保护内容路由 `GET /api/posts/[id]/protected` 后端最初运行于 **Cloudflare Workers**（`wrangler` CLI、`wrangler.jsonc` ⏸、`@cloudflare/vite-plugin`），机器人逻辑基于 **grammy** + `@grammyjs/auto-retry`，会话状态存放于 Cloudflare KV（`TG_AUTH_KV` 绑定）⏸。

随着认证能力扩展到三条路径（详见 `docs/TELEGRAM_AUTH_COMPARISON.md`），Workers 方案出现以下摩擦：

| 摩擦点              | 具体表现                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Bot API 需自建封装  | Webhook、发送消息、文件下载、错误重试依赖 grammy 生态，而非平台一等能力                    |
| 数据层不统一        | KV 仅适合键值；群成员、会话、待认证记录需关系型查询，需额外引入 D1 + Drizzle 与迁移流程    |
| Mini App 无专用约定 | `initData` 校验、Endpoint 输入输出、错误模型均需手写                                       |
| 配置面广            | `wrangler.jsonc` ⏸ 需维护 `compatibility_date`、`compatibility_flags`、`assets`、KV 绑定等 |
| 运行时差异          | V8 isolate 默认无 Node 内置模块，需 `nodejs_compat` flag 才能使用部分 Node API             |

最后一次相关提交为 `ci: migrate from Cloudflare Workers to tgcloud`（commit `0819f83`）。该架构级迁移当时未留下 ADR，本记录予以补记，并明确变更范围、回滚方案与文档同步策略。

## Decision

将 Telegram Bot 后端（含 Mini App endpoints 与受保护内容路由）的**运行时与托管**从 **Cloudflare Workers (wrangler)** 迁移至 **tgcloud**（Telegram 无服务器平台，V8 isolates，抽象层次类似 Cloudflare Workers + Drizzle ORM，SDK 见 `docs/tgcloud-sdk.md`）。

### 1. 选择 tgcloud 的理由

| 维度             | Cloudflare Workers               | tgcloud                                                                     |
| ---------------- | -------------------------------- | --------------------------------------------------------------------------- |
| Telegram Bot API | 需 grammy 等第三方框架封装       | `api` 一等接口（`sendMessage`、`setWebhook`、`getFile`…）+ `BotApiError`    |
| 数据库           | KV 键值；关系型需自引 D1/Drizzle | `db` 内置 Drizzle 风格查询构建器 + `sqliteTable` schema + `tgcloud migrate` |
| Mini App         | 无专用约定                       | Endpoint 约定 + `ctx.initData` + `EndpointError`                            |
| 运行时           | Worker + KV（+ 可选 D1）多组件   | 单一 V8 运行时（`db` / `api` / `fetch` / `console`）                        |
| 配置             | `wrangler.jsonc` ⏸ 多绑定        | `tgcloud.jsonc` ⏸ 单文件（entrypoint / endpoints / database / secrets）     |
| Node 兼容        | 需 `nodejs_compat` flag          | 仅 Web 标准 API，无 Node 内置模块（原生 API 优先，见 ADR 0010）             |

核心动机：**单一运行时 + 机器人一等接口 + 内置关系型数据层**，以更少的配置与第三方依赖覆盖认证所需全部能力。

### 2. 变更范围

| 类别        | 迁移前（Cloudflare Workers）                                                            | 迁移后（tgcloud）                                                        | 证据                                                          |
| ----------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 部署 job    | `.github/workflows/deploy.yml` ⏸ 的 `cloudflare` job（`cloudflare/wrangler-action@v4`） | 无 Cloudflare job；机器人由 `pnpm deploy`（`tgcloud push`）独立部署      | commit `0819f83`                                              |
| Worker 配置 | `wrangler.jsonc` ⏸（`compatibility_date`、`nodejs_compat`、`assets`、`observability`）  | `tgcloud.jsonc` ⏸（entrypoint / endpoints / database / secrets）         | commit `0819f83`                                              |
| KV 存储     | `TG_AUTH_KV` KV namespace ⏸                                                             | tgcloud DB（`sessions`、`pendingAuth`、`groupMembers` 等表）⏸ 待确认映射 | `IMPLEMENTATION_PROGRESS.md`                                  |
| 机器人框架  | `grammy`、`@grammyjs/auto-retry`                                                        | tgcloud SDK `api`（Bot API 一等接口）                                    | `package.json` diff                                           |
| 构建插件    | `@cloudflare/vite-plugin`、`wrangler`                                                   | `@tgcloud/cli`（devDependency）                                          | `package.json` diff                                           |
| 本地预览    | `wrangler dev`                                                                          | `pnpm exec tgcloud dev`                                                  | `package.json` scripts                                        |
| Secrets     | `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CF_PAGES_URL`                         | `TG_API_TOKEN`（CI）/ tgcloud secrets（`BOT_TOKEN`、`JWT_SECRET`…）⏸     | `docs/adr/0003-deployment-strategy.md`、`docs/tgcloud-sdk.md` |
| 机器人产物  | `handlers/*`（wrangler entry）                                                          | `handlers/message.js` ⏸ + `schema.js` ⏸ + `endpoints/*.js` ⏸             | commit `0819f83`、`IMPLEMENTATION_PROGRESS.md`                |

静态站点侧：迁移提交将部署目标收敛为 **Codeberg Pages / GitHub Pages / IPFS 三个平台**，机器人后端不再与静态站点共享 CI job（`docs/adr/0003-deployment-strategy.md` 仍以"4 个并行 Job（含 tgcloud）"表述，待对齐，见 §6）。

### 3. 兼容性说明

| 主题            | 约束 / 差异                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------- |
| V8 isolates     | 无 Node 内置模块（`fs`、`path`、`node:crypto` 等）；加密使用 Web Crypto (`crypto.subtle`)          |
| 数据库 API      | Drizzle 风格链式查询：`db.select().from(schema).where(...)`，终结于 `.get()` / `.all()` / `.run()` |
| Schema 定义     | 通过 `sdk/db` 的 `sqliteTable`、`integer`、`text`、`uniqueIndex` 声明，`tgcloud migrate` 应用      |
| Bot API 形态    | `api.sendMessage({ chat_id, text, ... })` 等对象参数调用，区别于 grammy 的中间件/上下文模型        |
| 错误模型        | `EndpointError`（含 `code` / `status` / `details`）与 `BotApiError`（含 `code`，如 403 屏蔽）      |
| 入口与 Endpoint | 单一 `entrypoint` handler + 命名 `endpoints`，`ctx.initData` 承载 Mini App 用户身份                |
| 会话可迁移性    | JWT 有效期 15 分钟，认证会话可容忍遗失；`pendingAuth` 等短期状态无需长期持久化                     |

### 4. 迁移步骤（历史记录）⏸

> ⏸ 下列产物已从当前工作区移除；步骤依据 commit `0819f83` 与 `IMPLEMENTATION_PROGRESS.md` 还原，待重写。

1. 创建 tgcloud 项目配置 `tgcloud.jsonc` ⏸
2. 定义数据库 schema `schema.js` ⏸（`profiles` / `groups` / `postAuth` / `sessions` / `groupMembers` / `pendingAuth`）
3. 实现 `handlers/message.js` ⏸（Bot 消息入口、`/start` 深度链接、callback query、群成员跟踪）
4. 实现 endpoints：`miniapp.js`、`callback.js`、`status.js`、`protected.js` ⏸
5. 抽取 `middleware/verifyInitData.js` ⏸（initData / Login Widget 复用校验）
6. 运行 `pnpm exec tgcloud migrate` 应用 schema ⏸
7. 运行 `pnpm deploy`（`tgcloud push`）部署 handlers / endpoints ⏸
8. 运行 `pnpm exec tgcloud webhook` 配置或同步 Webhook ⏸
9. 从 `deploy.yml` ⏸ 删除 `cloudflare` job，删除 `wrangler.jsonc` ⏸，清理 Cloudflare secrets
10. 调整 `package.json` 依赖与 scripts（见 §2 变更范围表）
11. 端到端验证认证链路（Deep Link / Widget / Mini App → JWT → protected route）⏸

### 5. 回滚方案

| 层级    | 回滚动作                                                                         | 备注                                              |
| ------- | -------------------------------------------------------------------------------- | ------------------------------------------------- |
| 代码    | `git revert 0819f83`，或恢复到迁移前 tag                                         | 会一并恢复 `wrangler.jsonc` ⏸ 与 `cloudflare` job |
| 依赖    | 重新加入 `wrangler`、`@cloudflare/vite-plugin`、`grammy`、`@grammyjs/auto-retry` | 见 `package.json` diff                            |
| 配置    | 恢复 `wrangler.jsonc` ⏸ 与 KV 绑定 `TG_AUTH_KV` ⏸                                | KV namespace id ⏸ 待确认                          |
| Secrets | 重新注入 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CF_PAGES_URL`         | 已从 CI 退役                                      |
| 数据    | 从 tgcloud DB 导出认证相关表 → 回填 KV / D1 ⏸                                    | JWT 15 分钟过期，会话数据可容忍遗失               |

**回滚触发条件**：tgcloud 侧 Bot API 不可用、Webhook 无法同步，或 DB 迁移失败且 >2h 未恢复。⏸ 待补充演练记录与阈值确认。

### 6. 风险：文档陈旧

迁移以单次 commit 落地，但多份文档未同步，形成事实源冲突：

| 陈旧文档                                     | 陈旧内容                                                                                            | 正确来源                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `.agents/knowledge/deployment-procedures.md` | "4-Target Deployment"、Cloudflare Workers/wrangler、`CF_PAGES_URL`、`wrangler.jsonc` 监控项         | 本 ADR + `docs/adr/0003-deployment-strategy.md` |
| `docs/SECURITY_WHITEPAPER.md` §5.1           | 残留 `cloudflare` job 与 `CLOUDFLARE_*` secrets 示例                                                | 本 ADR §2                                       |
| `docs/adr/0003-deployment-strategy.md`       | 以"4 个并行 Job（含 tgcloud）"表述；实际 `deploy.yml` ⏸ 为 3 个静态平台 job + 独立 tgcloud pipeline | 本 ADR §2                                       |
| `.agents/knowledge/index.md`                 | `wrangler.jsonc` 的 `compatibility_date` 监控项                                                     | 本 ADR §2                                       |

处理原则：**本 ADR 为迁移的事实源**；上表文档在季度 ADR 审查（见 `docs/adr/README.md`）时同步修正。⏸

---

## Consequences

### 正面

- **单一运行时**：db / api / fetch / console 收敛为一个平台，减少跨服务装配
- **依赖收敛**：移除 `grammy`、`@grammyjs/auto-retry`、`@cloudflare/vite-plugin`、`wrangler`，引入单一 `@tgcloud/cli`
- **Bot 能力开箱即用**：Webhook、发送/编辑消息、文件下载、错误模型均为一等接口
- **数据层统一**：Drizzle 风格查询 + `tgcloud migrate`，认证相关表结构显式可追溯
- **配置简化**：`tgcloud.jsonc` ⏸ 单文件替代 wrangler 多绑定
- **部署解耦**：机器人独立 pipeline，不再拖累静态站点 CI

### 负面与风险

- **平台锁定**：机器人代码绑定 tgcloud SDK（`sdk`、`sdk/db`、`ctx.initData`），迁移成本转移到未来
- **运行时约束**：无 Node 内置模块，构建期脚本（Pagefind / lychee / vnu 等）不能复用同一运行时
- **生态成熟度**：`@tgcloud/cli@^0.1.x` 版本较低，API 稳定性 ⏸ 待确认
- **文档漂移**：多份文档仍描述 Cloudflare Workers/wrangler（见 §6），误导后续智能体
- **运维盲区**：需要补充 tgcloud 侧的可观测性与告警策略 ⏸

### 后续工作

- [ ] 按 §6 表格逐项修正陈旧文档
- [ ] 明确 `TG_AUTH_KV` ⏸ → tgcloud DB 表的映射与数据迁移脚本
- [ ] 补充回滚演练记录与阈值
- [ ] 建立 tgcloud 侧监控 / 告警（错误率、Webhook 失败率）
- [ ] 评估 `@tgcloud/cli` 版本升级策略（遵循 ADR 0010）

---

## Alternatives Considered

1. **维持 Cloudflare Workers 并补齐 D1 + Mini App 约定** —— 需自行实现 Endpoint 约定、重试与迁移，多组件配置，投入产出比低，拒绝。
2. **Cloudflare Workers + tgcloud SDK 混合** —— 无官方支持，兼容性风险高，拒绝。
3. **自托管 VPS（Node + Docker）** —— 需自管 TLS、Webhook 暴露面、进程与持久化，运维成本高，拒绝。
4. **其他 Serverless（Vercel / Netlify Functions）** —— 与 Telegram 生态无一等集成，仍需自管 Bot API 与数据库，拒绝。

## Related Documents

- `docs/adr/0003-deployment-strategy.md`（多平台部署，tgcloud 目标）
- `docs/adr/0001-functional-architecture.md`（C2 容器边界、TelegramAuth 模块）
- `docs/adr/0010-dependency-evaluation.md`（架构级依赖引入需 ADR）
- `docs/tgcloud-sdk.md`（SDK API、schema、Endpoint 约定）
- `docs/SECURITY_WHITEPAPER.md` §4.3–4.4、§5.1（认证授权、受保护内容路由）
- `docs/TELEGRAM_AUTH_COMPARISON.md`（Deep Link / Login Widget / Mini App 对比）
- `CONTEXT.md`（术语：DeployTarget、TelegramAuth）
- `IMPLEMENTATION_PROGRESS.md`（tgcloud 集成产物清单）⏸
- `.agents/knowledge/deployment-procedures.md`（待更新）⏸

## References

- commit `0819f83` `ci: migrate from Cloudflare Workers to tgcloud`
- `wrangler.jsonc` ⏸（已删除，原 `compatibility_date: 2026-10-04`）
- `package.json`（依赖与 scripts 变更）
- `.github/workflows/deploy.yml` ⏸（移除 `cloudflare` job）
- tgcloud 官方文档 <https://tgcloud.io/docs>
- Telegram Bot API <https://core.telegram.org/bots/api>

## Implementation Checklist

- [x] 移除 `deploy.yml` ⏸ 的 `cloudflare` job 与 `cloudflare/wrangler-action`
- [x] 删除 `wrangler.jsonc` ⏸
- [x] 移除 `grammy`、`@grammyjs/auto-retry`、`@cloudflare/vite-plugin`、`wrangler` 依赖
- [x] 引入 `@tgcloud/cli`（devDependency）
- [x] 新增 `handlers/message.js` ⏸、`schema.js` ⏸
- [x] `preview` 切换为 `pnpm exec tgcloud dev`
- [x] 新增 `deploy` / `status` / `run` / `migrate` / `webhook` / `tgcloud:setup` scripts
- [ ] 更新 `docs/adr/0003-deployment-strategy.md`：明确 tgcloud 为独立 pipeline，静态站点为 3 平台
- [ ] 更新 `.agents/knowledge/deployment-procedures.md`：移除 Cloudflare Workers/wrangler 描述
- [ ] 更新 `docs/SECURITY_WHITEPAPER.md` §5.1：移除 `cloudflare` job 残留
- [ ] tgcloud 侧配置真实 secrets（`BOT_TOKEN`、`JWT_SECRET`、`WEBHOOK_SECRET`）⏸
- [ ] 端到端验证认证链路（Deep Link / Widget / Mini App → JWT → protected route）⏸
- [ ] 建立回滚演练（见 §5）
