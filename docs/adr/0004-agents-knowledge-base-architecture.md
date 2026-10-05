# Architecture Decision Record: AGENTS 知识库架构设计

## Status

Accepted

## Context

随着项目文档增长（AGENTS.md、CONTEXT.md、4 个 ADR、白皮书、重构计划、子智能体操作手册、深度模块接口等），需要建立系统化的知识库架构，使 AI 智能体能够：

- 快速定位所需上下文（最小化 context load）
- 按需加载参考材料（progressive disclosure）
- 保持术语一致性（单一源头）
- 支持子智能体并行工作流

## Decision

采用 **三层信息金字塔** + **上下文指针** 架构，遵循 `writing-for-agents` 的信息层级原则和 `domain-modeling` 的文件结构规范。

### 1. 信息金字塔

```
┌─────────────────────────────────────┐
│  L1: AGENTS.md (Always-loaded)      │  ← 步骤 + 关键指针
│  - 核心工作流、命令、角色表         │
│  - 指向 L2/L3 的上下文指针          │
├─────────────────────────────────────┤
│  L2: 领域文档 (Disclosed on demand) │  ← 参考规则、决策记录
│  - CONTEXT.md (术语表)              │
│  - docs/adr/*.md (架构决策)         │
│  - docs/SECURITY_WHITEPAPER.md      │
│  - REFACTOR_PLAN.md                 │
├─────────────────────────────────────┤
│  L3: 实现细节 (Environment/Code)    │  ← 环境即源头
│  - src/modules/*.ts (接口契约)      │
│  - package.json (scripts)           │
│  - .agents/scripts/* (可执行工具)    │
└─────────────────────────────────────┘
```

### 2. 文件结构规范

```
/
├── AGENTS.md              # L1: 总入口，仅含步骤 + 指针
├── CONTEXT.md             # L2: 术语表 (15 核心术语，单一源头)
├── REFACTOR_PLAN.md       # L2: 当前重构计划 (8 阶段)
├── docs/
│   ├── adr/               # L2: 架构决策记录 (编号前缀)
│   │   ├── 0001-functional-architecture.md
│   │   ├── 0002-draft-isolation-submodule.md
│   │   ├── 0003-subagent-responsibilities-controls.md
│   │   └── 0004-agents-knowledge-base-architecture.md (本文)
│   ├── SECURITY_WHITEPAPER.md
│   ├── SUBAGENT_OPERATIONS.md
│   └── architecture-map.md
├── .agents/               # L2/L3 边界: 子智能体运行时
│   ├── scripts/           # L3: 可执行工具 (task-claim, run-gate 等)
│   ├── tasks/phase-1..8/  # L2: 任务卡 (步骤 + 验收标准)
│   ├── contracts/         # L2: 接口契约 (TS/Zod)
│   ├── lifecycle/         # L2: 绩效月报
│   ├── team/              # L2: 技能矩阵、容量规划
│   └── tech-debt/         # L2: 技术债登记
├── src/
│   ├── modules/           # L3: 深度模块接口 (导出单一对象)
│   │   ├── index.ts       # 统一导出
│   │   ├── types.ts       # 共享类型
│   │   ├── content-pipeline.ts
│   │   ├── build-pipeline.ts
│   │   ├── theme-system.ts
│   │   ├── search.ts
│   │   ├── client-runtime.ts
│   │   ├── telegram-auth.ts
│   │   └── ui-components.ts
│   └── ...                # 实现代码
└── package.json           # L3: scripts 即源头
```

### 3. 上下文指针设计

**原则**：指针的措辞决定触发可靠性，前置导向词，每分支一指针。

| 指针位置                          | 目标                                         | 触发分支                   | 措辞模板                                                                     |
| --------------------------------- | -------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------- |
| AGENTS.md#Architecture References | `docs/adr/0001-functional-architecture.md`   | 需了解模块边界、数据流     | "模块边界、数据流 → `docs/adr/0001-functional-architecture.md`"              |
| AGENTS.md#Security Considerations | `docs/SECURITY_WHITEPAPER.md`                | 安全审查、威胁建模         | "安全基线、威胁模型、事件响应 → `docs/SECURITY_WHITEPAPER.md`"               |
| AGENTS.md#Sub-Agent Orchestration | `docs/SUBAGENT_OPERATIONS.md`                | 领取任务、跑门禁、上报阻塞 | "子智能体日常命令、故障排查 → `docs/SUBAGENT_OPERATIONS.md`"                 |
| AGENTS.md#Content Management      | `docs/adr/0002-draft-isolation-submodule.md` | 草稿隔离、私有仓库         | "草稿物理隔离、Git submodule → `docs/adr/0002-draft-isolation-submodule.md`" |
| 任务卡中的 `Specs` 字段           | 对应 ADR/白皮书                              | 执行具体任务时             | "规范：`docs/adr/0001-functional-architecture.md#3.1`"                       |
| 任务卡中的 `Contracts` 字段       | `.agents/contracts/*.ts`                     | 实现接口时                 | "契约：`src/modules/build-pipeline.ts`"                                      |

