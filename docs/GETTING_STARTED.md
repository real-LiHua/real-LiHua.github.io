# 开发者入门 (Getting Started)

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

本指南面向**人类开发者**，覆盖环境准备、脚手架、常用命令与推荐阅读顺序。
子智能体专属流程见 [`docs/SUBAGENT_OPERATIONS.md`](SUBAGENT_OPERATIONS.md)。

---

## 1. 前置条件

| 工具             | 版本   | 用途                            | 验证              |
| ---------------- | ------ | ------------------------------- | ----------------- |
| **Node.js**      | 24.x   | 运行时                          | `node --version`  |
| **pnpm**         | 11.3.0 | 包管理（`packageManager`）      | `pnpm --version`  |
| **Rust / Cargo** | 1.80+  | `post-edit` CLI（edition 2024） | `cargo --version` |
| **Git**          | 2.40+  | 版本控制、子模块                | `git --version`   |
| **Java**         | 17+    | `vnu` HTML 校验                 | `java --version`  |

> 版本锁定于 `package.json`（`packageManager: pnpm@11.3.0`）与 `Cargo.toml`；请勿随意升级主版本。

---

## 2. 引导步骤 (Bootstrap)

```bash
# 1. 克隆仓库
git clone https://github.com/real-LiHua/real-LiHua.github.io.git
cd real-LiHua.github.io

# 2. 启用 pnpm（Corepack）
corepack enable
corepack prepare pnpm@11 --activate

# 3. 安装依赖
pnpm install

# 4. 挂载草稿私有子模块（仅在有权限时）⏸
git submodule update --init --recursive

# 5. 安装 Playwright 浏览器（E2E 需要）
pnpm exec playwright install --with-deps chromium
```

> ⏸ 私有草稿子模块尚未落地（见 [`docs/adr/0002-draft-isolation-submodule.md`](adr/0002-draft-isolation-submodule.md)）。
> 公开仓库无子模块时，步骤 4 可跳过。

---

## 3. 开发服务器

```bash
pnpm dev          # http://localhost:4321
```

端口占用排查见 [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md#4-开发服务器)。

---

## 4. 构建与预览

```bash
pnpm check        # astro check：TypeScript + Astro 类型
pnpm build        # astro build + BuildPipeline（Pagefind/lychee/vnu/Mermaid/Watermark）
pnpm preview      # astro build && pnpm exec tgcloud dev（本地预览 + tgcloud）
npx serve dist/client   # 仅静态产物预览
```

---

## 5. 推荐阅读顺序

```text
1. AGENTS.md                              # 项目总览、命令、角色、技能指引
2. CONTEXT.md                             # 术语单一源头（49 术语）
3. docs/architecture-map.md               # 模块依赖图、接口契约、数据流、seam
4. docs/adr/0001-functional-architecture.md   # C1–C4 架构
5. 你的角色 ADR（见下表）
6. docs/SUBAGENT_OPERATIONS.md            # 质量门禁 / 协作流程
```

| 你的方向           | 必读 ADR / 文档                                                   |
| ------------------ | ----------------------------------------------------------------- |
| 前端 / 组件 / 主题 | 0001、0005（主题 Token）、0006（Pagefind UI）、0007（客户端模块） |
| 内容 / MDX / 类型  | 0001、0002（草稿隔离）、REFACTOR_PLAN.md                          |
| 构建 / 部署 / CI   | 0001、0003（部署策略）、[`docs/DEPLOYMENT.md`](DEPLOYMENT.md)     |
| Rust CLI           | 0003、REFACTOR_PLAN.md、`Cargo.toml`                              |
| 搜索 / Pagefind    | 0001、0006、[`docs/architecture-map.md`](architecture-map.md)     |
| 质量 / DX          | 全部 ADR、[`docs/TESTING.md`](TESTING.md)                         |

---

## 6. 仓库布局

### 6.1 仓库根

```text
.
├── .agents/            # 知识库 / 契约 / 入职手册（scripts 与 tasks）
│   ├── contracts/      # 接口契约 JSON
│   ├── knowledge/      # 依赖矩阵、部署流程、Mermaid SVG 修复
│   └── onboarding/     # 子智能体入职手册 00–06
├── .github/            # workflows（deploy、knowledge-guard）、PR 模板
├── .husky/             # pre-commit
├── docs/               # 本目录：ADRs 与运维/开发文档
├── handlers/           # Telegram Bot handler
├── public/             # 静态资源
├── scripts/            # fetch-bot-username.ts
├── src/                # Astro 博客源码（见 §6.2）
├── tests/              # Playwright E2E（见 §6.3）
├── astro.config.ts     # Astro 配置（adapter、integrations）
├── Cargo.toml          # Rust `post-edit` CLI
├── schema.js           # tgcloud DB schema
├── tgcloud.jsonc       # tgcloud 项目配置
├── CONTEXT.md          # 术语单一源头
└── package.json / pnpm-lock.yaml / pnpm-workspace.yaml
```

### 6.2 `src/`（Astro 博客）

```text
src/
├── components/         # Astro 组件（Header/Footer/Navigation/PostCard/Tag…）
├── layouts/            # BaseLayout
├── modules/            # 深度模块（content/build pipeline、theme、search、telegram-auth）
├── integrations/       # build-pipeline（Pagefind/lychee/vnu/Mermaid/Watermark）
├── plugins/            # satteri-external-links
├── pages/              # 路由（index/about/posts/tags/drafts/telegram/api）
├── posts/              # .md/.mdx 文章（drafts/ 现状为路径隔离）
├── post-edit/          # Rust CLI 源码
├── scripts/            # 客户端脚本（client-entry + modules）
├── styles/             # theme-tokens.css / global.css
└── utils/              # date / content 工具
handlers/ + schema.js   # Telegram Bot 源码
```

### 6.3 `tests/`

```text
tests/
└── e2e/                # navigation / theme-toggle / search / content / auth（见 docs/TESTING.md）
```

---

## 7. 当前状态说明

> 工作区包含**完整文档 + 从零重写的源码设施**（[`REWRITE_PLAN.md`](../REWRITE_PLAN.md) W0–W10 已完成）。
> `src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/`、`handlers/`、`schema.js`、`tgcloud.jsonc`、`tests/` 均已就位；重写**未**从 git 恢复。
> 文中 `⏸` 标注对应**尚未落地**的少量项（如草稿私有子模块、CSP、CI 中的 `pnpm audit`），以 [`PROJECT_STATUS.md`](../PROJECT_STATUS.md) 为准。

因此，涉及 `src/` 的命令（`dev` / `check` / `build` / `preview` / `post:edit`）均可执行。

---

## 8. 下一步

- 跑通基线：`pnpm install && pnpm check && pnpm build`
- 阅读 [`docs/TESTING.md`](TESTING.md) 了解质量门禁与 Playwright E2E 步骤
- 阅读 [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) 了解 4 目标部署
- 阅读 [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md) 备查常见故障
- 新增依赖前先评估，流程见 [`docs/adr/0010-dependency-evaluation.md`](adr/0010-dependency-evaluation.md)

---

## 相关文档

- [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) — 部署指南
- [`docs/TESTING.md`](TESTING.md) — 测试策略
- [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — 故障排查
- [`docs/OPERATIONS.md`](OPERATIONS.md) — 运维 runbook
- [`docs/SUBAGENT_OPERATIONS.md`](SUBAGENT_OPERATIONS.md) — 子智能体操作
- `.agents/onboarding/04-tools-access.md` — 工具与访问权限
