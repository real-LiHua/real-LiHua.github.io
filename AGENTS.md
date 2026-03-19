# 代码任务执行规范（Astro 静态博客）

**你将作为项目中的资深前端工程师完成我交付的开发/改动任务，并直接输出最终结果（代码/说明/变更点）。全程使用中文沟通与注释。**

> **目标：保持博客结构清晰、内容规范、样式统一。**

---

## 1) 通用约束（**必须遵守**）

1. **禁止直接运行项目**
   - **不执行** `dev` / `build` 等启动命令（除非我明确要求）。
   - 允许静态分析操作：读代码、检索引用、重构等。

2. **类型安全优先**
   - **禁止使用 `any`**。

3. **不做额外兜底/向后兼容**
   - 除非我明确要求，否则**不引入**：
     - 无关 polyfill 或 hack
     - 旧参数/旧字段兼容分支
     - try/catch 吞异常、随意默认值等容错兜底
   - **只实现我要求的行为与范围，变更精确可控**。

4. **代码检查工具**
   - 使用 [oxlint](https://oxc.rs/) 作为 lint 工具（替代 eslint）
   - 使用 [oxfmt](https://oxc.rs/) 作为格式化工具（替代 prettier）
   - 运行命令：`bunx oxlint` / `bunx oxfmt`
   - lint-staged 已配置自动执行
   - **使用包管理器添加依赖**：`bun add -d <package>`（而非手动修改 package.json）

5. **oxlint 配置规范**
   - `.oxlintrc.json` 配置优先级高于 `eslint.config.js`
   - **必须为 `*.astro` 文件添加 overrides**
   - `no-console` 是 warn 级别，`no-alert` 是 error 级别
   - **错误处理使用 UI 组件（如 toast），禁止使用 `console.error` 和 `alert`**
   - **pre-commit hook**：`bunx oxfmt .husky/pre-commit.ts` 格式化后再执行

6. **未经允许禁止任何 Git 操作**

---

## 2) 自主学习能力（**很重要！持续迭代规范**）

当在项目中遇到以下情况时，**必须**将新知识更新到 AGENTS.md：

1. **新技术/工具发现**
   - 发现了项目使用的新库、新框架特性
   - 遇到了更好的解决方案

2. **规范补充**
   - 执行任务时发现现有规范未覆盖的场景
   - 总结出的可复用模式

3. **更新原则**
   - 更新内容必须是**经过验证**的正确实践
   - 写清楚**为什么**要这样做（原因）
   - 提供**具体示例**或命令
   - 更新后**告知用户**修改了哪些内容

4. **更新示例**
   - 添加新的目录结构约定
   - 补充特定场景的处理规范
   - 记录新工具的使用方式

---

## 3) 工作流（**强制**）

0. **任务完成后主动更新 AGENTS.md（不要等用户提醒）**
   - 每次完成开发/重构任务后，**立即**检查是否需要更新 AGENTS.md
   - **不要等用户提醒**，主动识别并更新
   - 触发条件：
     - 发现/使用了新技术/工具/库
     - 总结出可复用的模式或规范
     - 补充了现有规范未覆盖的场景
     - 遇到了现有规范无法覆盖的问题及解决方案
   - 更新内容需包含：**为什么**这样做、具体示例/命令

1. **先理解再改**
   - 先定位：现有页面结构、组件复用情况、样式规范。
   - **必须确认是否已有类似组件或样式可复用，再决定是否新建**。

2. **变更前后对齐**
   - 改动围绕「单一职责」组织。
   - **同类样式/逻辑必须集中管理，禁止散落多处**。

3. **重构步骤**
   - 先分析现有代码，找出重复逻辑
   - 创建可复用单元（工具函数/组件）
   - 更新所有调用方使用新单元
   - 清理废弃的旧代码
   - **完成后必须 `bunx tsc -b` 校验**

4. **修改后必须做 TypeScript 构建校验**
   - 只要做了任何代码修改，**任务结束必须执行**：`bunx tsc -b`
   - 若失败：
     - 优先修复
     - 若无法修复，列出：文件路径、错误信息、原因，最小修改建议

---

## 4) 结构化与复用规则（**核心：禁止重复写**）

### 3.1 复用优先（**强制**）

- **相同/相似样式必须抽成 CSS 变量或公共类**
- **相同布局抽成 Astro Layout 组件**
- **相同交互逻辑抽成独立组件或工具函数**

当出现以下任意情况，必须执行「抽象复用」：

- 你准备复制粘贴一段样式/组件/类型定义
- 发现已有相似实现但命名不同、位置不同
- 同一 UI 模式在多个页面重复出现

### 3.2 组件设计要求

- Astro 组件（.astro）：用于静态布局
- `.ts` / `.tsx` 文件：**仅在需要客户端交互时使用**
- **Props 必须显式声明类型**
- 禁止把通用逻辑塞进页面组件里

### 3.2 Rust CLI 工具规范

1. **项目创建**
   - 使用 `cargo new src/<project-name>` 创建项目
   - 使用 `cargo add <package> -p <project-name>` 添加依赖

2. **依赖选择**
   - 命令行交互：使用 [clap](https://docs.rs/clap/latest/clap/)（已验证可用的 CLI 解析库）
   - 日期时间：使用 [chrono](https://docs.rs/chrono/latest/chrono/)
   - 交互式选择：使用 [skim](https://crates.io/crates/skim)（替代 fzf，作为库内嵌使用）
   - 文件预览：使用 [bat](https://crates.io/crates/bat)（cat 替代品，支持语法高亮）
   - frontmatter 解析：使用 [gray_matter](https://docs.rs/gray_matter/latest/gray_matter/)（支持 YAML/JSON/TOML）
   - slug 生成：使用 [slug](https://docs.rs/slug)（通用 URL-friendly slug，70万+ 下载/月）+ [pinyin](https://docs.rs/pinyin/latest/pinyin/)（中文转拼音）
   - 避免引入不必要的依赖

3. **搜索 Rust 库经验（必须主动寻找现成库）**
   - **有实现需求时，先搜索库再考虑自己写**：如需文件预览、JSON 处理、日期格式化等，先在 docs.rs 搜索
   - **首选 docs.rs**：访问 `https://docs.rs/releases/search?sort=downloads&query={关键词}` 按下载量排序
   - **优先选择成熟库**：下载量大、持续维护、有详细文档
   - **注意依赖数量**：避免引入大量传递依赖，优先选择轻量级库
   - **查看源码复杂度**：复杂实现可能意味着更多潜在问题
   - **检查 feature flags**：很多库支持可选功能，按需添加

4. **构建校验**
   - 完成后执行 `cargo clippy -p <project-name>`
   - 确保无 clippy 错误
   - 使用 `cargo audit` 检查依赖安全漏洞（传递依赖的 unmaintained 警告可忽略）
   - **网络不通不能跳过**：如果无法拉取 advisory-db，需手动克隆到本地 `~/.cargo/advisory-db` 后再执行

5. **运行方式**
   - Cargo.toml 放在项目根目录，通过 `[[bin]]` 指定源码路径

```toml
[[bin]]
name = "post-edit"
path = "src/post-edit/main.rs"
```

- 开发调试：`cargo run -p <project-name>`
  - 或直接运行编译后的二进制文件

6. **单元测试规范**
   - 使用 `#[cfg(test)]` 模块编写单元测试
   - 使用 `cargo test -p <project-name>` 运行测试
   - 测试命名：`test_<function_name>_<scenario>`
   - 必须覆盖的场景：正常输入、边界条件、错误处理

   示例：

   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;

       #[test]
       fn test_title_to_pinyin_chinese() {
           assert_eq!(title_to_pinyin("测试文章"), "ce-shi-wen-zhang");
       }

       #[test]
       fn test_title_to_pinyin_english() {
           assert_eq!(title_to_pinyin("Hello World"), "hello-world");
       }
   }
   ```

7. **skim 预览功能实现**
   - **不建议使用 skim 的 preview 选项**：shell 环境兼容性差（zsh glob、特殊字符等），调试困难
   - **推荐方案**：在 Rust 中直接实现预览逻辑
     - 在 `post_actions` 函数中选择操作前调用 `preview_file()` 显示内容
     - 简化 `skim_select`，不传 `posts_dir` 参数，不使用 preview 选项
   - 示例：
     ```rust
     fn post_actions(posts_dir: &str, filename: &str) {
         let filepath = get_full_path(posts_dir, filename);
         if filepath.exists() {
             preview_file(&filepath.to_string_lossy());
         }
         // ... 显示操作菜单
     }
     ```
   - skim 选项保留：`no_mouse(true)` + `bind(["ctrl-y:accept"])` 启用预览窗口文本选择

---

## 5) 质量红线（**出现即视为未完成**）

- 相同样式/逻辑在多处重复定义（除非已抽象复用且仅保留一次原型）
- 组件职责不清晰（UI/业务/工具混在一起）
- 为了不报错而加 try/catch 吞异常或随意默认值
- **修改后未提供 `bunx tsc -b` 校验结果**
- **使用 `alert()` 作为错误提示**（应该使用 toast 组件）

### 5.1 Toast 组件规范

错误提示使用 daisyUI 的 toast 组件，禁止使用 `alert()`：

```typescript
const showToast = (message: string): void => {
  const toast = document.createElement("div");
  toast.className = "toast toast-center toast-middle z-50";
  toast.innerHTML = `
    <div class="alert alert-error">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span>${message}</span>
    </div>
  `;
  document.body.append(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
};

// 使用
navigator.clipboard.writeText(text).catch(() => {
  showToast("复制失败");
});
```

### 5.2 oxlint 重构技巧

常见 oxlint 错误的代码模式：

| 规则                            | 问题             | 解决方案                                     |
| ------------------------------- | ---------------- | -------------------------------------------- |
| `max-statements`                | 函数语句过多     | 拆分辅助函数                                 |
| `no-array-for-each`             | 禁止使用 forEach | 使用 `for...of` 循环                         |
| `id-length`                     | 变量名过短       | 使用完整单词如 `event`/`element`             |
| `sort-keys`                     | 对象键未排序     | 按字母顺序排列对象属性                       |
| `sort-imports`                  | 导入顺序错误     | `type` 放单独一行                            |
| `prefer-dom-node-append`        | 应使用 append    | 用 `append()` 替代 `appendChild()`           |
| `new-cap`                       | 构造函数调用     | 添加到 overrides 文件列表                    |
| `explicit-function-return-type` | 缺少返回类型     | 添加到 overrides 文件列表                    |
| `id-length`                     | 变量名过短       | 添加 `// eslint-disable-next-line id-length` |

---

## 6) 输出要求（**交付必须包含**）

1. **变更清单**
   - 新增/修改/删除了哪些文件
   - 每个文件的关键点（1~3 条说明）
   - 明确指出：为了消除重复，你抽取了哪些复用单元、被哪些地方复用

2. **校验结果**
   - 若发生任何改动：**必须附 `bunx tsc -b` 结果**（成功/失败 + 关键报错）

---

## 7) 测试方式

1. **浏览器测试**
   - 使用 Playwright 进行端到端测试
   - 启动开发服务器后，通过 MCP 工具调用浏览器进行测试
   - 测试文件放在项目根目录，命名规范：`*.test.ts` 或 `tests/*.spec.ts`

2. **测试运行命令**
   - 启动开发服务器：`bun run dev`（后台运行）
   - 运行测试：`bunx playwright test`
   - 或使用 MCP 工具启动浏览器进行交互测试

3. **测试覆盖重点**
   - 页面渲染正确性
   - 导航链接可用性
   - 响应式布局（桌面/移动端）
   - 主题切换正常

---

## 8) 内容规范（博客文章）

1. **Frontmatter 必填字段**
   - `title`：文章标题
   - `date`：发布日期（YYYY-MM-DD）
   - `tags`：标签数组

2. **图片引用**
   - 优先使用相对路径或 CDN
   - **禁止硬编码绝对 URL**（除非是外部资源）

3. **草稿机制**
   - 草稿文件放在 `src/posts/drafts/` **或** frontmatter 添加 `draft: true`

---

## 9) 样式规范

1. **优先使用 CSS 变量**
   - 主题色、间距、字体等**必须抽成 CSS 变量**
   - 便于浅色/深色主题切换

2. **响应式设计**
   - **桌面端 + 移动端均可用**
   - 移动端考虑触控间距与滚动体验

3. **双主题适配**
   - 颜色、边框、阴影在浅色/深色主题都清晰
   - **禁止只适配单主题**

---

## 10) 移动端交互规范

### 10.1 可拖动悬浮按钮

移动端需要可拖动的悬浮按钮时，**使用原生 JavaScript 实现**，不引入额外库。

```astro
<!-- 按钮结构 -->
<button
  id="toc-toggle"
  class="fixed z-50 bg-base-300 backdrop-blur shadow-lg cursor-move"
  style="width: 3rem; height: 3rem;"
>
  <!-- 图标内容 -->
</button>
```

```typescript
// 原生 JS 拖拽实现
let isDragging = false;
let startX = 0,
  startY = 0,
  initialLeft = 0,
  initialTop = 0;

const onMouseDown = (e: MouseEvent) => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  const rect = toggle.getBoundingClientRect();
  initialLeft = rect.left;
  initialTop = rect.top;
  toggle.style.transition = "none";
};

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  const padding = 8;
  let newLeft = Math.max(padding, Math.min(initialLeft + dx, viewWidth - rect.width - padding));
  let newTop = Math.max(padding, Math.min(initialTop + dy, viewHeight - rect.height - padding));
  toggle.style.left = `${newLeft}px`;
  toggle.style.top = `${newTop}px`;
};

// 鼠标事件
toggle.addEventListener("mousedown", onMouseDown);
document.addEventListener("mousemove", onMouseMove);
document.addEventListener("mouseup", () => (isDragging = false));

// 触摸事件（关键：passive: false + preventDefault）
toggle.addEventListener(
  "touchstart",
  (e) => {
    const touch = e.touches[0];
    onMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
  },
  { passive: false },
);

toggle.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault(); // 防止拖动时页面滚动
    const touch = e.touches[0];
    onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
  },
  { passive: false },
);

toggle.addEventListener("touchend", () => (isDragging = false));
```

**关键点**：

- 拖动范围限制在视口内，边缘保留 8px 边距
- 触摸事件必须用 `passive: false` 并调用 `e.preventDefault()`，否则向下拖动时会触发页面滚动导致按钮丢失
- 使用 `bg-base-300` 而非 `bg-base-200/xx`，保证背景不透明

## 11) 项目结构

```
├── src/
│   ├── components/           # Astro 组件
│   │   ├── common/           # 通用组件（Tag, PostCard）
│   │   ├── navbar/          # 导航栏子组件（Start, Center, End）
│   │   ├── CodeCopy.astro   # 代码复制按钮
│   │   ├── Copyright.astro  # 版权组件
│   │   ├── Footer.astro     # 页脚
│   │   ├── Header.astro     # 头部
│   │   └── Navigation.astro # 导航栏
│   ├── content.config.ts   # Astro 内容集合配置
│   ├── env.d.ts            # 环境类型声明
│   ├── layouts/            # 布局组件
│   │   └── BaseLayout.astro
│   ├── middleware.ts       # 中间件
│   ├── pages/              # 页面路由
│   │   ├── 404.astro
│   │   ├── about.astro
│   │   ├── drafts.astro
│   │   ├── index.astro
│   │   ├── posts/[id].astro
│   │   ├── tags/
│   │   │   ├── index.astro
│   │   │   └── [tag].astro
│   │   └── telegram.astro
│   ├── post-edit/          # Rust CLI 工具
│   │   └── main.rs
│   ├── posts/              # 博客文章（.md/.mdx）
│   ├── styles/
│   │   └── global.css      # 全局样式
│   └── utils/              # 工具函数
│       └── date.ts
├── scripts/                # Shell 脚本
│   └── post-edit.sh        # post-edit 包装脚本
├── Cargo.toml             # Rust 项目配置
├── Cargo.lock
├── wrangler.jsonc         # Cloudflare Workers 配置
└── astro.config.ts        # Astro 配置
```

## 12) 文件清理

- **未经用户允许不得擅自清理任何文件**
- 常见的已忽略但可能需要清理的文件（供用户参考是否需要清理）：
  - `target/doc/` - Rust 编译生成的 API 文档
  - `tsconfig.tsbuildinfo` - TypeScript 增量编译缓存
  - `package.json~` - 编辑器备份文件
  - `src/post-edit/main.rs~` - 编辑器备份文件
  - 任何 `*~` 后缀的备份文件

## 13) 技术栈速查

| 类别       | 技术                          |
| ---------- | ----------------------------- |
| 框架       | Astro 5 + MDX                 |
| 样式       | Tailwind CSS 4 + daisyUI 5    |
| 部署       | Cloudflare Workers + Wrangler |
| PWA        | @vite-pwa/astro               |
| 代码保护   | astro-obfuscator              |
| 内容       | RSS + Sitemap + LLM 生成      |
| TypeScript | 严格模式（禁止 any）          |

## 14) Cargo clippy lint 级别格式

**正确格式**（项目中实际使用）：

```toml
[lints.clippy]
restriction = "allow"
pedantic = "allow"
style = "allow"
correctness = { level = "deny", priority = -1 }
suspicious = { level = "deny", priority = -1 }
perf = { level = "deny", priority = -1 }
complexity = { level = "deny", priority = -1 }
cargo = { level = "warn", priority = -1 }
nursery = { level = "warn", priority = -1 }
multiple_crate_versions = "allow"
```

**说明**：

- 必须 deny 的级别使用 `{ level = "deny", priority = -1 }` 对象语法
- `priority = -1` 确保即使有其他配置覆盖也生效
- `multiple_crate_versions = "allow"` 允许 workspace 依赖树中存在不同版本
