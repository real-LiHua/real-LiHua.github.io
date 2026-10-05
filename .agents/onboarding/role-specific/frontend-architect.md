# 角色指南：前端架构师

**角色 ID**：`frontend-architect`  
**类型**：Stream-aligned  
**核心职责**：组件体系、设计系统、View Transitions、性能优化、可访问性、daisyUI 集成

---

## 1. 核心领域

| 领域 | 关键文件 | 关注点 |
|------|----------|--------|
| **组件体系** | `src/components/` | 复合组件模式、Props 设计、插槽设计 |
| **设计系统** | `src/styles/theme-tokens.css` | CSS Token、daisyUI 主题、Typography |
| **View Transitions** | `src/layouts/BaseLayout.astro` | `<ClientRouter />`、生命周期、转场指令 |
| **可访问性** | 全站 | 语义化 HTML、ARIA、键盘导航、prefers-reduced-motion |
| **性能** | `astro.config.ts`、组件 | 代码分割、懒加载、关键 CSS |

---

## 2. 必读文档

| 文档 | 重点章节 |
|------|----------|
| `AGENTS.md` | Technical Reference → View Transitions、Tailwind CSS 4 + daisyUI 5 |
| `docs/adr/0001-functional-architecture.md` | 3.6 UIComponents、C4 Container 视图 |
| `docs/adr/0003-subagent-responsibilities-controls.md` | 角色定义、技能矩阵 |
| `docs/adr/0005-theme-token-strategy.md` (待创建) | CSS Token vs @theme 决策 |
| `docs/adr/0006-pagefind-ui-approach.md` (待创建) | 声明式 vs 模块化 UI |
| `docs/SUBAGENT_OPERATIONS.md` | Technical Reference 全部 |
| `docs/SECURITY_WHITEPAPER.md` | CSP、Headers、客户端脚本安全 |

---

## 3. 专属质量门禁

```bash
# 本地预跑
pnpm exec tsx .agents/scripts/run-gate.ts frontend-architect

# 等价于
pnpm tsc -b && pnpm oxlint && pnpm oxfmt --check && pnpm build
pnpm playwright test --project=chromium
```

**通过标准**：核心页面渲染、导航、主题切换、View Transitions 全绿。

---

## 4. 核心交付物

| 交付物 | 位置 | 验收标准 |
|--------|------|----------|
| **复合组件库** | `src/components/` | Navbar、PostCardGrid/List、Tag、PagefindSearch、BaseLayout |
| **主题系统** | `src/styles/theme-tokens.css` | light/dark/prose 变量全覆盖，daisyUI @plugin 仅引用 token |
| **客户端运行时** | `src/scripts/client-entry.ts` | 9模块注册表、生命周期分发、单一入口 |
| **View Transitions** | `BaseLayout.astro` | `<ClientRouter fallback="animate" />` + 生命周期监听 |

---

## 5. 常用开发模式

### 5.1 复合组件

```astro
<!-- Navbar.astro -->
<Navbar>
  <Navbar.Start><Logo /></Navbar.Start>
  <Navbar.Center links={[{href:"/", label:"首页"}]} />
  <Navbar.End><ThemeToggle /></Navbar.End>
  <Navbar.MobileMenu links={[...]} />
</Navbar>
```

### 5.2 主题切换

```typescript
// src/scripts/theme-toggle.ts
const THEME_DARK = "dark", THEME_LIGHT = "light";
const setTheme = (theme: string, persist = true) => {
  document.documentElement.dataset.theme = theme;
  if (persist) localStorage.setItem("theme", theme);
};
```

### 5.3 View Transitions 生命周期

```html
<script is:inline>
document.addEventListener("astro:page-load", () => {
  // 页面加载完成（含转场后）
  initComponents();
});

document.addEventListener("astro:after-swap", () => {
  // DOM 交换后、动画前
  restoreScrollPosition();
});
</script>
```

### 5.4 响应式 + daisyUI

```astro
<div class="navbar max-w-6xl mx-auto px-4">
  <div class="navbar-start">...</div>
  <div class="navbar-center hidden lg:flex">...</div>
  <div class="navbar-end flex items-center gap-2">
    <div class="lg:hidden dropdown dropdown-end">...</div>
    <ThemeToggle />
  </div>
</div>
```

---

## 6. 专属质量门禁细则

