# AGENTS.md — Astro 静态博客

你将在本项目中完成前端开发/重构任务，输出最终代码。使用中文沟通与注释。

## 项目概要

Astro 7 + MDX 静态博客，部署到 **Cloudflare Workers + Codeberg Pages + GitHub Pages**。样式栈：Tailwind CSS 4 + daisyUI 5（通过 `@plugin` 指令加载）。CSS 变量定义在 `src/styles/global.css`，双主题（light/dark）完整适配。

## 关键命令

```bash
pnpm dev              # 启动开发服务器
pnpm build            # 构建
pnpm preview          # build + wrangler dev
pnpm post:edit        # cargo run -p post-edit -- (Rust CLI 工具)
pnpm oxlint --fix     # 静态检查并自动修复部分异常
pnpm oxfmt            # 格式化代码
pnpm tsc -b           # 修改代码后必须做 TypeScript 构建校验
cargo clippy -p post-edit  # Rust 代码检查
cargo test -p post-edit    # Rust 测试
cargo audit                # Rust 依赖安全审计
```

**任务完成后必须执行**：`pnpm tsc -b` 验证，然后检查 oxlint 不新增错误。

## 技术约束

- **禁止使用 `any`**（项目虽未开启 `strict: true`，但有 `strictNullChecks: true`，且手动约束禁止 any）
- **错误提示使用 daisyUI toast 组件**，禁止 `alert()` / `console.error()`
- **异常处理**：禁止 try/catch 吞异常，禁止随意默认值兜底
- **依赖管理**：`pnpm add -D <package>`（不手动改 package.json）
- **未经允许禁止任何 Git 操作**

## 代码规范

- Lint: **oxlint** 为主（`no-console`: warn, `no-alert`/`no-debugger`: error），`eslint.config.js` 为辅
- Format: **oxfmt**（取代 prettier），配置见 `oxfmt.config.ts`
- lint-staged：Stage 文件的 `*.{astro,ts,tsx,js,jsx,css}` 自动执行 oxlint + oxfmt

### pre-commit hook

1. `pnpm oxfmt .husky/pre-commit.ts && node .husky/pre-commit.ts || wrangler types` —— 每日更新 wrangler.jsonc 的 `compatibility_date` 为昨天，失败时生成运行时类型
2. `lint-staged` —— 格式化和检查暂存文件

### oxlint 注意事项

- `.oxlintrc.json` 优先级高于 `eslint.config.js`
- **必须为 `*.astro` 文件添加 overrides**（已在 `.oxlintrc.json` 配置：关闭 `unicorn/filename-case`、`sort-imports`、`prefer-dom-node-append` 等 Astro 不兼容规则）
- 常见违规处理：`max-statements` -> 拆分函数、`no-array-for-each` -> `for...of`、`id-length` -> 用完整变量名
- `sort-keys` 在 `oxfmt.config.ts` 等配置文件中启用，注意键名须字母序

## 项目结构（关键部分）

```
src/
├── components/           # Astro 组件（静态 UI）
│   ├── common/           # PostCard.astro, Tag.astro
│   ├── navbar/           # Start.astro, Center.astro, End.astro, SearchBar.astro (含 pagefind 搜索按钮)
│   ├── CodeCopy.astro
│   ├── Copyright.astro
│   ├── Footer.astro
│   ├── Header.astro
│   └── Navigation.astro
├── integrations/         # Astro 集成（构建时钩子）
│   ├── build-hooks.ts    # Pagefind 索引、lychee 链接检查、vnu HTML 验证
│   ├── mermaid-compile-time.ts  # 构建时渲染 Mermaid 图表
│   └── satteri-config.ts # Markdown 处理器配置（satteri + shiki + 日期注入）
├── layouts/BaseLayout.astro  # 唯一布局组件（含主题切换、OGP meta、ClientRouter、CodeCopy、Pagefind modal）
├── pages/
│   ├── posts/[id].astro  # 文章详情页（含 data-pagefind-body）
│   ├── posts/index.astro # 文章列表页
│   ├── tags/             # 标签索引页
│   │   ├── index.astro   # 标签列表
│   │   └── [tag].astro   # 单标签文章列表
│   ├── meow.ts           # API 路由（非 GET 请求受限：仅特定 origin + User-Agent "catgirl" 可访问）
│   ├── drafts.astro      # 草稿列表（含 Telegram 入口）
│   ├── telegram.astro    # Telegram 集成页面
│   ├── about.astro       # 关于页面
│   ├── 404.astro         # 404 页面
│   └── rss.xml.ts        # RSS 订阅生成
├── plugins/
│   └── mdast-toc.ts      # MDast TOC 插件（生成目录）
├── posts/                # .md / .mdx 博客文章（通过 astro:content 加载）
│   └── drafts/           # 草稿文章（路径决定 draft 状态，无需 frontmatter 标记）
├── scripts/              # 客户端交互脚本（通过 <script> 导入）
│   ├── code-copy.ts      # 代码块复制
│   ├── gravatar-fallback.ts  # 图片加载失败时切换 fallback URL
│   ├── reading-progress.ts   # 阅读进度条
│   ├── scroll-reveal.ts      # 滚动渐入动画
│   ├── telegram.ts           # Telegram 交互
│   ├── theme-toggle.ts
│   ├── tilt-card.ts          # 3D 倾斜卡片
│   └── toc.ts                # 目录高亮
├── styles/global.css     # 全局样式：Tailwind + daisyUI 主题配置
├── utils/
│   ├── content.ts        # 内容获取工具函数
│   └── date.ts           # 日期工具函数（基于 dayjs）
├── middleware.ts         # Astro 中间件
├── content.config.ts     # Content collections 定义与 Zod schema
├── post-edit/main.rs     # Rust CLI 入口
└── env.d.ts              # 环境类型声明
```

