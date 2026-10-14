# Architecture Decision Record: Agent 学习与知识捕获机制

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

## Status

Proposed

## Context

当前项目文档完善，但 Agent 缺乏**自主学习/知识捕获**能力：

- 代码旁无自动记录坑点机制
- 运行时错误无自动归类/学习
- 本地开发经验无自动沉淀到文档
- 跨会话记忆/经验复用依赖人工更新文档/ADR
- 无自动生成 "Lessons Learned" 机制

需要一套 **轻量、可选、可审计** 的学习机制，将开发过程中的隐性知识显性化。

## Decision

建立 **三层捕获** + **两种模式** + **人工审核** 的学习机制。

---

### 1. 三层捕获模型

| 层级             | 触发时机          | 捕获内容                                 | 存储位置                                    | 处理方式                  |
| ---------------- | ----------------- | ---------------------------------------- | ------------------------------------------- | ------------------------- |
| **L1: 即时捕获** | 代码编写/调试时   | TODO/FIXME/XXX 注释、内联坑点标记        | 源码注释                                    | 即时可见，代码审查时同步  |
| **L2: 会话捕获** | 任务完成/阶段结束 | 遇到的问题、解决方案、决策理由、避坑指南 | `.agents/learning/session-<id>.md`          | 任务完成时自动/半自动生成 |
| **L3: 知识沉淀** | 月度/里程碑       | 高频模式、最佳实践、反模式、架构演进     | `docs/LESSONS_LEARNED.md` 、ADR、CONTEXT.md | 人工审核 + 定期归档       |

---

### 2. 两种捕获模式

#### 模式 A: 主动标记 (开发者驱动)

**源码注释规范**：

```typescript
// @learning:pitfall - 坑点记录
// @learning:decision - 决策理由
// @learning:pattern - 可复用模式
// @learning:gotcha - 易错点/反直觉行为

// 示例
// @learning:pitfall Astro 5+ glob loader 的 `retainBody: true` 会导致内存暴涨，大量 MDX 时必须设为 false
const loader = glob({ pattern: "**/*.mdx", base: "./src/posts", retainBody: false }); // ⏸ src/

// @learning:decision 选择 satteri 而非 remark/rehype：内置 Shiki、AST 统一、插件系统更简单
// 相关 ADR: docs/adr/0001-functional-architecture.md#31-content-pipeline-module

// @learning:pattern 复合组件模式：Navbar.Start/Center/End + slots 避免布尔属性爆炸
// 复用: docs/adr/0001-functional-architecture.md#36-ui-component-library-复合组件模式
```

**提取脚本**：

```bash
# 提取所有 @learning 标记
pnpm exec tsx .agents/scripts/extract-learning.ts --output .agents/learning/extracted-<timestamp>.md
```

#### 模式 B: 任务复盘 (结构化)

**任务完成时自动触发** (集成 `task-complete.ts` )：

```markdown
# Session Learning: Task 3.4 - Navbar 复合组件重构

## 任务信息

- Task ID: 3.4
- Assignee: frontend-architect
- Duration: 2.5h
- Date: 2026-10-07

## 遇到的问题 (Pitfalls)

| 问题                      | 现象                    | 根因                          | 解决方案                                                                       | 耗时  |
| ------------------------- | ----------------------- | ----------------------------- | ------------------------------------------------------------------------------ | ----- |
| daisyUI 5 navbar 类名变更 | `navbar-start` 等类失效 | 升级文档滞后                  | 查阅源码迁移到 `navbar-start` → `navbar-start` (无变化)，实际是 CSS 变量名变了 | 45min |
| View Transitions 闪烁     | 主题切换后页面闪白      | `astro:after-swap` 未恢复主题 | 在 `theme-toggle.ts` 监听 `astro:after-swap` 重新应用 `data-theme`             | 30min |

## 决策记录

| 决策                       | 理由                             | 替代方案                        | ADR 关联 |
| -------------------------- | -------------------------------- | ------------------------------- | -------- |
| 使用复合组件而非布尔 Props | 避免 `Navbar` 接受 5+ 个 boolean | render props / 单组件巨大 Props | 0001#3.6 |
| ThemeTokens 仅用 CSS 变量  | daisyUI @plugin 直接引用         | Tailwind @theme 指令            | 0005     |

## 可复用模式

- **Pattern**: 复合组件 + slots 替代 boolean 爆炸
  - 适用: 所有有多个变体/插槽的组件
  - 示例: `Navbar`、`PostCard`、`PagefindSearch`

- **Pattern**: ClientModule 依赖声明 + 拓扑排序
  - 适用: 所有需初始化顺序的客户端脚本
  - 示例: `theme-toggle` → `toc` → `telegram-auth`

## 待办/改进

- [ ] 将 daisyUI 5 迁移指南记入 `docs/DAISYUI_MIGRATION.md` ⏸
- [ ] ThemeTokens 增加 `--color-focus` 变量供焦点态使用
- [ ] 考虑引入 `astro:before-swap` 预加载优化

## 标签

`#frontend` `#daisyui` `#view-transitions` `#theme` `#component-pattern`
```

---

### 3. 存储结构

```text
.agents/learning/
├── sessions/              # L2 会话记录 (按任务/日期)
│   ├── 2026-10/
│   │   ├── session-3.4-navbar-refactor.md
│   │   └── session-5.2-pagefind-config.md
│   └── index.json         # 会话索引: id, task, date, tags, assignee
├── extracted/             # L1 注释提取结果
│   └── extracted-<timestamp>.md
├── patterns/              # L3 归纳模式 (人工整理)
│   ├── component-patterns.md
│   ├── build-pipeline-patterns.md
│   └── debugging-patterns.md
└── index.json             # 全局索引
```

---

### 4. 自动化集成点

| 集成点                  | 触发时机     | 动作                           |
| ----------------------- | ------------ | ------------------------------ |
| `task-complete.ts`      | 任务完成     | 生成 L2 会话模板，提醒填写     |
| `extract-learning.ts` ⏸ | 手动/CI 定时 | 扫描源码 `@learning` 注释 → L2 |
| `knowledge-guard.yml`   | 月度         | 提取高频标签 → 建议 L3 归纳    |
| PR 模板                 | PR 提交      | 必填 "Learning Notes" 字段     |

---

### 5. PR 模板新增字段

```markdown
## Learning Notes (必填)