**反模式对比**：

- ❌ "详见安全白皮书" (无导向词、无分支)
- ✅ "CSP 策略、Telegram 认证流程、构建管线安全 → `docs/SECURITY_WHITEPAPER.md`"

### 4. 术语单一源头

`CONTEXT.md` 为唯一术语定义处，所有文档引用术语时**不再重复定义**，仅使用术语。

| 术语                         | 定义位置   | 使用约束                     |
| ---------------------------- | ---------- | ---------------------------- |
| Post, Draft, Frontmatter     | CONTEXT.md | 直接使用，不解释             |
| BuildPipeline, ThemeSystem   | CONTEXT.md | 首次出现可加 `#术语` 锚点    |
| ClientModule, ClientRuntime  | CONTEXT.md | 代码中同名导出，文档引用同名 |
| Deep Module, Seam, Interface | CONTEXT.md | 遵循 `codebase-design` 定义  |

**规则**：新增术语 → 先更新 CONTEXT.md → 再在别处使用。

### 5. ADR 编号与分类

```
docs/adr/
├── 0001-functional-architecture.md      # 系统级：C4 + 模块边界
├── 0002-draft-isolation-submodule.md    # 领域级：草稿隔离策略
├── 0003-subagent-responsibilities-controls.md # 组织级：角色/内控
├── 0004-agents-knowledge-base-architecture.md # 元级：知识库架构
├── 0005-theme-token-strategy.md         # 待创建：CSS Token vs @theme
├── 0006-pagefind-ui-approach.md         # 待创建：声明式 vs 模块化 UI
└── 0007-client-module-registry.md       # 待创建：客户端模块注册表设计
```

**命名约定**：`NNNN-<kebab-case-topic>.md`，主题词来自 CONTEXT.md 术语。

### 6. 任务卡契约

每任务卡 `.agents/tasks/phase-X/N.md` 遵循统一结构：

````markdown
# Task N: <Title>

## Metadata

- ID, Phase, Assignee, Status, Dependencies, Estimated Hours

## Inputs

- Files: [输入文件列表]
- Specs: [指向 ADR/白皮书的指针，含章节锚点]
- Contracts: [指向 .agents/contracts/ 或 src/modules/ 的指针]

## Description

- 做什么、为什么、约束

## Acceptance Criteria

- [ ] 可验证的标准

## Verification Commands

```bash
pnpm check && pnpm build  # 通用
pnpm playwright test --project=chromium  # 角色专属
```
````

## Outputs

- Files, Tests, Contracts 更新

## Context (for handoff)

```json
{ "exports": {}, "contracts": {}, "notes": "" }
```

````

**指针规范**：
- `Specs` 字段值为 `docs/adr/0001-functional-architecture.md#3.1-content-pipeline-module`
- `Contracts` 字段值为 `src/modules/build-pipeline.ts` 或 `.agents/contracts/build-output.json`

### 7. 导入路径规范

