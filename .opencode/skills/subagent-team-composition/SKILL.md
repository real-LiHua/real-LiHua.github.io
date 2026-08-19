---
description: 子智能体团队组合 - 编制规划、技能矩阵、负载均衡、跨职能协作
---

# 子智能体团队组合管理

## 团队拓扑模式

### 当前团队结构（6 人制）

```
                    ┌─────────────────┐
                    │  Quality-DX     │ ◄── 横向治理
                    │  Guardian       │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Frontend     │    │  Content      │    │  Build-Deploy │
│  Architect    │    │  Engineer     │    │  Engineer     │
│  (Stream)     │    │  (Stream)     │    │  (Platform)   │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Search       │    │  CLI Tool     │    │  (Future)     │
│  Discovery    │    │  Engineer     │    │  Data/Analytics│
└───────────────┘    └───────────────┘    └───────────────┘
```

### 团队类型定义

| 团队类型                  | 职责               | 成员                       | 协作模式                      |
| ------------------------- | ------------------ | -------------------------- | ----------------------------- |
| **Stream-aligned**        | 端到端交付业务价值 | Frontend, Content, Search  | 内部高内聚，外部通过 API/契约 |
| **Platform**              | 提供内部基础设施   | Build-Deploy, CLI-Tool     | 服务型，SLA 驱动              |
| **Enabling**              | 跨团队能力建设     | Quality-DX                 | 咨询、工具、标准              |
| **Complicated-Subsystem** | 专业深度领域       | (未来) ML/Search, Security | 专家型，按需介入              |

## 编制规划

### 技能矩阵（当前）

| 技能 \ 角色      | Frontend | Content | Build | CLI | Search | Quality |
| ---------------- | -------- | ------- | ----- | --- | ------ | ------- |
| Astro 组件       | ●●●      | ●○○     | ●○○   | ○○○ | ●○○    | ●●○     |
| Tailwind/daisyUI | ●●●      | ●○○     | ○○○   | ○○○ | ●○○    | ●○○     |
| Markdown/MDX     | ●○○      | ●●●     | ●○○   | ○○○ | ●○○    | ●○○     |
| Rust/Cargo       | ○○○      | ○○○     | ○○○   | ●●● | ○○○    | ○○○     |
| CI/CD            | ●○○      | ○○○     | ●●●   | ●○○ | ○○○    | ●○○     |
| 测试/质量        | ●●○      | ●○○     | ●○○   | ●○○ | ●○○    | ●●●     |
| 搜索/索引        | ●○○      | ●○○     | ●○○   | ○○○ | ●●●    | ○○○     |
| 架构设计         | ●●●      | ●●○     | ●●○   | ●○○ | ●○○    | ●○○     |

### 容量规划

```yaml
# .agents/team/capacity-plan-<quarter>.md
quarter: "2026-Q3"
roles:
  frontend-architect:
    capacity_hours_per_week: 20
    current_allocation: 16
    buffer: 4
    max_concurrent_tasks: 3
  content-engineer:
    capacity_hours_per_week: 16
    current_allocation: 12
    buffer: 4
    max_concurrent_tasks: 2
  # ... 其他角色

hiring_plan:
  - role: "data-analytics-engineer"
    justification: "访问统计、用户行为分析需求增长"
    target_date: "2026-10-01"
    budget: "0.5 FTE"
```

## 负载均衡算法

### 任务分发策略

```python
# 伪代码：任务分配决策
def assign_task(task, candidates):
    scores = {}
    for agent in candidates:
        # 1. 技能匹配度 (40%)
        skill_match = calculate_skill_match(task.required_skills, agent.skills)

        # 2. 当前负载 (30%)
        load_factor = 1 - (agent.current_tasks / agent.max_concurrent_tasks)

        # 3. 领域亲和性 (20%)
        domain_affinity = agent.domain_expertise.get(task.domain, 0)

        # 4. 成长机会 (10%)
        growth = 1 if task.stretch_skill in agent.learning_goals else 0

        scores[agent] = 0.4*skill_match + 0.3*load_factor + 0.2*domain_affinity + 0.1*growth

    return max(scores, key=scores.get)
```

### 再平衡触发器

- **周度**：自动检查负载偏差 > 30% → 推荐任务转移
- **紧急**：单角色队列积压 > 5 任务 → 启用跨职能支援
- **季度**：容量规划审查 → 调整编制/招聘

## 跨职能协作机制

### 1. 虚拟特性团队

```yaml
# 临时组建，任务完成解散
feature_team:
  id: "ft-2026-search-redesign"
  mission: "重构搜索体验：语义搜索 + 个性化推荐"
  members:
    - search-discovery-engineer (Lead)
    - frontend-architect (UI/UX)
    - content-engineer (Schema/Index)
    - quality-dx-guardian (测试/门禁)
  duration: "4 weeks"
  ceremonies:
    - daily_standup: 15min
    - weekly_sync: 30min
    - retro: 结束时
```

### 2. 契约驱动协作

- **接口契约**：`.agents/contracts/` 定义输入输出
- **版本化**：语义化版本，破坏性变更需 ADR
- **消费者驱动契约测试**：下游验证上游变更

### 3. 知识共享仪式

| 仪式                | 频率 | 参与者               | 产出           |
| ------------------- | ---- | -------------------- | -------------- |
| Tech Talk           | 月度 | 全员                 | 录像+文档      |
| Architecture Review | 双周 | Architect + 相关角色 | ADR/决策记录   |
| Incident Retro      | 事后 | 涉事角色             | 改进行动项     |
| Hack Day            | 季度 | 自愿                 | 原型/工具/优化 |

## 团队健康度指标

```yaml
# 月度团队健康度报告
team_health:
  psychological_safety: 4.2/5 # 匿名调查
  workload_balance: 0.85 # 方差系数 < 0.3
  knowledge_silo_risk: 低 # 关键知识 ≥ 2 人掌握
  cross_team_collaboration: 高 # 月均跨团队任务 ≥ 3
  innovation_rate: 中 # 季度创新项目 ≥ 1
```

## 命令

```bash
# 团队拓扑可视化
subagent-team topology --format mermaid|graphviz

# 技能矩阵
subagent-team skills-matrix --output .agents/team/skills-matrix.md

# 容量规划
subagent-team capacity --quarter 2026-Q3

# 负载再平衡建议
subagent-team rebalance --dry-run

# 组建特性团队
subagent-team form-feature-team --mission "search redesign" --lead search-discovery-engineer

# 健康度调查
subagent-team health-check --anonymous --output .agents/team/health-<month>.md
```
