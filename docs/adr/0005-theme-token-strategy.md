# Architecture Decision Record: 主题 Token 策略 - CSS 变量 vs Tailwind @theme

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

## Status

Accepted

## Last Updated

2026-10

## Context

Tailwind CSS 4 采用 CSS-first 架构，daisyUI 5 通过 `@plugin "daisyui/theme"` 定义主题。需要决定：

1. 主题变量（颜色、间距、字体等）的单一源头在哪里
2. 如何同时满足：daisyUI 语义类名、Tailwind 实用类、@tailwindcss/typography prose 样式
3. 深色模式切换的实现方式（CSS 变量 vs Tailwind `dark:` 变体）

## Options

### Option A: CSS 变量单一源头 + daisyUI @plugin 引用 (推荐)

- `src/styles/theme-tokens.css` 定义所有 `--color-*`、`--spacing-*`、`--font-*` 等 CSS 变量
- daisyUI `@plugin "daisyui/theme" { name: "light"; --color-primary: var(--color-brand-500); ... }` 引用变量
- `@tailwindcss/typography` 通过 `--tw-prose-*` 变量同步
- 运行时仅切换 `document.documentElement.dataset.theme = 'light'|'dark'`，CSS 变量自动生效

### Option B: Tailwind @theme 指令定义

- 在 CSS 中使用 `@theme { --color-primary: #...; }` 定义
- Tailwind 4 自动生成对应实用类
- daisyUI 需单独配置主题色，无法直接复用

### Option C: 双重维护 (CSS 变量 + Tailwind config 同步)

- 同时维护 `theme-tokens.css` 和 Tailwind 配置
- 构建时同步或运行时注入
- 复杂度高，易漂移

## Decision

**选择 Option A: CSS 变量单一源头 + daisyUI @plugin 引用**

### 实施细节

**1. theme-tokens.css 结构**

```css
/* src/styles/theme-tokens.css  */
@theme {
  /* 语义化颜色映射到品牌色 */
  --color-primary: var(--color-brand-500);
  --color-primary-content: var(--color-brand-50);
  --color-secondary: var(--color-brand-300);
  --color-accent: var(--color-accent-500);
  --color-neutral: var(--color-slate-800);
  --color-base-100: var(--color-slate-50);
  --color-base-200: var(--color-slate-100);
  --color-base-300: var(--color-slate-200);
  --color-info: var(--color-sky-500);
  --color-success: var(--color-emerald-500);
  --color-warning: var(--color-amber-500);
  --color-error: var(--color-rose-500);
}

/* Light theme (default) */
:root,
[data-theme="light"] {
  --color-brand-50: #f0f9ff;
  --color-brand-100: #e0f2fe;
  --color-brand-500: #0ea5e9;
  --color-brand-600: #0284c7;
  --color-accent-500: #d946ef;
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  --color-slate-800: #1e293b;
  /* prose variables */
  --tw-prose-body: var(--color-slate-700);
  --tw-prose-headings: var(--color-slate-900);
  --tw-prose-links: var(--color-brand-600);
  --tw-prose-code: var(--color-slate-900);
  --tw-prose-pre-bg: var(--color-slate-950);
}

/* Dark theme */
[data-theme="dark"] {
  --color-brand-50: #0c1a2a;
  --color-brand-100: #075985;
  --color-brand-500: #38bdf8;
  --color-brand-600: #7dd3fc;
  --color-accent-500: #f0abfc;
  --color-slate-50: #0f172a;
  --color-slate-100: #1e293b;
  --color-slate-200: #334155;
  --color-slate-800: #f1f5f9;
  /* prose variables - dark override */
  --tw-prose-body: var(--color-slate-300);
  --tw-prose-headings: var(--color-slate-100);
  --tw-prose-links: var(--color-brand-400);
  --tw-prose-code: var(--color-slate-100);
  --tw-prose-pre-bg: var(--color-slate-950);
}
```

**2. global.css 引入**

```css
/* src/styles/global.css  */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "daisyui" {
  themes: false; /* 禁用内置主题，完全自定义 */
}
@plugin "daisyui/theme" {
  name: "light";
  prefersdark: false;
  color-scheme: "light";
  /* 引用 theme-tokens.css 变量 */
  --color-primary: var(--color-primary);
  --color-primary-content: var(--color-primary-content);
  --color-secondary: var(--color-secondary);
  --color-accent: var(--color-accent);
  --color-neutral: var(--color-neutral);
  --color-base-100: var(--color-base-100);
  --color-base-200: var(--color-base-200);
  --color-base-300: var(--color-base-300);
  --color-info: var(--color-info);
  --color-success: var(--color-success);
  --color-warning: var(--color-warning);
  --color-error: var(--color-error);
}
@plugin "daisyui/theme" {
  name: "dark";
  prefersdark: true;
  color-scheme: "dark";
  /* 同名变量，值由 [data-theme="dark"] 覆盖 */
  --color-primary: var(--color-primary);
  --color-primary-content: var(--color-primary-content);
  /* ... 同 light ... */
}

@import "./theme-tokens.css";
```

**3. 主题切换脚本 (theme-toggle.ts)**

```typescript
// 仅 30 行：切换 data-theme 属性 + localStorage 同步 + 系统偏好监听
export function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
}

export function toggleTheme() {
  const html = document.documentElement;
  const next = html.dataset.theme === "dark" ? "light" : "dark";
  html.dataset.theme = next;
  localStorage.setItem("theme", next);
}
```

## Consequences

### Positive

- **单一源头**：所有颜色/间距/字体在 `theme-tokens.css` 定义，修改一处全局生效
- **零运行时开销**：CSS 变量原生切换，无 JS 计算样式
- **daisyUI 完全兼容**：语义类名 (btn-primary, card, badge) 自动适配主题
- **Typography 同步**：`prose` 类族通过 `--tw-prose-*` 自动跟随深/浅色
- **扩展性**：新增语义色只需在 CSS 变量层添加，daisyUI/Tailwind 自动可用

### Negative / Trade-offs

- 需理解 CSS 变量作用域与 Tailwind 4 `@theme` 交互
- daisyUI `@plugin "daisyui/theme"` 语法相对较新，文档较少
- 浏览器不支持 CSS 变量的极老环境需 polyfill (非目标用户)

## References

- `src/styles/theme-tokens.css`

- `src/styles/global.css`

- `src/scripts/theme-toggle.ts` ⏸
- docs/adr/0001-functional-architecture.md#33-theme-system-module
- CONTEXT.md (术语: Theme, TailwindCSS4, DaisyUI5, TypographyPlugin)
