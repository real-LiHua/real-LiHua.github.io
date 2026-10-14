# 项目状态（Project Status）

**Last Updated:** 2026-10-14
**维护者:** real-LiHua
**定位:** 本项目**当前状态**的单一事实来源（Single Source of Truth）。

> [!IMPORTANT] 与既有文档的关系
> `REFACTOR_PLAN.md`（历史重构计划）、`IMPLEMENTATION_PROGRESS.md`（历史进度存档）、`.phase-current`（值为 `8`）描述的是**重写之前**的阶段，保留其历史语义。
> 重写的执行计划见 [`REWRITE_PLAN.md`](./REWRITE_PLAN.md)（W0–W10 已完成）。
> **自本文件起，项目当前状态以本文件为准。**

---

## 0. 一句话结论

工作区现已包含**完整文档 + 从零重写的源码设施**，重写（W0–W10）已完成：

- `src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/`、`handlers/`、`schema.js`、`tgcloud.jsonc`、`pagefind.yaml`、`message-filters.txt`、`tests/` 等**均已在工作区就位**。
- 重写**没有**从 git 历史恢复：不执行 `git restore` / `git revert`；旧实现**仅作行为参考与规格素材**。
- 重写的"规格"由现有文档承担：`CONTEXT.md`、`docs/adr/**`、`docs/architecture-map.md`、`docs/SECURITY_WHITEPAPER.md`、`docs/*.md`。
- 少量项仍未落地，文中以 `⏸` 标注，见 §4。

---

## 1. 图例

| 标记 | 含义             |
| ---- | ---------------- |
| ✅   | 工作区可用       |
| ⏸    | 尚未落地，待后续 |
| 🆕   | 本次文档整理新增 |
| ⚠️   | 存在矛盾或待确认 |

---

## 2. Git 现状（事实数据）

| 项            | 值                                                                              |
| ------------- | ------------------------------------------------------------------------------- |
| 当前分支      | `feat/onboarding-handbook-and-role-guides`                                      |
| `HEAD`        | `793e7cf` — `feat: from-scratch rewrite of blog + bot, reconcile docs`          |
| `origin/main` | `85a31f9`                                                                       |
| 工作区        | 重写已提交（`793e7cf`，**未 push**）；其后新增的 SEO/安全/CI 设施改动**未提交** |

> 关键点：本分支的工作区即重写产物；`HEAD`/`origin/main` 中的旧实现仅作参考，**不作为恢复来源**。

---

## 3. 重写设施状态（W0–W10）

| 路径                                                                  | 工作区 | 说明                                                                                       |
| --------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| `src/`（Astro 博客，约 57 文件）                                      | ✅     | pages / layouts / components / modules / integrations / plugins / scripts / styles / posts |
| `src/post-edit/main.rs`                                               | ✅     | Rust CLI（`pnpm post:edit`）                                                               |
| `.github/workflows/deploy.yml`                                        | ✅     | 4 平台 CI/CD（含 E2E 门禁）                                                                |
| `.github/workflows/knowledge-guard.yml`                               | ✅     | pointer / term / contract / regression 检查                                                |
| `.github/workflows/dependency-guard.yml`                              | ✅     | 依赖守护：`pnpm audit`（high/critical 阻断）+ 许可证检查 + `cargo audit`                   |
| `.agents/scripts/`（13 文件）                                         | ✅     | 知识库守卫与任务编排脚本                                                                   |
| `.agents/tasks/phase-1/1.1–1.10.md`                                   | ✅     | 重写任务卡（W0–W10）                                                                       |
| `.agents/milestones/`、`.agents/tasks/archive/`                       | ✅     | 里程碑报告与任务归档目录（含 README）                                                      |
| `handlers/message.js`、`schema.js`、`tgcloud.jsonc`                   | ✅     | tgcloud Bot 源码与配置                                                                     |
| `pagefind.yaml`、`message-filters.txt`                                | ✅     | 搜索索引与消息过滤配置                                                                     |
| `scripts/fetch-bot-username.ts`                                       | ✅     | Bot 用户名抓取脚本                                                                         |
| `public/robots.txt`                                                   | ✅     | 抓取规则 + Sitemap 指向（`docs/SEO.md` §5）                                                |
| `.husky/pre-commit`、`.markdownlint-cli2.jsonc`                       | ✅     | pre-commit（lint-staged）+ markdown lint 配置                                              |
| `docs/DAISYUI_MIGRATION.md`、`docs/DEPENDENCY_EVALUATION_TEMPLATE.md` | ✅     | daisyUI 5 迁移记录 + 依赖评估模板                                                          |
| `playwright.config.ts`、`tests/e2e/*.spec.ts`                         | ✅     | Playwright E2E（navigation / theme / search / content / auth）                             |
| `tgcloud/`（目录）                                                    | ❌     | **从未存在**；Bot 源码为根级 `handlers/`、`schema.js`，见 §6                               |

