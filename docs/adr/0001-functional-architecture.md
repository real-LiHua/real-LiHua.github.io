# Architecture Decision Record: 博客系统功能架构设计

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

## Status

Accepted

## Context

个人博客需支持：文章发布/草稿管理、全文搜索、主题切换、Telegram 认证阅读、Mermaid 图表、盲水印版权保护、多平台部署。现有代码呈现“集成分散、组件耦合、主题变量重复、脚本碎片化”等浅模块特征，需重构为深度模块架构。

## Decision

采用 **C4 模型** 定义四层架构，配合 **深度模块** 原则划定模块边界：

### C1: System Context (系统上下文)

```text
[作者] ──▶ [博客系统] ◀── [读者]
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
[tgcloud] [Codeberg] [GitHub Pages] [IPFS/Pinata]
    │           │           │            │
    └───────────┴───────────┴────────────┘
                    │
              [Telegram Bot]
              [Pagefind Index]
```

### C2: Container (容器/运行时边界)

| Container               | 技术                          | 职责                            | 接口                               |
| ----------------------- | ----------------------------- | ------------------------------- | ---------------------------------- |
| **Astro App (SSR/SSG)** | Astro 7 + Node Adapter        | 核心渲染、路由、内容管道        | HTTP GET/POST, `astro:content` API |
| **Build Pipeline**      | Node.js (构建时)              | 后处理管线                      | `astro:build:done` hook            |
| **Client Runtime**      | Vanilla TS + View Transitions | 交互、搜索、主题、TOC、阅读进度 | DOM Events (`astro:page-load` 等)  |
| **Rust CLI**            | Rust (post-edit)              | 文章增删改查、发布/撤回         | CLI 交互菜单                       |
| **Telegram Bot**        | tgcloud SDK                   | 群组成员身份验证、Mini App API  | HTTPS Webhook / Deep Link          |

### C3: Component (模块/深度模块边界)

#### 3.1 Content Pipeline Module

```text
┌─────────────────────────────────────────────────────────────┐
│                    ContentPipeline                           │
│  Interface:                                                  │
│    getPublishedPosts() → Post[]                              │
│    getDraftPosts() → Post[]                                  │
│    getAllPosts() → Post[]                                    │
│    renderPost(id) → { Content, headings, frontmatter }       │
├─────────────────────────────────────────────────────────────┤
│  Implementation:                                             │
│    - Astro Content Collections (glob loader)                 │
│    - Zod schema (PostFrontmatter, TelegramAuthConfig)        │
│    - satteri Markdown 处理器 (heading IDs, 外链, 日期自动填充)  │
│    - MDX 渲染 (@astrojs/mdx)                                 │
│    - RSS/站点地图生成 (@astrojs/rss, @astrojs/sitemap)       │
└─────────────────────────────────────────────────────────────┘
```

**Depth**: 调用者仅需 `getPublishedPosts()`/`renderPost()`，内部封装 loader/schema/processor/渲染全链路。

#### 3.2 Build Pipeline Module

```text
┌─────────────────────────────────────────────────────────────┐
│                      BuildPipeline                           │
│  Interface:                                                  │
│    execute(distDir: URL) → BuildReport                       │
├─────────────────────────────────────────────────────────────┤
│  Implementation: (阶段串行，失败不中断后续)                   │
│    1. PagefindIndexer    → 生成搜索索引                       │
│    2. LinkChecker        → lychee 验证所有链接                │
│    3. HtmlValidator      → vnu-jar 验证 HTML                  │
│    4. MermaidRenderer    → 遍历 HTML 渲染 Mermaid → SVG       │
│    5. WatermarkInjector  → 原创文章注入零宽水印               │
│  Internal Seams:                                             │
│    - FileWalker (复用的 HTML 文件遍历器)                      │
│    - StageRunner (阶段执行器：超时、重试、错误聚合)           │
└─────────────────────────────────────────────────────────────┘
```

**Depth**: 单一 `execute()` 隐藏 5 个阶段、文件遍历、错误处理、日志聚合。

#### 3.3 Theme System Module

```text
┌─────────────────────────────────────────────────────────────┐
│                       ThemeSystem                            │
│  Interface:                                                  │
│    tokens.css (CSS 变量契约)                                  │
│    toggleTheme(theme: 'light'|'dark')                        │
│    initTheme() → 应用 localStorage/系统偏好                   │
├─────────────────────────────────────────────────────────────┤
│  Implementation:                                             │
│    - theme-tokens.css (light/dark/prose 变量单一源)           │
│    - daisyUI @plugin "daisyui/theme" 引用 tokens             │
│    - @tailwindcss/typography prose 变量同步                  │
│    - theme-toggle.ts (ClientModule) 仅 30 行                 │
└─────────────────────────────────────────────────────────────┘
```

