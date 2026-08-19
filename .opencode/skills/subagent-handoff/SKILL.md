---
description: 任务交接规范 - 产出物清单、验收标准、回滚点、依赖声明
---

# 任务交接规范

## 交接清单（完成任务时必须提供）

### 1. 代码产出物

- 新增/修改文件列表（含路径）
- 关键函数/组件签名变更
- 类型定义导出变更

### 2. 测试产出物

- 新增测试文件/用例
- 覆盖率变化
- 手动验证步骤

### 3. 文档产出物

- ADR 记录（架构决策）
- README/注释更新
- 迁移指南（如有破坏性变更）

### 4. 验收证据

```bash
# 必跑命令及输出摘要
pnpm tsc -b        # ✓ 0 errors
pnpm oxlint        # ✓ 0 new errors
pnpm oxfmt --check # ✓ 0 diffs
pnpm build         # ✓ success
# 角色专属：
cargo test         # ✓ (cli-tool-engineer)
pnpm exec playwright test # ✓ (quality-dx-guardian)
```

## 交接模板

````markdown
## Handoff: Task 1.1 - Fix update_frontmatter_bool

### Assignee: cli-tool-engineer

### Completed: 2026-08-19 10:45

### Changes

- `src/post-edit/main.rs`: Added `update_frontmatter_bool()` function (lines 580-620)
- `src/post-edit/main.rs`: Fixed 4 existing tests to use new function

### Tests

- All 4 `update_frontmatter_bool_*` tests pass
- `cargo test`: 12 passed, 0 failed

### Verification

```bash
cargo test
# test update_frontmatter_bool_set_true ... ok
# test update_frontmatter_bool_set_false ... ok
# test update_frontmatter_bool_add_new_key ... ok
# test update_frontmatter_bool_preserves_content ... ok
```
````

### Dependencies Satisfied

- Provides `update_frontmatter_bool` for future frontmatter manipulation tasks

### Rollback Point

- Git commit: `abc1234` (before this task)
- No schema/config changes - pure implementation

```

## 验收检查项（接收方确认）
- [ ] 代码可构建、测试通过
- [ ] 无破坏性变更或已文档化迁移路径
- [ ] 类型导出正确，下游可用
- [ ] 符合项目规范（无 any、类型完整、oxlint 通过）
- [ ] 进度文件标记 `done`，任务卡归档
```
