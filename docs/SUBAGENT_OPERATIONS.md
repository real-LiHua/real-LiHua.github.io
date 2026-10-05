# Sub-agent Operations Quick Reference

## Daily Commands

| Action       | Command                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| 查看任务状态 | `cat .agents/tasks/phase-X/N.progress`                                                                    |
| 领取任务     | `pnpm exec tsx .agents/scripts/task-claim.ts 1.1 --assignee frontend-architect`                           |
| 更新进度     | `pnpm exec tsx .agents/scripts/task-progress.ts 1.1 50 --msg "Implementing types"`                        |
| 上报阻塞     | `pnpm exec tsx .agents/scripts/task-progress.ts 1.1 --blocked "Need schema" --help-from content-engineer` |
| 完成任务     | `pnpm exec tsx .agents/scripts/task-complete.ts 1.1`                                                      |
| 跑质量门禁   | `pnpm exec tsx .agents/scripts/run-gate.ts frontend-architect`                                            |
| 回归检查     | `pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1`                                                |

## Phase 执行流程

```bash
# 1. 查看当前 Phase 任务
ls .agents/tasks/phase-1/

# 2. 识别可并行任务（无依赖）
# 例：1.1, 1.3, 1.5 可并行

# 3. 多角色并行领取
# Terminal 1 (content-engineer):
task-claim 1.1 --assignee content-engineer

# Terminal 2 (frontend-architect):
task-claim 1.3 --assignee frontend-architect

# 4. 开发过程中每 30min 更新进度
task-progress 1.1 30 --msg "Exported PostFrontmatter type"
task-progress 1.1 60 --msg "Updated content.ts imports"

# 5. 遇阻塞立即上报
task-progress 1.1 --blocked "Zod import error" --help-from quality-dx-guardian

# 6. 完成后跑门禁
task-complete 1.1
# 自动运行：tsc, oxlint, oxfmt, build + 角色专属门禁

# 7. 全 Phase 完成后验收
check-regression HEAD~1
```

## 常见场景

### 任务卡住 > 15min

```bash
task-progress <id> --blocked "<具体原因>" --help-from <目标角色>
# 等待协助，或自行解决后
task-progress <id> <percent> --msg "Resolved: <原因>"
```

### 门禁失败

```bash
task-complete 1.1
# ✗ Oxlint failed: ...
# 修复后
task-complete 1.1
```

### 需要跳过门禁（仅紧急情况）

```bash
task-complete 1.1 --skip-gate
# ⚠️ 会记录 gate.failure.json，需补门禁
```

### 并行任务冲突（同一文件）

```bash
# 串行执行或拆分更细粒度任务
# 原则：共享文件 = 串行
```

## 质量门禁速查

| 角色                      | 通用                      | 专属                    |
| ------------------------- | ------------------------- | ----------------------- |
| 全部                      | tsc, oxlint, oxfmt, build | —                       |
| frontend-architect        | ✓                         | playwright chromium     |
| content-engineer          | ✓                         | RSS/内容管道验证        |
| build-deploy-engineer     | ✓                         | lychee, vnu             |
| cli-tool-engineer         | ✓                         | cargo test/clippy/audit |
| search-discovery-engineer | ✓                         | Pagefind 索引存在       |
| quality-dx-guardian       | ✓                         | 全套 Playwright         |

## 生命周期操作

```bash
# 月度绩效评估（由 quality-dx-guardian 执行）
pnpm exec tsx .agents/scripts/lifecycle-monthly-review.ts

# 查看角色状态
cat .agents/lifecycle/performance-frontend-architect-2026-10.md

# 休眠闲置角色（自动：14天无任务）
# 手动唤醒
```

## 目录结构

```
.agents/
├── scripts/           # 核心脚本
│   ├── task-claim.ts
│   ├── task-progress.ts
│   ├── task-complete.ts
│   ├── run-gate.ts
│   └── check-regression.ts
├── tasks/
│   ├── phase-1/       # Phase 任务卡
│   ├── phase-2/
│   └── TASK_TEMPLATE.md
├── lifecycle/         # 绩效月报
│   └── performance-<role>-<YYYY-MM>.md
├── team/              # 团队拓扑
│   ├── skills-matrix.yaml
│   └── capacity-plan-<quarter>.md
├── contracts/         # 接口契约
│   ├── content-pipeline.ts
│   └── build-pipeline.ts
└── tech-debt/         # 技术债登记
    └── <adr-id>-<description>.md
```

## 关键原则

1. **只读任务卡** - 执行前完整阅读 `.md`
2. **心跳更新** - 长任务每 30min `task-progress`
3. **阻塞即报** - 卡住 > 15min 必须 `task-progress --blocked`
4. **产出物声明** - `task-complete` 前明确输出文件列表
5. **门禁自检** - `task-complete` 自动跑通用+专属门禁
6. **契约先行** - 接口变更先更新 `.agents/contracts/` 再实现

## 故障排查

| 现象                     | 原因              | 解决                                      |
| ------------------------ | ----------------- | ----------------------------------------- |
| `task-claim` 找不到任务  | 路径错误          | 检查 `.agents/tasks/phase-X/`             |
| `task-complete` 门禁挂起 | 端口占用/进程残留 | `pkill -f playwright; pkill -f cargo`     |
| `check-regression` 报错  | git stash 冲突    | 手动 `git stash; git checkout <sha>; ...` |
| 进度文件不更新           | 权限问题          | `chmod +x .agents/scripts/*.ts`           |