```typescript
// 内部模块：统一从 @/modules 导入接口对象
import { contentPipeline, buildPipeline, themeSystem } from "@/modules";

// 类型：从 @/modules/types 导入
import type { PostFrontmatter, BlogCollection } from "@/modules/types";

// 实现细节：相对路径，不跨模块引用实现
import { formatDate } from "../utils/date";
````

**环境即源头**：`package.json` 的 `scripts`、`astro.config.ts` 的集成配置、`wrangler.jsonc` 的绑定——文档不复述，仅在 AGENTS.md 给出命令入口。

### 8. 子智能体知识隔离

每角色仅加载所需 L2 文档：

| 角色                      | 必读 L1   | 按需 L2                               | L3 环境                                               |
| ------------------------- | --------- | ------------------------------------- | ----------------------------------------------------- |
| frontend-architect        | AGENTS.md | 0001, 0005, 0006, SUBAGENT_OPERATIONS | src/components, src/styles, playwright.config.ts      |
| content-engineer          | AGENTS.md | 0001, 0002, REFACTOR_PLAN             | src/content.config.ts, src/utils/content.ts           |
| build-deploy-engineer     | AGENTS.md | 0001, 0003, SECURITY_WHITEPAPER       | .github/workflows, wrangler.jsonc                     |
| cli-tool-engineer         | AGENTS.md | 0003, REFACTOR_PLAN                   | Cargo.toml, src/post-edit/                            |
| search-discovery-engineer | AGENTS.md | 0001, 0006, architecture-map.md       | src/modules/search.ts                                 |
| quality-dx-guardian       | AGENTS.md | 全部 ADR, SUBAGENT_OPERATIONS         | .oxlintrc.json, oxfmt.config.ts, playwright.config.ts |

### 9. 维护规程

| 动作             | 频率          | 责任角色            | 产出                                 |
| ---------------- | ------------- | ------------------- | ------------------------------------ |
| 术语同步检查     | 每 Phase 结束 | quality-dx-guardian | CONTEXT.md 更新                      |
| ADR 过期审查     | 季度          | 全员                | 废弃/替换标记                        |
| 指针失效扫描     | 月度          | quality-dx-guardian | 修复报告                             |
| 任务卡归档       | Phase 完成后  | 对应角色            | 移至 `.agents/tasks/archive/`        |
| 知识库健康度评估 | 季度          | 全员                | `docs/KNOWLEDGE_HEALTH_<quarter>.md` |

### 10. 导向词表

| 导向词                 | 含义                      | 适用场景           |
| ---------------------- | ------------------------- | ------------------ |
| **tight**              | 快速、确定性、低开销      | 循环、门禁、脚本   |
| **red**                | 二进制可观测失败态        | 质量门禁、测试     |
| **seam**               | 模块接口位置 (Feathers)   | 架构讨论、ADR      |
| **deep**               | 小接口大实现 (Ousterhout) | 模块设计评审       |
| **red-green-refactor** | TDD 循环                  | 任务卡验收标准     |
| **tracer-bullet**      | 端到端最小可行路径        | 里程碑拆解         |
| **context-pointer**    | 文档外部引用机制          | AGENTS.md 指针设计 |

## Consequences

### Positive

- **Context load 可控**：AGENTS.md 仅 ~100 行核心步骤 + 指针表
- **按需加载**：子智能体仅拉取相关 L2，避免无关噪声
- **术语一致**：CONTEXT.md 单一源头，消除定义漂移
- **可追溯**：任务卡 → Specs/Contracts → ADR/代码 完整链路
- **环境同步**：package.json/astro.config.ts 等不写入文档，天然不 stale

### Trade-offs

- **初始导航成本**：新智能体需学会"查指针→读 L2"模式
- **指针维护**：重构移动文件需同步更新所有指针
- **认知负载转移**：人类需维护索引结构，但换来智能体稳定性

## Alternatives Considered

1. **扁平化大 AGENTS.md** —— 超过 500 行后 attention 稀释，拒绝
2. **全量上下文注入** —— Token 浪费、无关干扰，拒绝
3. **外部向量检索** —— 增加基础设施复杂度，拒绝

## Related Documents

- CONTEXT.md (术语表)
- docs/adr/0001-functional-architecture.md (模块边界)
- docs/adr/0003-subagent-responsibilities-controls.md (角色/内控)
- .agents/skills/writing-for-agents (编写原则)
- .agents/skills/domain-modeling (领域建模规范)

## Implementation Checklist

- [x] AGENTS.md 重写为三层金字塔结构
- [x] CONTEXT.md 15 术语定义
- [x] docs/adr/ 编号规范化
- [x] .agents/contracts/ 接口契约文件
- [x] .agents/scripts/ 核心工具脚本
- [ ] docs/adr/0005-theme-token-strategy.md 创建
- [ ] docs/adr/0006-pagefind-ui-approach.md 创建
- [ ] docs/adr/0007-client-module-registry.md 创建
- [ ] 任务卡模板强制 Specs/Contracts 字段
- [ ] CI 增加指针失效扫描脚本
- [ ] 季度知识库健康度报告模板
