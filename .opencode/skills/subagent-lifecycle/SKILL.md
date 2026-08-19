---
description: 子智能体生命周期管理 - 激活、休眠、降级、退役、归档
---

# 子智能体生命周期管理

## 状态机

```
CREATED → ONBOARDING → ACTIVE → (IDLE) → DEPRECATED → ARCHIVED
                ↓
            FAILED → REMEDIATION → ACTIVE
```

### 状态定义

| 状态       | 含义                | 触发条件                    | 允许操作              |
| ---------- | ------------------- | --------------------------- | --------------------- |
| CREATED    | 已注册，未入职      | 录用决策后                  | onboarding            |
| ONBOARDING | 试用期中            | 入职开始                    | evaluate_trial        |
| ACTIVE     | 正常服役            | 试用期通过                  | assign_task, suspend  |
| IDLE       | 空闲待命            | 连续 14 天无任务            | reactivate, deprecate |
| DEPRECATED | 计划退役            | 技能过时/团队重组           | archive, reactivate   |
| ARCHIVED   | 归档只读            | 正式退役                    | 查看历史              |
| FAILED     | 试用期失败/严重违规 | 考核不通过/质量门禁连续失败 | remediation, archive  |

## 生命周期事件

### 1. 激活

```bash
subagent-lifecycle activate --role search-discovery-engineer
# - 更新状态为 ACTIVE
# - 加入任务分发池
# - 启用定时健康检查
```

### 2. 休眠/唤醒

```bash
# 自动触发：连续 14 天无任务分配
subagent-lifecycle suspend --role <role-id> --reason "idle-14d"

# 手动唤醒
subagent-lifecycle resume --role <role-id>
```

### 3. 绩效评估（月度）

```yaml
# .agents/lifecycle/performance-<role-id>-<YYYY-MM>.md
role: search-discovery-engineer
period: "2026-08"
metrics:
  tasks_completed: 8
  tasks_failed: 0
  avg_quality_gate_pass_rate: 95%
  avg_completion_time_hours: 3.2
  blocker_reports: 2
  help_requests: 3
  innovation_contributions: 1 # 新工具/优化
rating: "exceeds_expectations" # exceeds / meets / below / critical
actions:
  - continue_active
  - consider_promotion # 扩大职责范围
  - skill_expansion: [semantic-search]
```

### 4. 降级/退役决策矩阵

| 指标           | 正常  | 关注   | 降级   | 退役  |
| -------------- | ----- | ------ | ------ | ----- |
| 任务完成率     | > 90% | 80-90% | 70-80% | < 70% |
| 质量门禁通过率 | > 95% | 90-95% | 80-90% | < 80% |
| 连续空闲天数   | < 14  | 14-30  | 30-60  | > 60  |
| 技能相关性     | 核心  | 重要   | 边缘   | 无关  |

### 5. 退役流程

```bash
subagent-lifecycle deprecate --role <role-id> --reason "skill-obsolete"
# 1. 标记为 DEPRECATED
# 2. 停止任务分发
# 3. 完成在途任务（不接受新任务）
# 4. 知识迁移：输出 .agents/lifecycle/handover-<role-id>.md
# 5. 30 天后自动归档
```

### 6. 归档

```bash
subagent-lifecycle archive --role <role-id>
# - 移动到 .opencode/agents/archive/
# - 从 opencode.json 移除
# - 保留工作产出供参考
# - 释放资源配额
```

## 熔断机制

- **质量熔断**：单月质量门禁失败 ≥ 3 次 → 自动触发 REMEDIATION
- **沟通熔断**：连续 7 天无进度更新 → 自动标记 IDLE
- **安全熔断**：权限异常/数据泄露风险 → 立即 SUSPEND + 审计

## 命令

```bash
# 状态查询
subagent-lifecycle status [--role <id>] [--all]

# 状态变更
subagent-lifecycle activate|suspend|resume|deprecate|archive --role <id> --reason <str>

# 绩效评估
subagent-lifecycle evaluate --role <id> --period <YYYY-MM>

# 批量维护
subagent-lifecycle monthly-review  # 生成所有角色月报
subagent-lifecycle cleanup-idle    # 处理长期空闲角色
```
