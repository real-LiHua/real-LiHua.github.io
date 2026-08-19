---
description: 协作规划辅助 - 依赖拓扑、并行度计算、里程碑分解
---

# 协作规划辅助

## 任务分解命令

### `split-tasks <epic-id> [--granularity fine|coarse]`

将大任务拆解为可并行的子任务卡

```bash
node .agents/scripts/split-tasks.ts phase-1 --granularity fine
# 输出：生成 1.1 ~ 1.5 任务卡到 .agents/tasks/phase-1/
```

### `compute-parallelism <phase-dir>`

计算最大并行度，识别关键路径

```bash
node .agents/scripts/compute-parallelism.ts .agents/tasks/phase-1/
# 输出：
# Max parallel: 3
# Critical path: 1.1 → 1.4 → 2.1
# Independent: 1.2, 1.3, 1.5
```

### `generate-milestone <phase-dir>`

生成里程碑时间线

```bash
node .agents/scripts/generate-milestone.ts .agents/tasks/phase-1/
# 输出：.agents/milestones/phase-1.md
```

## 依赖拓扑模型

### 任务卡依赖字段

```yaml
# .agents/tasks/phase-1/1.4-unify-script-registry.md
dependencies: ["1.3"] # 必须先删除占位组件
```

### 依赖图示例（Phase 1）

```
1.1 (cli-fix)          1.2 (cli-tests)          1.3 (remove-placeholders)
      │                       │                         │
      └───────────────────────┼─────────────────────────┘
                              ▼
                    1.4 (script-registry) ◄── 1.5 (schema-types)
                              │
                              ▼
                        Phase 2 所有任务
```

### 并行度计算规则

1. **无依赖** = 可并行
2. **共享文件** = 串行（避免冲突）
3. **同一角色** = 建议串行（上下文连贯）
4. **关键路径长度** = 最短完成时间下界

## 里程碑模板

```markdown
# Milestone: Phase 1 - 基础稳固

## Target Date: 2026-08-26 (1 week)

## Tasks

| ID  | Title                         | Assignee           | Depends | Est. Hours | Status  |
| --- | ----------------------------- | ------------------ | ------- | ---------- | ------- |
| 1.1 | Fix update_frontmatter_bool   | cli-tool-engineer  | -       | 2          | pending |
| 1.2 | CLI integration tests         | cli-tool-engineer  | 1.1     | 4          | pending |
| 1.3 | Remove placeholder components | frontend-architect | -       | 1          | pending |
| 1.4 | Unify script registry         | frontend-architect | 1.3     | 3          | pending |
| 1.5 | Content schema types export   | content-engineer   | -       | 2          | pending |

## Parallel Groups

- Group A (parallel): 1.1, 1.3, 1.5
- Group B (after 1.1): 1.2
- Group C (after 1.3): 1.4

## Risk Buffer

- 1.1 必须先完成（解除测试阻塞）
- 1.3/1.4 前端任务建议同一角色顺序执行
```

## 规划原则

1. **最小可交付** - 每任务产出可验证增量
2. **依赖显性化** - 所有依赖写入任务卡
3. **角色亲和性** - 同角色任务倾向串行
4. **缓冲预留** - 关键路径 +20% 时间
5. **每日同步** - 进度文件自动聚合生成日报
