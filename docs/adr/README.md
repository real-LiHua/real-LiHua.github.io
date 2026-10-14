# Architecture Decision Records (ADR)

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

本目录（`docs/adr/`）保存项目的全部架构决策记录。本文件是 ADR 的索引与撰写约定。

## 什么是 ADR

**ADR (Architecture Decision Record)** 记录一项**架构级决策**的背景、选择、理由与后果，使"决策可追溯、演进可回放"。每份 ADR 描述**当时**为何这样决定，而非当前系统如何实现——后者以代码与 `CONTEXT.md` 为准。

**判定标准**：若一项变更影响模块边界、运行时/托管、数据模型、跨角色契约或长期维护成本，则应创建 ADR；常规实现细节留在 PR 描述即可。

**不可变原则**：ADR 一经记录**不修改历史**。决策被推翻时，新增一份 ADR，并把旧的标记为 `Superseded`（见 `docs/adr/0009-knowledge-update-process.md` §7 版本与归档策略）。

## 生命周期状态

| 状态         | 含义                       | 触发动作                                                |
| ------------ | -------------------------- | ------------------------------------------------------- |
| `Proposed`   | 已提出，等待评审确认       | 记录决策草案，等待全员架构评审                          |
| `Accepted`   | 已采纳并生效               | 决策落地，作为事实源被引用                              |
| `Deprecated` | 不再推荐，但尚未被明确替代 | 标注废弃原因与替代方向                                  |
| `Superseded` | 已被后续 ADR 明确取代      | 在 `## Status` 注明 `Superseded by NNNN` 并链接承接 ADR |

状态迁移应保守：`Proposed → Accepted` 需经架构评审；`Accepted → Superseded` 必须指向承接的 ADR 编号。

## 索引

| 编号                                                 | 标题                                                               | 状态       | 焦点                        |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ---------- | --------------------------- |
| [0001](./0001-functional-architecture.md)            | 博客系统功能架构设计                                               | `Accepted` | 系统级：C4 模型 + 模块边界  |
| [0002](./0002-draft-isolation-submodule.md)          | 草稿隔离 - 私有 Git 子模块方案                                     | `Accepted` | 领域级：草稿隔离策略        |
| [0003](./0003-deployment-strategy.md)                | 部署策略 - 多平台同步部署                                          | `Accepted` | 基础设施级：多平台部署      |
| [0004](./0004-subagent-coordination.md)              | 子智能体职责与协作内控体系                                         | `Accepted` | 组织级：子智能体协作内控    |
| [0005](./0005-theme-token-strategy.md)               | 主题 Token 策略 - CSS 变量 vs Tailwind @theme                      | `Accepted` | 实现级：主题 Token 策略     |
| [0006](./0006-pagefind-ui-approach.md)               | Pagefind UI 方案 - 声明式 vs 模块化 UI                             | `Accepted` | 实现级：搜索 UI 方案        |
| [0007](./0007-client-module-registry.md)             | 客户端模块注册表设计                                               | `Accepted` | 实现级：客户端模块注册表    |
| [0008](./0008-agents-knowledge-base-architecture.md) | AGENTS 知识库架构设计                                              | `Accepted` | 元级：知识库架构            |
| [0009](./0009-knowledge-update-process.md)           | AGENTS 知识更新流程设计                                            | `Accepted` | 元级：知识更新流程          |
| [0010](./0010-dependency-evaluation.md)              | 依赖评估与引入策略                                                 | `Accepted` | 实现级：依赖评估与引入策略  |
| [0011](./0011-agent-learning-mechanism.md)           | Agent 学习与知识捕获机制                                           | `Proposed` | 元级：Agent 学习与知识捕获  |
| [0012](./0012-tgcloud-migration.md)                  | tgcloud 迁移 - Telegram Bot 后端从 Cloudflare Workers 迁至 tgcloud | `Accepted` | 基础设施级：运行时/托管迁移 |

### 状态对齐记录

