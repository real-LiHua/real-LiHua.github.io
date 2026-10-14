# 项目状态（Project Status）

**Last Updated:** 2026-10-12
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

| 项            | 值                                                           |
| ------------- | ------------------------------------------------------------ |
| 当前分支      | `feat/onboarding-handbook-and-role-guides`                   |
| `HEAD`        | `0819f83` — `ci: migrate from Cloudflare Workers to tgcloud` |
| `origin/main` | `85a31f9`                                                    |
| 工作区        | 大量改动**未提交**（重写源码 + 文档），**未 push**           |

> 关键点：本分支的工作区即重写产物；`HEAD`/`origin/main` 中的旧实现仅作参考，**不作为恢复来源**。

---

## 3. 重写设施状态（W0–W10）

| 路径                                                | 工作区 | 说明                                                                                       |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| `src/`（Astro 博客，约 57 文件）                    | ✅     | pages / layouts / components / modules / integrations / plugins / scripts / styles / posts |
| `src/post-edit/main.rs`                             | ✅     | Rust CLI（`pnpm post:edit`）                                                               |
| `.github/workflows/deploy.yml`                      | ✅     | 4 平台 CI/CD（含 E2E 门禁）                                                                |
| `.github/workflows/knowledge-guard.yml`             | ✅     | pointer / term / contract / regression 检查                                                |
| `.agents/scripts/`（13 文件）                       | ✅     | 知识库守卫与任务编排脚本                                                                   |
| `.agents/tasks/phase-1/1.1–1.10.md`                 | ✅     | 重写任务卡（W0–W10）                                                                       |
| `handlers/message.js`、`schema.js`、`tgcloud.jsonc` | ✅     | tgcloud Bot 源码与配置                                                                     |
| `pagefind.yaml`、`message-filters.txt`              | ✅     | 搜索索引与消息过滤配置                                                                     |
| `scripts/fetch-bot-username.ts`                     | ✅     | Bot 用户名抓取脚本                                                                         |
| `playwright.config.ts`、`tests/e2e/*.spec.ts`       | ✅     | Playwright E2E（navigation / theme / search / content / auth）                             |
| `tgcloud/`（目录）                                  | ❌     | **从未存在**；Bot 源码为根级 `handlers/`、`schema.js`，见 §6                               |

---

## 4. 仍待落地（⏸）

以下项**尚未实现**，是当前 `⏸` 标注对应的真实缺口：

- **CSP**：`src/layouts/BaseLayout.astro` 尚未注入严格 `Content-Security-Policy`。
- **JSON-LD**：结构化数据（schema.org）尚未加入。
- **`pnpm audit` in CI**：依赖审计目前为本地手动执行，CI 未接入。
- **草稿物理隔离**：私有 Git 子模块方案尚未落地（见 `docs/adr/0002-draft-isolation-submodule.md`）。
- **`.agents/milestones/`、`.agents/tasks/archive/`**：目录尚未创建。
- **`dependency-guard.yml`**：依赖守护工作流尚未创建。
- **`docs/DAISYUI_MIGRATION.md`**：迁移记录尚未创建。
- **`mini-app/auth.html`**：Mini App 页面尚未创建。
- **监控**：运行时监控/告警尚未配置。
- **`public/robots.txt`**：缺失（重写前位于 `public/robots.txt`，重写中移除；`@astrojs/sitemap` 已生成 `sitemap-index.xml`）。

> **重写中移除、依赖仍在（待复核是否重建）**：`.husky/pre-commit*`（`husky`、`lint-staged` 仍在 devDependencies）、`.markdownlint-cli2.*` 配置（`markdownlint-cli2` 仍在 devDependencies）、`.vscode/*`。

---

## 5. 质量门禁

重写收口命令与结果：

```bash
pnpm check                    # astro check：0 error（2 hints）
pnpm build                    # 构建成功（Pagefind / 水印 / Mermaid 由 buildPipelineIntegration 提供）
pnpm exec oxlint .            # exit 0
pnpm exec oxfmt --check       # 全部通过
pnpm exec playwright test     # 15/15 通过（--project=chromium）
pnpm exec tsx .agents/scripts/{scan-pointers,check-terms,sync-contracts}.ts   # exit 0（advisory）
```

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
