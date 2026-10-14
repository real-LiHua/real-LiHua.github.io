# `.agents/tasks/archive/` — 已归档任务卡

Phase 完成后，该 Phase 的任务卡从 `.agents/tasks/phase-N/` 移入 `.agents/tasks/archive/phase-N/`。保留期限 2 年（ADR 0009 §7）。

## 归档时机

- 触发条件：Phase 结束（`docs/adr/0009-knowledge-update-process.md` §5.1）
- 执行者：对应角色；审批者：`quality-dx-guardian`

## 目录结构

```text
.agents/tasks/
├── phase-1/            # 进行中（在写）
│   ├── 1.1.md
│   └── ...
└── archive/            # 已归档（本目录）
    └── phase-0/
        └── 0.1.md
```

## 归档前检查

- [ ] 所有任务卡 `status=done`
- [ ] 每张卡 `Outputs` 填写完整
- [ ] 契约引用仍有效（`pnpm exec tsx .agents/scripts/sync-contracts.ts`）
- [ ] 已在 `.agents/milestones/phase-N.md` 记录里程碑报告

## Related Documents

- `.agents/milestones/README.md` — 里程碑报告
- `docs/adr/0009-knowledge-update-process.md` §5.1 / §7 — 归档与保留策略
- `docs/SUBAGENT_OPERATIONS.md` — 任务卡工作流
