# Architecture Decision Record: Pagefind UI 方案 - 声明式 vs 模块化 UI

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

## Status

Accepted

## Last Updated

2026-10

## Context

Pagefind 提供两种 UI 集成方式：

1. **声明式 HTML 组件** (`<pagefind-config>`, `<pagefind-input>`, `<pagefind-results>`)
2. **模块化 JS API** (`Instance`, `Input`, `ResultList` from `@pagefind/modular-ui`)

需要决定采用哪种，并确定：

- 如何适配 daisyUI 主题 (CSS 变量 `--pagefind-ui-*`)
- 搜索组件在 `BaseLayout` 中的槽位设计
- 多站点合并索引的 `bundlePath` 配置

## Options

### Option A: 声明式 HTML 组件 (推荐)

- 直接在 Astro 组件中使用 `<pagefind-*>` 自定义元素
- 配置通过 HTML 属性声明：`base-url`, `bundle-path`, `excerpt-length`
- 结果模板通过 `<script type="text/pagefind-template">` 定义
- 零 JS 样板代码，原生支持 Shadow DOM 隔离

### Option B: 模块化 JS API

- `new Instance({ bundlePath })`

* `new Input({ containerElement })`

* `new ResultList({ containerElement, resultTemplate })`

- 完全可编程，支持动态配置、事件钩子、自定义排名
- 需要编写胶水代码，打包体积略大

### Option C: 混合模式

- 声明式做基础 UI，模块化 API 做高级功能 (如搜索建议、筛选器)

## Decision

**选择 Option A: 声明式 HTML 组件为主，模块化 API 作为备选扩展**

### 实施细节

**1. PagefindSearch 组件 (Astro)**

```astro
---
// src/components/search/PagefindSearch.astro ⏸
interface Props {
  bundlePath?: string;
  placeholder?: string;
  theme?: 'light' | 'dark' | 'auto';
}

const { bundlePath = '/pagefind/', placeholder = '搜索文章...', theme = 'auto' } = Astro.props;
---

<pagefind-config
  base-url="/"
  bundle-path={bundlePath}
  excerpt-length={60}
  highlight-param="highlight"
>
  <pagefind-input placeholder={placeholder} />
  <pagefind-results />
  <script type="text/pagefind-template">
    <div class="pagefind-result">
      <a class="pagefind-result-title" href="{{ url | safeUrl }}">
        {{ meta.title }}
      </a>
      <div class="pagefind-result-excerpt">{{+ excerpt +}}</div>
      <div class="pagefind-result-meta">
        <span class="pagefind-result-date">{{ meta.date }}</span>
        <span class="pagefind-result-tags">{{ meta.tags }}</span>
      </div>
    </div>
  </script>
</pagefind-config>

<style>
  /* daisyUI 适配：仅需覆盖 CSS 变量 */
  pagefind-config {
    --pagefind-ui-primary: var(--color-primary);
    --pagefind-ui-background: var(--color-base-100);
    --pagefind-ui-text: var(--color-base-content);
    --pagefind-ui-border: var(--color-base-300);
    --pagefind-ui-tag: var(--color-primary);
    --pagefind-ui-tag-background: var(--color-primary-focus);
  }

  /* 响应式调整 */
  pagefind-input {
    width: 100%;
    max-width: 400px;
  }

  pagefind-results {
    margin-top: 1rem;
  }
</style>
```

**2. BaseLayout 槽位集成**

```astro
---
// src/layouts/BaseLayout.astro
const { search } = Astro.props;
---

<!-- ... head ... -->
<body data-theme="light">
  <ClientRouter fallback="animate">
    <header><Navbar /></header>
    <main>
      <slot />
      {search && <div id="search-slot"><slot name="search" /></div>}
    </main>
    <footer><Footer /></footer>
  </ClientRouter>

  <!-- Pagefind 样式注入 -->
  <link rel="stylesheet" href="/pagefind/pagefind-ui.css" />

  <!-- 主题切换同步 Pagefind -->
  <script is:inline>
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.dataset.theme;
      document.querySelector('pagefind-config')?.setAttribute('data-theme', theme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  </script>
</body>
```

**3. 主题适配 CSS 变量映射**
| Pagefind 变量 | 映射到 daisyUI Token |
|--------------|---------------------|
| `--pagefind-ui-primary` | `var(--color-primary)` |
| `--pagefind-ui-background` | `var(--color-base-100)` |
| `--pagefind-ui-text` | `var(--color-base-content)` |
| `--pagefind-ui-border` | `var(--color-base-300)` |
| `--pagefind-ui-tag` | `var(--color-primary)` |
| `--pagefind-ui-tag-background` | `var(--color-primary-focus)` |

**4. 多站点合并索引**

```typescript
// 场景：博客 + 文档站合并搜索
// pagefind-config 仅支持单一 bundle-path
// 方案：构建时合并索引文件，或运行时动态切换 bundlePath
const mergedBundlePath = "/pagefind/merged/";
// 需自定义构建脚本合并 pagefind/index.json
```

## Consequences

### Positive

- **零 JS 样板**：声明式组件原生工作，无需注册、初始化、清理
- **Shadow DOM 隔离**：样式不污染宿主页面，`pagefind-ui.css` 仅作用于内部
- **主题适配简单**：仅需覆盖 6 个 CSS 变量，自动跟随 daisyUI 主题切换
- **Astro 友好**：在 `.astro` 组件中直接使用，支持插槽组合
- **渐进增强**：JS 失败时仍可基础工作 (输入框可用)

### Negative / Trade-offs

- **自定义排名/筛选受限**：声明式不支持 `ranking`、`filters` 等高级配置
- **结果模板语法受限**：`{{+ excerpt +}}` 等模板语法不如 JS 灵活
- **多索引合并需额外工程**：声明式仅支持单一 `bundle-path`

## Future Extension (Option C)

若需高级功能，可引入模块化 API：

```typescript
// src/scripts/search-advanced.ts ⏸
import { Instance, Input, ResultList } from '@pagefind/modular-ui';

export function initAdvancedSearch() {
  const instance = new Instance({ bundlePath: '/pagefind/' });
  const input = new Input({ containerElement: '#search-input' });
  const results = new ResultList({
    containerElement: '#search-results',
    resultTemplate: customTemplate,
    ranking: { ... },
    filters: { tags: [...] }
  });
}
```

## References

- `src/components/search/PagefindSearch.astro` ⏸
- `src/layouts/BaseLayout.astro`

- docs/adr/0001-functional-architecture.md#34-search-module
- CONTEXT.md (术语: SearchIndex, PagefindModularUI, PagefindConfig, PagefindCSSVars)
- Pagefind 官方文档: https://pagefind.app/docs/ui/
