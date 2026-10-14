# `post-edit` CLI 参考 (Rust CLI Reference)

**Status**: Active — 实现见 `src/post-edit/main.rs`
**Date**: 2026-10-12
**Crate**: `post-edit`（Cargo workspace 唯一 crate，见 `Cargo.toml`）
**关系**:

- 文章字段与约定见 `docs/CONTENT_GUIDE.md`
- 草稿隔离策略见 `docs/adr/0002-draft-isolation-submodule.md`
- 术语定义见 `CONTEXT.md`（Post、Draft、Frontmatter）

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

> [!NOTE] 已实现
> `src/post-edit/main.rs` 已落地；下表为**实际实现**的 flag，可用 `pnpm post:edit --help` 核对。未实现的设计项已在正文标注。

---

## 1. 用途

`post-edit` 是管理博客文章的命令行工具（`Cargo.toml` description：_"管理博客文章的命令行工具"_），面向单人作者，覆盖文章全生命周期：

- **new** — 从模板创建文章
- **edit** — 交互式编辑/预览
- **list** — 列出文章（含草稿）
- **delete** — 删除文章
- **publish** — 从草稿发布到正式目录

它直接读写 `src/posts/*.md` / `*.mdx` 与 `src/posts/drafts/`（路径决定草稿状态）。

---

## 2. 构建与调用

| 方式     | 命令                                     | 状态                                               |
| -------- | ---------------------------------------- | -------------------------------------------------- |
| 项目脚本 | `pnpm post:edit <subcommand>`            | ✅ `package.json`（= `cargo run -p post-edit --`） |
| 发布构建 | `cargo build --release -p post-edit`     | ✅                                                 |
| 直接运行 | `cargo run -p post-edit -- <subcommand>` | ✅ 等价于脚本                                      |
| 二进制   | `target/release/post-edit <subcommand>`  | ✅ 构建后可用                                      |

```bash
# 开发调用（package.json 已定义）
pnpm post:edit --help

# 发布构建
cargo build --release -p post-edit
```

> `Cargo.toml` 中 `[[bin]] name = "post-edit"`、`path = "src/post-edit/main.rs"`；源码缺失时任何 `cargo run -p post-edit` 都会失败（见 §7）。

---

## 3. 子命令

> 下表为实际实现的 flag；以 `pnpm post:edit --help` 输出为准。

### 3.1 `new` — 新建文章

| 参数                  | 说明                                  | 状态 |
| --------------------- | ------------------------------------- | ---- |
| `<title>`（位置参数） | 文章标题                              | ✅   |
| `--draft`             | 建到 `drafts/`（默认发布到 `posts/`） | ✅   |
| `--tags <a,b>`        | 初始标签                              | ✅   |
| `--authors <a,b>`     | 初始作者（默认 `real-LiHua`）         | ✅   |
| `--slug <slug>`       | 指定 slug（否则由标题生成）           | ✅   |

```bash
pnpm post:edit new "Astro 7 迁移踩坑记" --tags web,astro --draft
```

**slug 生成**：中文标题经 `pinyin` crate 转拼音，再由 `slug` crate 规范化（小写、`-` 分词）。同音标题可能冲突，需人工确认；标题全为符号时 slug 为空，会要求显式 `--slug`。

> 未实现：`--template <path>`（自定义模板）。

### 3.2 `edit` — 编辑 / 预览

| 参数             | 说明                                      | 状态 |
| ---------------- | ----------------------------------------- | ---- |
| `<id\|query>`    | 按 id / 模糊关键词选择文章（`skim` 交互） | ✅   |
| `--editor <cmd>` | 指定编辑器（否则 `$EDITOR`/`$VISUAL`）    | ✅   |
| `--preview`      | 用 `bat` 预览正文                         | ✅   |

### 3.3 `list` — 列出文章

| 参数           | 说明                    | 状态 |
| -------------- | ----------------------- | ---- |
| `--drafts`     | 仅列草稿                | ✅   |
| `--published`  | 仅列已发布              | ✅   |
| `--json`       | 结构化输出（手写 JSON） | ✅   |
| `--tags <tag>` | 按标签过滤              | ✅   |

### 3.4 `delete` — 删除文章

| 参数      | 说明                       | 状态 |
| --------- | -------------------------- | ---- |
| `<id>`    | 目标文章                   | ✅   |
| `--force` | 跳过确认（默认应二次确认） | ✅   |

### 3.5 `publish` — 发布草稿

| 参数     | 说明                                     | 状态 |
| -------- | ---------------------------------------- | ---- |
| `<id>`   | 目标草稿                                 | ✅   |
| `--date` | 设置 `publishDate`（默认今天，`chrono`） | ✅   |

**语义**：将文件从 `src/posts/drafts/` **移动**到 `src/posts/`，并按需补齐 `publishDate`（等价于 `git mv`

- frontmatter 更新；未知字段与正文原样保留）。

---

## 4. Frontmatter 处理

