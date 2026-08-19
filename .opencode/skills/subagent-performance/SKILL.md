---
description: 子智能体绩效管理 - KPI 设定、实时监控、反馈机制、晋升/调岗
---

# 子智能体绩效管理

## KPI 体系设计

### 核心指标（权重 100%）

| 维度         | 关键指标              | 权重 | 采集方式               | 优秀标准      |
| ------------ | --------------------- | ---- | ---------------------- | ------------- |
| **交付质量** | 质量门禁首次通过率    | 30%  | task-complete 自动记录 | ≥ 95%         |
| **交付效率** | 任务平均周期时间      | 20%  | 进度文件时间戳         | ≤ 估算 1.2x   |
| **协作质量** | 阻塞主动上报率        | 15%  | blocker 记录           | 100% 主动上报 |
| **知识沉淀** | ADR/文档/最佳实践贡献 | 15%  | Git 提交统计           | ≥ 1 件/月     |
| **创新改进** | 工具/流程/性能优化    | 10%  | 自我申报 + 评审        | ≥ 1 件/季度   |
| **学习成长** | 新技能掌握/证书/分享  | 10%  | 导师评价 + 自我总结    | ≥ 1 项/季度   |

### 角色差异化权重

```yaml
# 不同角色侧重不同
frontend-architect:
  delivery_quality: 35%
  innovation: 15% # 架构创新更重要

cli-tool-engineer:
  delivery_efficiency: 25% # Rust 编译测试快
  learning: 15% # 技术栈更新快

quality-dx-guardian:
  collab_quality: 25% # 跨团队协作多
  knowledge: 20% # 规范文档维护
```

## 监控仪表盘（实时）

### 数据源

- 任务进度文件：`.agents/tasks/phase-X/N.progress`
- 质量门禁结果：`.agents/tasks/phase-X/N.gate.json`
- Git 提交：`git log --author="<role-id>" --since="1 month ago"`
- 交接文档：`.agents/tasks/phase-X/N.handoff.md`

### 可视化指标

```bash
# 生成月度绩效报告
subagent-perf report --role <id> --period 2026-08

# 输出：.agents/performance/report-<role>-<period>.md
# 包含：雷达图、趋势图、同比环比、改进建议
```

## 反馈机制

### 1. 即时反馈（任务级）

- **质量门禁失败**：自动通知 + 24h 内复盘
- **阻塞上报**：Mentor/Architect 4h 内响应
- **交接评审**：每任务完成后，Mentor 15min 代码评审

### 2. 周度同步（15min）

```markdown
# Weekly Sync: search-discovery-engineer - 2026-W33

## 本周完成

- Task 2.1: Pagefind 中文分词优化 ✓ (4h, 质量门禁首次通过)

## 进行中

- Task 2.3: 搜索结果高亮组件 (60%, 预计周五完成)

## 阻塞/风险

- 无

## 需要支持

- 需要 content-engineer 确认 schema 导出接口 (周三前)

## 学习/改进

- 学习了 Pagefind 自定义权重算法
- 优化了索引构建脚本，耗时 -30%
```

### 3. 月度绩效面谈（30min）

- 回顾 KPI 达成情况
- 360° 反馈（Mentor、协作伙伴、Architect）
- 制定下月 OKR
- 讨论职业发展（技能扩展/角色演进）

## 晋升/调岗路径

### 晋升阶梯

```
Junior (L1) → Senior (L2) → Staff (L3) → Principal (L4)
   ↓             ↓            ↓            ↓
 执行任务    设计方案/导师  跨域架构/战略  生态建设/标准制定
```

### 晋升评估委员会

- **主席**：Architect（或最高级别同领域）
- **成员**：2-3 位跨职能 Senior/Staff
- **流程**：材料包 → 答辩 → 讨论 → 决定

### 调岗（横向流动）

- 技能互补型：frontend-architect ↔ search-discovery-engineer
- 兴趣驱动：cli-tool-engineer → build-deploy-engineer (Rust + CI/CD)
- 组织需要：临时支援高负载领域

## 绩效改进计划 (PIP)

触发条件：连续 2 月 rating="below_expectations"

```yaml
# .agents/performance/PIP-<role>-<date>.md
role: search-discovery-engineer
issues:
  - quality_gate_pass_rate: 78% (target 95%)
  - avg_cycle_time: 2.5x estimate
  - blocker_reporting: 40% (missed 3/5)
actions:
  - weekly_pair_programming with frontend-architect (4 weeks)
  - mandatory daily progress update
  - reduced concurrent tasks: 3 → 1
  - mentor: quality-dx-guardian (quality focus)
review_date: "2026-10-15"
outcome: "pass / extend / redeploy"
```

## 命令

```bash
# 实时 KPI 看板
subagent-perf dashboard --role <id> [--live]

# 月度报告
subagent-perf report --role <id> --period <YYYY-MM> [--format markdown|json]

# 绩效面谈记录
subagent-perf review --role <id> --period <YYYY-MM> --notes "<markdown>"

# 晋升评估
subagent-perf promote --role <id> --target-level L3 --package .agents/performance/promo-pkg.md

# PIP 管理
subagent-perf pip create --role <id> --issues "<list>"
subagent-perf pip review --role <id> --pip-id <id>
```
