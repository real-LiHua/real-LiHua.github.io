# AGENTS 知识库快速导航卡

## 三层金字塔

```
L1: AGENTS.md          ← 始终加载 (步骤 + 指针)
    ├─ "模块边界、数据流" → docs/adr/0001-functional-architecture.md
    ├─ "安全基线、威胁模型" → docs/SECURITY_WHITEPAPER.md
    ├─ "子智能体命令、故障排查" → docs/SUBAGENT_OPERATIONS.md
    ├─ "草稿隔离、Git submodule" → docs/adr/0002-draft-isolation-submodule.md
    ├─ "角色/生命周期/内控" → docs/adr/0003-subagent-responsibilities-controls.md
    └─ "知识库架构/指针规范" → docs/adr/0004-agents-knowledge-base-architecture.md

L2: 领域文档          ← 按需加载
    CONTEXT.md              # 15 术语单一源头
    REFACTOR_PLAN.md        # 8 阶段重构计划
    docs/adr/0001..0004.md  # 架构决策记录
    docs/SECURITY_WHITEPAPER.md
    docs/SUBAGENT_OPERATIONS.md
    docs/architecture-map.md

L3: 环境/代码          ← 直接查看
    src/modules/*.ts        # 7 深度模块接口
    package.json scripts    # 命令源头
    .agents/scripts/*.ts    # 可执行工具
```

## 核心术语 (CONTEXT.md)

| 术语                   | 含义                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Post**               | 博客文章，含 frontmatter + MDX 正文，id 基于文件路径生成 slug                                                                                                      |
| **Draft**              | 位于 `src/posts/drafts/` 的 Post，仅开发环境可见，构建不生成路由                                                                                                   |
| **Frontmatter**        | YAML 元数据，经 ZodSchema 验证后成为类型安全的 PostFrontmatter                                                                                                     |
| **GlobLoader**         | `astro/loaders` 的 `glob()` 加载器，支持 pattern/base/generateId/retainBody                                                                                        |
| **ZodSchema**          | `astro/zod` 导出的 Zod 4，`z.coerce.date()`、`z.array(z.string())` 自动生成 TS 类型                                                                                |
| **RenderFunction**     | `render(entry)` → `{ Content, headings, remarkPluginFrontmatter }`，Content 为 Astro 组件                                                                          |
| **ContentCollections** | `defineCollection` + `getCollection/getEntry` 统一查询，支持构建时/实时两种                                                                                        |
| **BuildPipeline**      | 统一构建后处理：Pagefind → lychee → vnu → Mermaid → Watermark                                                                                                      |
| **ThemeSystem**        | CSS Token + daisyUI 主题 + prose 适配 + 运行时切换                                                                                                                 |
| **ClientRuntime**      | 统一客户端入口 + 9 ClientModule 注册表 + 生命周期分发                                                                                                              |
| **TelegramAuth**       | 文章级访问控制：前端墙 + JWT 轮询 + Bot 深度链接                                                                                                                   |
| **Deep Module**        | 小接口大实现，隐藏复杂度 (Ousterhout)                                                                                                                              |
| **Seam**               | 模块接口位置 (Feathers 术语)                                                                                                                                       |
| **AstroIntegration**   | 通过 `astro:config:setup` 等钩子扩展构建，接收 `logger`                                                                                                            |
| **ViewTransitions**    | SPA 模式转场，`<ClientRouter />` + 5 个生命周期事件                                                                                                                |
| **Middleware**         | `onRequest(context, next)` 拦截请求，`context.locals` 共享数据                                                                                                     |
| **ImageOptimization**  | Sharp 默认 / Passthrough 绕过，`image.service` / `image.endpoint` 配置                                                                                             |
| **RSSGeneration**      | `@astrojs/rss` + `pagesGlobToRssItems` / `rssSchema`                                                                                                               |
| **SitemapGeneration**  | `@astrojs/sitemap` chunks 分片、namespaces 排除、ChangeFreqEnum                                                                                                    |
| **TailwindCSS4**       | CSS-first `@import "tailwindcss"` + `@plugin`，无配置文件                                                                                                          |
| **DaisyUI5**           | `@plugin "daisyui/theme"` CSS 变量驱动，prefersdark 自动适配                                                                                                       |
| **TypographyPlugin**   | `@tailwindcss/typography` prose 类族，`--tw-prose-*` CSS 变量                                                                                                      |
| **PagefindModularUI**  | `Instance/Input/ResultList` 组件化，bundlePath/ranking/mergeIndex 配置                                                                                             |
| **PagefindConfig**     | `<pagefind-config>` 声明式，base-url/bundle-path/excerpt-length/highlight-param                                                                                    |
| **PagefindCSSVars**    | `--pagefind-ui-*` 样式变量，body.dark 自动适配深色                                                                                                                 |
| **Oxlint**             | Oxc 高性能 linter，`.oxlintrc.json`/`.config.ts`，overrides 差异化，typeAware 类型感知                                                                             |
| **Oxfmt**              | Oxc 格式化，`embeddedLanguageFormatting: "auto"`，Tailwind class 排序                                                                                              |
| **TypeAwareLinting**   | tsgolint (Go) 语义分析，typescript/ 前缀规则                                                                                                                       |
| **PrivateSubmodule**   | 私有 Git 仓库子模块挂载 drafts/，Deploy Key 只读，物理隔离                                                                                                         |
| **Satteri**            | 替代 remark/rehype 的 Markdown 处理器（`@astrojs/markdown-satteri`），`MdastPlugin`/`HastPlugin` 插件系统，构建时 AST 转换：heading IDs、外链、Mermaid、日期、表格 |

