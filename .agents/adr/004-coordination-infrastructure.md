# ADR 004: 协调基础设施 - 消息总线、知识库、合约落地、通信协调员

## Status

Accepted

## Date

2026-09-02

## Context

随着多智能体协作深入，需要正式确立协调基础设施：

- **消息总线**：智能体间异步通信，需明确 Schema、路由、优先级、幂等性
- **知识库**：跨会话、跨智能体的持久化知识存储，需结构化、可检索、版本化
- **合约落地**：将架构决策、接口定义、数据 Schema 物理化为可验证文件
- **通信协调员**：新角色，负责消息路由、冲突解决、协作编排

## Decision

### 1. 消息总线 Schema 与路由 (P2)

**文件位置**：`.agents/messages/` 目录下的 JSON Lines 格式

**消息结构**：

```json
{
  "id": "uuid",
  "timestamp": "ISO8601",
  "from": "agent-id",
  "to": "agent-id|broadcast",
  "type": "command|event|query|response",
  "priority": "P0|P1|P2",
  "payload": {},
  "correlationId": "uuid",
  "replyTo": "agent-id"
}
```

**路由规则**：

- 直连：`to` 指定单一接收者
- 广播：`to: "broadcast"` 发送给所有订阅该类型的智能体
- 优先级队列：P0 立即处理，P1 批次处理，P2 后台处理
- 幂等键：`correlationId` + `from` 去重

**存储**：`.agents/messages/inbox/{agent-id}/` 与 `.agents/messages/outbox/`

---

### 2. 知识库结构 (P1)

**文件位置**：`.agents/knowledge/`

**目录结构**：

```
knowledge/
├── decisions/      # ADR、设计决策、权衡记录
├── patterns/       # 代码模式、最佳实践、反模式
├── specs/          # 接口规范、API 契约、数据 Schema
├── runbooks/       # 运维手册、故障排查、部署步骤
├── context/        # 会话上下文、临时发现、待办事项
└── index.json      # 全局索引：title、tags、updatedAt、path
```

**检索**：

- 标签索引（`index.json`）
- 全文搜索（后续接入 Pagefind 或 ripgrep）
- 版本控制：Git 历史即版本，关键节点打 tag

---

### 3. 合约落地 (P0)

**文件位置**：`.agents/contracts/`

**核心合约文件**：
| 文件 | 说明 | 验证方式 |
|------|------|----------|
| `component-props.json` | 组件 Props 类型定义 | `oxlint` + TypeScript 编译 |
| `script-config.json` | 客户端脚本配置 Schema | `zod` 运行时验证 |
| `content-schema.json` | Content Collections frontmatter | `astro check` |
| `message-schema.json` | 消息总线消息结构 | `ajv` JSON Schema 验证 |
| `deployment-targets.json` | 部署目标配置矩阵 | CI 矩阵验证 |

**物化流程**：

1. ADR 决策 → 生成/更新对应合约文件
2. 合约变更 → CI 自动运行类型检查、Schema 验证
3. 运行时 → 通过 `zod`/`ajv` 验证输入输出符合合约

---

### 4. 通信协调员角色激活 (P0)

**角色定义**：`.agents/roles/communication-coordinator.md`

**职责**：

- 消息路由：维护订阅表、转发广播、处理死信队列
- 冲突解决：并发写入同一文件、优先级冲突、资源争用
- 协作编排：多智能体任务分解、依赖图构建、进度聚合
- 熔断降级：消息堆积触发背压、降级为同步调用

**激活条件**：

- 并行智能体 ≥ 3
- 或存在跨智能体共享状态写入
- 或任务依赖链长度 ≥ 3

---

## Consequences

### 正面

- **显式化协作**：隐式约定变为可审计、可验证的合约文件
- **故障隔离**：消息总线解耦发送方与接收方，单点故障不阻塞全链路
- **知识复用**：知识库沉淀跨会话经验，新智能体快速上下文获取
- **可观测性**：消息轨迹、知识版本、合约合规均可审计

### 负面/风险

- **基础设施前置成本**：需维护消息存储、索引构建、合约同步工具
- **消息最终一致性**：异步通信引入延迟，需设计补偿机制
- **合约演进阻力**：Schema 变更需协调所有消费者，版本策略需前置设计
- **协调员单点**：通信协调员若失效需降级为直连模式

### 后续工作

- [ ] 实现 `.agents/scripts/message-bus.ts` 基础路由器 (P2)
- [ ] 建立 `knowledge/index.json` 自动更新脚本 (P1)
- [ ] 合约文件 CI 校验流水线接入 (P0)
- [ ] 通信协调员角色实现与测试 (P0)
- [ ] 死信队列与重试策略 (P1)

---

## References

- `.agents/messages/` - 消息存储目录
- `.agents/knowledge/` - 知识库目录
- `.agents/contracts/` - 合约文件目录
- `.agents/roles/communication-coordinator.md` - 角色定义
- ADR 001、002、003 - 已物化为合约的前序决策
