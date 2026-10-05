# 角色指南：内容工程师

**角色 ID**：`content-engineer`  
**类型**：Stream-aligned  
**核心职责**：Content Collections、MDX 管线、Zod Schema、RSS/SEO、Satteri 插件

---

## 1. 核心领域

| 领域 | 关键文件 | 关注点 |
|------|----------|--------|
| **Content Collections** | `src/content.config.ts` | Glob Loader、Zod Schema、类型导出 |
| **MDX/Markdown 管线** | `src/integrations/satteri-config.ts` | Satteri 插件、渲染、heading IDs、外链 |
| **RSS/SEO** | `src/pages/rss.xml.js`、`src/pages/sitemap-index.xml.js` | `rssSchema`、分片站点地图 |
| **类型系统** | `src/modules/types.ts`、`src/utils/content.ts` | `PostFrontmatter`、`TelegramAuthConfig`、`BlogCollection` |
| **日期工具** | `src/utils/date.ts` | `formatDate`、`sortByDate` |

---

## 2. 必读文档

| 文档 | 重点章节 |
|------|----------|
| `AGENTS.md` | Technical Reference → Astro 7 Content Collections、Satteri 替代 remark/rehype |
| `docs/adr/0001-functional-architecture.md` | 3.1 ContentPipeline Module |
| `docs/adr/0002-draft-isolation-submodule.md` | 草稿隔离方案 |
| `docs/adr/0005-knowledge-update-process.md` | L1-L3 触发层、术语更新流程 |
| `docs/SUBAGENT_OPERATIONS.md` | Technical Reference → Content Collections |
| `CONTEXT.md` | 33 核心术语（Post、Draft、Frontmatter、Collection 等） |

---

## 3. 专属质量门禁

```bash
# 本地预跑
pnpm exec tsx .agents/scripts/run-gate.ts content-engineer

# 等价于
pnpm tsc -b && pnpm oxlint && pnpm oxfmt --check && pnpm build
pnpm build && node -e "require('./dist/server/entry.mjs')"
```

**通过标准**：无 Markdown 错误、RSS 生成有效、Content Collections 类型检查通过。

---

## 3. 核心交付物

| 交付物 | 位置 | 验收标准 |
|--------|------|----------|
| **Content Collections Schema** | `src/content.config.ts` | Zod 4 语法、自动 TS 类型、`telegramAuth` 可选 |
| **类型导出** | `src/modules/types.ts` | `PostFrontmatter`、`TelegramAuthConfig`、`BlogCollection` |
| **内容工具函数** | `src/utils/content.ts` | `getPublishedPosts`/`getDraftPosts`/`getAllPosts`/`renderPost` |
| **Satteri 管线** | `src/integrations/satteri-config.ts` | `MdastPlugin`/`HastPlugin`、heading IDs、外链、Mermaid、日期自动填充 |
| **RSS/站点地图** | `src/pages/rss.xml.js` | `rssSchema` 强制字段、分片站点地图 |

---

## 4. 核心开发模式

### 4.1 Content Collections 配置

```typescript
// src/content.config.ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ base: "./src/posts", pattern: "**/*.md{,x}" }),
  schema: z.object({
    title: z.coerce.string(),
    description: z.string().optional().nullable(),
    publishDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
    authors: z.array(z.string()).optional(),
    image: z.string().optional(),
    telegramAuth: z.object({
      enabled: z.boolean(),
      groupId: z.string(),
      groupName: z.string().optional(),
      customMessage: z.string().optional(),
    }).optional(),
  }),
});

export const collections = { blog };
```

### 4.2 类型导出与复用

```typescript
// src/modules/types.ts
import { z } from "astro/zod";
import type { CollectionEntry } from "astro:content";

export const postFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  publishDate: z.coerce.date().optional(),
  updatedDate: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
  authors: z.array(z.string()).optional(),
  image: z.string().optional(),
  telegramAuth: z.object({
    enabled: z.boolean(),
    groupId: z.string(),
    groupName: z.string().optional(),
    customMessage: z.string().optional(),
  }).optional(),
});

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;
export type BlogCollection = CollectionEntry<"blog">;
```

### 4.3 内容工具函数

```typescript
// src/utils/content.ts
import { getCollection } from "astro:content";

export const getPublishedPosts = () =>
  getCollection("blog", ({ id }) => !id.startsWith("drafts/"));

export const getDraftPosts = () =>
  getCollection("blog", ({ id }) => id.startsWith("drafts/"));

export const getAllPosts = () => getCollection("blog");

export const isDraftEntry = (entry: { id: string }) => entry.id.startsWith("drafts/");
```

### 4.4 页面中查询与渲染

```astro
---
import { getCollection, getEntry, render } from "astro:content";
import { contentPipeline } from "@/modules";

const posts = await contentPipeline.getPublishedPosts();
const { Content, headings } = await render(post);
---

<Content />
<nav>
  {headings.map(h => <a href={`#${h.slug}`}>{h.text}</a>)}
</nav>
```

### 4.5 Satteri 管线配置

```typescript
// src/integrations/satteri-config.ts
import { satteri, satteriHeadingIdsPlugin } from "@astrojs/markdown-satteri";
import { mermaidMdast, mermaidHast } from "@xingwangzhe/satteri-mermaid";
import { satteriExternalLinks } from "../plugins/satteri-external-links";