- **2026-10**：`0005`（Theme Token）、`0006`（Pagefind UI）、`0007`（ClientModule 注册表）的实现已在 Phase 4–6 落地，状态由 `Proposed` 迁移为 `Accepted`。
- `0011`（Agent 学习机制）**仍为 `Proposed`**：其 `## Implementation Checklist` 中的工具项（`extract-learning.ts` 等）尚未实现，待落地后再迁移。

## 何时创建 ADR

- **应该创建**：引入/替换架构级依赖（如 ORM、运行时、托管平台）；变更模块边界或接口契约；改变数据模型或认证模型；引入新的长期维护成本或平台锁定。
- **无需创建**：常规功能实现、Bug 修复、局部重构、格式/文案调整——这些记录在 PR 描述即可。
- **架构级依赖**：遵循 `docs/adr/0010-dependency-evaluation.md` §6，必须在引入时创建 ADR，记录选型理由、迁移路径与退出策略。

## 模板

每份 ADR 至少包含以下章节（按顺序）：

```markdown
# Architecture Decision Record: <标题>

## Status

<Proposed | Accepted | Deprecated | Superseded by NNNN>

## Last Updated

YYYY-MM

## Context

<背景、约束、触发因素；引用既有 ADR 与术语，不重复定义>

## Decision

<决策内容；可用编号小节、表格、mermaid 图组织>

## Consequences

### 正面

<收益>

### 负面与风险

<代价、风险、平台锁定>

### 后续工作

- [ ] 待办

## Alternatives Considered

1. <替代方案> —— <拒绝理由>

## Related Documents

- `docs/adr/NNNN-<topic>.md`（关联说明）
- `CONTEXT.md`（术语）

## References

- <commit / 文件 / 外部链接>

## Implementation Checklist

- [x] 已完成项
- [ ] 待办项
```

> 变体说明：早期 ADR 使用 `### Positive` / `### Trade-offs`，新 ADR 统一使用 `### 正面` / `### 负面与风险`；两者均可接受，但应在单个文件内保持一致。

## 命名与编号

- **格式**：`NNNN-<kebab-case-topic>.md`，四位数零填充，例如 `0012-tgcloud-migration.md`。
- **编号**：单调递增、**永不复用**。新增 ADR 取当前最大编号 +1（当前最大为 `0012`）。
- **主题词**：优先使用 `CONTEXT.md` 中已定义的术语，例如 `DeployTarget`、`TelegramAuth`。
- **存储**：永久保存在 `docs/adr/`，不因 Superseded 而删除。

## ADR 与 CONTEXT.md 的关系

遵循 `docs/adr/0008-agents-knowledge-base-architecture.md` §4 的**术语单一源头**原则：

- 术语定义**只**在 `CONTEXT.md`；ADR 不得重复定义术语，直接引用即可。
- 首次出现可加锚点链接，例如 `[术语](../../CONTEXT.md)`。
- 新增术语 → **先**更新 `../../CONTEXT.md` → **再**在 ADR 中使用。
- 术语重命名 → 更新 `CONTEXT.md`

* 全库搜索替换 + 用 ADR 记录重命名原因。

## 维护

| 动作           | 频率   | 责任角色            | 说明                                                                  |
| -------------- | ------ | ------------------- | --------------------------------------------------------------------- |
| ADR 过期审查   | 季度   | 全员                | 核对 `Proposed` 是否应转 `Accepted`；标记 `Deprecated` / `Superseded` |
| 指针/链接校验  | 月度   | quality-dx-guardian | 确保 ADR 内部链接与文件路径有效⏸                                      |
| 模板一致性检查 | 季度   | quality-dx-guardian | 新 ADR 使用统一章节；状态字段规范                                     |
| 迁移/决策补记  | 事件后 | 变更发起者          | 架构级变更须补 ADR（如 `0012`）                                       |

季度审查的产出应更新本索引表的状态列，并在对应 ADR 的 `## Status` 中体现。**2026-10-09 更新**：已完成 `0005/0006/0007` 状态对齐，并清理 `0003` 与 `.agents/knowledge/deployment-procedures.md` 中的 Cloudflare Workers 残留（现指向 tgcloud，见 `docs/adr/0012-tgcloud-migration.md` §6）。
