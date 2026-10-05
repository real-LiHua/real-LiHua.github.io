# 角色指南：搜索发现工程师

**角色 ID**：`search-discovery-engineer`  
**类型**：Complicated-Subsystem  
**核心职责**：Pagefind 索引生成、搜索 UI 组件、标签系统、推荐算法、语义搜索

---

## 1. 核心领域

| 领域 | 关键文件 | 关注点 |
|------|----------|--------|
| **Pagefind 索引** | `src/modules/search.ts`、`build-hooks.ts` | 索引生成、增量更新、分片 |
| **搜索 UI** | `src/components/PagefindSearch.astro` | 模块化 UI、声明式配置、主题适配 |
| **标签系统** | `src/components/common/Tag.astro`、`src/pages/tags/` | 标签云、标签页、聚合 |
| **推荐算法** | `src/modules/search.ts` | 相关文章、语义相似度 |
| **语义搜索** | 待扩展 | 向量嵌入、混合检索 |

---

## 2. 必读文档

| 文档 | 重点章节 |
|------|----------|
| `AGENTS.md` | Technical Reference → Pagefind、Search Module |
| `docs/adr/0001-functional-architecture.md` | 3.4 Search Module、3.5 ClientRuntime |
| `docs/adr/0006-pagefind-ui-approach.md` (待创建) | 声明式 vs 模块化 UI 决策 |
| `docs/adr/0007-client-module-registry.md` (待创建) | 客户端模块注册表设计 |
| `docs/SUBAGENT_OPERATIONS.md` | Technical Reference → Pagefind |
| `docs/architecture-map.md` | 搜索模块依赖图、数据流 |

---

## 3. 专属质量门禁

```bash
# 本地预跑
pnpm exec tsx .agents/scripts/run-gate.ts search-discovery-engineer

# 等价于
pnpm tsc -b && pnpm oxlint && pnpm oxfmt --check && pnpm build
pnpm build && ls dist/client/pagefind/*.json
```

**通过标准**：Pagefind 索引文件存在、搜索功能可用、UI 组件渲染正常。

---

## 4. 核心交付物

| 交付物 | 位置 | 验收标准 |
|--------|------|----------|
| **Search Module 接口** | `src/modules/search.ts` | `generateIndex()`、`SearchComponentProps`、`search()` |
| **PagefindSearch 组件** | `src/components/PagefindSearch.astro` | 模块化/声明式 UI、CSS 变量主题适配 |
| **标签组件** | `src/components/common/Tag.astro` | 语义化、可配置尺寸/变体、链接生成 |
| **标签页** | `src/pages/tags/[tag].astro` | 分页、排序、SEO |
| **搜索索引生成** | `build-hooks.ts` | `pagefind` CLI、增量更新、分片配置 |

---

## 4. 核心开发模式

### 4.1 Search Module 接口

```typescript
// src/modules/search.ts
export interface SearchConfig {
  bundlePath?: string;        // 默认 "/pagefind/"
  placeholder?: string;       // 默认 "搜索文章..."
  theme?: "auto" | "light" | "dark";
}

export interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
  meta: Record<string, string[]>;
  score: number;
}

export interface SearchModule {
  generateIndex(distDir: URL): Promise<void>;
  SearchComponentProps: SearchConfig;
  search(query: string, options?: { filters?: Record<string, string[]> }): Promise<SearchResult[]>;
}
```

### 4.2 PagefindSearch 组件

```astro
---
// src/components/PagefindSearch.astro
interface Props {
  bundlePath?: string;
  placeholder?: string;
  theme?: "auto" | "light" | "dark";
}

const { bundlePath = "/pagefind/", placeholder = "搜索文章...", theme = "auto" } = Astro.props;
---

<!-- 声明式配置 -->
<pagefind-config 
  base-url="/" 
  bundle-path={bundlePath}
  excerpt-length="150"
  highlight-param="highlight"
>
  <pagefind-input 
    placeholder={placeholder}
    class="w-full"
  >
  </pagefind-input>
  <pagefind-results>
    <script type="text/pagefind-template">
      <li class="search-result p-3 hover:bg-base-200 rounded-lg transition-colors">
        <h3 class="font-medium text-base">{@meta.title}</h3>
        <a href="{@url | safeUrl}" class="text-sm opacity-60">{@url}</a>
        <p class="text-sm mt-1 line-clamp-2">{@+ excerpt +}</p>
      </li>
    </script>
  </pagefind-results>
</pagefind-config>

<!-- CSS 变量主题适配 -->
<style>
  :root {
    --pagefind-ui-primary: var(--color-primary);
    --pagefind-ui-background: var(--color-base-100);
    --pagefind-ui-text: var(--color-base-content);
    --pagefind-ui-border: var(--color-base-300);
  }
  [data-theme="dark"] {
    --pagefind-ui-primary: var(--color-primary);
    --pagefind-ui-background: var(--color-base-100);
    --pagefind-ui-text: var(--color-base-content);
    --pagefind-ui-border: var(--color-base-300);
  }
</style>

<!-- 模块化 UI 备选 -->
<script>
  import { Instance, Input, ResultList } from "@pagefind/modular-ui";
  // 仅在需要高级控制时启用
</script>
```

### 4.3 标签系统