**注意**：

- `src/rust/` 目录不存在；Rust 项目入口在 `src/post-edit/main.rs`
- 图片 fallback 方案：用 `data-gravatar-fallback` 属性 + `src/scripts/gravatar-fallback.ts`，避免内联 `onerror` 触发 ts(6133)
- Pagefind 搜索：构建时自动生成索引到 `dist/client/pagefind/`，开发模式通过 `ln -sf` 链接到 `public/pagefind`
- Mermaid 图表：构建时由 `mermaid-compile-time.ts` 预渲染为 SVG
- 日期注入：通过 `satteri-config.ts` 中的 `satteriPublishDate` / `satteriUpdatedDate` 从 git 历史自动注入

## 文章内容规范

### Frontmatter 字段（由 `src/content.config.ts` 定义）

```yaml
title: string # required
authors: string[] # optional
description: string # optional
image: string # optional
publishDate: date # derived from git history by satteriPublishDate (can be set manually)
updatedDate: date # derived from git history by satteriUpdatedDate
tags: string[] # optional
```

**Note**: The field is `publishDate` not `date`. Draft files should be placed under `src/posts/drafts/` — draft status is determined by path; do not use a frontmatter `draft` flag.

### Astro config 特殊行为（`astro.config.ts`）

- `adapter: node({ mode: "standalone" })` —— Node 独立模式
- `site: process.env.SITE_URL ?? "http://localhost:4321"`（默认值被 `SITE_URL` 环境变量覆盖）
- `trailingSlash: "ignore"`
- `security: { checkOrigin: false }` —— 关闭 CSRF 检查
- `vite.build.cssMinify: "lightningcss"` —— CSS 压缩用 lightningcss
- Markdown 处理器：`satteri`（替代 remark），含 shiki 语法高亮、mermaid 渲染、表格对齐、heading IDs、git 日期注入
- 集成：`favicons`、`mdx`、`sitemap`、`satteri-config`、`astro-minify-html-swc`（仅生产）、`build-hooks`

## Rust CLI 工具（post-edit）

Cargo.toml 使用 **edition = "2024"**。入口：`src/post-edit/main.rs`

依赖速查：

| 用途        | 库                 |
| ----------- | ------------------ |
| CLI 解析    | clap (derive)      |
| 日期        | chrono             |
| 交互选择    | skim               |
| 文件预览    | bat                |
| Frontmatter | gray_matter (yaml) |
| Slug 生成   | slug + pinyin      |

**Cargo clippy 配置**：

- `correctness`/`suspicious`/`perf`/`complexity` → `deny`
- `cargo`/`nursery` → `warn`
- `multiple_crate_versions` → `allow`
- `restriction`/`pedantic`/`style` → `allow`

功能：交互式菜单（新建/搜索/编辑/发布/设为草稿/删除文章）、预览、搜索、草稿与正式文章移动管理

## 部署流水线（`.github/workflows/deploy.yml`）

触发条件：push 到 `main` 分支，排除 `.agents/**` / `*.md` / `LICENSE.txt` / `src/post-edit/**` / `Cargo.toml`

1. **Cloudflare Workers**：`pnpm build` + `wrangler deploy`
2. **Codeberg Pages**：`pnpm build` + SSH 推 `dist/client` 到 `ssh://git@codeberg.org/lihua/pages`
3. **GitHub Pages**：`withastro/action` 构建 + `actions/deploy-pages` 部署 `dist/client`
4. **IPFS**：`pnpm build` + `ipfs` 将 CID pin 到 Pinata（已禁用 `if: false`）

## 组件规范