---

## 4. 仍待落地（⏸）

以下项**尚未实现**，是当前 `⏸` 标注对应的真实缺口：

- **严格 CSP**：`BaseLayout.astro` 已注入**基线** CSP（`default-src 'self'`、`object-src 'none'`、`base-uri 'self'`、`form-action 'self'` 等，见 `docs/SECURITY_WHITEPAPER.md` §3.2）。“**严格**”策略（去掉 `'unsafe-inline'`、hash/`nonce` 化）当前**受阻**：Astro 原生 CSP（`security.csp`）官方**不支持 `<ClientRouter />` 与 Shiki**，而本站两者都用；`frame-ancestors` 亦无法经 `<meta>` 生效（须托管方注入 HTTP 头）。
- **JSON-LD 的 `Person` / `BreadcrumbList`**：`WebSite`（首页类）与 `BlogPosting`（文章）已注入；关于页 `Person`、面包屑 `BreadcrumbList` 尚未加入（`docs/SEO.md` §6）。
- **草稿物理隔离**：私有 Git 子模块方案尚未落地（见 `docs/adr/0002-draft-isolation-submodule.md`）。
- **依赖体积对比**：`scripts/check-dep-size.ts` 尚未创建，`dependency-guard.yml` 未接入新增依赖体积对比（`docs/adr/0010-dependency-evaluation.md` §7 的 Size Check 步骤）。
- **学习脚本缺失**：`AGENTS.md`「Quick Reference Card」引用的 `.agents/scripts/extract-learning.ts` / `aggregate-learning.ts` / `learning-index.ts` **不存在**（`.agents/learning/` 为 gitignored 本地目录）。
- **`mini-app/auth.html`**：Mini App 页面尚未创建；其后端端点 `/api/auth/telegram/miniapp` 亦未实现（见 `docs/TELEGRAM_AUTH_COMPARISON.md`）。
- **监控**：运行时监控/告警尚未配置。
- **默认分享图**：`og:image` 在文章缺 `image` 时无站点级默认图，分享卡片会降级为纯文本（`docs/SEO.md` §4）。
- **sitemap 排除受保护路由**：草稿已由路径规则排除；受保护（`telegramAuth`）路由尚未从 sitemap 中排除（`docs/SEO.md` §2）。
- **Content Schema 输入上限**：当前 `src/content.config.ts` 未对 `title` / `description` / `tags` / `authors` 设 `.max()` 长度上限（`docs/SECURITY_WHITEPAPER.md` §4.2）。
- **子智能体设施目录**：`.agents/team/`、`.agents/lifecycle/`、`.agents/tech-debt/`、`.agents/team/skills-matrix.yaml` 尚未创建（见 `docs/adr/0004-subagent-coordination.md`；`.agents/scripts/subagent-*.ts` 已就位）。

