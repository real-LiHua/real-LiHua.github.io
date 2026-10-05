# Context: 个人博客系统

## Glossary

**Post** — 一篇博客文章，包含前置元数据与 Markdown/MDX 正文。唯一标识为 `id`（基于文件路径生成的 slug）。

**Draft** — 位于 `src/posts/drafts/` 下的 Post，仅在开发环境可见，构建产物中不生成路由。

**Frontmatter** — Post 文件头部的 YAML 元数据，经 Zod schema 验证后成为类型安全的 `PostFrontmatter`。

**Collection** — Astro Content Collections 管理的构建时数据集，本项目仅有 `blog` 一个集合。

**Theme** — daisyUI 5 主题配置，包含 `light`/`dark` 两套 CSS 变量 token，运行时通过 `document.documentElement.dataset.theme` 切换。

**SearchIndex** — Pagefind 在构建期生成的静态搜索索引文件（`dist/client/pagefind/`），客户端零配置加载。

**Watermark** — 零宽字符盲水印，构建后注入原创文章 HTML 文本节点，用于版权追踪。

**MermaidDiagram** — Markdown 代码块中声明的 Mermaid 图表，构建期渲染为内联 SVG。

**ClientRouter** — Astro View Transitions 提供的 `<ClientRouter />` 组件，启用 SPA 模式客户端路由与页面转场动画。

**TelegramAuth** — 文章级访问控制：需验证读者为指定 Telegram 群组成员，通过 Bot 深度链接完成认证。

**BuildPipeline** — 统一的构建后处理管线：Pagefind 索引 → 链接检查 → HTML 验证 → Mermaid 渲染 → 水印注入。

**PostCard** — 文章摘要卡片组件，两种变体：`grid`（网格）与 `list`（列表）。

**Navbar** — 顶部导航复合组件，包含 `Start`（品牌）、`Center`（桌面端链接）、`End`（右侧动作）、`MobileMenu`（移动端抽屉）。

**PagefindSearch** — 封装 Pagefind UI 的搜索组件，暴露 `bundlePath`/`placeholder`/`theme` 属性。

**ClientModule** — 客户端脚本模块，导出 `init(ctx)` 函数，由 `client-entry.ts` 统一在 `astro:page-load`/`astro:after-swap` 生命周期注册与初始化。

**RSSFeed** — `@astrojs/rss` 生成的 `rss.xml` 端点，聚合已发布文章。

**Sitemap** — `@astrojs/sitemap` 生成的 `sitemap-index.xml` 与分片文件。

**DeployTarget** — 四大部署目标：Cloudflare Workers / Codeberg Pages / GitHub Pages / IPFS (Pinata)。

**GlobLoader** — Astro 5.0+ 引入的 `glob()` 加载器，用于从文件系统按模式匹配加载 Markdown/MDX/JSON/YAML/TOML 文件，支持 `pattern`、`base`、`generateId`、`retainBody` 选项。

**ZodSchema** — Astro Content Collections 使用 Zod (通过 `astro/zod` 导出) 定义前置数据验证 schema，自动生成 TypeScript 类型并提供运行时验证。

**RenderFunction** — `astro:content` 导出的 `render()` 函数，返回 `{ Content, headings, remarkPluginFrontmatter }`，用于将 Markdown/MDX 编译为 Astro 组件并提取标题结构。

**ContentCollections** — Astro 2.0+ 的内容管理 API，支持构建时集合 (`defineCollection`) 和实时集合 (`defineLiveCollection`)，统一查询入口 `getCollection()`/`getEntry()`。

**AstroIntegration** — Astro 集成系统，通过 `astro:config:setup`、`astro:build:start`、`astro:build:done`、`astro:routes:resolved` 等钩子扩展构建流程。

**ViewTransitions** — Astro 3.0+ 基于 View Transitions API 的页面转场，提供 `<ClientRouter />` 启用 SPA 模式，生命周期事件：`astro:before-preparation`、`astro:after-preparation`、`astro:before-swap`、`astro:after-swap`、`astro:page-load`。

**Middleware** — Astro 中间件，拦截请求/响应，可在预渲染和按需渲染时运行，提供 `locals` 对象跨组件共享请求级数据。

**ImageOptimization** — Astro 图片优化管线，默认使用 Sharp 服务，支持 `passthroughImageService()` 绕过处理（适配 Cloudflare 等边缘环境），配置 `image.service` 与 `image.endpoint`。

**RSSGeneration** — `@astrojs/rss` 包生成 RSS 2.0/Atom 订阅，支持 `pagesGlobToRssItems()` 从 `import.meta.glob` 生成条目，`rssSchema` 强制前置字段。

**SitemapGeneration** — `@astrojs/sitemap` 生成站点地图，支持 `chunks` 分片、自定义 `changefreq`/`priority`/`lastmod`，可排除 `news`/`xhtml`/`image`/`video` 命名空间。

**TailwindCSS4** — Tailwind CSS 4.0 采用 CSS-first 架构，通过 `@import "tailwindcss"` 与 `@plugin` 引入，无需 `tailwind.config.js`，Vite 插件 `@tailwindcss/vite` 集成。

**DaisyUI5** — daisyUI 5 通过 `@plugin "daisyui"` 与 `@plugin "daisyui/theme"` 定义主题，CSS 变量驱动，`prefersdark`/`color-scheme` 自动适配系统深色模式。

**TypographyPlugin** — `@tailwindcss/typography` 提供 `prose` 类族，通过 CSS 变量 `--tw-prose-*` 控制排版样式，支持暗色模式覆盖。

**PagefindModularUI** — Pagefind 模块化 UI (`@pagefind/modular-ui`)，`Instance`/`Input`/`ResultList` 组件化，支持 `bundlePath`、`ranking`、`mergeIndex` 配置。

**PagefindConfig** — 声明式配置元素 `<pagefind-config>`，属性 `base-url`、`bundle-path`、`excerpt-length`、`highlight-param` 控制搜索行为。

**PagefindCSSVars** — Pagefind UI 样式通过 CSS 变量 `--pagefind-ui-*` 定制，支持 `body.dark` 选择器自动适配深色主题。

**Oxlint** — 基于 Oxc 的高性能 linter，支持 `.oxlintrc.json`/`oxlint.config.ts` 双格式，`overrides` 按文件模式差异化规则，`typeAware: true` 启用类型感知规则。

**Oxfmt** — Oxc 格式化工具，兼容 Prettier 选项，`oxfmt.config.ts` 支持 `overrides`、`embeddedLanguageFormatting: "auto"`，集成 Tailwind CSS class 排序。

**TypeAwareLinting** — Oxlint 类型感知模式，依赖 `tsgolint` (Go 实现的 TypeScript 语义分析)，需 `oxlint-tsgolint` 配合，规则前缀 `typescript/`。

**PrivateSubmodule** — 草稿隔离方案：私有 Git 仓库作为子模块挂载到 `src/posts/drafts/`，CI 通过 Deploy Key 只读拉取，物理隔离防泄露。

**Satteri** — 替代 remark/rehype 的新一代 Markdown 处理器（`@astrojs/markdown-satteri`），提供 `MdastPlugin`/`HastPlugin` 插件系统，配合 `satteri` 核心库实现构建时 Markdown/MDX AST 转换（heading IDs、外链标记、Mermaid 渲染、日期自动填充、表格对齐）