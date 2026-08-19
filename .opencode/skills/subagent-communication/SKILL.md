---
description: 子智能体间通信协议 - 任务领取、进度汇报、阻塞上报、上下文传递
---

# 子智能体通信协议

## 核心命令

### `claim-task <task-id> [--assignee <name>]`

领取任务，写入 assignee，创建进度文件

```bash
node .agents/scripts/task-claim.ts 1.1 --assignee cli-tool-engineer
```

### `report-progress <task-id> <percent> [--msg <message>]`

更新进度百分比和消息，写入 `.progress` 文件

```bash
node .agents/scripts/task-progress.ts 1.1 50 --msg "Implementing update_frontmatter_bool"
```

### `report-blocker <task-id> <reason> [--help-from <agent>]`

上报阻塞，可指定需要协助的智能体

```bash
node .agents/scripts/task-progress.ts 1.1 --blocked "Need schema type from content-engineer" --help-from content-engineer
```

### `complete-task <task-id> [--skip-gate]`

完成任务，运行质量门禁，归档

```bash
node .agents/scripts/task-complete.ts 1.1
```

## 文件约定

### 任务卡（只读输入）

```
.agents/tasks/phase-X/N.md
├── metadata: id, title, assignee, status, dependencies
├── inputs: files, tests, spec
├── outputs: files, tests
└── acceptance: commands, criteria
```

### 进度文件（运行时写入）

```
.agents/tasks/phase-X/N.progress
{
  "taskId": "1.1",
  "assignee": "cli-tool-engineer",
  "percent": 50,
  "status": "in_progress|blocked|done",
  "updatedAt": "2026-08-19T10:30:00Z",
  "message": "Implementing update_frontmatter_bool",
  "blocker": null,
  "helpFrom": null
}
```

### 上下文传递（任务间）

```
.agents/tasks/phase-X/N.context.json
{
  "fromTask": "1.5",
  "toTask": "1.1",
  "exports": { "BlogPost": "type from content.config.ts" },
  "contracts": { "frontmatter": "Zod schema" }
}
```

## 通信原则

1. **只读任务卡** - 执行前完整阅读
2. **心跳更新** - 长任务每 30min 更新进度
3. **阻塞即报** - 卡住 > 15min 必须上报
4. **产出物声明** - 完成前明确输出文件列表
5. **门禁自检** - `complete-task` 自动跑质量检查