**Depth**: 调用者只需引入 `theme-tokens.css`，主题切换、prose 适配、动画过渡全内置。

#### 3.4 Search Module

```text
┌─────────────────────────────────────────────────────────────┐
│                       SearchModule                           │
│  Interface:                                                  │
│    <PagefindSearch bundlePath? placeholder? theme?>          │
│    PagefindIndexer.generate(distDir)                         │
├─────────────────────────────────────────────────────────────┤
│  Implementation:                                             │
│    - Pagefind CLI (构建期索引)                                │
│    - @pagefind/modular-ui 或声明式 <pagefind-*> 组件         │
│    - CSS 变量 --pagefind-ui-* 适配 daisyUI 主题              │
│    - 暴露 bundlePath 供多站点合并索引                        │
└─────────────────────────────────────────────────────────────┘
```

#### 3.5 Client Runtime Module

```text
┌─────────────────────────────────────────────────────────────┐
│                      ClientRuntime                           │
│  Interface:                                                  │
│    client-entry.ts (单一入口)                                 │
│    registerModule(name, initFn)                              │
│    Lifecycle: onPageLoad(ctx), onAfterSwap(ctx)              │
├─────────────────────────────────────────────────────────────┤
│  Implementation: (9 个 ClientModule)                         │
│    - ThemeToggle      → 主题切换、扩展检测                    │
│    - TOC              → 目录生成、滚动高亮、移动端面板        │
│    - ReadingProgress  → 顶部进度条                            │
│    - ScrollReveal     → IntersectionObserver 入场动画         │
│    - TiltCard         → 鼠标跟随 3D 倾斜                      │
│    - CodeCopy         → 代码块复制按钮                        │
│    - TelegramAuth     → 认证墙轮询、深度链接跳转              │
│    - GravatarFallback → 头像加载失败降级                      │
│    - VerifyWatermark  → 独立 CLI 验证工具                     │
└─────────────────────────────────────────────────────────────┘
```

#### 3.6 UI Component Library (复合组件模式)

```text
┌─────────────────────────────────────────────────────────────┐
│                      UIComponents                             │
│  Interface: (复合组件 + 插槽)                                 │
│    <Navbar><Navbar.Start/><Navbar.Center/><Navbar.End/></Navbar>
│    <PostCardGrid posts={[]} />                               │
│    <PostCardList posts={[]} />                               │
│    <Tag tag={string} />                                      │
│    <PagefindSearch />                                        │
│    <BaseLayout><slot/><slot name="search"/></BaseLayout>      │
├─────────────────────────────────────────────────────────────┤
│  Implementation:                                             │
│    - daisyUI 5 语义类名 (btn, card, badge, navbar, dropdown) │
│    - Tailwind CSS 4 实用类组合                               │
│    - Astro 组件 Props 类型安全 (zod 推导)                    │
│    - transition:* 指令配合 View Transitions                  │
└─────────────────────────────────────────────────────────────┘
```

#### 3.7 Telegram Auth Module

```text
┌─────────────────────────────────────────────────────────────┐
│                    TelegramAuth                               │
│  Interface:                                                  │
│    <TelegramAuthWall postId groupName customMessage />        │  ← 认证墙 UI (多入口引导)
│    GET /api/posts/[id]/protected → 返回受保护内容 HTML        │  ← 独立保护路由 (核心)
│    POST /api/auth/telegram/miniapp → 验证 initData → JWT      │  ← Mini App 认证端点
│    POST /api/auth/telegram/callback → 验证 hash → JWT         │  ← Login Widget 回调
│    initTelegramAuth(ctx) (ClientModule)                      │  ← 多入口引导、降级、AJAX注入
│    Bot API: /start=auth_{postId} → 验证群成员 → 返回 JWT      │
├─────────────────────────────────────────────────────────────┤
│  Implementation:                                             │
│    - 前置：astro:config:setup 注入 TELEGRAM_BOT_USERNAME      │
│    - 服务端：tgcloud Bot 处理 /start、检查群成员、签发 JWT    │
│    - 保护路由：GET /api/posts/[id]/protected (需 JWT 验证)    │
│    - Mini App 端点：POST /api/auth/telegram/miniapp (验证 initData) │
│    - Login Widget 回调：POST /api/auth/telegram/callback (验证 hash) │
│    - 客户端：分层降级策略 (UA分流 + Cookie降级 + 手动切换)     │
│    - 客户端：多入口引导 → 轮询/回调验证 → AJAX 注入受保护内容   │
└─────────────────────────────────────────────────────────────┘
```

### C4: Code (关键实现细节)

#### 接口契约 (TypeScript/Zod)

