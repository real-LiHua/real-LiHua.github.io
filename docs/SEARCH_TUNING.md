# Pagefind 搜索调优 (Search Tuning)

**Status**: Active — 配置参考（索引生成已落地）
**Date**: 2026-10-09
**适用范围**: Pagefind 索引生成、搜索 UI 配置、主题变量、排名与多索引
**关系**:

- UI 方案决策见 `docs/adr/0006-pagefind-ui-approach.md`（声明式为主，模块化 API 为扩展）
- 术语定义见 `CONTEXT.md`（SearchIndex、PagefindSearch、PagefindModularUI、PagefindConfig、PagefindCSSVars）
- 主题色映射见 `docs/VISUAL_DESIGN_SPEC.md` §2.5
- 快速示例见 `docs/KNOWLEDGE_BASE_QUICKREF.md`（Pagefind 模式）

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

---

## 1. 索引生成

Pagefind 在**构建后**对静态产物建立索引，属于 `BuildPipeline` 的第一阶段（`PagefindIndexer`，见 `docs/adr/0001-functional-architecture.md` §3.2）。

| 项       | 说明                                                      |
| -------- | --------------------------------------------------------- |
| 触发时机 | `astro:build:done` 之后（`BuildPipeline.execute()`）      |
| 扫描目标 | `dist/client/` 下静态 HTML，**仅本地文件、无外部请求**    |
| 输出目录 | `dist/client/pagefind/`（`CONTEXT.md`：`SearchIndex`）    |
| CLI      | `pagefind --site <dir>`（`pagefind` 为 devDependency）    |
| 失败处理 | 记录错误并继续（不阻断部署）                              |
| 分片     | 索引过大时可分片以控制体积与加载时间（威胁模型 DoS 缓解） |

```bash
# 构建（含 Pagefind 阶段）
pnpm build

# 产物检查：应存在 index / fragment / 语言等 json
ls dist/client/pagefind/*.json
```

> 默认 `bundlePath` 为 `/pagefind/`，即 `dist/client/pagefind/` 在站点上的 URL。

---

## 2. bundlePath

| 场景             | 配置                                                             |
| ---------------- | ---------------------------------------------------------------- |
| 默认             | `/pagefind/`（与产物目录对应）                                   |
| 自定义           | 通过 `<pagefind-config bundle-path="...">` 或组件 prop 指定      |
| `PagefindSearch` | 暴露 `bundlePath` / `placeholder` / `theme` 属性（`CONTEXT.md`） |
| 多站点合并       | 见 §6                                                            |

---

## 3. 声明式 UI 配置（`<pagefind-config>`）

采用 ADR 0006 的 **Option A：声明式 HTML 组件**。配置以 HTML 属性声明：

| 属性              | 作用                                 | 示例/默认    | 来源                       |
| ----------------- | ------------------------------------ | ------------ | -------------------------- |
| `base-url`        | 结果链接的基准 URL（子路径部署时用） | `/`          | `PagefindConfig`、ADR 0006 |
| `bundle-path`     | 索引 bundle 路径                     | `/pagefind/` | `PagefindConfig`、ADR 0006 |
| `excerpt-length`  | 结果摘要长度（词数）                 | `60`         | `PagefindConfig`、ADR 0006 |
| `highlight-param` | 用于高亮查询词的 URL 参数名          | `highlight`  | `PagefindConfig`、ADR 0006 |

```html
<!-- 设计示意（ADR 0006） -->
<pagefind-config
  base-url="/"
  bundle-path="/pagefind/"
  excerpt-length="{60}"
  highlight-param="highlight"
>
  <pagefind-input placeholder="搜索文章..." />
  <pagefind-results />
  <script type="text/pagefind-template">
    <div class="pagefind-result">
      <a class="pagefind-result-title" href="{{ url | safeUrl }}">{{ meta.title }}</a>
      <div class="pagefind-result-excerpt">{{+ excerpt +}}</div>
      <div class="pagefind-result-meta">
        <span>{{ meta.date }}</span>
        <span>{{ meta.tags }}</span>
      </div>
    </div>
  </script>
</pagefind-config>
```

- 结果模板用 `<script type="text/pagefind-template">` 定义，`{{ meta.* }}` 取索引中的 meta 字段。
- 输入框/结果容器分别是 `<pagefind-input>` / `<pagefind-results>`。
- 组件在 Shadow DOM 内，样式不污染宿主页面。
- 索引 meta（`title`、`date`、`tags`）的实际来源与字段名以内容管线为准。

---

## 4. 主题变量（`--pagefind-ui-*`）

搜索面板通过 CSS 变量适配 daisyUI 双主题（`docs/VISUAL_DESIGN_SPEC.md` §2.5）：

| Pagefind 变量              | 映射到 daisyUI Token        |
| -------------------------- | --------------------------- |
| `--pagefind-ui-primary`    | `var(--color-accent)`       |
| `--pagefind-ui-text`       | `var(--color-base-content)` |
| `--pagefind-ui-background` | `var(--color-base-100)`     |
| `--pagefind-ui-border`     | `var(--color-base-300)`     |
| `--pagefind-ui-tag`        | `var(--color-base-200)`     |