| 检查项 | 工具 | 标准 |
|--------|------|------|
| **类型安全** | `pnpm tsc -b` | 0 errors、无 `any` 泄漏 |
| **Lint** | `pnpm oxlint` | 0 errors（warn 仅 no-console） |
| **格式** | `pnpm oxfmt --check` | 0 diffs |
| **构建** | `pnpm build` | success |
| **E2E** | `pnpm playwright test --project=chromium` | 全通过 |
| **a11y** | Playwright + axe | 无严重违规 |
| **性能** | Lighthouse CI | LCP < 2.5s、CLS < 0.1 |

---

## 7. 常见任务类型

| 任务类型 | 典型触发 | 关键产出 |
|----------|----------|----------|
| **新增复合组件** | UI 需求 | 组件文件 + Props 类型 + Story/测试 |
| **主题扩展** | 设计变更 | `theme-tokens.css` 变量 + daisyUI @plugin 同步 |
| **View Transitions 优化** | 性能/体验 | `transition:*` 指令、生命周期钩子 |
| **a11y 修复** | 审计/用户反馈 | 语义化 HTML、ARIA、键盘导航 |
| **性能优化** | Lighthouse 报警 | 代码分割、懒加载、关键 CSS 内联 |

---

## 7. 常见坑与规避

| 坑 | 症状 | 规避 |
|----|------|------|
| **布尔属性爆炸** | 组件 Props 超过 5 个 boolean | 改用复合组件 + 插槽 |
| **主题变量重复** | `global.css` 和 `theme-tokens.css` 重复 | 仅 `theme-tokens.css` 定义，`global.css` 仅 `@import` |
| **View Transitions 闪烁** | 主题切换后闪白 | `astro:after-swap` 监听恢复主题 |
| **hydration mismatch** | 服务端/客户端渲染不一致 | `isBrowser` 守卫、抑制 SSR 差异 |
| **CSS 变量未生效** | daisyUI @plugin 未读取 token | 检查 `@plugin "daisyui/theme"` 引用正确变量名 |

---

## 8. 关键文件清单

```
src/
├── components/
│   ├── Navbar.astro          # 复合导航
│   ├── Header.astro          # 页头
│   ├── Footer.astro          # 页脚
│   ├── CodeCopy.astro        # 代码复制
│   ├── navbar/
│   │   ├── Start.astro
│   │   ├── Center.astro
│   │   ├── End.astro
│   │   └── MobileMenu.astro
│   ├── common/
│   │   ├── PostCardGrid.astro
│   │   ├── PostCardList.astro
│   │   ├── Tag.astro
│   │   └── PagefindSearch.astro
├── layouts/
│   └── BaseLayout.astro      # CSP、OGP、ClientRouter、Pagefind、主题初始化
├── scripts/
│   ├── client-entry.ts       # 统一客户端入口
│   ├── theme-toggle.ts       # 主题切换
│   ├── toc.ts                # 目录生成
│   ├── reading-progress.ts   # 顶部进度条
│   ├── scroll-reveal.ts      # 入场动画
│   ├── tilt-card.ts          # 3D 倾斜
│   ├── code-copy.ts          # 代码复制
│   ├── telegram-auth.ts      # 认证墙轮询
│   └── gravatar-fallback.ts  # 头像降级
├── styles/
│   ├── theme-tokens.css      # 唯一变量源（light/dark/prose）
│   ├── global.css            # @import theme-tokens + Tailwind + daisyUI
│   └── shiki.css             # 代码高亮主题
```

---

## 9. 协作接口

| 依赖角色 | 协作内容 | 接口 |
|----------|----------|------|
| `content-engineer` | 文章渲染组件、TOC 数据 | `contentPipeline.renderPost()` |
| `build-deploy-engineer` | 构建产物、Pagefind UI | `buildPipeline.execute()` |
| `search-discovery-engineer` | 搜索 UI 组件 | `searchModule.SearchComponentProps` |
| `quality-dx-guardian` | 代码规范、a11y 审计 | oxlint/oxfmt/Playwright 配置 |

---

## 10. 学习资源

| 资源 | 链接 |
|------|------|
| Astro View Transitions | https://docs.astro.build/en/guides/view-transitions/ |
| daisyUI 5 Components | https://daisyui.com/components/ |
| Tailwind CSS 4 | https://tailwindcss.com/docs/installation |
| Pagefind Modular UI | https://github.com/pagefind/pagefind/tree/main/pagefind_ui/modular |
| Web Accessibility | https://www.w3.org/WAI/ARIA/apg/ |

---

**核心口诀**：复合组件替代布尔爆炸 → Theme Tokens 单一源头 → Client Runtime 单一入口 → View Transitions 生命周期 → 本地预跑 Chromium 门禁 → CI 绿灯合并