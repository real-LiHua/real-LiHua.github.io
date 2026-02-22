# AGENTS.md

本文件为在此代码库中工作的 AI 代理提供指导。

## 项目概述

这是一个基于 Astro 的静态网站项目，包含：

- **Astro** 5.x + TypeScript
- **Tailwind CSS** v4 + **DaisyUI** v5
- **Telegram Bot** (Grammy)
- **IPFS** 集成 (Helia)
- 使用 **Bun** 作为包管理器

---

## 1. 构建/测试/启动命令

| 命令          | 说明                            |
| ------------- | ------------------------------- |
| `bun dev`     | 启动开发服务器                  |
| `bun build`   | 运行类型检查 + 构建生产版本     |
| `bun preview` | 构建后预览（运行 wrangler dev） |
| `bun astro`   | 执行 Astro CLI                  |

### Lint 和格式化

| 命令                    | 说明                |
| ----------------------- | ------------------- |
| `bunx eslint --fix`     | 修复 ESLint 问题    |
| `bunx stylelint --fix`  | 修复 Stylelint 问题 |
| `bunx prettier --write` | 格式化所有文件      |
| `bunx astro check`      | 运行 Astro 类型检查 |

### Git Hooks (Husky + lint-staged)

提交前自动运行 lint-staged：

- `*.css` → stylelint --fix + prettier --write
- `*.{js,mjs,jsx,ts,tsx}` → eslint --fix + prettier --write
- 其他文件 → prettier --ignore-unknown --write

---

## 2. 代码风格指南

### 2.1 通用规则

- 使用 **TypeScript**，启用 `strictNullChecks`
- 使用 **Bun** 作为包管理器
- 所有代码必须通过 ESLint + Prettier + Stylelint 检验
- 遵循现有文件的代码结构

### 2.2 Astro 组件 (.astro)

**Props 定义（推荐方式）：**

```astro
---
interface Props {
  title: string;
  description?: string;
}

const { title, description = "Default description" } = Astro.props;
---

<header>
  <h1>{title}</h1>
  {description && <p>{description}</p>}
</header>
```

**使用 JSDoc 类型标注（用于复杂类型）：**

```astro
---
/** @type {import('astro').MarkdownInstance} */
const post = Astro.props.entry;
---
```

**规则：**

- 定义 `Props` 接口来获得 TypeScript 支持和自动补全
- 组件 props 使用 `Astro.props` 解构
- 禁止使用 `set:text` 和 `set:html` 指令（ESLint 规则强制）
- 属性按字母顺序排序（ESLint 规则强制：`astro/sort-attributes`）

### 2.3 导入顺序 (ESLint sort-imports)

项目使用 ESLint 内置的 `sort-imports` 规则：

```typescript
// 外部库
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

// 内部模块
import Navigation from "./Navigation.astro";
import type { Props } from "../types";
```

**memberSyntaxSortOrder**: `none` → `all` → `multiple` → `single`

### 2.4 命名约定

| 类型            | 约定             | 示例                                     |
| --------------- | ---------------- | ---------------------------------------- |
| Astro 组件文件  | PascalCase       | `Header.astro`, `Navigation.astro`       |
| 普通文件        | camelCase        | `middleware.ts`, `utils.ts`              |
| 目录            | kebab-case       | `src/components/navbar/`                 |
| TypeScript 类型 | PascalCase       | `interface Props {}`, `type Config = {}` |
| 常量            | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                        |

### 2.5 TypeScript 规则

- 启用 `strictNullChecks`
- 优先使用 TypeScript 接口定义 Astro 组件 props
- 避免使用 `any`，使用具体类型或 `unknown`

```typescript
// 推荐
interface Props {
  name: string;
  greeting?: string;
}

// 避免
function handleFile(/** @type {any} */ file) {}
```

### 2.6 CSS / Tailwind CSS v4 / DaisyUI v5

**Tailwind CSS v4 配置：**

```css
@import "tailwindcss";
@plugin "daisyui";

@theme {
  --font-display: "Twinkle Star", sans-serif;
  --color-brand: oklch(65% 0.3 240);
}
```

**规则：**

- 使用 Tailwind CSS v4 语法（`@import "tailwindcss"`）
- 不再使用 `tailwind.config.js`
- 使用 DaisyUI v5 组件（`@plugin "daisyui"`）
- 优先使用 daisyUI 语义颜色（`primary`, `base-100`, `neutral`）而非 Tailwind 颜色
- 自定义主题使用 `@theme` 块

**DaisyUI 颜色使用规则：**

- 使用 daisyUI 语义颜色（`primary`, `secondary`, `base-100`）以支持主题切换
- 避免使用 Tailwind 颜色（如 `red-500`），因为它们不会随主题变化
- 使用 `oklch()` 颜色空间定义自定义颜色

**DaisyUI 组件示例：**

```html
<!-- Button -->
<button class="btn btn-primary">Button</button>

<!-- Card -->
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Title</h2>
    <p>Content</p>
  </div>
</div>

<!-- Navbar -->
<div class="navbar bg-base-200">
  <div class="navbar-start">...</div>
  <div class="navbar-center">...</div>
  <div class="navbar-end">...</div>
</div>
```

### 2.7 错误处理

- 使用 try-catch 捕获异步操作错误
- 提供有意义的错误消息
- 避免裸露的 `console.error`，使用结构化日志
- 正确处理 `null` 和 `undefined`（项目启用 `strictNullChecks`）

---

## 3. 安全指南

1. **OWASP 原则**：检查注入、XSS、CSRF、敏感数据泄露
2. 禁止提交密钥/凭证到仓库（使用 `.env` 或环境变量）
3. 用户输入必须验证和清理
4. 使用 TypeScript 类型检查防止运行时错误

---

## 4. Git 提交规范

使用**约定式提交** (Conventional Commits)：

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

**常用类型：**

- `feat`: 新功能
- `fix`: Bug 修复
- `build`: 构建系统或依赖
- `deps`: 依赖更新
- `deps-dev`: 开发依赖更新
- `refactor`: 重构
- `docs`: 文档更新
- `style`: 格式化
- `chore`: 维护任务

**示例：**

```
feat: add new blog post component
deps: update helia to v6.0.20
fix: resolve navigation alignment issue
```

---

## 5. 关键文件位置

| 文件                | 用途            |
| ------------------- | --------------- |
| `astro.config.mjs`  | Astro 配置      |
| `tsconfig.json`     | TypeScript 配置 |
| `eslint.config.js`  | ESLint 配置     |
| `src/components/`   | Astro 组件      |
| `src/layouts/`      | 页面布局        |
| `src/pages/`        | 路由页面        |
| `src/middleware.ts` | Astro 中间件    |

---

## 6. 常用工具文档

- **Astro**: https://docs.astro.build
- **Tailwind CSS v4**: https://tailwindcss.com/docs
- **DaisyUI v5**: https://daisyui.com/docs
- **Grammy**: https://grammy.dev
- **Helia**: https://helia.io
- **Wrangler**: https://developers.cloudflare.com/workers/wrangler

---

## 7. 代码质量检查

在提交代码前，确保运行：

```bash
# 类型检查
bunx astro check

# Lint
bunx eslint .
bunx stylelint .

# 格式化
bunx prettier --write .
```

所有 lint 和格式化问题都应该被修复后再提交。
