# AGENTS.md — Astro 静态博客

你将在本项目中完成前端开发/重构任务，输出最终代码。使用中文沟通与注释。

## 项目概要

Astro 7 + MDX 静态博客，部署到 **Cloudflare Workers + Codeberg Pages + GitHub Pages**。样式栈：Tailwind CSS 4 + daisyUI 5（通过 `@plugin` 指令加载）。CSS 变量定义在 `src/styles/global.css`，双主题（light/dark）完整适配。

## 关键命令

```bash
pnpm dev              # 启动开发服务器
pnpm build            # 完整构建：clean → astro check/build → pagefind → check:links → vnu
pnpm build:clean      # 清理 public/pagefind
pnpm build:astro      # astro check + astro build
pnpm build:pagefind   # pagefind 索引 + symlink
pnpm check:links      # lychee 死链检查
pnpm build:vnu        # vnu HTML 验证
pnpm preview          # build + wrangler dev
pnpm post:edit        # cargo run -p post-edit -- (Rust CLI 工具)
pnpm exec oxlint      # 静态检查
pnpm exec oxfmt       # 格式化代码
pnpm exec tsc -b      # 修改代码后必须做 TypeScript 构建校验
cargo clippy -p post-edit  # Rust 代码检查
cargo test -p post-edit    # Rust 测试
cargo audit               # Rust 依赖安全审计
```

**任务完成后必须执行**：`pnpm exec tsc -b` 验证，然后检查 oxlint 不新增错误。

## 技术约束

- **禁止使用 `any`**（项目虽未开启 `strict: true`，但有 `strictNullChecks: true`，且手动约束禁止 any）
- **错误提示使用 daisyUI toast 组件**，禁止 `alert()` / `console.error()`
- **异常处理**：禁止 try/catch 吞异常，禁止随意默认值兜底
- **依赖管理**：`pnpm add -D <package>`（不手动改 package.json）
- **不要运行 `dev`/`build` 等启动命令**（除非用户明确要求），允许静态分析操作
- **未经允许禁止任何 Git 操作**

## 代码规范

- Lint: **oxlint** 为主（`no-console`: warn, `no-alert`/`no-debugger`: error），`eslint.config.js` 为辅
- Format: **oxfmt**（取代 prettier），配置见 `oxfmt.config.ts`
- lint-staged：Stage 文件的 `*.{astro,ts,tsx,js,jsx,css}` 自动执行 oxlint + oxfmt

### pre-commit hook

1. `bunx oxfmt .husky/pre-commit.ts && node .husky/pre-commit.ts || wrangler types` —— 每日更新 wrangler.jsonc 的 `compatibility_date` 为昨天，失败时生成运行时类型
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
│   ├── navbar/           # Start.astro, Center.astro, End.astro (含 pagefind 搜索按钮)
│   ├── CodeCopy.astro
│   ├── Copyright.astro
│   ├── Footer.astro
│   ├── Header.astro
│   └── Navigation.astro
├── layouts/BaseLayout.astro  # 唯一布局组件（含主题切换、OGP meta、ClientRouter、CodeCopy、Pagefind modal）
├── pages/
│   ├── posts/[id].astro  # 文章详情页（含 data-pagefind-body）
│   ├── tags/             # 标签索引页
│   ├── meow.ts           # API 路由（非 GET 请求受限：仅特定 origin + User-Agent "catgirl" 可访问）
│   ├── drafts.astro      # 草稿列表（含 Telegram 入口）
│   ├── telegram.astro    # Telegram 集成页面
│   ├── about.astro       # 关于页面
│   └── 404.astro         # 404 页面
├── posts/                # .md / .mdx 博客文章（通过 astro:content 加载）
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
├── utils/date.ts         # 日期工具函数（基于 dayjs）
├── middleware.ts         # Astro 中间件
├── content.config.ts     # Content collections 定义与 Zod schema
├── post-edit/main.rs     # Rust CLI 入口
└── env.d.ts              # 环境类型声明
```

**注意**：

- `src/rust/` 目录存在但为空；Rust 项目入口在 `src/post-edit/main.rs`
- 图片 fallback 方案：用 `data-gravatar-fallback` 属性 + `src/scripts/gravatar-fallback.ts`，避免内联 `onerror` 触发 ts(6133)
- Pagefind 搜索：构建时自动生成索引到 `dist/client/pagefind/`，开发模式通过 `ln -sf` 链接到 `public/pagefind`

## 文章内容规范

### Frontmatter 字段（由 `src/content.config.ts` 定义）

```yaml
title: string # 必填
publishDate: date # 由 remarkPublishDate 插件从 git log 自动派生（也可手动指定）
updatedDate: date # 由 remarkUpdatedDate 插件自动从 git log 派生
description: string # 可选
tags: string[] # 可选
draft: boolean # 可选，默认 false
```

**注意**：字段是 `publishDate` 而非 `date`。草稿文件放 `src/posts/drafts/` 或 frontmatter 设 `draft: true`。

### Astro config 特殊行为

- `adapter: node({ mode: "standalone" })` —— Node 独立模式
- `site: "https://lihua.codeberg.page"`（被 `SITE_URL` 环境变量覆盖）
- `trailingSlash: "ignore"`
- `security: { checkOrigin: false }` —— 关闭 CSRF 检查
- `vite.build.cssMinify: "lightningcss"` —— CSS 压缩用 lightningcss
- remark 插件：`remarkPublishDate` + `remarkUpdatedDate` 自动从 git 历史注入日期到 frontmatter

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