## 联系人

| 角色                      | 擅长领域                      | 找TA解决             |
| ------------------------- | ----------------------------- | -------------------- |
| frontend-architect        | 组件、主题、View Transitions  | UI/交互/样式问题     |
| content-engineer          | Content Collections、MDX、RSS | 内容管道/类型/渲染   |
| build-deploy-engineer     | CI/CD、Astro集成、部署        | 构建失败/部署异常    |
| cli-tool-engineer         | Rust CLI、post-edit           | CLI 功能/测试/发布   |
| search-discovery-engineer | Pagefind、搜索算法            | 搜索不工作/索引异常  |
| quality-dx-guardian       | Lint/Type/Test/架构治理       | 质量门禁/规范/技术债 |

---

## Technical Reference (from Official Docs)

### Astro 7 Content Collections

- **Glob Loader** (`astro/loaders`): `glob({ pattern: "**/*.{md,mdx}", base: "./src/posts" })` — 支持 `generateId`、`retainBody` (v5.17+)、`pattern` 数组
- **Schema** (`astro/zod`): Zod 4 语法，`z.coerce.date()`、`z.array(z.string())`、`.optional()`、`.nullable()`，自动生成 TS 类型
- **Markdown 处理器**: **Satteri** (`@astrojs/markdown-satteri`) 替代已弃用的 remark/rehype，提供 `MdastPlugin`/`HastPlugin` 插件系统（heading IDs、外链标记、Mermaid 渲染、日期自动填充、表格对齐）
- **Render**: `render(entry)` → `{ Content, headings, remarkPluginFrontmatter }`，`Content` 为 Astro 组件
- **查询**: `getCollection("blog", filter?)`、`getEntry("blog", id)`、`getEntries()`
- **RSS**: `@astrojs/rss` + `pagesGlobToRssItems(import.meta.glob)` 或 `rssSchema` 强制字段
- **Sitemap**: `@astrojs/sitemap` v3.7+ 支持 `chunks` 分片、`namespaces` 排除、`ChangeFreqEnum`

### Astro Integrations & Hooks

- **钩子**: `astro:config:setup` (配置)、`astro:build:start` (构建前)、`astro:build:done` (构建后)、`astro:routes:resolved` (路由解析后)
- **IntegrationResolvedRoute**: `pattern`、`component`、`prerender`、`params`、`generateId`
- **Logger**: `astro:build:done` 等钩子接收 `logger: AstroIntegrationLogger`

### View Transitions (SPA Mode)

- **ClientRouter**: `<ClientRouter fallback="animate|swap|none" />`，`animate` 默认模拟转场
- **生命周期**: `astro:before-preparation` → `astro:after-preparation` → `astro:before-swap` → `astro:after-swap` → `astro:page-load`
- **脚本重执行**: `<script is:inline data-astro-rerun>` 强制每次导航执行，或监听 `astro:page-load`
- **转场指令**: `transition:name`、`transition:animate` (fade/slide/custom)、`transition:persist`
- **表单**: `<form data-astro-reload>` 退出 SPA 模式

### Middleware

- `src/middleware/index.ts` 导出 `onRequest(context, next)`，可读写 `context.locals` 跨组件共享
- 预渲染时运行，按需渲染时每请求运行，Cookie/Headers 仅 SSR 可用

### Image Optimization

- **Sharp** (默认): `image.service.entrypoint: 'astro/assets/services/sharp'`，配置 `limitInputPixels`、`webp`/`jpeg`/`avif`/`png` encoder 选项
- **Passthrough**: `passthroughImageService()` 绕过处理，适配 Cloudflare Workers 等边缘环境
- **Endpoint**: `image.endpoint.route` 自定义图片服务路由

### Tailwind CSS 4 + daisyUI 5

- **CSS-first**: `@import "tailwindcss"; @plugin "@tailwindcss/typography"; @plugin "daisyui";`
- **主题**: `@plugin "daisyui/theme" { name: "light"; prefersdark: false; color-scheme: "light"; --color-*: ... }`
- **Typography**: `@tailwindcss/typography` 通过 `--tw-prose-*` CSS 变量控制，`[data-theme="dark"]` 覆盖
- **Vite 插件**: `@tailwindcss/vite` 集成

### Pagefind

- **模块化 UI**: `Instance({ bundlePath })` + `Input({ containerElement })` + `ResultList({ containerElement, resultTemplate })`
- **声明式**: `<pagefind-config base-url="/" bundle-path="/pagefind/"><pagefind-input><pagefind-results>`
- **CSS 变量**: `--pagefind-ui-primary`、`--pagefind-ui-background`、`--pagefind-ui-text`、`body.dark` 覆盖
- **结果模板**: `<script type="text/pagefind-template">` 内部 `{{ meta.title }}`、`{{ url | safeUrl }}`、`{{+ excerpt +}}`

### Oxlint / Oxfmt

- **配置**: `.oxlintrc.json` (ESLint 兼容) 或 `oxlint.config.ts` (`defineConfig`)，支持 `overrides` 按 glob 差异化
- **类型感知**: `typeAware: true` 需 `oxlint-tsgolint`，规则前缀 `typescript/`
- **Oxfmt**: `oxfmt.config.ts` (`defineConfig`)，`embeddedLanguageFormatting: "auto"`，Tailwind class 排序内置
- **忽略**: `.oxfmtrc.json` `ignorePatterns: ["dist/**", "*.min.js"]`
