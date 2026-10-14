# Phase Completion Checklist Template

> 复制到 `.agents/tasks/phase-N/COMPLETION_CHECKLIST.md`，在 Phase 启动时创建、结束时填满。
> 契约见 `.agents/onboarding/03-task-workflow.md` §7。

---

# Phase N: <Phase Title> — Completion Checklist

## Phase Overview

- **Phase**: N
- **Title**: <Phase Title>
- **Start Date**: <YYYY-MM-DD>
- **Target End Date**: <YYYY-MM-DD>
- **Actual End Date**: <YYYY-MM-DD>

## Task Summary

| Task ID | Title | Assignee | Status | Hours Est. | Hours Actual |
| ------- | ----- | -------- | ------ | ---------- | ------------ |
| N.1     |       |          |        |            |              |
| N.2     |       |          |        |            |              |
| N.3     |       |          |        |            |              |

## Completion Criteria

- [ ] 所有任务卡 `status=done`
- [ ] 所有任务卡 `Outputs` 填写完整
- [ ] 所有任务卡 `Context`（handoff JSON）完整

## Knowledge Base Sync

- [ ] 任务卡归档至 `.agents/tasks/archive/phase-N/`
- [ ] `REWRITE_PLAN.md` 对应阶段勾选
- [ ] `CONTEXT.md` 新增/变更术语同步
- [ ] ADR 状态更新（Proposed → Accepted/Deprecated）
- [ ] 指针扫描通过：`pnpm exec tsx .agents/scripts/scan-pointers.ts`
- [ ] 契约同步：`pnpm exec tsx .agents/scripts/sync-contracts.ts`
- [ ] 术语检查：`pnpm exec tsx .agents/scripts/check-terms.ts`

## Quality Gates

- [ ] 通用门禁：`pnpm check && pnpm build && pnpm exec oxlint . && pnpm exec oxfmt --check`
- [ ] 各角色专属门禁通过（见 `docs/SUBAGENT_OPERATIONS.md`）
- [ ] 回归检查通过：`pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1`

## Documentation

- [ ] `AGENTS.md` 如有新增命令/角色/模式
- [ ] 架构文档如有模块边界变更
- [ ] `CHANGELOG.md` 记录（如存在）

## Handoff

- [ ] Context handoff JSON 已审阅
- [ ] 下一 Phase 任务卡已创建
- [ ] 里程碑报告生成：`.agents/milestones/phase-N.md`

## Sign-off

| Role                | Name | Date |
| ------------------- | ---- | ---- |
| Phase Lead          |      |      |
| quality-dx-guardian |      |      |
