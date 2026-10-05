# Architecture Decision Record: 草稿隔离 - 私有 Git 子模块方案

## Status

Accepted

## Context

当前博客将草稿放在 `src/posts/drafts/` 目录下，通过路径前缀过滤 (`!id.startsWith("drafts/")`) 控制发布。存在风险：

- 意外提交草稿到公开仓库
- CI 配置错误导致草稿构建部署
- 克隆仓库者直接可见未发布内容

需求：草稿**物理隔离**，仅作者可见，构建时按需挂载。

## Decision

采用 **私有 Git 子模块** 方案：

```
real-LiHua.github.io (公开仓库)
├── src/posts/
│   ├── *.md          # 已发布文章
│   └── drafts/       # ← git submodule 挂载点 (空目录，.gitignore 忽略)
└── .gitmodules       # 记录子模块映射

private-drafts-repo (私有仓库，仅作者访问)
├── *.md              # 草稿文章
└── .git/
```

**实施细节**：

1. `git submodule add git@github.com:real-LiHua/private-drafts.git src/posts/drafts`
2. `.gitignore` 添加 `src/posts/drafts/` (防止子模块内容被父仓库跟踪)
3. CI 构建步骤前：`git submodule update --init --recursive`
4. 子模块仓库配置 **Deploy Key (只读)**，仅 CI 环境可拉取
5. 本地开发：作者手动 `git submodule update --init` 或配置 `git clone --recurse-submodules`

**Astro Content Collections 配置不变**：

```typescript
loader: glob({ base: "./src/posts", pattern: "**/*.md{,x}" });
// drafts/ 下文件自动被 glob 发现，isDraft() 通过 id 前缀过滤
```

## Consequences

### Positive

- **零泄露风险**：草稿从未进入公开仓库历史
- **权限最小化**：仅作者拥有私有仓库写权限，CI 仅读
- **工作流不变**：本地开发 `src/posts/drafts/` 正常编写，发布时 `git mv drafts/xxx.md ../` 移至公开目录
- **版本管理**：草稿拥有独立 Git 历史，可回滚、分支实验
- **多设备同步**：私有仓库作为草稿中枢，克隆即同步

### Negative / Trade-offs

- **初始化成本**：新环境需 `--recurse-submodules` 或手动 `submodule update`
- **CI 复杂度**：增加 `git submodule update` 步骤，需配置 Deploy Key
- **冲突处理**：子模块指针更新需 `git add src/posts/drafts` 提交到父仓库
- **大文件**：草稿含大图片时，私有仓库体积增长 (可配合 Git LFS)

## Alternatives Considered

1. **加密文件存公开仓库** —— 密钥管理复杂，审计困难，拒绝
2. **单独 CMS (Notion/Obsidian Sync)** —— 引入外部依赖，违背 "Git 为源" 原则，拒绝
3. **分支保护 + CI 过滤** —— 仍在同一仓库，人为失误风险残留，拒绝
4. **私有仓库 + CI 手动拷贝** —— 无版本关联，操作繁琐，拒绝

## Related ADRs

- 0001-functional-architecture.md (内容管道模块边界)
- 待创建：0003-git-submodule-workflow.md (子模块操作规范)

## Implementation Checklist

- [ ] 创建私有仓库 `private-drafts`
- [ ] `git submodule add` 挂载到 `src/posts/drafts`
- [ ] 父仓库 `.gitignore` 忽略 `src/posts/drafts/`
- [ ] 配置私有仓库 Deploy Key (只读) 到 GitHub Actions Secrets
- [ ] CI workflow 增加 `git submodule update --init --recursive` 步骤
- [ ] 文档化：`docs/adr/0002-draft-isolation-submodule.md` (本文件)
- [ ] 团队/个人操作手册：`docs/GIT_SUBMODULE_WORKFLOW.md`
