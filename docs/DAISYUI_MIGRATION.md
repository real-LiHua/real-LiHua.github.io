# daisyUI 5 迁移与配置记录 (daisyUI 5 Migration & Config)

**Status**: Accepted
**Date**: 2026-10-14
**适用范围**: Tailwind CSS 4 + daisyUI 5 的 CSS-first 配置，以及从 daisyUI 4 类名到 5 的迁移对照
**关系**:

- 主题**机制**（CSS 变量单一源头 + `@plugin "daisyui/theme"`）见 `docs/adr/0005-theme-token-strategy.md`
- 颜色/圆角/尺寸**取值**与视觉规则见 `docs/VISUAL_DESIGN_SPEC.md`
- 术语（ThemeTokens、DaisyUI5 等）见 `CONTEXT.md`
- 官方指南：[daisyUI 5 upgrade guide](https://daisyui.com/docs/upgrade/)

> [!NOTE] 定位
> 本项目按 `REWRITE_PLAN.md` 从零重写，当前源码**只使用 daisyUI 5 语法**；git 历史中的 v4 时代实现仅作行为参考。
> 本文档因此承担两个职责：记录**当前 v5 配置的事实**，并提供 **v4 → v5 的迁移对照**，供后续改动（或移植旧代码）时查证。
> 已核验：`src/` 中**不存在**任何 v4 遗留类名（见 §4 核验结果）。

---

## 1. 安装与启用（CSS-first）

daisyUI 5 不再通过 `tailwind.config.js` 的 `plugins` + `daisyui` 字段配置，改为在 CSS 中通过 `@plugin` 声明：

```css
/* src/styles/global.css */
@import "tailwindcss";
@import "./theme-tokens.css";

@plugin "@tailwindcss/typography";
@plugin "daisyui" {
  themes: false; /* 关闭内置主题，仅使用下方自定义主题 */
}
```

要点：

- `themes: false` 表示**不启用任何内置主题**（`light`/`dark`/`cupcake` …）。内置主题会注入大量 `--color-*` 变量，与 §2 的自定义主题产生覆盖竞争。
- 需要内置主题时应改为 `themes: light --default, dark --prefersdark;`，但本项目走全自定义路线。
- 插件由 `@tailwindcss/vite`（`astro.config.ts` 的 `vite.plugins`）处理，不再需要 PostCSS 配置。

---

## 2. 自定义主题（`@plugin "daisyui/theme"`）

每个主题用一条 `@plugin "daisyui/theme" { … }` 声明，`name` 必须与 `data-theme` 的取值一致：

```css
/* src/styles/global.css — 浅色（默认） */
@plugin "daisyui/theme" {
  name: "light";
  default: true;
  prefersdark: false;
  color-scheme: light;

  --color-primary: var(--palette-brand-500);
  /* …其余语义色… */

  --radius-selector: 1rem;
  --radius-field: 0.25rem;
  --radius-box: 0.5rem;
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: 1px;
  --depth: 1;
  --noise: 0;
}
```

### 2.1 必需变量契约

| 类别       | 变量                                                  | 规则                                                                              |
| ---------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| 语义色     | `--color-primary`、`--color-base-100` …               | 每个 `--color-<role>` **必须**有配对的 `--color-<role>-content`（daisyUI 5 要求） |
| 形状       | `--radius-selector`、`--radius-field`、`--radius-box` | 三档圆角，按语义分配，禁止全站同一值                                              |
| 尺寸       | `--size-selector`、`--size-field`                     | daisyUI 5 必填，决定按钮/输入框高度步进                                           |
| 其它       | `--border`、`--depth`、`--noise`                      | 边框粗细、投影深度、噪点开关                                                      |
| 主题元数据 | `name`、`default`、`prefersdark`、`color-scheme`      | `prefersdark: true` 表示系统深色时默认启用                                        |

> 缺失 `--color-<role>-content` 会让该底色上的文字回退到 `base-content`，在深色下通常表现为**对比度不足**（`docs/VISUAL_DESIGN_SPEC.md` §2）。

### 2.2 双主题

`global.css` 声明 `light`（`default: true`）与 `dark`（`prefersdark: true`）两条主题；`html[data-theme]` 由 `themeSystem` 的无闪烁内联脚本在首帧前写入，运行时由 `theme-toggle` 客户端模块切换。

---

## 3. Token 间接层（ADR 0005）

daisyUI 语义变量**不直接写死颜色**，而是引用 `theme-tokens.css` 的原始调色板变量：

```text
--palette-brand-500   (theme-tokens.css, :root / [data-theme] 覆盖)
        │
        ▼
--color-primary        (global.css, @plugin "daisyui/theme")
        │
        ▼
btn-primary / text-primary / bg-base-100 …  (组件只用语义类名)
```

- 切换 `data-theme` 时整表翻转，**无 JS 计算样式**。
- 组件**只允许**使用语义类名（`text-primary`、`bg-base-100`…），不得裸写 Tailwind 原始色名，也不得用 `dark:` 覆盖语义色（`docs/ACCESSIBILITY.md`、`docs/VISUAL_DESIGN_SPEC.md` §6）。

---

## 4. v4 → v5 破坏性变更对照

来源：[官方 upgrade guide](https://daisyui.com/docs/upgrade/#changes-from-v4)。下表列出与本站组件相关的变更，并附本仓库核验结果（已用 `rg` 全量扫描 `src/`）。

| 组件              | v4 写法                                    | v5 写法                                               | 本仓库 |
| ----------------- | ------------------------------------------ | ----------------------------------------------------- | ------ |
| Card              | `card-bordered`                            | `card-border`                                         | 未使用 |
| Card              | `card-compact`                             | `card-sm`                                             | 未使用 |
| Input             | `input-bordered`                           | `input`（默认带边框；无边框用 `input-ghost`）         | 未使用 |
| Select            | `select-bordered`                          | `select`（默认带边框；无边框用 `select-ghost`）       | 未使用 |
| Textarea          | `textarea-border`                          | `textarea`（默认带边框）                              | 未使用 |
| File input        | `file-input-bordered`                      | `file-input`（默认带边框）                            | 未使用 |
| Tabs              | `tabs-bordered`/`tabs-lifted`/`tabs-boxed` | `tabs-border`/`tabs-lift`/`tabs-box`                  | 未使用 |
| Menu              | `active`/`disabled`/`focus`                | `menu-active`/`menu-disabled`/`menu-focus`            | 未使用 |
| Menu              | 垂直菜单默认满宽                           | 默认不满宽，需要时显式加 `w-full`                     | 未使用 |
| Table             | `hover`                                    | `hover:bg-base-300`（或其它色）                       | 未使用 |
| Footer            | 默认水平                                   | 默认垂直，需显式 `md:footer-horizontal`               | 未使用 |
| Stat              | `stats` 自带背景                           | 背景透明，需要时加 `bg-base-100`                      | 未使用 |
| Avatar            | `online`/`offline`/`placeholder`           | `avatar-online`/`avatar-offline`/`avatar-placeholder` | 未使用 |
| Artboard          | `artboard phone-*`                         | 已移除，改用 Tailwind `w-*`/`h-*`                     | 未使用 |
| Bottom navigation | `btm-nav`/`btm-nav-active`                 | 已移除，改用 `dock`/`dock-active`                     | 未使用 |
| Mockup phone      | `.camera`/`.display`                       | `mockup-phone-camera`/`mockup-phone-display`          | 未使用 |
| Stack             | 尺寸设在子项                               | 尺寸设在 stack 容器                                   | 未使用 |
| Form 结构         | `form-control`、`label-text(-alt)`         | 已移除，改用 `fieldset`/`legend`/`label`              | 未使用 |
| 组合控件          | `btn-group`、`input-group`                 | 已移除，改用 `join`/`join-item`                       | 未使用 |
| Mask              | `mask-square`、`mask-parallelogram-*`      | 已移除（如需请自行引入 CSS）                          | 未使用 |

> 核验命令（可复现）：
>
> ```bash
> rg -n 'card-bordered|card-compact|input-bordered|select-bordered|textarea-border|tabs-bordered|tabs-lifted|tabs-boxed|form-control|label-text|btn-group|input-group|artboard|btm-nav|bottom-nav|file-input-bordered|mask-square|mask-parallelogram' src/
> # 无输出 = 无 v4 遗留类名
> ```

---

## 5. 常见坑与排查

| 症状                      | 根因                                            | 处置                                                                |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| 主题切换后样式不变        | `@plugin "daisyui/theme"` 变量名与 token 不一致 | 核对 `--color-*` 变量名与 `theme-tokens.css` 一致                   |
| 深色下文字对比度不足      | 缺少 `--color-<role>-content` 配对              | 为每个 `--color-<role>` 补内容色（`docs/VISUAL_DESIGN_SPEC.md` §2） |
| 内置主题覆盖自定义主题    | 未设置 `themes: false`                          | 在 `@plugin "daisyui"` 中关闭内置主题                               |
| `data-theme` 切换无效     | 主题 `name` 与 `data-theme` 取值不一致          | 保持 `name` 与运行时写入值一致（`light`/`dark`）                    |
| 布局意外变化（菜单/页脚） | v5 改变了部分组件的默认宽度/方向                | 参见 §4：显式补 `w-full`、`md:footer-horizontal` 等                 |

---

## 6. 校验清单

- [ ] `@plugin "daisyui"` 显式设置 `themes: false`（或显式启用所需内置主题）
- [ ] 每个 `--color-<role>` 都有 `--color-<role>-content`
- [ ] 每个主题都设置了 `color-scheme`，并正确使用 `default`/`prefersdark`
- [ ] `--radius-*`、`--size-*`、`--border`、`--depth`、`--noise` 均已声明
- [ ] `src/` 中无 v4 遗留类名（§4 命令无输出）
- [ ] `pnpm build` 通过且主题切换正常（`pnpm exec playwright test --project=chromium`）

---

## Related Documents

- `docs/adr/0005-theme-token-strategy.md` — 主题机制决策
- `docs/VISUAL_DESIGN_SPEC.md` — 颜色/圆角/尺寸取值
- `src/styles/global.css`、`src/styles/theme-tokens.css` — 实现
- `docs/LESSONS_LEARNED.md` — daisyUI 相关坑点