- 解析使用 `gray_matter`（启用 `yaml` feature），动态 `Pod` 读取 `title` / `publishDate` / `tags`。
- `new` 手写已知字段的 YAML 块（`title`、`publishDate`、`description`、`tags`、`authors`），字段值与 `docs/CONTENT_GUIDE.md` §3 的 Zod schema 对齐（`title` 必填）。
- `publish` 只对 `publishDate` 行做文本级替换/插入，**原样保留未知字段与注释**。
- 日期字段（`publishDate`）由 `chrono` 以 `YYYY-MM-DD` 写回。

> 实现选择：不做 Zod 等价校验（写入即信任作者）；`.mdx` 可被读取/编辑/发布，但 `new` 固定生成 `.md`。

---

## 5. 依赖与交互组件

| Crate           | 版本    | 角色                         |
| --------------- | ------- | ---------------------------- |
| `clap` (derive) | 4.6.2   | 命令/子命令/参数解析         |
| `chrono`        | 0.4.45  | 日期处理（`publishDate` 等） |
| `skim`          | 5.2     | 模糊查找 / 交互式选择文章    |
| `gray_matter`   | 0.3.2   | 前置元数据解析（YAML）       |
| `bat`           | 0.26.1  | 带语法高亮的正文预览         |
| `pinyin`        | 0.11.0  | 中文标题 → 拼音 slug         |
| `slug`          | 0.1.6   | slug 规范化                  |
| `serde`         | 1.0.228 | 结构体序列化/反序列化        |
| `anyhow`        | 1.0.104 | 错误上下文                   |
| `itertools`     | 0.15.0  | 迭代器工具                   |

> `skim` / `bat` 依赖交互式终端；在无 TTY 环境（CI、管道）中走非交互分支（§3.2/§3.4 会拒绝静默破坏性操作）。
> `lychee` 由 Astro 构建管线（`src/modules/build-pipeline.ts`）作为外部 CLI 调用，**不是 Rust crate 依赖**。

---

## 6. 测试与质量门禁

```bash
cargo test -p post-edit                                    # 单元测试
cargo clippy -p post-edit --all-targets                     # 语义 lint
cargo fmt --check                                           # 格式检查
cargo audit                                                 # 依赖漏洞审计（需先 cargo install cargo-audit）
```

`Cargo.toml` 的 `[lints.clippy]` 已配置：`correctness` / `suspicious` / `perf` / `complexity` 为 **deny**，`cargo` / `nursery` 为 warn；`restriction` / `pedantic` / `style` 放行。CI 执行 `cargo test`

- `cargo clippy`

- `cargo audit`（`cli-tool-engineer` 质量门禁，见 `AGENTS.md` 与 `.github/workflows/deploy.yml`）。

---

## 7. 故障排查

| 症状                                         | 可能原因                                            | 处理                                           |
| -------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| `cargo run -p post-edit` 报找不到目标/源文件 | `Cargo.toml` 的 `[[bin]] path` 与实际文件不符       | 确认 `src/post-edit/main.rs` 存在              |
| `pnpm post:edit` 无输出/挂起                 | `skim` 交互在非 TTY 环境等待输入                    | 改在交互终端运行，或传精确 slug                |
| 新建文章 slug 为空 / 全是 `-`                | 标题全为符号或 `pinyin` 转换结果为空                | 显式传 `--slug`                                |
| 同音标题生成重复 slug                        | 拼音转换碰撞                                        | 人工改名确认                                   |
| YAML 解析错误                                | frontmatter 引号/冒号未转义（如 `title: a: b`）     | 用引号包裹字段值（见 `docs/CONTENT_GUIDE.md`） |
| 日期解析失败                                 | `publishDate` 非法格式                              | 使用 `YYYY-MM-DD` 或 YAML 日期                 |
| `cargo audit` 未找到                         | 未安装子命令                                        | `cargo install cargo-audit`                    |
| `bat` 预览乱码/无色                          | 终端不支持真彩或 `!` 无 `BAT_THEME`                 | 设置 `BAT_THEME` 或忽略（仅预览）              |
| `clippy` 阻断构建                            | 命中 `deny` 级别规则（correctness/suspicious/perf） | 修复代码，勿用 `#[allow]` 掩盖                 |
| `delete` 在 CI 中被拒绝                      | 非交互会话需要显式确认                              | 传 `--force`                                   |

---

## 8. 实现说明（原待确认清单）

- [x] `new`/`edit`/`list`/`delete`/`publish` 的 flag 与位置参数（见 §3）
- [x] `new` 默认写入 `src/posts/`；`--draft` 写入 `src/posts/drafts/`
- [x] 不做 Zod 等价校验；`publish` 保留未知字段与注释
- [x] 非交互（CI）模式：无 TTY 时拒绝交互式选择/确认，配合 `--force` 或精确 slug
- [x] `.mdx` 可读取/编辑/发布；`new` 固定生成 `.md`
- [x] `--json` 输出 `{slug,title,draft,publishDate,path,tags}[]`（手写 JSON 转义）
- [x] 交互选择使用 `skim`；键位沿用 skim 默认