> **本轮已落地**（从 §4 移除）：
>
> - **CSP 基线** — `BaseLayout.astro` 注入 `<meta http-equiv="Content-Security-Policy">`（`'unsafe-inline'` + `'wasm-unsafe-eval'` 说明见 `docs/SECURITY_WHITEPAPER.md` §3.2）。
> - **JSON-LD** — `WebSite` / `BlogPosting`；含 `noindex`（受保护文章）、`og:url`/`og:site_name`/`twitter:title|description`、`keywords`、RSS 自动发现链接。
> - **`pnpm audit` 接入 CI** — `.github/workflows/dependency-guard.yml`（`--audit-level=high` 阻断 + 许可证检查 + `cargo audit`）。
> - **`.agents/milestones/`、`.agents/tasks/archive/`** — 目录与 README 已创建。
> - **`docs/DAISYUI_MIGRATION.md`** — 已创建。**`docs/DEPENDENCY_EVALUATION_TEMPLATE.md`** — 已创建（ADR 0010 清单项）。
> - **`public/robots.txt`** — 已创建（Allow 全站 + Disallow `/api/`、`/drafts` + Sitemap）。
> - **文档一致性清理** — 移除/更正了一批指向已落地设施的过期 `⏸` 与错误路径（`CONTRIBUTING.md`、`docs/SUBAGENT_OPERATIONS.md`、`docs/CONTENT_GUIDE.md`、`docs/ACCESSIBILITY.md`、`docs/TROUBLESHOOTING.md`、`docs/I18N.md`、`docs/GETTING_STARTED.md`、`docs/DEPLOYMENT.md`、`docs/SECURITY_WHITEPAPER.md` §3.3/§4.2/附录 A、`docs/adr/0004`）。
>
> **重写中移除、已复核**：`.husky/pre-commit` 与 `.markdownlint-cli2.jsonc` 已**重建**（husky v9 + lint-staged + markdownlint-cli2，见 §5）；`.vscode/*` 由 `.gitignore` 忽略（本地 IDE 配置，无需重建）；`.gitignore` 不再忽略 `Cargo.lock`（CLI crate，锁定文件应提交）。

---

## 5. 质量门禁

重写收口命令与结果：

```bash
pnpm check                    # astro check：0 error（2 hints）
pnpm build                    # 构建成功（Pagefind / 水印 / Mermaid 由 buildPipelineIntegration 提供）
pnpm exec oxlint .            # exit 0
pnpm exec oxfmt --check       # 全部通过
pnpm run lint:md              # markdownlint-cli2：0 issues（107 文件）
pnpm exec playwright test     # 15/15 通过（--project=chromium）
pnpm exec tsx .agents/scripts/{scan-pointers,check-terms,sync-contracts}.ts   # exit 0（advisory）
```

依赖与供应链门禁在 PR 上自动运行：`.github/workflows/dependency-guard.yml`（`pnpm audit --audit-level=high`、许可证检查、`cargo audit`）。

---

## 6. tgcloud 的真实形态

需要更正一个长期误述：

- 文档曾称 `tgcloud/` 是"第二个项目、尚未创建"。
- 实际上，**`tgcloud/` 目录在 `HEAD` 与 `origin/main` 中都不存在，也从未存在**。
- Telegram Bot 实现在根级：
  - `handlers/message.js`（Bot handler）
  - `schema.js`（DB schema）
  - `tgcloud.jsonc`（项目配置）
  - `scripts/fetch-bot-username.ts`
  - `package.json` 的 tgcloud 脚本（`deploy`、`tgcloud` 等）

---

## 7. 状态来源裁定

| 来源                              | 声称                             | 裁定                       |
| --------------------------------- | -------------------------------- | -------------------------- |
| `.phase-current`                  | `8`                              | 历史值，非当前状态         |
| `IMPLEMENTATION_PROGRESS.md`      | `Current Phase 7/8`              | 历史存档，自述"按原貌保留" |
| `REFACTOR_PLAN.md`                | 8 个 Phase 已执行完毕            | 历史计划文档，非当前状态   |
| `REWRITE_PLAN.md`                 | W0–W10 执行计划                  | **已完成**，进度见其 §7    |
| **`PROJECT_STATUS.md`（本文件）** | **工作区 = 完整文档 + 重写源码** | **当前状态以此为准**       |

---

## 8. 下一步

| 目标                 | 动作                                               |
| -------------------- | -------------------------------------------------- |
| **收口重写**         | 复核 §5 门禁并提交（conventional commit）          |
| **补齐 ⏸ 项**        | 按 §4 清单逐项落地，完成后移除对应 `⏸` 标注        |
| **tgcloud 平台验证** | 按 `docs/tgcloud-sdk.md` 做本地 `tgcloud run` 验证 |
| **对齐文档一致性**   | 见 `CHANGELOG.md` 与各文档修订记录                 |
