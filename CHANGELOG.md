# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

## [Unreleased]

### Added

- **标准仓库入口文件** — `CHANGELOG.md`、`CONTRIBUTING.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md`、`.env.example`、`.github/CODEOWNERS`、`.github/ISSUE_TEMPLATE/*`。
- **开发者与运维文档** — `docs/GETTING_STARTED.md`、`docs/DEPLOYMENT.md`、`docs/TESTING.md`、`docs/TROUBLESHOOTING.md`、`docs/OPERATIONS.md`。
- **内容与产品文档** — `docs/CONTENT_GUIDE.md`、`docs/SEO.md`、`docs/ACCESSIBILITY.md`、`docs/I18N.md`、`docs/POST_EDIT_CLI.md`、`docs/SEARCH_TUNING.md`。
- **状态与重写文档** — `PROJECT_STATUS.md`（当前状态权威来源）、`REWRITE_PLAN.md`（从零重写计划）、`docs/adr/README.md`（ADR 索引）、`docs/adr/0012-tgcloud-migration.md`（Cloudflare → tgcloud 迁移决策）。

### Changed

- 工作区收敛为「文档 + 配置」形态：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 等设施被**有意移除**，项目将**从零重写**（**不从 git 历史恢复**，旧实现仅作行为参考）；见 `PROJECT_STATUS.md` 与 `REWRITE_PLAN.md`。
- **恢复 → 重写**：移除 `REBUILD_PLAN.md`（恢复叙述），改为 `REWRITE_PLAN.md`（从零重写 W0–W10）；全库 `⏸` 术语由「待重建」统一为「待重写」，并澄清 `tgcloud/` 目录从未存在（Bot 源码为根级 `handlers/`、`schema.js`）。
- **文档一致性修复** — Cloudflare/wrangler 残留清理（`docs/DEPLOYMENT.md`、`.agents/knowledge/deployment-procedures.md`、`.opencode/agents/*`、`docs/SECURITY_WHITEPAPER.md` 示例）；ADR `0005`/`0006`/`0007` 状态由 `Proposed` 对齐为 `Accepted`；入职手册 `CONTEXT.md` 术语计数同步为 49；安全白皮书版本头对齐版本历史（1.1 / 2026-10-05）。

### Removed

- 源码设施（`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/`、`handlers/`）—— **有意移除**，将从零重写，见 [`REWRITE_PLAN.md`](./REWRITE_PLAN.md)。

## [1.0.0] - 2026-10

首个正式版本，汇总 `REFACTOR_PLAN.md` Phase 1–8 的重构成果（进度记录见 `IMPLEMENTATION_PROGRESS.md`）。

### Added

- **深度模块体系** — `ContentPipeline`、`BuildPipeline`、`ThemeSystem`、`SearchModule`、`ClientRuntime`、`TelegramAuth`、`UIComponents` 七个 deep module，类型统一由 `src/modules/types.ts` ⏸ 单一导出。
- **BuildPipeline 五阶段管线** — Pagefind 索引 → 链接检查（lychee）→ HTML 验证（vnu）→ Mermaid 构建期渲染 → 零宽字符水印注入；共享 `FileWalker`，支持阶段级超时、重试与错误聚合。
- **tgcloud Telegram Bot 集成** — 数据库 schema、Bot 消息处理、Mini App `initData` 验证、Login Widget 回调、认证状态轮询与受保护内容路由；服务端签发与校验短时 JWT（HS256，15 分钟）并校验群成员身份。
- **Pagefind 声明式 UI** — `PagefindSearch` 组件封装 `<pagefind-*>` 声明式元素，CSS 变量对接 daisyUI 主题。
- **主题 Token 单一源头** — `theme-tokens.css` ⏸ 集中定义 `--color-*` 与 `--tw-prose-*`，daisyUI 5 与 `@tailwindcss/typography` 共享变量，`prefers-color-scheme` 自动适配深色模式。
- **RSS / Sitemap** — `@astrojs/rss` 生成 `rss.xml`，`@astrojs/sitemap` 生成 `sitemap-index.xml` 及分片。
- **Rust `post-edit` CLI** — 交互式文章管理工具（new/edit/list/delete/publish），基于 clap、chrono、skim、gray_matter、bat。
- **子智能体编排** — 6 个角色、任务卡工作流、知识库维护 L0–L3 触发机制，以及 Agent Learning 三层捕获模型（`@learning:*` 标记 → 会话复盘 → 月度聚合）。

### Changed

- **样式栈升级** — Tailwind CSS 4（CSS-first，`@import "tailwindcss"`

* `@plugin`）与 daisyUI 5（CSS 变量驱动主题）。

- **Markdown 处理器迁移** — 由 remark/rehype 迁移至 Satteri（`@astrojs/markdown-satteri`），统一 heading ID、外链标记、Mermaid 渲染与表格对齐。
- **客户端运行时收敛** — 9 个客户端模块由 `ClientRuntime` ⏸ 单一入口注册，声明 `dependsOn` 依赖并在 `astro:page-load` / `astro:after-swap` 生命周期按拓扑序初始化。
- **多平台部署** — 单次 push 触发 Codeberg Pages / GitHub Pages / IPFS (Pinata) / tgcloud 同步部署，构建一次、部署多端。
- **导航与卡片组件复合化** — `Navbar` 复合 `Start` / `Center` / `End` / `MobileMenu`；`PostCard` 拆分为 `PostCardGrid` 与 `PostCardList`。
- **TelegramAuth 分层降级** — Deep Link > Mini App > Login Widget 多入口，Cookie 偏好记忆与手动切换。

### Removed

- **旧 Cloudflare Workers 部署** — 迁移至 tgcloud，Cloudflare 相关部署配置与依赖退役（`ci: migrate from Cloudflare Workers to tgcloud`）。
- **旧组件** — `Navigation.astro`（由 `Navbar` 复合组件取代）与单变体 `PostCard.astro`（由 `PostCardGrid` / `PostCardList` 取代）。
- **旧构建集成** — Phase 2 注册进 `astro.config.ts` 的 4 个独立集成，合并为单一 `build-hooks` ⏸。

### Fixed

- **HTML 验证误报** — vnu-jar 对 Tailwind `@apply` 与严格 meta 校验的已知误报改为非阻断模式（记录告警、不中断构建）。
- **Mermaid 渲染闪烁** — 由客户端渲染改为构建期渲染为内联 SVG。
- **类型安全** — 消除隐式 `any` 与 `as unknown as`，`pnpm check` 0 errors。

### Security

- **CSP Level 3** — 严格内容安全策略（无 `*` 通配，Pagefind WASM 与 Telegram API 显式白名单），详见 `docs/SECURITY_WHITEPAPER.md`。
- **盲水印溯源** — 原创文章构建后注入零宽字符水印，用于版权追踪。
- **供应链审计** — `pnpm audit` 每次构建运行，高危阻断；许可证白名单与包体积预算纳入评估流程（`docs/adr/0010-dependency-evaluation.md`）。
- **草稿隔离** — 草稿经私有 Git 子模块物理隔离，公开仓库零草稿文件（`docs/adr/0002-draft-isolation-submodule.md`）。
