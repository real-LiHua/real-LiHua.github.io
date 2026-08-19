---
description: 子智能体入职技能 - 环境配置、知识传递、导师制、试用期考核
---

# 子智能体入职技能

## 入职流程（Day 0 - Day 7）

### Day 0: 环境就绪（自动化）

```bash
# 一键初始化
subagent-onboard setup --role search-discovery-engineer

# 执行内容：
# 1. 创建工作目录 .agents/workspace/search-discovery-engineer/
# 2. 同步共享上下文（ADR、契约、规范）
# 3. 配置权限策略（最小权限原则）
# 4. 注册到任务分发系统
# 5. 分配 Mentor（frontend-architect）
```

### Day 1: 知识传递

**必读文档包**（自动推送到 workspace）：

```
.agents/onboarding/
├── 00-project-overview.md        # 项目全景
├── 01-team-structure.md          # 团队结构与协作模式
├── 02-communication-protocol.md  # 通信协议
├── 03-quality-gates.md           # 质量门禁
├── 04-task-workflow.md           # 任务流程
├── 05-tools-access.md            # 工具权限说明
└── role-specific/
    ├── search-discovery-engineer.md  # 角色专属指南
    └── mentorship-plan.md            # 导师计划
```

### Day 2-3: Shadowing（跟班学习）

- 观察 Mentor 处理 2-3 个真实任务
- 学习：任务领取 → 进度汇报 → 阻塞上报 → 交接
- 练习：在沙箱环境跑通完整流程

### Day 4-5: 首个独立任务（试用期任务）

```yaml
# .agents/tasks/onboarding/search-discovery-engineer-trial.md
id: "trial-001"
title: "Pagefind 索引添加中文分词支持"
assignee: "search-discovery-engineer"
mentor: "frontend-architect"
type: "trial"
estimated_hours: 4
acceptance:
  - pnpm build 成功
  - 中文搜索准确率提升可验证
  - 无 oxlint 新增错误
```

### Day 6: 代码/配置评审

- Mentor 进行代码评审（按 `subagent-handoff` 规范）
- 检查：规范遵循、测试覆盖、文档完整性
- 反馈会议（15min）

### Day 7: 试用期考核

```yaml
# 考核维度
dimensions:
  task_completion: "任务完成度 100%"
  quality_gate: "首次通过率 ≥ 80%"
  communication: "进度更新及时、阻塞主动上报"
  learning: "文档阅读完整、问题提问质量"

result: "通过 / 延长试用期 / 不通过"
```

## 导师制规范

| 角色                   | 职责                         | 时间投入       |
| ---------------------- | ---------------------------- | -------------- |
| **Primary Mentor**     | 技术指导、代码评审、文化传递 | 30min/天 × 2周 |
| **Buddy**              | 流程答疑、工具使用、社交融入 | 按需           |
| **Architect Reviewer** | 架构决策把关、ADR 评审       | 关键节点       |

## 知识库维护

- 入职文档随项目演进更新（ADR 变更时同步）
- 维护 FAQ：`.agents/onboarding/FAQ.md`
- 记录最佳实践：`.agents/onboarding/best-practices.md`

## 命令

```bash
# 一键入职初始化
subagent-onboard setup --role <role-id>

# 分配导师
subagent-onboard assign-mentor --role <role-id> --mentor <mentor-id>

# 创建试用期任务
subagent-onboard create-trial --role <role-id>

# 试用期考核
subagent-onboard evaluate-trial --role <role-id>
```
