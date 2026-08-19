# ADR 002: 内容管线 - satteri + git 日期注入 + Mermaid 预渲染

## Status

Accepted

## Context

Markdown/MDX 博客文章需要：

- 语法高亮、Mermaid 图表、表格对齐、标题 ID
- 发布/更新日期自动从 git 历史获取（无需手动维护 frontmatter）
- RSS 订阅生成
- 构建时预渲染 Mermaid 为 SVG（避免客户端渲染闪烁）

## Decision

1. **Markdown 处理器**：`@astrojs/markdown-satteri` (替代 remark)
   - 统一 AST 处理管线（mdast → hast）
   - 内置 Shiki 语法高亮（双主题：github-light/github-dark）
   - 支持自定义 mdast/hast 插件

2. **自定义插件** (`src/integrations/satteri-config.ts`)：
   - `satteriPublishDate` - `git log --follow --diff-filter=A -1 --pretty="format:%cI"` 获取首次提交日期
   - `satteriUpdatedDate` - `git log -1 --pretty="format:%cI"` 获取最近提交日期
   - `satteriTableAlign` - 将 `align` 属性转为内联 `style="text-align:..."`
   - `satteriHeadingIdsPlugin` - 为标题自动添加 ID
   - `mermaidMdast` / `mermaidHast` - Mermaid 代码块提取与渲染准备

3. **构建时 Mermaid 预渲染** (`src/integrations/mermaid-compile-time.ts`)：
   - Hook: `astro:build:done`
   - 扫描 `dist/client/**/*.html` 中的 `<pre class="mermaid">`
   - 使用 `mermaid-wasm-renderer` 渲染为 SVG
   - 替换为 `<div class="mermaid">SVG</div>`

4. **Content Collections** (`src/content.config.ts`)：
   - 单 collection: `blog` (glob: `src/posts/**/*.md{,x}`)
   - Zod schema 定义 frontmatter 字段
   - 草稿由路径决定（`src/posts/drafts/`），无 `draft` 字段

5. **RSS 生成** (`src/pages/rss.xml.ts`)：
   - `@astrojs/rss` + `getPublishedPosts()` 排除草稿
   - 按 `publishDate` 降序

## Consequences

### 正面

- 日期零维护，准确可靠
- Mermaid 无客户端闪烁，SEO 友好
- 管线模块化，易于扩展新语法
- 类型安全（Zod → TypeScript 推导）

### 负面/风险

- git 命令依赖构建环境（CI 需完整历史）
- satteri 生态相对年轻，文档较少
- Mermaid wasm 体积较大，构建时长增加

### 后续工作

- 增量 Mermaid 缓存（基于文件 hash，Task 2.2）
- 中文分词优化 Pagefind
- Schema 版本化迁移工具

## References

- `src/integrations/satteri-config.ts`
- `src/integrations/mermaid-compile-time.ts`
- `src/content.config.ts`
- `src/pages/rss.xml.ts`
- `src/plugins/mdast-toc.ts`
