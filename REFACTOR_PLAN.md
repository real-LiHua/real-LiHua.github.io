# Refactor Plan: 博客架构现代化与模块化重构

## Current State

项目是一个基于 **Astro 7 + MDX + Content Collections** 的个人博客，部署到 Cloudflare Workers / Codeberg / GitHub Pages / IPFS 四平台。核心技术栈冻结：

- Astro 7 (Node adapter, standalone)
- Tailwind CSS 4 + daisyUI 5 + @tailwindcss/typography
- Pagefind 零配置静态搜索
- oxlint + oxfmt (lint-staged + Husky)
- Rust CLI `post-edit` 管理文章
- GitHub Actions 4 并行部署任务

**当前痛点**：

1. **集成分散**：4 个自定义 Astro 集成 (`build-hooks`, `satteri-config`, `watermark`, `mermaid-compile-time`) 各自为政，`astro:build:done` 钩子重复遍历文件
2. **组件耦合**：`Navigation.astro` 内联路由逻辑、移动端/桌面端重复代码；`PostCard` 两种变体逻辑混合
3. **主题变量冗余**：`global.css` 光/暗主题各 35 行 CSS 变量重复，`prose` 变量分离在 `:root` 与 `[data-theme="dark"]`
4. **Pagefind 硬编码**：`BaseLayout` 直接引入 Pagefind UI 脚本/样式，难以测试/替换
5. **客户端脚本分散**：9 个独立脚本，无统一入口，`astro:page-load` 监听分散
6. **类型安全缺口**：`post.data` 访问多用 `as unknown as`，`telegramAuth` 类型未导出复用
7. **构建钩子副作用**：`watermark`/`mermaid` 直接读写 `dist/client`，无中间层抽象

## Target State

1. **统一构建管线**：单一 `build-pipeline` 集成，按阶段执行（Pagefind → 链接检查 → HTML 验证 → Mermaid 渲染 → 水印注入），复用文件遍历
2. **组件复合化**：`Navigation` 拆分为 `Navbar` + `NavLinks` + `MobileMenu` 复合组件；`PostCard` 变体提取为 `PostCardGrid` / `PostCardList`
3. **主题 Token 化**：CSS 变量集中在 `theme-tokens.css`，通过 `@plugin "daisyui/theme"` 仅引用 token，`prose` 变量同步纳入
4. **Pagefind 组件化**：`<PagefindSearch />` 封装 UI/配置/样式，`BaseLayout` 仅 `<slot name="search" />`
5. **客户端模块化**：`scripts/client-entry.ts` 统一注册，生命周期事件集中分发
6. **类型完备**：导出 `PostFrontmatter`、`TelegramAuthConfig` 等类型，消除 `as unknown as`
7. **内容工具类型安全**：`getPublishedPosts` 返回 `CollectionEntry<"blog">[]` 精确类型，`render` 结果类型化

---

## Affected Files

| File                                       | Change Type | Dependencies                                    |
| ------------------------------------------ | ----------- | ----------------------------------------------- |
| `src/integrations/build-pipeline.ts`       | create      | blocks all integration refactors                |
| `src/integrations/build-hooks.ts`          | delete      | blocked by build-pipeline                       |
| `src/integrations/satteri-config.ts`       | modify      | blocked by build-pipeline (markdown config)     |
| `src/integrations/watermark.ts`            | modify      | blocked by build-pipeline (file IO abstraction) |
| `src/integrations/mermaid-compile-time.ts` | modify      | blocked by build-pipeline (file IO abstraction) |
| `src/components/Navigation.astro`          | delete      | blocks navbar/\* refactors                      |
| `src/components/navbar/Start.astro`        | modify      | blocked by Navigation delete                    |
| `src/components/navbar/Center.astro`       | create      | blocked by Navigation delete                    |
| `src/components/navbar/End.astro`          | modify      | blocked by Navigation delete                    |
| `src/components/navbar/MobileMenu.astro`   | create      | blocked by Navigation delete                    |
| `src/components/Navbar.astro`              | create      | blocks Header refactor                          |
| `src/components/Header.astro`              | modify      | blocked by Navbar create                        |
| `src/components/common/PostCard.astro`     | delete      | blocks PostCardGrid/List create                 |
| `src/components/common/PostCardGrid.astro` | create      | blocked by PostCard delete                      |
| `src/components/common/PostCardList.astro` | create      | blocked by PostCard delete                      |
| `src/components/common/Tag.astro`          | keep        | —                                               |
| `src/components/PagefindSearch.astro`      | create      | blocks BaseLayout modify                        |
| `src/layouts/BaseLayout.astro`             | modify      | blocked by PagefindSearch create                |
| `src/styles/global.css`                    | modify      | blocked by theme-tokens.css create              |
| `src/styles/theme-tokens.css`              | create      | blocks global.css modify                        |
| `src/scripts/client-entry.ts`              | create      | blocks all script refactors                     |
| `src/scripts/theme-toggle.ts`              | modify      | blocked by client-entry                         |
| `src/scripts/toc.ts`                       | modify      | blocked by client-entry                         |
| `src/scripts/reading-progress.ts`          | modify      | blocked by client-entry                         |
| `src/scripts/scroll-reveal.ts`             | modify      | blocked by client-entry                         |
| `src/scripts/tilt-card.ts`                 | modify      | blocked by client-entry                         |
| `src/scripts/code-copy.ts`                 | modify      | blocked by client-entry                         |
| `src/scripts/telegram-auth.ts`             | modify      | blocked by client-entry                         |
| `src/scripts/gravatar-fallback.ts`         | modify      | blocked by client-entry                         |
| `src/utils/content.ts`                     | modify      | blocks pages/posts/[id].astro                   |
| `src/utils/date.ts`                        | keep        | —                                               |
| `src/content.config.ts`                    | modify      | exports types                                   |
| `src/pages/posts/index.astro`              | modify      | blocked by PostCardGrid/List                    |
| `src/pages/posts/[id].astro`               | modify      | blocked by content.ts types, client-entry       |
| `src/pages/tags/[tag].astro`               | modify      | blocked by PostCardGrid/List                    |
| `astro.config.ts`                          | modify      | replace integrations                            |
| `package.json`                             | modify      | scripts/client-entry build step                 |