## 角色速查

| 角色                        | 必读 L2                               | 专属门禁                |
| --------------------------- | ------------------------------------- | ----------------------- |
| `frontend-architect`        | 0001, 0005, 0006, SUBAGENT_OPERATIONS | Playwright Chromium     |
| `content-engineer`          | 0001, 0002, REFACTOR_PLAN             | 内容管道+RSS验证        |
| `build-deploy-engineer`     | 0001, 0003, SECURITY_WHITEPAPER       | lychee+vnu              |
| `cli-tool-engineer`         | 0003, REFACTOR_PLAN                   | cargo test/clippy/audit |
| `search-discovery-engineer` | 0001, 0006, architecture-map          | Pagefind索引存在        |
| `quality-dx-guardian`       | 全部 ADR, SUBAGENT_OPERATIONS         | 全套Playwright          |

## 常用命令

```bash
# 任务操作
pnpm exec tsx .agents/scripts/task-claim.ts 1.1 --assignee content-engineer
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 50 --msg "Exported types"
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 --blocked "Need schema" --help-from quality-dx-guardian
pnpm exec tsx .agents/scripts/task-complete.ts 1.1

# 质量门禁
pnpm exec tsx .agents/scripts/run-gate.ts frontend-architect
pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1

# 开发
pnpm dev
pnpm check
pnpm build
pnpm playwright test
```

## 任务卡规范

````markdown
# Task N: <Title>

## Metadata

- ID, Phase, Assignee, Status, Dependencies, Estimated Hours

## Inputs