- Astro 组件（`.astro`）：用于静态布局，**Props 必须显式声明类型**
- 客户端交互：使用 `.ts`/`.tsx` 文件（**仅在需要客户端交互时使用**）
- 禁止把通用逻辑塞进页面组件里
- 相同布局/样式/逻辑必须抽象复用（CSS 变量、Layout 组件、工具函数），禁止复制粘贴
- draggable 悬浮按钮：使用**原生 JS** 实现（`touchstart/touchmove` 必须 `{ passive: false }` + `e.preventDefault()`）

## 测试

- Playwright E2E 测试：`pnpm exec playwright test`
- 测试文件：`*.test.ts` 或 `tests/*.spec.ts`
- 覆盖重点：页面渲染、导航链接、响应式布局、主题切换

## 子智能体团队系统

本项目建立 6 个专用子智能体 + 5 个协作 Skill，支持任务并行执行与质量门禁。

### 智能体注册（`.opencode/opencode.json`）

| 智能体                      | 角色             | 核心职责目录                                                                                                             |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `frontend-architect`        | 前端架构师       | `src/components/**`、`src/layouts/**`、`src/styles/**`、`src/scripts/**`                                                 |
| `content-engineer`          | 内容工程师       | `src/content.config.ts`、`src/integrations/satteri-config.ts`、`src/plugins/**`、`src/pages/rss.xml.ts`                  |
| `build-deploy-engineer`     | 构建部署工程师   | `astro.config.ts`、`src/integrations/build-hooks.ts`、`src/integrations/mermaid-compile-time.ts`、`.github/workflows/**` |
| `cli-tool-engineer`         | CLI 工具工程师   | `src/post-edit/**`、`Cargo.toml`                                                                                         |
| `search-discovery-engineer` | 搜索发现工程师   | `src/components/navbar/SearchBar.astro`、`src/layouts/BaseLayout.astro` (Pagefind)                                       |
| `quality-dx-guardian`       | 质量与 DX 守护者 | `.oxlintrc.json`、`oxfmt.config.ts`、`.husky/**`、`tests/**`、`package.json`                                             |

### 协作 Skill（`.opencode/skills/`）

| Skill                     | 用途                         | 核心命令                             |
| ------------------------- | ---------------------------- | ------------------------------------ |
| `subagent-communication`  | 任务领取、进度汇报、阻塞上报 | `task-claim`、`task-progress`        |
| `subagent-handoff`        | 任务交接规范                 | 交接清单模板、验收检查项             |
| `subagent-shared-context` | 共享上下文管理               | ADR 读写、接口契约                   |
| `subagent-quality-gate`   | 质量门禁自动化               | `run-gate`、`check-regression`       |
| `subagent-planning`       | 协作规划辅助                 | `split-tasks`、`compute-parallelism` |

### 任务执行流程

1. **领取任务**：`node .agents/scripts/task-claim.ts <task-id> --assignee <agent>`
2. **执行中**：每 30min 更新进度 `node .agents/scripts/task-progress.ts <task-id> <percent> --msg "..."`
3. **阻塞时**：`node .agents/scripts/task-progress.ts <task-id> --blocked "reason" --help-from <agent>`
4. **完成**：`node .agents/scripts/task-complete.ts <task-id>`（自动跑质量门禁）
5. **交接**：按 `subagent-handoff` 规范提供产出物清单、验收证据

### Phase 1 任务卡（`.agents/tasks/phase-1/`）

| ID  | 标题                                        | 负责智能体         | 依赖 | 验收命令                    |
| --- | ------------------------------------------- | ------------------ | ---- | --------------------------- |
| 1.1 | 修复 CLI 缺失函数 `update_frontmatter_bool` | cli-tool-engineer  | -    | `cargo test`                |
| 1.2 | 补全 CLI 集成测试                           | cli-tool-engineer  | 1.1  | `cargo test` 覆盖率 > 80%   |
| 1.3 | 删除空占位组件 Start/Center/End             | frontend-architect | -    | `pnpm build && pnpm oxlint` |
| 1.4 | 统一客户端脚本注册机制                      | frontend-architect | 1.3  | `pnpm dev` 验证脚本加载     |
| 1.5 | Content Schema 类型导出供前端复用           | content-engineer   | -    | `pnpm tsc -b`               |

### 架构决策记录（`.agents/adr/`）

- `001-component-architecture.md` - 单布局+模块化组件+原生脚本
- `002-content-pipeline.md` - satteri+git日期+Mermaid预渲染
- `003-deployment-strategy.md` - 三端同步+Cloudflare优先边缘能力

### 质量门禁（每任务必跑）

```bash
# 通用门禁
pnpm tsc -b
pnpm oxlint
pnpm oxfmt --check
pnpm build

# 角色专属
# frontend-architect: pnpm exec playwright test --project=chromium
# cli-tool-engineer: cargo test && cargo clippy -p post-edit && cargo audit
# build-deploy-engineer: lychee dist/client && vnu --skip-non-html dist/client
# quality-dx-guardian: pnpm exec playwright test
```