```astro
<!-- src/components/common/Tag.astro -->
interface Props {
  tag: string;
  href?: string;           // 默认 `/tags/{tag}/`
  size?: "xs" | "sm" | "md";
  variant?: "ghost" | "outline" | "soft" | "solid";
}

const { tag, href = `/tags/${tag}/`, size = "sm", variant = "ghost" } = Astro.props;

<a href={href} class={`badge badge-${size} badge-${variant}`}>
  {tag}
</a>
```

```astro
<!-- src/pages/tags/[tag].astro ---
import { getCollection } from "astro:content";
import Tag from "../../components/common/Tag.astro";

export async function getStaticPaths() {
  const posts = await getCollection("blog", ({ data }) => data.tags?.length);
  const tags = [...new Set(posts.flatMap(p => p.data.tags || []))];
  return tags.map(tag => ({ params: { tag } }));
}

const { tag } = Astro.params;
const posts = (await getCollection("blog"))
  .filter(p => p.data.tags?.includes(tag))
  .sort((a, b) => b.data.publishDate?.getTime() - a.data.publishDate?.getTime());
---

<h1 class="text-2xl font-medium mb-4">标签：{tag}</h1>
<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {posts.map(post => (
    <article class="card bg-base-100 border-base-200">
      <div class="card-body">
        <time class="text-xs opacity-40">{formatDate(post.data.publishDate)}</time>
        <h2 class="card-title"><a href={`/posts/${post.id}`}>{post.data.title}</a></h2>
        <div class="flex flex-wrap gap-1 mt-2">
          {post.data.tags?.map(t => <Tag tag={t} size="xs" />)}
        </div>
      </div>
    </article>
  ))}
</div>
```

---

## 5. 专属质量门禁细则

| 检查项 | 工具 | 标准 |
|--------|------|------|
| **索引生成** | `pnpm build && ls dist/client/pagefind/*.json` | 索引文件存在、非空 |
| **搜索功能** | Playwright E2E | 搜索框输入 → 结果渲染 → 点击跳转正常 |
| **UI 组件** | Playwright Chromium | 主题切换后样式正确、无控制台错误 |
| **类型安全** | `pnpm tsc -b` | 0 errors |
| **构建** | `pnpm build` | success |

---

## 6. 常见任务类型

| 任务类型 | 典型触发 | 关键产出 |
|----------|----------|----------|
| **Pagefind 配置调优** | 搜索体验优化 | `bundlePath`、`ranking`、`mergeIndex`、分片 |
| **搜索 UI 重构** | UX 改进 | 模块化 UI ↔ 声明式切换、主题适配 |
| **标签系统增强** | UX/SEO | 标签云、热门标签、标签云页面 |
| **推荐算法** | 相关文章 | 语义相似度、协同过滤、内容向量化 |
| **语义搜索扩展** | 智能搜索 | 向量嵌入、混合检索、重排序 |

---

## 7. 常见坑与规避

| 坑 | 症状 | 规避 |
|----|------|------|
| **Pagefind 索引过大** | 构建慢、体积 > 200KB | 分片索引、`excludeSelectors` 排除非内容区 |
| **搜索无结果** | 索引未生成/路径错 | 检查 `bundlePath`、确认 `pagefind` 跑过 |
| **主题切换 UI 不变** | CSS 变量未绑定 | 检查 `--pagefind-ui-*` 变量、body.dark 选择器 |
| **声明式/模块化冲突** | 双重初始化报错 | 二选一、互斥初始化 |
| **标签页 404** | `getStaticPaths` 缺失标签 | 确保 `getStaticPaths` 覆盖所有标签 |
| **语义搜索准确率低** | 结果不相关 | 混合检索：关键词 + 向量 + 重排序 |

---

## 8. 关键文件清单

```
src/
├── modules/
│   └── search.ts              # Search Module 接口
├── components/
│   ├── PagefindSearch.astro   # 搜索 UI 组件
│   └── common/
│       └── Tag.astro          # 标签组件
├── pages/
│   ├── tags/
│   │   ├── index.astro        # 标签云页面
│   │   └── [tag].astro        # 单标签聚合页
├── integrations/
│   └── build-hooks.ts         # Pagefind 索引生成阶段
└── scripts/
    └── client-entry.ts        # 搜索模块注册
```

---

## 9. 协作接口

| 依赖角色 | 协作内容 | 接口 |
|----------|----------|------|
| `frontend-architect` | 搜索 UI 组件、主题适配 | `searchModule.SearchComponentProps`、`themeSystem` |
| `build-deploy-engineer` | 索引生成阶段配置 | `buildPipeline.registerStage({ name: "pagefind", run })` |
| `content-engineer` | 索引源数据、标签数据 | `contentPipeline.getPublishedPosts()` |
| `frontend-architect` | 客户端模块注册 | `clientRuntime.registerModule({ name: "search", init })` |
| `quality-dx-guardian` | E2E 测试、门禁 | Playwright 搜索测试 |

---

## 10. 学习资源

| 资源 | 链接 |
|------|------|
| Pagefind 官方文档 | https://pagefind.app/ |
| Pagefind Modular UI | https://github.com/pagefind/pagefind/tree/main/pagefind_ui/modular |
| Pagefind 配置 | https://pagefind.app/docs/configuration/ |
| 语义搜索入门 | https://www.pinecone.io/learn/semantic-search/ |

---

**核心口诀**：索引生成入管线 → 搜索 UI 组件化 → CSS 变量主题适配 → 标签系统语义化 → 语义搜索渐进增强 → E2E 守护搜索体验