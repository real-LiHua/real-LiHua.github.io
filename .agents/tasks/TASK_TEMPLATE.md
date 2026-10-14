# Task Template

> 复制本文件到 `.agents/tasks/phase-N/<id>.md`，填写各字段。
> 单一事实来源：**任务卡是规格**（读卡 → 心跳 → 必报 → 声明 → 自检）。
> 完整流程见 `docs/SUBAGENT_OPERATIONS.md` 与 `.agents/onboarding/03-task-workflow.md`。

---

# Task N: <Title>

## Metadata

- **ID**: X.N (e.g., 1.1, 2.3)
- **Phase**: <Phase name>
- **Assignee**: <role-id>
- **Status**: pending | in_progress | blocked | done
- **Dependencies**: ["X.M", "Y.K"]
- **Estimated Hours**: <number>
- **CreatedAt**: <ISO timestamp>
- **StartedAt**: <ISO timestamp>
- **CompletedAt**: <ISO timestamp>

## Inputs

- **Files**: [输入文件]
- **Specs**: [指向 ADR/白皮书的指针，含章节锚点]
- **Contracts**: [指向 `src/modules/` 或 `.agents/contracts/` 的指针]

## Description

<做什么、为什么、约束>

## Acceptance Criteria

- [ ] 可验证标准 1
- [ ] 可验证标准 2

## Verification Commands

```bash
pnpm check && pnpm build
pnpm exec playwright test --project=chromium   # 角色专属
```

## Outputs

- **Files**: [输出文件列表]
- **Tests**: [新增/更新测试]
- **Contracts**: [更新的接口契约]

## Context (for handoff)

```json
{ "exports": {}, "contracts": {}, "notes": "" }
```