- Files: [输入文件]
- Specs: [docs/adr/0001-functional-architecture.md#3.1]
- Contracts: [src/modules/build-pipeline.ts]

## Acceptance Criteria

- [ ] 可验证标准

## Verification Commands

```bash
pnpm check && pnpm build
pnpm playwright test --project=chromium  # 角色专属
```
````

## Outputs

- Files, Tests, Contracts 更新

## Context (handoff)

```json
{ "exports": {}, "contracts": {}, "notes": "" }
```

```

## 指针写法对照

| 场景 | ❌ 差 | ✅ 好 |
|------|------|------|
| 安全审查 | "详见白皮书" | "CSP策略、Telegram认证、构建管线安全 → `docs/SECURITY_WHITEPAPER.md`" |
| 模块边界 | "看架构文档" | "C4模型、深度模块边界、数据流 → `docs/adr/0001-functional-architecture.md`" |
| 子智能体操作 | "看操作手册" | "任务领取/进度/阻塞/门禁命令 → `docs/SUBAGENT_OPERATIONS.md`" |

## 导向词

- **tight** = 快速、确定性、低开销
- **red** = 二进制可观测失败态
- **seam** = 模块接口位置
- **deep** = 小接口大实现
- **red-green-refactor** = TDD循环
- **tracer-bullet** = 端到端最小可行路径

## 目录速查

```

.agents/
├── scripts/task-claim.ts, task-progress.ts, task-complete.ts, run-gate.ts, check-regression.ts
├── tasks/phase-1..8/ # 任务卡
├── contracts/ # 接口契约 (TS/Zod)
├── lifecycle/ # 月度绩效报告
├── team/ # 技能矩阵、容量规划
└── tech-debt/ # 技术债登记

src/modules/
├── index.ts # 统一导出
├── types.ts # 共享类型
├── content-pipeline.ts
├── build-pipeline.ts
├── theme-system.ts
├── search.ts
├── client-runtime.ts
├── telegram-auth.ts
└── ui-components.ts

````

## 维护节奏

| 动作 | 频率 | 责任 |
|------|------|------|
| 术语同步检查 | Phase 结束 | quality-dx-guardian |
| ADR 过期审查 | 季度 | 全员 |
| 指针失效扫描 | 月度 | quality-dx-guardian |
| 任务卡归档 | Phase 完成 | 对应角色 |
| 健康度评估 | 季度 | 全员 |

---

## 常用 API 模式速查

### Content Collections
```typescript
// src/content.config.ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/posts" }),
  schema: z.object({
    title: z.string(),
    publishDate: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
  }),
});
export const collections = { blog };

// 页面中查询
import { getCollection, getEntry, render } from "astro:content";
const posts = await getCollection("blog", ({ id }) => !id.startsWith("drafts/"));
const { Content, headings } = await render(post);
````

### View Transitions

```astro
---
import { ClientRouter } from "astro:transitions";
---
<html>
<head><ClientRouter fallback="animate" /></head>
<body>
  <a href="/next" transition:name="hero">Next</a>
  <script is:inline>
    document.addEventListener("astro:page-load", () => { /* ... */ });
  </script>
</body>
</html>
```

### Middleware

```typescript
// src/middleware/index.ts
export async function onRequest(context, next) {
  context.locals.user = await getUser(context.cookies.get("session"));
  return next();
}
```

### Image Optimization

```astro
---
import { Image } from "astro:assets";
import myImage from "./hero.png";
---
<Image src={myImage} width={800} height={400} alt="Hero" />
```

### Tailwind CSS 4 + daisyUI 5

```css
/* global.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "daisyui";
@plugin "daisyui/theme" {
  name: "light";
  --color-primary: oklch(60% 0.15 250);
}
```

### Pagefind

```html
<pagefind-config base-url="/" bundle-path="/pagefind/">
  <pagefind-input placeholder="搜索...">
    <pagefind-results>
      <script type="text/pagefind-template">
        <li>{{ meta.title }} <a href="{{ url | safeUrl }}">{{ url }}</a></li>
      </script>
    </pagefind-results></pagefind-input
  ></pagefind-config
>
```

### Oxlint / Oxfmt

```jsonc
// .oxlintrc.json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "rules": { "no-unused-vars": "error" },
  "overrides": [{ "files": ["*.astro"], "rules": { "no-unused-vars": "off" } }],
}
```

```typescript
// oxlint.config.ts
import { defineConfig } from "oxlint";
export default defineConfig({
  options: { typeAware: true },
  overrides: [{ files: ["**/*.ts"], rules: { "typescript/no-explicit-any": "error" } }],
});
```
