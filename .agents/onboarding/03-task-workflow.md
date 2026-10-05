# 任务工作流手册

**适用**：所有子智能体  
**版本**：1.0  
**依据**：ADR 0003 `subagent-planning`、`subagent-lifecycle`

---

## 1. 任务全生命周期

```
CREATED → ONBOARDING → ACTIVE → (IDLE) → DEPRECATED → ARCHIVED
                ↓
            FAILED → REMEDIATION → ACTIVE
```

| 状态 | 含义 | 触发条件 |
|------|------|----------|
| `pending` | 待领取 | 任务卡创建 |
| `in_progress` | 执行中 | `task-claim` 后 |
| `blocked` | 阻塞 | `task-progress --blocked` |
| `done` | 完成 | `task-complete` 门禁通过 |
| `archived` | 归档 | Phase 结束统一归档 |

---

## 2. 任务卡结构

```markdown
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
- **Contracts**: [指向 src/modules/ 或 .agents/contracts/ 的指针]

## Description
<做什么、为什么、约束>

## Acceptance Criteria
- [ ] 可验证标准 1
- [ ] 可验证标准 2

## Verification Commands
```bash
pnpm check && pnpm build
pnpm playwright test --project=chromium  # 角色专属
```

## Outputs
- **Files**: [输出文件列表]
- **Tests**: [新增/更新测试]
- **Contracts**: [更新的接口契约]

## Context (for handoff)
```json
{ "exports": {}, "contracts": {}, "notes": "" }
```
```

---

## 3. Phase 执行流程

### 3.1 Phase 启动
```bash
# 1. 查看任务列表
ls .agents/tasks/phase-1/

# 2. 识别可并行任务（无依赖）
# 例：1.1, 1.3, 1.5 可并行
```

### 3.2 并行领取
```bash
# Terminal 1 (content-engineer):
pnpm exec tsx .agents/scripts/task-claim.ts 1.1 --assignee content-engineer

# Terminal 2 (frontend-architect):
pnpm exec tsx .agents/scripts/task-claim.ts 1.3 --assignee frontend-architect
```

### 3.3 开发过程
```bash
# 每 30min 更新进度
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 30 --msg "Exported PostFrontmatter type"
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 60 --msg "Updated content.ts imports"

# 遇阻塞立即上报
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 --blocked "Need schema" --help-from quality-dx-guardian
```

### 3.4 完成任务
```bash
pnpm exec tsx .agents/scripts/task-complete.ts 1.1
# 自动运行：tsc, oxlint, oxfmt, build + 角色专属门禁
```

### 3.5 Phase 验收
```bash
# 全 Phase 完成后
pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1

# 归档任务卡
mkdir -p .agents/tasks/archive/phase-1
mv .agents/tasks/phase-1/*.md .agents/tasks/archive/phase-1/
mv .agents/tasks/phase-1/*.progress .agents/tasks/archive/phase-1/
```

---

## 4. 任务卡模板

位置：`.agents/tasks/TASK_TEMPLATE.md`

**新建任务卡步骤**：
```bash
cp .agents/tasks/TASK_TEMPLATE.md .agents/tasks/phase-X/N.md
# 填写 Metadata、Inputs、Description、Acceptance Criteria、Verification Commands
```

**必填字段**：
- `Dependencies`：必须先完成的任务 ID
- `Specs`：指向 ADR 章节，如 `docs/adr/0001-functional-architecture.md#3.1`
- `Contracts`：指向模块接口，如 `src/modules/build-pipeline.ts`
- `Acceptance Criteria`：每项可验证
- `Outputs`：明确列出输出文件

---

## 5. 依赖管理

### 依赖规则
- **无依赖** = 可并行
- **共享文件** = 串行（避免冲突）
- **同一角色** = 建议串行（上下文连贯）

### 依赖声明
任务卡 `Dependencies` 字段：
```markdown
Dependencies: ["1.1", "1.3"]
```

### 并行度计算
```bash
# 计算最大并行度
pnpm exec tsx .agents/scripts/compute-parallelism.ts .agents/tasks/phase-1/
```

---

## 6. 阻塞处理

### 触发条件
- 卡住 > 15min 无进展
- 依赖任务未完成
- 需要其他角色协助

### 处理流程
```bash
# 1. 立即上报
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 --blocked "Zod import error" --help-from quality-dx-guardian

# 2. 协助角色响应，完成依赖
pnpm exec tsx .agents/scripts/task-progress.ts 1.5 100 --msg "Exported types for build pipeline"

# 3. 解除阻塞继续
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 60 --msg "Resolved: fixed import path"
```

### 自动熔断
- 单月质量门禁失败 ≥ 3 次 → 自动 `REMEDIATION`
- 连续 7 天无进度更新 → 自动标记 `IDLE`
- 权限异常/数据泄露风险 → 立即 `SUSPEND` + 审计

---

## 7. Phase 完成清单

```markdown
# Phase N 完成清单

## 任务状态
- [ ] 所有任务卡 status=done
- [ ] 所有任务卡 Outputs 填写完整
- [ ] 所有任务卡 Context handoff JSON 完整

## 知识库同步
- [ ] 任务卡归档至 .agents/tasks/archive/phase-N/
- [ ] REFACTOR_PLAN.md 对应阶段勾选
- [ ] CONTEXT.md 新增/变更术语同步
- [ ] ADR 状态更新 (Proposed → Accepted/Deprecated)
- [ ] 指针扫描通过: `pnpm exec tsx .agents/scripts/scan-pointers.ts`
- [ ] 契约同步: `pnpm exec tsx .agents/scripts/sync-contracts.ts`
- [ ] 术语检查: `pnpm exec tsx .agents/scripts/check-terms.ts`

## 质量门禁
- [ ] 所有角色专属门禁通过
- [ ] 回归检查通过: `pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1`

## 文档更新
- [ ] AGENTS.md 如有新命令/角色/模式
- [ ] 架构文档如有模块边界变更
- [ ] CHANGELOG.md 记录 (如存在)

## 交接下一 Phase
- [ ] Context handoff JSON 已审阅
- [ ] 下一 Phase 任务卡已创建
- [ ] 里程碑报告生成: .agents/milestones/phase-N.md

## 签名
| Role | Name | Date |
|------|------|------|
| Phase Lead | | |
| quality-dx-guardian | | |
```

---

## 8. 任务卡归档规范

```bash
# 归档命令
mkdir -p .agents/tasks/archive/phase-N
mv .agents/tasks/phase-N/*.md .agents/tasks/archive/phase-N/
mv .agents/tasks/phase-N/*.progress .agents/tasks/archive/phase-N/ 2>/dev/null || true

# 生成里程碑报告
cat > .agents/milestones/phase-N.md << 'EOF'
# Milestone: Phase N Complete
**Date**: $(date -u +"%Y-%m-%d")
**Tasks**: $(ls .agents/tasks/archive/phase-N/*.md | wc -l)
**Duration**: <days> days
**Key Deliverables**: <list>
EOF
```

---

## 9. 常见问题

| 问题 | 解决 |
|------|------|
| 任务卡依赖循环 | 检查 `Dependencies` 字段，拆分任务或调整顺序 |
| 并行任务改同一文件冲突 | 串行执行或拆分更细粒度任务 |
| 阻塞超过 1 小时无响应 | 升级找 `quality-dx-guardian` 协调 |
| 任务卡 Outputs 漏填 | `task-complete` 前必须填写，否则门禁不跑 |

---

**核心原则**：任务卡是单一事实来源 —— 读卡 → 心跳 → 必报 → 声明 → 自检