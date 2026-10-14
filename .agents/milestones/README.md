# `.agents/milestones/` — 里程碑报告

每个 Phase 结束后在此生成一份里程碑报告，文件名 `phase-N.md`（N 为 Phase 编号）。这是 ADR 0009 §5.1「Phase 结束清单」的最后一步产出。

## 何时生成

- 一个 Phase 的全部任务卡 `status=done`、`Outputs` 填写完整后
- 任务卡归档完成后（见 `.agents/tasks/archive/README.md`）
- 由 `quality-dx-guardian` 维护（ADR 0009 §6 角色职责矩阵）

## 模板

```markdown
# Phase N 里程碑报告

**日期**: YYYY-MM-DD
**负责人**: <role-id>

## 目标与范围

- <本 Phase 的目标>

## 交付物

| 任务卡 | 角色 | Outputs | 质量门禁 |
| ------ | ---- | ------- | -------- |
| N.1    |      |         | ✅/❌    |

## 质量门禁结果

pnpm check / pnpm build / oxlint / oxfmt / playwright 结果

## 知识库同步

- [ ] CONTEXT.md 术语已同步
- [ ] ADR 状态已更新
- [ ] 指针扫描通过
- [ ] 契约同步检查通过

## 遗留项与风险

- <未完成项、技术债、下个 Phase 的输入>

## 归档

- 任务卡已移至 `.agents/tasks/archive/phase-N/`
```

## Related Documents

- `docs/adr/0009-knowledge-update-process.md` §5.1 / §7 — 归档与保留策略
- `.agents/tasks/` — 进行中的任务卡
- `REWRITE_PLAN.md`、`REFACTOR_PLAN.md` — Phase 定义
