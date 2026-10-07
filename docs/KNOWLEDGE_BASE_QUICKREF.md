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
| **tgcloud**            | Telegram 的无服务器平台，运行在 V8 隔离环境中，类似 wrangler/vercel + drizzle-kit                                                                                  |
| **tgcloud SDK**        | 提供 `db` (数据库), `api` (Bot API), `fetch` (HTTP), `console` (日志)                                                                                              |
| **BotApiError**        | tgcloud SDK 中 Bot API 调用失败时抛出的错误，含 `.code` `.description` `.method` `.parameters`                                                                      |
| **EndpointError**      | 拒绝 Mini App 调用的错误，抛出后返回 400 状态码                                                                                                                    |
| **InputFile**          | 文件上传对象，`new InputFile(bytes, filename, { type })`，用于 `api.sendDocument` 等                                                                               |
| **TelegramAuth (Bot)** | tgcloud Bot 认证：通过深度链接验证群成员身份，签发 JWT (15min)                                                                                                     |

## 角色速查

| 角色                        | 必读 L2                                     | 专属门禁                  |
| --------------------------- | ------------------------------------------- | ------------------------- |
| `frontend-architect`        | 0001, 0005, 0006, SUBAGENT_OPERATIONS       | Playwright Chromium       |
| `content-engineer`          | 0001, 0002, REFACTOR_PLAN                   | 内容管道+RSS验证          |
| `build-deploy-engineer`     | 0001, 0003, SECURITY_WHITEPAPER             | lychee+vnu                |
| `cli-tool-engineer`         | 0003, REFACTOR_PLAN                         | cargo test/clippy/audit   |
| `search-discovery-engineer` | 0001, 0006, architecture-map                | Pagefind索引存在          |
| `quality-dx-guardian`       | 全部 ADR, SUBAGENT_OPERATIONS               | 全套Playwright            |

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

# tgcloud Telegram Bot
pnpm status           # 检查本地 vs 云端状态
pnpm deploy           # 部署到 tgcloud
pnpm exec tgcloud migrate   # 应用数据库架构变更
pnpm run <module>           # 本地运行 handler/endpoint (tgcloud run)
pnpm exec tgcloud webhook   # 检查/同步 bot webhook
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

---

## tgcloud SDK 常用模式

### Handler (消息处理)
```javascript
// handlers/message.js
import { api } from 'sdk';

export default async function (message, ctx) {
  // message: Telegram Message 对象
  // ctx.update: 完整的 Update 对象
  await api.sendMessage({
    chat_id: message.chat.id,
    text: `You said: ${message.text ?? '(no text)'}`,
  });
}
```

### Endpoint (Mini App 调用)
```javascript
// endpoints/getProfile.js
import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { profiles } from '../schema.js';

export default async function (input, ctx) {
  // input: Mini App 传入的 JSON 对象
  // ctx.initData: 验证过的 Telegram WebApp initData (含 user 信息)
  const user = ctx.initData.user;
  const row = await db.select().from(profiles).where(eq(profiles.userId, user.id)).get();
  if (!row) throw new EndpointError('Profile not found', { code: 'NOT_FOUND' });
  return row; // 自动包装为 { ok: true, result: row }
}
```

### Database (db) 查询
```javascript
import { db, eq, sql } from 'sdk/db';
import { users, posts } from '../schema.js';

// 查询
const user = await db.select().from(users).where(eq(users.tgId, 12345)).get();
const posts = await db.select().from(posts).where(eq(posts.userId, user.id)).all();

// 插入
await db.insert(posts).values({ userId: user.id, text: 'Hello' }).run();

// 更新
await db.update(posts).set({ done: true }).where(eq(posts.id, 1)).run();

// 删除
await db.delete(posts).where(eq(posts.id, 1)).run();

// 原始 SQL
await db.run(sql`UPDATE posts SET done = 1 WHERE id = ${1}`);
```

### Bot API (api)
```javascript
import { api, BotApiError } from 'sdk';

// 发送消息
await api.sendMessage({ chat_id: id, text: 'Hello!' });

// 编辑消息
await api.editMessageText({ chat_id, message_id, text: 'Updated' });

// 错误处理
try {
  await api.deleteMessage({ chat_id, message_id });
} catch (e) {
  if (e.code !== 400) throw e; // 400 = 已删除，忽略
}
```

### HTTP (fetch)
```javascript
import { fetch } from 'sdk';

const res = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice' }),
});
if (!res.ok) throw new Error(res.statusText);
const data = await res.json();
```

### 文件上传
```javascript
import { InputFile } from 'sdk';

await api.sendDocument({
  chat_id,
  document: new InputFile(bytes, 'a.pdf', { type: 'application/pdf' })
});
```

### 文件下载
```javascript
const bytes = await api.getFileContent(file_id); // Uint8Array
const stream = await api.getFileStream(file_id);
for await (const chunk of stream.body) { /* Uint8Array */ }
```

### 本地测试
```bash
# 运行 handler/endpoint
pnpm exec tgcloud run handlers/message '{"chat":{"id":1},"text":"hello"}'
pnpm exec tgcloud run endpoints/getProfile '{}' --ctx '{ "initData": { "user": { "id": 1 } } }'

# 检查 webhook
pnpm exec tgcloud webhook
pnpm exec tgcloud webhook sync
```

### 部署与迁移
```bash
pnpm exec tgcloud push      # 部署代码
pnpm exec tgcloud migrate   # 应用 schema 变更
pnpm exec tgcloud status    # 查看本地 vs 云端差异
pnpm exec tgcloud webhook sync  # 同步 webhook
```