export const satteriConfigIntegration = () => ({
  hooks: {
    "astro:config:setup": ({ updateConfig, config }) => {
      updateConfig({
        markdown: {
          processor: satteri({
            hastPlugins: [
              mermaidHast(),
              satteriHeadingIdsPlugin,
              satteriExternalLinks(config.site ?? "http://localhost:4321"),
            ],
            mdastPlugins: [mermaidMdast()],
          }),
        },
      });
    },
  },
  name: "satteri-config",
});
```

---

## 5. 专属质量门禁细则

| 检查项 | 工具 | 标准 |
|--------|------|------|
| **类型安全** | `pnpm tsc -b` | 0 errors、无 `any` 泄漏、所有类型从 `types.ts` 导出 |
| **Lint** | `pnpm oxlint` | 0 errors |
| **格式** | `pnpm oxfmt --check` | 0 diffs |
| **构建** | `pnpm build` | success、无 Markdown 警告 |
| **内容管道** | `node -e "require('./dist/server/entry.mjs')"` | 无渲染错误、RSS XML 有效 |
| **类型导出** | `grep -r "as unknown as" src/pages/` | 0 结果（消除类型断言） |

---

## 6. 常见任务类型

| 任务类型 | 典型触发 | 关键产出 |
|----------|----------|----------|
| **Schema 变更** | 新字段/类型调整 | `content.config.ts` + `types.ts` + 页面类型更新 |
| **Satteri 插件开发** | 新 Markdown 功能 | `MdastPlugin`/`HastPlugin` + 单测 |
| **RSS/SEO 优化** | SEO 需求 | `rssSchema` 强制字段、分片站点地图 |
| **草稿隔离** | 安全需求 | 私有子模块配置 + CI 挂载 |
| **类型收窄** | 消除 `as unknown as` | `types.ts` 导出 + 页面导入 |

---

## 7. 常见坑与规避

| 坑 | 症状 | 规避 |
|----|------|------|
| **remark/rehype 已弃用** | 构建警告、类型报错 | 全面迁移到 Satteri (`@astrojs/markdown-satteri`) |
| **Zod 4 语法变化** | Schema 报错 | 用 `z.coerce.date()`、`z.array(z.string())` |
| **类型断言泄漏** | 页面出现 `as unknown as` | `types.ts` 导出精确类型、页面 `import` 使用 |
| **草稿泄露** | 生产环境出现草稿 | 物理隔离：私有子模块挂载 `src/posts/drafts/` |
| **日期类型不匹配** | `publishDate` 解析失败 | `z.coerce.date()` + `formatDate` 统一格式 |
| **RSS 字段缺失** | 验证失败 | 用 `rssSchema` 强制 `title`/`link`/`pubDate` |

---

## 8. 关键文件清单

```
src/
├── content.config.ts              # Collections 定义
├── modules/
│   ├── types.ts                   # 共享类型导出
│   ├── content-pipeline.ts        # 内容管道接口
│   └── content-pipeline.ts        # 实现（代理 utils/content.ts）
├── integrations/
│   └── satteri-config.ts          # Satteri 管线配置
├── plugins/
│   ├── satteri-external-links.ts  # 外链标记插件
│   └── mdast-toc.ts               # TOC 生成插件
├── utils/
│   ├── content.ts                 # getPublishedPosts 等工具
│   └── date.ts                    # formatDate、sortByDate
├── pages/
│   ├── rss.xml.js                 # RSS 端点
│   ├── sitemap-index.xml.js       # 站点地图
│   └── posts/
│       ├── index.astro            # 文章列表
│       └── [id].astro             # 文章详情（含 TOC、TelegramAuthWall）
└── posts/                         # 内容源
    ├── *.md / *.mdx
    └── drafts/                    # 私有子模块挂载点
```

---

## 9. 协作接口

| 依赖角色 | 协作内容 | 接口 |
|----------|----------|------|
| `frontend-architect` | 文章组件 Props、TOC 数据 | `contentPipeline.renderPost()` 返回 `Content`、`headings` |
| `build-deploy-engineer` | RSS/站点地图生成 | `contentPipeline.getPublishedPosts()` |
| `search-discovery-engineer` | 搜索索引源数据 | `getPublishedPosts()` 返回完整前置数据 |
| `quality-dx-guardian` | Schema 规范、类型规范 | oxlint/oxfmt/TypeScript 配置 |

---

## 10. 学习资源

| 资源 | 链接 |
|------|------|
| Astro Content Collections | https://docs.astro.build/en/guides/content-collections/ |
| Astro Zod Schema | https://docs.astro.build/en/reference/modules/astro-zod/ |
| Satteri 插件系统 | https://github.com/astrojs/markdown-satteri |
| Astro RSS | https://docs.astro.build/en/guides/rss/ |
| Astro Sitemap | https://docs.astro.build/en/guides/integrations-guide/sitemap/ |

---

**核心口诀**：Schema 定义类型 → Types 导出复用 → Satteri 管线处理 → 工具函数封装 → 页面零类型断言 → RSS/Sitemap 自动生成