---

## Execution Plan

### Phase 1: Types and Interfaces

- [ ] **1.1** 在 `src/content.config.ts` 导出 `PostFrontmatter`、`TelegramAuthConfig`、`BlogCollection` 类型
  - `PostFrontmatter = z.infer<typeof blog.schema>`
  - `TelegramAuthConfig = z.infer<typeof telegramAuthSchema>`
  - `BlogCollection = CollectionEntry<"blog">`
- [ ] **1.2** 在 `src/utils/content.ts` 引入并导出上述类型，`getPublishedPosts` 返回类型改为 `Promise<BlogCollection[]>`
- [ ] **1.3** 在 `src/pages/posts/[id].astro` 使用导入类型替换 `as unknown as` 与内联推断
- [ ] **Verify**: `pnpm check` 通过，无 `any` 泄漏

### Phase 2: 统一构建管线

- [ ] **2.1** 创建 `src/integrations/build-pipeline.ts`：
  - 单一 `astro:build:done` 钩子
  - 内部阶段数组：`[pagefind, lychee, vnu, mermaid, watermark]`
  - 复用 `findHtmlFiles` 工具（从 watermark/mermaid 提取到 `src/integrations/utils/file-utils.ts`）
  - 每阶段独立 `try/catch`，失败不阻断后续，汇总错误最后抛出
- [ ] **2.2** 重构 `watermark.ts`：导出纯函数 `applyWatermarks(htmlFiles, siteUrl)`，不再是集成
- [ ] **2.3** 重构 `mermaid-compile-time.ts`：导出纯函数 `renderMermaidInFiles(htmlFiles)`，不再是集成
- [ ] **2.4** `satteri-config.ts` 保留 `astro:config:setup`（markdown 处理器配置），移出 build 阶段逻辑
- [ ] **2.5** `astro.config.ts` 替换 `integrations` 数组：移除 4 个旧集成，添加 `buildPipelineIntegration()`
- [ ] **Verify**: `pnpm build` 成功，`dist/client` 包含 pagefind 索引、mermaid SVG、水印 HTML，lychee/vnu 无报错

### Phase 3: 组件复合化

- [ ] **3.1** 创建 `src/components/navbar/MobileMenu.astro`（从 Navigation 提取移动端下拉菜单）
- [ ] **3.2** 创建 `src/components/navbar/Center.astro`（桌面端导航链接，接收 `links: NavLink[]` props）
- [ ] **3.3** 重构 `src/components/navbar/Start.astro`、`End.astro` 为纯展示组件
- [ ] **3.4** 创建 `src/components/Navbar.astro` 复合组件：
  - `<Navbar><Navbar.Start /><Navbar.Center /><Navbar.End /></Navbar>`
  - 内部处理响应式断点、移动端状态
- [ ] **3.5** 简化 `Header.astro`：仅 `<header><Navbar /></header>`
- [ ] **3.6** 删除 `Navigation.astro`
- [ ] **3.7** 创建 `PostCardGrid.astro`、`PostCardList.astro`（从 PostCard 拆分 variant 逻辑）
- [ ] **3.8** 删除 `PostCard.astro`
- [ ] **3.9** 更新 `src/pages/posts/index.astro`、`src/pages/tags/[tag].astro` 引入新组件
- [ ] **Verify**: `pnpm dev` 视觉回归无差异，响应式断点正常

### Phase 4: 主题 Token 化

- [ ] **4.1** 创建 `src/styles/theme-tokens.css`：
  - 定义 `:root` 与 `[data-theme="dark"]` 共享的 `--color-*`、`--radius-*`、`--size-*`、`--border`、`--depth`、`--noise`
  - 将 `prose` 变量（`--tw-prose-*`）纳入同一文件，按主题分组
