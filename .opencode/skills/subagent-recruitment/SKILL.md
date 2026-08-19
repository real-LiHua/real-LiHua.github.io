---
description: 子智能体招聘技能 - 需求分析、角色设计、候选人评估、录用决策
---

# 子智能体招聘技能

## 触发条件

- 新业务领域需要专门处理
- 现有智能体负载过高（并发任务 > 3）
- 技能缺口分析发现缺失能力
- 架构演进需要新专业角色

## 招聘流程

### 1. 需求分析（JD 编写）

```yaml
# .agents/recruitment/JD-<role-id>.md
role_id: "search-discovery-engineer"
title: "搜索发现工程师"
department: "frontend"
reports_to: "frontend-architect"
level: "senior"

responsibilities:
  - Pagefind 索引优化与维护
  - 搜索 UI 组件开发
  - 标签系统与推荐算法
  - 搜索相关度调优

required_skills:
  - Pagefind 配置与扩展
  - Astro 组件开发
  - TypeScript 类型系统
  - 全文检索原理

nice_to_have:
  - 语义搜索/向量嵌入经验
  - Elasticsearch/Algolia 经验

kpis:
  - 搜索响应时间 < 200ms
  - 搜索相关度用户满意度 > 4.5/5
  - 索引构建时间 < 30s

workload_estimate: "2-3 并行任务/周"
```

### 2. 候选人评估模型

- **内部晋升**：现有智能体扩展技能树
- **新建智能体**：从模板生成，定制 prompt
- **外部引入**：复用社区/开源智能体定义

### 3. 评估维度（权重）

| 维度       | 权重 | 评估方法                 |
| ---------- | ---- | ------------------------ |
| 任务匹配度 | 40%  | 核心职责覆盖率           |
| 技能互补性 | 25%  | 与现有团队技能矩阵重叠度 |
| 协作兼容性 | 20%  | 通信协议、交接规范兼容   |
| 维护成本   | 15%  | 配置复杂度、Token 消耗   |

### 4. 录用决策

```bash
# 评分脚本
node .agents/scripts/evaluate-candidate.ts JD-search-discovery-engineer.md candidate-frontend-architect-ext.md

# 输出：推荐录用 / 待培养 / 不匹配
```

## 入职清单（录用后自动执行）

- [ ] 生成 `.opencode/agents/<role>.md`
- [ ] 注册到 `.opencode/opencode.json`
- [ ] 创建专属 Skill 目录
- [ ] 分配初始任务卡
- [ ] 指导 Mentor（通常是架构师或同领域资深）
- [ ] 完成首个任务验证（试用期）

## 命令

```bash
# 创建新角色需求
subagent-recruit create-jd --role search-discovery-engineer --department frontend

# 评估候选人
subagent-recruit evaluate --jd .agents/recruitment/JD-xxx.md --candidate internal:frontend-architect

# 录用并初始化
subagent-recruit hire --role search-discovery-engineer --mentor frontend-architect
```
