# `.agents/tasks/` — 重写阶段任务卡

本目录承载**从零重写**（`REWRITE_PLAN.md`）的任务卡。工单粒度、状态机与质量门禁契约见
`docs/SUBAGENT_OPERATIONS.md`；执行流程见 `.agents/onboarding/03-task-workflow.md`。

## 阶段映射

重写计划用 `W0`–`W10` 描述阶段；任务卡沿用 `<phase>.<n>` 编号。当前仅展开 **phase-1**，
其任务 = 重写阶段 W1–W10：

| Task ID | Rewrite stage | 目标                       | Assignee                  |
| ------- | ------------- | -------------------------- | ------------------------- |
| 1.1     | W1            | 项目骨架                   | build-deploy-engineer     |
| 1.2     | W2            | 内容与类型                 | content-engineer          |
| 1.3     | W3            | 构建管线                   | build-deploy-engineer     |
| 1.4     | W4            | 主题与 UI                  | frontend-architect        |
| 1.5     | W5            | 客户端运行时               | frontend-architect        |
| 1.6     | W6            | 搜索                       | search-discovery-engineer |
| 1.7     | W7            | TelegramAuth + tgcloud Bot | content-engineer          |
| 1.8     | W8            | Rust CLI                   | cli-tool-engineer         |
| 1.9     | W9            | CI/CD 与部署               | build-deploy-engineer     |
| 1.10    | W10           | 测试与门禁                 | quality-dx-guardian       |

## 使用

```bash
# 查看当前阶段任务
ls .agents/tasks/phase-1/

# 领取 / 更新 / 上报阻塞 / 完成（脚本随重写落地，见 docs/SUBAGENT_OPERATIONS.md）
pnpm exec tsx .agents/scripts/task-claim.ts 1.1 --assignee build-deploy-engineer
```

## 约定

- `Status` 取值：`pending` | `in_progress` | `blocked` | `done`。
- `Dependencies` 语义与 `REWRITE_PLAN.md` §3 一致（无依赖 = 可并行）。
- 完成前必须填 `Outputs`；`task-complete` 会自动跑通用 + 角色专属质量门禁。
- 阶段全部 `done` 后归档到 `.agents/tasks/archive/phase-1/`。