- [ ] **4.2** `global.css` `@import "./theme-tokens.css"`，移除重复变量块
- [ ] **4.3** 调整 daisyUI `@plugin "daisyui/theme"` 仅引用 token 变量（或改用 `@theme` 语法，Tailwind CSS 4 支持）
- [ ] **Verify**: `pnpm build`，手动切换主题、缩放、减弱动态偏好均正常

### Phase 5: Pagefind 组件化

- [ ] **5.1** 创建 `src/components/PagefindSearch.astro`：
  - 接收 `bundlePath`、`placeholder`、`theme` props
  - 内联 `<pagefind-config>`、`<pagefind-input>`、`<pagefind-results>` 或模块化 UI
  - 样式通过 CSS 变量（`--pagefind-ui-*`）适配 daisyUI 主题
- [ ] **5.2** `BaseLayout.astro` 移除硬编码 Pagefind 脚本/样式，改为 `<slot name="search" />`
- [ ] **5.3** `src/pages/posts/index.astro`、`src/pages/posts/[id].astro` 等需要搜索的页面传入 `<PagefindSearch slot="search" />`
- [ ] **Verify**: 搜索功能正常，主题切换后 UI 颜色同步

### Phase 6: 客户端模块化

- [ ] **6.1** 创建 `src/scripts/client-entry.ts`：
  - 统一监听 `astro:page-load`、`astro:after-swap`
  - 导出 `registerClientModule(name, initFn)` 注册表
  - 每个原脚本改为导出 `init(context)` 函数，接收 `{ document, window, routerEvents }`
- [ ] **6.2** 重构 9 个脚本为模块：
  - `theme-toggle` → `initThemeToggle(ctx)`
  - `toc` → `initTOC(ctx)`
  - `reading-progress` → `initReadingProgress(ctx)`
  - `scroll-reveal` → `initScrollReveal(ctx)`
  - `tilt-card` → `initTiltCard(ctx)`
  - `code-copy` → `initCodeCopy(ctx)`
  - `telegram-auth` → `initTelegramAuth(ctx)`
  - `gravatar-fallback` → `initGravatarFallback(ctx)`
  - `verify-watermark` 保留为独立 CLI 脚本
- [ ] **6.3** `client-entry.ts` 在 `astro:page-load` 依次调用所有 `initFn`
- [ ] **6.4** `BaseLayout` 仅 `<script><script>` 引入 `client-entry.ts`（或用 `is:inline` 注册）
- [ ] **Verify**: 所有交互功能正常，控制台无重复注册警告

### Phase 7: 内容工具与页面类型安全

- [ ] **7.1** `src/utils/content.ts` 补充 `render` 结果类型：`RenderedPost = Awaited<ReturnType<typeof render>>`
- [ ] **7.2** `src/pages/posts/[id].astro` 使用类型化 `Content`、`headings`、`toc`
- [ ] **7.3** `src/pages/posts/index.astro` 简化映射逻辑，直接用 `post.data`（已含 `remarkPluginFrontmatter`）
- [ ] **Verify**: `pnpm check` 通过，`pnpm playwright test` 通过

### Phase 8: 清理与文档

- [ ] **8.1** 删除未使用的导入、废弃文件
- [ ] **8.2** 更新 `AGENTS.md` 反映新架构（集成、组件、脚本结构）
- [ ] **8.3** 运行完整 CI 模拟：`pnpm check && pnpm build && pnpm playwright test`

---

## Rollback Plan

If something fails:

1. **Phase 2 (构建管线) 失败**：
   - `git restore astro.config.ts src/integrations/`
   - 恢复 4 个原集成，`pnpm build` 验证
2. **Phase 3/5/6 (组件/脚本) 失败**：
   - `git restore src/components/ src/layouts/BaseLayout.astro src/scripts/`
   - `pnpm dev` 验证视觉/交互
3. **Phase 4 (主题) 失败**：
   - `git restore src/styles/global.css`
   - 删除 `theme-tokens.css`
4. **整体回滚**：`git reset --hard HEAD~1` 回到重构前提交

---

## Risks

| Risk                                                    | Likelihood | Impact | Mitigation                                          |
| ------------------------------------------------------- | ---------- | ------ | --------------------------------------------------- |
| `build-pipeline` 并行阶段竞态                           | 中         | 高     | 每阶段串行执行，文件锁或临时目录隔离                |
| daisyUI 5 `@plugin` 语法与 Tailwind CSS 4 `@theme` 冲突 | 低         | 中     | 优先用官方文档验证的 `@plugin "daisyui/theme"` 写法 |
| Pagefind 模块化 UI 与现有 `pagefind-modal` 冲突         | 低         | 中     | 保留 `<pagefind-modal>` 仅作备用，主 UI 用组件化    |
| 客户端模块注册顺序导致依赖失败                          | 中         | 中     | `client-entry` 显式定义加载顺序，必要时 `await`     |
| Rust CLI `post-edit` 依赖旧 frontmatter 字段            | 低         | 低     | 重构不改字段名，仅类型导出                          |
| `astro:build:done` 单钩子超时                           | 低         | 高     | 分阶段设置超时，日志分级                            |

---

**Shall I proceed with Phase 1?**
