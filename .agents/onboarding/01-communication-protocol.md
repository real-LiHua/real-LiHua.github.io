# 通信协议手册

**适用**：所有子智能体  
**版本**：1.0  
**依据**：ADR 0003 `subagent-communication` 技能

---

## 1. 核心命令

| 命令 | 用途 | 关键参数 |
|------|------|----------|
| `task-claim` | 领取任务，创建进度文件 | `--assignee <role>` |
| `task-progress` | 更新进度/上报阻塞/请求协助 | `<percent>` `--msg` `--blocked` `--help-from` |
| `task-complete` | 完成任务，自动跑质量门禁 | `--skip-gate` (仅紧急) |

---

## 2. 文件约定

### 进度文件 (`.progress`)
```json
{
  "taskId": "1.1",
  "assignee": "content-engineer",
  "percent": 50,
  "status": "in_progress",
  "updatedAt": "2026-10-05T10:30:00Z",
  "message": "Exported PostFrontmatter type",
  "blocker": null,
  "helpFrom": null
}
```

| 字段 | 说明 |
|------|------|
| `status` | `pending` \| `in_progress` \| `blocked` \| `done` |
| `blocker` | 阻塞描述，非空即标记为 blocked |
| `helpFrom` | 请求协助的角色 ID |

### 上下文传递 (`.context.json`)
```json
{
  "fromTask": "1.5",
  "toTask": "2.1",
  "exports": { "PostFrontmatter": "type from content.config.ts" },
  "contracts": { "frontmatter": "Zod schema" }
}
```

---

## 3. 通信原则（必须遵守）

1. **只读任务卡** — 执行前完整阅读 `.md`
2. **心跳更新** — 长任务每 30min 更新进度
3. **阻塞即报** — 卡住 > 15min 必须上报
4. **产出物声明** — 完成前明确输出文件列表
5. **门禁自检** — `task-complete` 自动跑质量检查

---

## 4. 典型场景

### 领取任务
```bash
pnpm exec tsx .agents/scripts/task-claim.ts 1.1 --assignee content-engineer
```

### 正常进度更新
```bash
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 50 --msg "Exported PostFrontmatter type"
```

### 上报阻塞并请求协助
```bash
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 --blocked "Zod import error" --help-from quality-dx-guardian
```

### 解除阻塞继续
```bash
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 60 --msg "Resolved: fixed import path"
```

### 完成任务
```bash
pnpm exec tsx .agents/scripts/task-complete.ts 1.1
# 自动运行：tsc, oxlint, oxfmt, build + 角色专属门禁
```

### 紧急跳过门禁（仅限阻塞无法解决）
```bash
pnpm exec tsx .agents/scripts/task-complete.ts 1.1 --skip-gate
# ⚠️ 会记录 gate.failure.json，需补门禁
```

---

## 5. 协作模式

### 跨角色协助
```bash
# A 角色卡住，请求 B 角色协助
pnpm exec tsx .agents/scripts/task-progress.ts 2.1 --blocked "Need schema types" --help-from content-engineer

# B 角色收到通知后，完成依赖后通知 A
pnpm exec tsx .agents/scripts/task-progress.ts 1.5 100 --msg "Exported types for build pipeline"
```

### 上下文传递
任务完成时在 `.context.json` 声明输出：
```json
{
  "fromTask": "1.5",
  "toTask": "2.1",
  "exports": { "BuildPipeline": "interface from src/modules/build-pipeline.ts" },
  "contracts": { "BuildStage": "type from src/modules/types.ts" }
}
```

---

## 6. 反模式（禁止）

| ❌ 反模式 | ✅ 正确做法 |
|----------|------------|
| 默默卡住 1 小时不报 | 15min 必须 `--blocked` |
| 完成任务不跑门禁 | `task-complete` 自动跑门禁 |
| 任务卡只看标题不读全文 | 执行前完整阅读 `.md` |
| 进度文件不更新 | 每 30min 必须 `task-progress` |
| 完成前不声明输出文件 | `Outputs` 字段必须填写 |

---

## 6. 文件位置

```
.agents/
├── scripts/
│   ├── task-claim.ts
│   ├── task-progress.ts
│   └── task-complete.ts
├── tasks/phase-X/
│   ├── N.md          # 任务卡（只读输入）
│   ├── N.progress    # 进度文件（运行时写入）
│   └── N.context.json # 上下文传递（任务间）
```

---

## 7. 常见问题

| 问题 | 解决 |
|------|------|
| `task-claim` 提示任务不存在 | 检查 `.agents/tasks/phase-X/` 路径拼写 |
| `task-complete` 门禁挂起 | `pkill -f playwright; pkill -f cargo` 后重试 |
| 进度文件权限拒绝 | `chmod +x .agents/scripts/*.ts` |
| 进度卡在 100% 但状态非 done | `task-progress <id> 100` 会自动置为 done |

---

**核心口诀**：读卡 → 心跳 → 必报 → 声明 → 自检