> ADR 0006 另给出 `--pagefind-ui-tag-background` → `var(--color-primary-focus)` 的映射；两处取值统一以 `src/styles/theme-tokens.css` 为准。

**主题切换同步**：监听 `document.documentElement.dataset.theme` 变化，转发给 `<pagefind-config>`（MutationObserver，ADR 0006）：

```js
const observer = new MutationObserver(() => {
  const theme = document.documentElement.dataset.theme;
  document.querySelector("pagefind-config")?.setAttribute("data-theme", theme);
});
observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme"],
});
```

- 也可用 `body.dark` 选择器直接覆盖（`PagefindCSSVars` 术语）。
- 结果高亮词建议 `primary/15` 淡朱底色（视觉规范 §6.2）。

---

## 5. 排名与高级配置（模块化 API）

声明式 UI **不支持** `ranking` / `filters`（ADR 0006 权衡项）。需要定制排名时，改用 `@pagefind/modular-ui`：

```ts
// src/scripts/search-advanced.ts ⏸（ADR 0006 Future Extension）
import { Instance, Input, ResultList } from "@pagefind/modular-ui";

const instance = new Instance({ bundlePath: "/pagefind/" });
const input = new Input({ containerElement: "#search-input" });
const results = new ResultList({
  containerElement: "#search-results",
  resultTemplate: customTemplate,
  // 排名权重：具体键名与取值范围 ⏸ 待确认，参见
  // https://pagefind.app/docs/ranking/
  ranking: {
    // title: ..., heading: ..., content: ..., url: ..., word_count: ...
  },
});
```

> ⏸ **待确认**：`ranking` 的确切键名、默认值与调优区间，以 Pagefind 官方文档为准，不在本文杜撰。

**何时需要模块化 API**：

- 自定义排序/权重
- 按标签等维度做筛选器（`filters`）
- 动态配置、事件钩子、搜索建议

---

## 6. 多索引合并（mergeIndex）

| 方案       | 说明                                                             |
| ---------- | ---------------------------------------------------------------- |
| 声明式限制 | `<pagefind-config>` 仅支持**单一** `bundle-path`（ADR 0006）     |
| 模块化 API | `new Instance({ bundlePath, mergeIndex: [...] })` 合并多个索引 ⏸ |
| 构建期合并 | 自定义脚本合并 `pagefind/index.json`（ADR 0006 提及）⏸           |

```ts
// 设计示意：合并博客 + 文档站索引
const instance = new Instance({
  bundlePath: "/pagefind/",
  mergeIndex: [{ bundlePath: "/docs/pagefind/" }], // ⏸ 待确认字段结构
});
```

> 具体字段形状以 Pagefind 官方文档为准（⏸ 待确认），本文不虚构。

---

## 7. 调试索引

| 手段       | 做法                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| 检查产物   | `ls dist/client/pagefind/*.json`；确认 `index.json` / fragment 存在    |
| 构建日志   | 看 `BuildPipeline` 的 Pagefind 阶段输出（失败记录但继续）              |
| 详细日志   | `pagefind --site dist/client --verbose`                                |
| 网络面板   | 打开搜索时检查 `pagefind/fragment/*` 与 `index.json` 请求是否 200      |
| Shadow DOM | 浏览器 DevTools 展开 `pagefind-input` / `pagefind-results` 检查渲染    |
| 路径错误   | `404` 多为 `bundle-path` 与产物目录不一致                              |
| 无结果     | 索引为空（`dist/` 未构建）、被 `data-pagefind-ignore` 排除、或语言配置 |
| 控制台     | 关注 `[ClientRuntime]` 初始化错误（`docs/adr/0007`）                   |

**常见排除**：认证墙/受保护内容不应进入索引（正文不在初始 HTML，故通常天然为空；必要时加 `data-pagefind-ignore`）⏸ 待确认是否已处理。

---

## 8. 验证命令

```bash
pnpm build                                   # 触发 Pagefind 阶段
ls dist/client/pagefind/*.json               # 索引存在
ls dist/client/pagefind/fragment/ | head     # 分片存在
pnpm exec oxlint . && pnpm exec oxfmt --check # 静态检查
```

浏览器端：本地 `pnpm preview` → 输入关键词 → 结果出现、链接可达、主题切换后样式正确、`/` 与 `Ctrl/Cmd+K` 聚焦输入框。

---

## 9. 调优检查清单

- [ ] `dist/client/pagefind/` 生成，`index.json` / fragment 存在
- [ ] `bundle-path` 与实际产物目录一致（默认 `/pagefind/`）
- [ ] `<pagefind-config>` 四个属性（`base-url` / `bundle-path` / `excerpt-length` / `highlight-param`）符合预期
- [ ] `--pagefind-ui-*` 变量映射到 daisyUI token，亮/暗双主题对比度达标
- [ ] 主题切换后搜索面板样式同步（MutationObserver / `body.dark`）
- [ ] 结果模板正确渲染 `meta.title` / 摘要 / 链接
- [ ] 受保护/认证页面不被索引
- [ ] 需要自定义排名/筛选时，确认已切换到模块化 API
- [ ] 多索引场景确认 `mergeIndex`（或构建期合并）配置
- [ ] 搜索快捷键 `/` 与 `Ctrl/Cmd+K` 可用（视觉规范 §9.5）