```typescript
// src/content.config.ts 导出
export type PostFrontmatter = z.infer<typeof blog.schema>;
export type TelegramAuthConfig = z.infer<typeof telegramAuthSchema>;
export type BlogCollection = CollectionEntry<"blog">;

// src/utils/content.ts
export const getPublishedPosts = (): Promise<BlogCollection[]>;
export const renderPost = (id: string): Promise<RenderedPost>;
```

#### 构建管线阶段契约

```typescript
// src/integrations/build-pipeline.ts
interface BuildStage {
  name: string;
  run: (distDir: URL, logger: AstroIntegrationLogger) => Promise<void>;
  timeout?: number; // ms
}
```

#### 客户端模块契约

```typescript
// src/scripts/client-entry.ts
interface ClientContext {
  document: Document;
  window: Window;
  routerEvents: {
    onPageLoad: (fn: () => void) => void;
    onAfterSwap: (fn: () => void) => void;
  };
}
type ClientModuleInit = (ctx: ClientContext) => void | Promise<void>;
```

---

### 组件架构细则 (合并自 .agents/adr/001) ⏸

#### 单一布局组件 `BaseLayout.astro`

- 所有页面共用，包含：OGP meta、主题初始化内联脚本（防 FOUC）、`<ClientRouter>` 启用 View Transitions、全局脚本注入、Header/Footer 通过 slot 注入

#### 模块化组件结构 `src/components/`

- `common/`

- 通用展示组件
- `navbar/`

- 导航栏拆分（Start/Center/End/SearchBar）
- 功能组件直接放在 components/（CodeCopy、Copyright、Footer、Header、Navigation）

#### 原生 JS 客户端脚本 `src/scripts/`

- 每个脚本单一职责，监听 `astro:page-load` 初始化
- 无框架依赖，使用原生 DOM API
- 通过 `data-*` 属性传递配置（避免内联 onerror 触发 TS 错误）
- 统一错误提交用 daisyUI toast

#### 样式系统

- Tailwind CSS 4 + daisyUI 5 (`@plugin` 指令)
- CSS 变量在 `src/styles/global.css` 定义双主题 ⏸
- 组件内直接使用 daisyUI 类名

#### 脚本注册统一

- `src/scripts/script-registry.ts` 统一管理脚本的 `astro:page-load` 监听、初始化顺序与错误处理 ⏸

---

## Consequences

### Positive

- **单一职责**：每个深度模块封装完整子域逻辑
- **可测试性**：接口小，易写内存适配器（如 `BuildPipeline` 用内存文件系统测试）
- **局部性**：修改主题只碰 `theme-tokens.css`；修改搜索只碰 `SearchModule`
- **杠杆性**：`ContentPipeline` 一次实现，`getPublishedPosts`/`renderPost`/`RSS`/`Sitemap` 全复用

### Negative / Trade-offs

- **初期投入大**：需重写 4 个集成、拆分组件、统一脚本入口
- **Astro 集成 API 学习成本**：`astro:build:done`/`astro:config:setup` 钩子类型较复杂
- **ClientModule 注册顺序**：需显式管理依赖顺序（如 ThemeToggle 必在 TOC 之前）

## Alternatives Considered

1. **保持现状** —— 浅模块蔓延，技术债累积，拒绝
2. **微前端拆分** —— 过度设计，单人维护成本极高，拒绝
3. **仅重构集成** —— 未解决组件/脚本/主题分层问题，拒绝

## Related ADRs

- docs/adr/0002-draft-isolation-submodule.md (草稿隔离策略)
- docs/adr/0003-deployment-strategy.md (部署策略)
- docs/adr/0004-subagent-coordination.md (子智能体协作内控)
- docs/adr/0005-theme-token-strategy.md (CSS Token vs Tailwind @theme)
- docs/adr/0006-pagefind-ui-approach.md (声明式 vs 模块化 UI)
- docs/adr/0007-client-module-registry.md (客户端模块注册表设计)
- docs/adr/0008-agents-knowledge-base-architecture.md (知识库架构)
- docs/adr/0009-knowledge-update-process.md (知识更新流程)
- docs/adr/0010-dependency-evaluation.md (依赖评估与引入策略)
- docs/adr/0011-agent-learning-mechanism.md (Agent 学习与知识捕获机制)

## Implementation Status

- [ ] Phase 1: Types & Interfaces
- [ ] Phase 2: Build Pipeline
- [ ] Phase 3: Components (Navbar composite, PostCard variants)
- [ ] Phase 4: Theme Tokens
- [ ] Phase 5: Search Component
- [ ] Phase 6: Client Runtime
- [ ] Phase 7: Content & Pages
- [ ] Phase 8: Cleanup & Docs
