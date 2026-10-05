# 角色指南：CLI 工具工程师

**角色 ID**：`cli-tool-engineer`  
**类型**：Platform  
**核心职责**：Rust `post-edit` CLI、交互菜单、命令实现、测试、发布流程

---

## 1. 核心领域

| 领域 | 关键文件 | 关注点 |
|------|----------|--------|
| **Rust CLI** | `src/post-edit/main.rs` | Clap 解析、交互菜单、命令分发 |
| **文章管理** | `src/post-edit/` | new/edit/list/delete/publish/unpublish |
| **前置数据处理** | `src/post-edit/` | YAML 前置数据解析/序列化、验证 |
| **模糊搜索** | `src/post-edit/` | Skim 集成、文章选择 |
| **测试/发布** | `Cargo.toml`、`.github/workflows/` | `cargo test/clippy/audit`、Release 流程 |

---

## 2. 必读文档

| 文档 | 重点章节 |
|------|----------|
| `AGENTS.md` | CLI Tool 章节、Rust 工具链 |
| `docs/adr/0003-subagent-responsibilities-controls.md` | 角色定义、技能矩阵 |
| `src/post-edit/Cargo.toml` | 依赖、Feature、Profile |
| `src/post-edit/main.rs` | 入口、命令分发 |
| `docs/SECURITY_WHITEPAPER.md` | 命令参数引号规范、供应链安全 |

---

## 3. 专属质量门禁

```bash
# 本地预跑
pnpm exec tsx .agents/scripts/run-gate.ts cli-tool-engineer

# 等价于
pnpm tsc -b && pnpm oxlint && pnpm oxfmt --check && pnpm build
cargo test -p post-edit && cargo clippy -p post-edit && cargo audit
```

**通过标准**：cargo test 全绿、clippy 0 warnings、cargo audit 0 vulnerabilities。

---

## 4. 核心交付物

| 交付物 | 位置 | 验收标准 |
|--------|------|----------|
| **CLI 入口** | `src/post-edit/main.rs` | Clap 解析、子命令分发、错误处理 |
| **交互菜单** | `src/post-edit/menu.rs` | Skim 模糊搜索、键盘导航、预览 |
| **命令实现** | `src/post-edit/commands/` | new/edit/list/delete/publish/unpublish |
| **前置数据处理** | `src/post-edit/frontmatter.rs` | YAML 解析/序列化、Zod 验证兼容 |
| **测试套件** | `tests/` | 单元测试、集成测试、快照测试 |
| **发布脚本** | `.github/workflows/release.yml` | 语义化版本、Changelog、二进制上传 |

---

## 3. 核心开发模式

### 3.1 CLI 结构

```rust
// src/post-edit/main.rs
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "post-edit", version, about = "Blog post management CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Create new post
    New(NewArgs),
    /// Edit existing post
    Edit(EditArgs),
    /// List all posts
    List(ListArgs),
    /// Delete a post
    Delete(DeleteArgs),
    /// Publish draft
    Publish(PublishArgs),
    /// Unpublish post
    Unpublish(UnpublishArgs),
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::New(args) => new::run(args),
        Commands::Edit(args) => edit::run(args),
        // ...
    }
}
```

### 3.2 交互菜单 (Skim)

```rust
// src/post-edit/menu.rs
use skim::prelude::*;

pub fn select_post(posts: &[PostMeta]) -> Result<Option<PostMeta>> {
    let options = posts.iter()
        .map(|p| format!("{} | {} | {}", p.date, p.title, p.tags.join(",")))
        .collect::<Vec<_>>()
        .join("\n");

    let options = SkimOptionsBuilder::default()
        .height(Some("50%"))
        .preview(Some(PreviewCommand::new("bat --color=always {}", true)))
        .build();

    let (tx, rx) = unbounded();
    std::thread::spawn(move || {
        for item in options { tx.send(Arc::new(item)).unwrap(); }
    });

    let selected = Skim::run_with(&options, Some(rx))
        .and_then(|out| out.selected_items.first().map(|i| i.output().to_string()));

    Ok(selected.and_then(|s| posts.iter().find(|p| s.starts_with(&p.date)).cloned()))
}
```

### 3.3 前置数据处理

```rust
// src/post-edit/frontmatter.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct Frontmatter {
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub publish_date: Option<chrono::NaiveDate>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_date: Option<chrono::NaiveDate>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub authors: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub telegram_auth: Option<TelegramAuth>,
    // ... 扩展字段用 HashMap 捕获
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

pub fn parse_frontmatter(content: &str) -> Result<(Frontmatter, String)> {
    let (fm, body) = content.split_once("---\n").ok_or("Invalid frontmatter")?;
    let fm: Frontmatter = serde_yaml::from_str(fm)?;
    Ok((fm, body.to_string()))
}
```