- [ ] 无新学习点
- [ ] 有新坑点/模式/决策 → 已记录在:
  - 源码注释 (`@learning:*`)
  - `.agents/learning/sessions/<task-id>.md`

- 其他: **\_\_**

### 关键学习点摘要 (1-3 条)

1. **Pitfall**: <简述> → <解决>
2. **Pattern**: <可复用模式> → <适用场景>
3. **Decision**: <决策> → <理由>
```

---

### 6. 月度知识归纳流程

```bash
# 1. 收集本月所有 L1/L2
pnpm exec tsx .agents/scripts/aggregate-learning.ts --month 2026-10
# 2. 人工审核：识别高频模式、反模式、架构影响
# 3. 产出 L3:
# - 更新 docs/LESSONS_LEARNED.md
# - 创建/更新 ADR (架构级)
# - 更新 CONTEXT.md (新术语)
# - 更新技能文档 (最佳实践)
```

---

### 7. 工具实现

| 脚本                    | 功能                                        | 状态   |
| ----------------------- | ------------------------------------------- | ------ |
| `extract-learning.ts`   | 扫描源码 `@learning:*` 注释，按标签分类输出 | 待实现 |
| `aggregate-learning.ts` | 按月聚合 L2 会话，生成高频标签/模式报告     | 待实现 |
| `learning-index.ts`     | 维护 `.agents/learning/index.json` 全局索引 | 待实现 |
| `task-complete.ts` 集成 | 任务完成时生成会话模板                      | 待增强 |

---

## Consequences

### Positive

- **零遗漏**：开发时即时标记，不依赖事后回忆
- **可追溯**：每个坑点/决策关联任务、代码位置、时间、人员
- **可复用**：L3 归纳模式指导后续开发，避免重复踩坑
- **可量化**：高频标签 → 培训重点 / 文档缺口 / 架构改进机会

### Trade-offs

- **前置成本**：开发者需养成 `@learning` 注释习惯 (~1% 编码时间)
- **噪音控制**：需定期清理过期/重复标记，防止注释污染
- **人工门槛**：L3 归纳需要人工判断，不可全自动

---

## Alternatives Considered

1. **纯依赖 ADR** —— 粒度太粗，不捕获战术级坑点/模式，拒绝
2. **外部知识库 (Notion/Confluence)** —— 增加同步成本，脱离代码上下文，拒绝
3. **AI 自动总结提交记录** —— 语义理解不准，缺乏上下文，作为辅助可选
4. **强制每日学习日志** —— 仪式感过重，开发者抵触，拒绝

---

## Implementation Checklist

- [ ] 创建 `.agents/learning/` 目录结构
- [ ] 实现 `extract-learning.ts` (正则提取 `@learning:*`)
- [ ] 实现 `aggregate-learning.ts` (月度聚合)
- [ ] 实现 `learning-index.ts` (索引维护)
- [ ] 增强 `task-complete.ts` 生成会话模板
- [ ] 更新 `.github/pull_request_template.md` 增加 Learning Notes
- [ ] 创建 `docs/LESSONS_LEARNED.md` 模板
- [ ] 创建 `.agents/skills/agent-learning/SKILL.md` 技能文档
- [ ] 月度知识归纳流程文档化

---

## Related Documents

- `docs/adr/0008-agents-knowledge-base-architecture.md` (知识库架构)
- `docs/adr/0009-knowledge-update-process.md` (知识更新流程)
- `docs/adr/0004-subagent-coordination.md` (任务完成流程)
- `.agents/scripts/task-complete.ts` (任务完成脚本)
- `.github/pull_request_template.md` (PR 模板)
