# ADR 001: 组件架构 - 单布局 + 模块化组件 + 原生脚本

## Status

Accepted

## Context

Astro 静态博客需要：

- 统一布局（Header、Footer、主题、路由）
- 可复用的 UI 组件（PostCard、Tag、导航栏等）
- 客户端交互（主题切换、搜索、TOC、代码复制等）
- 零运行时框架依赖，最小 JS 体积

## Decision

1. **单一布局组件** `BaseLayout.astro` - 所有页面共用，包含：
   - OGP meta、主题初始化内联脚本（防 FOUC）
   - `<ClientRouter>` 启用 View Transitions
   - 全局脚本注入（theme-toggle、Pagefind modal）
   - Header/Footer 通过 slot 注入

2. **模块化组件结构** `src/components/`：
   - `common/` - 通用展示组件
   - `navbar/` - 导航栏拆分（Start/Center/End/SearchBar）
   - 功能组件直接放在 components/（CodeCopy、Copyright、Footer、Header、Navigation）

3. **原生 JS 客户端脚本** `src/scripts/`：
   - 每个脚本单一职责，监听 `astro:page-load` 初始化
   - 无框架依赖，使用原生 DOM API
   - 通过 `data-*` 属性传递配置（避免内联 onerror 触发 TS 错误）
   - 统一错误提交用 daisyUI toast

4. **样式系统**：
   - Tailwind CSS 4 + daisyUI 5 (`@plugin` 指令)
   - CSS 变量在 `src/styles/global.css` 定义双主题
   - 组件内直接使用 daisyUI 类名

## Consequences

### 正面

- 布局统一，维护成本低
- 组件复用度高，设计一致性强
- 零 JS 框架，首屏性能优秀
- TypeScript 类型安全（Astro Props + 脚本 TS）

### 负面/风险

- 组件粒度需把控，避免过度拆分
- 脚本加载时机需统一管理（见 Task 1.4）
- daisyUI 版本升级需注意破坏性变更

### 后续工作

- Task 1.3: 清理空占位组件
- Task 1.4: 统一脚本注册机制
- 建立组件库文档（Storybook）

## References

- `src/layouts/BaseLayout.astro`
- `src/components/`
- `src/scripts/`
- `src/styles/global.css`