### 3.4 测试模式

```rust
// tests/integration_test.rs
use post_edit::commands::{new, list};

#[test]
fn test_new_post_creates_file_with_frontmatter() {
    let temp_dir = tempdir::TempDir::new("post-edit-test").unwrap();
    let args = NewArgs { title: "Test Post".into(), /* ... */ };
    
    new::run(args).unwrap();
    
    let posts = list::run(ListArgs::default()).unwrap();
    assert_eq!(posts.len(), 1);
    assert_eq!(posts[0].title, "Test Post");
}
```

---

## 5. 专属质量门禁细则

| 检查项 | 工具 | 标准 |
|--------|------|------|
| **单元测试** | `cargo test -p post-edit` | 全绿 |
| **Clippy** | `cargo clippy -p post-edit -D warnings` | 0 warnings |
| **安全审计** | `cargo audit` | 0 vulnerabilities |
| **格式** | `cargo fmt --check` | 通过 |
| **文档** | `cargo doc --no-deps` | 无警告 |

---

## 6. 常见任务类型

| 任务类型 | 典型触发 | 关键产出 |
|----------|----------|----------|
| **新增子命令** | 功能需求 | Clap 子命令 + 实现模块 + 测试 |
| **交互菜单优化** | UX 改进 | Skim 配置、预览、键盘绑定 |
| **前置数据字段增/删** | Schema 变更 | `Frontmatter` 结构 + 序列化/反序列化 + 迁移脚本 |
| **错误处理改进** | 用户反馈 | `Result` 类型、用户友好错误信息、退出码 |
| **发布自动化** | 版本发布 | Release Action、语义化版本、Changelog 生成 |

---

## 7. 常见坑与规避

| 坑 | 症状 | 规避 |
|----|------|------|
| **Clap 版本冲突** | 编译错误/功能缺失 | `Cargo.toml` 锁定版本、Feature 门控 |
| **Skim 预览不工作** | 预览窗口空白 | 检查 `bat`/`cat` 可用性、预览命令格式 |
| **YAML 序列化顺序** | 前置数据字段顺序变 | `serde_yaml` + `serde(flatten)` + `indexmap` 保序 |
| **跨平台路径问题** | Windows/Linux 路径分隔 | `std::path::PathBuf`、`pathdiff` crate |
| **二进制体积过大** | 发布包过大 | `strip = true`、LTO、移除 debug 符号 |
| **依赖安全漏洞** | `cargo audit` 报警 | 定期 `cargo update`、锁定版本、替换漏洞 crate |

---

## 8. 关键文件清单

```
src/post-edit/
├── Cargo.toml
├── main.rs                    # 入口、命令分发
├── commands/
│   ├── new.rs
│   ├── edit.rs
│   ├── list.rs
│   ├── delete.rs
│   ├── publish.rs
│   └── unpublish.rs
├── menu.rs                    # Skim 交互菜单
├── frontmatter.rs             # YAML 解析/序列化
├── fs.rs                      # 文件系统操作
├── config.rs                  # 配置管理
└── error.rs                   # 错误类型

tests/
├── integration_test.rs
└── unit_test.rs

.github/workflows/
└── release.yml                # 发布自动化
```

---

## 9. 协作接口

| 依赖角色 | 协作内容 | 接口 |
|----------|----------|------|
| `content-engineer` | 前置数据 Schema 同步 | `content.config.ts` Zod Schema ↔ Rust `Frontmatter` 结构 |
| `build-deploy-engineer` | 发布流程集成 | CI Job 依赖、Release Action |
| `quality-dx-guardian` | 代码规范、安全审计 | `cargo clippy/audit` 配置 |

---

## 10. 学习资源

| 资源 | 链接 |
|------|------|
| Clap 文档 | https://docs.rs/clap/latest/clap/ |
| Skim | https://github.com/lotabout/skim |
| Serde YAML | https://github.com/dtolnay/serde-yaml |
| Cargo 手册 | https://doc.rust-lang.org/cargo/ |
| Rust API 指南 | https://rust-lang.github.io/api-guidelines/ |

---

**核心口诀**：Clap 解析分发 → Skim 交互选中 → Frontmatter 双向序列化 → 测试覆盖核心流程 → Clippy/Audit 零容忍 → Release 自动化版本