# Contributing Guide

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

本仓库包含两个独立部署、共享同一代码库的子系统：

1. **Astro 7 个人博客** — SSG（MDX、Tailwind CSS 4 + daisyUI 5、Pagefind），部署到 Codeberg Pages、GitHub Pages、IPFS (Pinata)。
2. **tgcloud Telegram Bot** — 运行在 Telegram V8 isolates 无服务器平台上的 Mini App。

参与贡献前，请先阅读 `AGENTS.md`（工作区约定与技能指南）与 `CONTEXT.md`（术语单一源头）。

## Prerequisites

| 工具    | 版本         | 说明                     |
| ------- | ------------ | ------------------------ |
| Node.js | 24           | 与运行基线匹配           |
| pnpm    | 11.3.0       | 由 `packageManager` 锁定 |
| Rust    | 稳定版工具链 | 构建 `post-edit` CLI     |

## Setup

```bash
pnpm install     # 安装依赖
pnpm dev         # 启动开发服务器 http://localhost:4321
```

> ⏸ 依赖 `src/` 的命令（`dev` / `check` / `build` / `preview` / `post:edit`）在源码树重写前会失败。

tgcloud Bot 的本地命令：

```bash
pnpm status                     # 本地与云端状态对比
pnpm deploy                     # 推送至 tgcloud（tgcloud push）
pnpm exec tgcloud migrate       # 应用数据库 schema
pnpm exec tgcloud run <module>  # 本地运行 handler / endpoint
pnpm exec tgcloud webhook       # 检查 / 同步 webhook
```

## Branch Model

- `main` 为稳定分支，仅通过 PR 合入。
- 功能开发在 `main` 切出的特性分支上进行，命名建议 `feat/<topic>`、`fix/<topic>`、`chore/<topic>`。
- 合并保持提交历史线性（squash 或 rebase），不产生无意义的 merge commit。

## Commit Convention

使用 Conventional Commits：

| 前缀     | 用途                     |
| -------- | ------------------------ |
| `feat:`  | 新功能                   |
| `fix:`   | 缺陷修复                 |
| `chore:` | 构建、依赖、工具链等杂项 |

示例：`feat(search): declarative Pagefind UI component`

## Required Checks

提交 PR 前在本地运行，全部通过：

```bash
pnpm check              # TypeScript + Astro 类型检查
pnpm build              # 完整构建
pnpm exec oxlint .      # Lint
pnpm exec oxfmt --check # 格式检查
pnpm audit              # 依赖安全审计
```

## Pull Request Process

1. 从 `main` 切出特性分支并完成改动。
2. 运行上节 Required Checks。
3. 按 `.github/pull_request_template.md` 填写 PR 描述，逐项勾选检查清单。
4. 在 PR 中声明知识库影响与依赖变更（见下）。
5. 等待维护者评审；所有检查为绿色后方可合并。

PR 标题建议使用 `[component] Brief description` 格式。

## Knowledge Base Impact

本仓库的文档即知识库。以下改动必须在 PR 中声明并同步更新：

| 变更类型              | 需更新                                     |
| --------------------- | ------------------------------------------ |
| 新增术语              | `CONTEXT.md`（先加定义，再在其他文档使用） |
| 接口 / 契约变更       | `.agents/contracts/*.json` 与相关任务卡    |
| 文件移动 / 重命名     | 指针引用（`scan-pointers` 脚本 ⏸）         |
| 架构级决策            | 新建 / 更新 `docs/adr/` 下的 ADR           |
| 模块边界 / 依赖图变化 | `docs/architecture-map.md` 与相关 ADR      |

评审时会核对指针、术语与契约一致性。

## Dependency Evaluation

引入任何 npm / Rust 依赖前，必须按 `docs/adr/0010-dependency-evaluation.md` 完成三层评估：

| 层级 | 内容                                        | 通过标准       |
| ---- | ------------------------------------------- | -------------- |
| L1   | 必要性：原生 API / 现有依赖 / 轻量实现替代  | 有明确引入理由 |
| L2   | 质量与安全：维护状态、许可证、体积、TS 支持 | 全项达标       |
| L3   | 集成验证：类型检查、构建、测试              | 本地 / CI 全绿 |

- 许可证白名单为 MIT / Apache-2.0 / BSD-3 / ISC；GPL / AGPL / 商业 / 未知许可证禁止引入。
- 架构级依赖（UI 框架、状态管理、构建工具等）必须创建 ADR，记录选型理由、迁移路径与退出策略。

## Code Review Expectations

- 代码遵循项目约定：`oxlint` / `oxfmt` 无错误。
- 类型正确：`pnpm check` 通过。
- 新增功能有对应测试（`pnpm exec playwright test` ⏸ 需先补 `@playwright/test` 与配置）。
- 知识库按影响清单同步更新。
- 变更中不包含任何密钥或敏感数据。

## License

本项目以 `LICENSE.txt` 中的条款授权（MIT）。提交贡献即表示你同意将你的贡献以同一许可证发布。

## Code of Conduct

参与本项目须遵守 `CODE_OF_CONDUCT.md`。
