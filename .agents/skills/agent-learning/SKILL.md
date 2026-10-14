# Skill: agent-learning

Agent 自主学习与知识捕获技能。使 Agent 能够在开发过程中捕获、整理、复用经验知识。

## 适用场景

- 代码编写/调试时遇到坑点、决策、可复用模式
- 任务完成需要结构化复盘
- 月度知识归纳、最佳实践沉淀
- 跨会话经验复用

## 核心概念

### 三层捕获

| 层级     | 触发        | 产出                   | 存储                         |
| -------- | ----------- | ---------------------- | ---------------------------- |
| L1: 即时 | 编码/调试时 | `@learning:*` 源码注释 | 源文件                       |
| L2: 会话 | 任务完成时  | 结构化复盘文档         | `.agents/learning/sessions/` |
| L3: 沉淀 | 月度/里程碑 | 归纳模式/最佳实践/ADR  | `docs/LESSONS_LEARNED.md`    |

### 注释标记语法

```typescript
// @learning:pitfall - 坑点记录
// @learning:decision - 架构/技术决策理由
// @learning:pattern - 可复用代码/架构模式
// @learning:gotcha - 易错点/反直觉行为/版本陷阱
// @learning:todo - 待改进/技术债
// @learning:ref - 关联文档/ADR/外部链接

// 属性 (可选，JSON 格式)
// @learning:pitfall { "impact": "high", "tags": ["daisyui", "theme"] }
// 耗时 45min 解决 daisyUI 5 navbar 类名变更
```

## 操作指南

### 1. 即时标记 (L1)

**编码时随手标记**：

```typescript
// 发现问题时立即注释
// @learning:pitfall { "impact": "high" } Astro 5 glob loader `retainBody: true` 大量 MDX 会 OOM
const loader = glob({ pattern: "**/*.mdx", base: "./src/posts", retainBody: false });

// 做决策时记录理由
// @learning:decision { "adr": "0005" } ThemeTokens 仅用 CSS 变量，daisyUI @plugin 直接引用
@plugin "daisyui/theme" { --color-primary: var(--color-brand-500); }

// 总结可复用模式
// @learning:pattern { "tags": ["component", "composite"] } Navbar.Start/Center/End + slots 避免布尔爆炸
```

### 2. 任务复盘 (L2)

**任务完成时执行**：

```bash
# 自动生成模板 (集成在 task-complete.ts)
pnpm exec tsx .agents/scripts/task-complete.ts 3.4
# → 生成 .agents/learning/sessions/2026-10/session-3.4.md 模板
```

**填写模板**：

```markdown
# Session Learning: Task 3.4

## 遇到的问题

| 问题 | 现象 | 根因 | 解决 | 耗时 |
| ---- | ---- | ---- | ---- | ---- |

## 决策记录

| 决策 | 理由 | 替代方案 | ADR |
| ---- | ---- | -------- | --- |

## 可复用模式

- Pattern: ...

## 标签

#frontend #daisyui #theme
```

### 3. 月度归纳 (L3)

**执行聚合脚本**：

```bash
pnpm exec tsx .agents/scripts/aggregate-learning.ts --month 2026-10
```

**人工产出**：

- 更新 `docs/LESSONS_LEARNED.md`
- 高频标签 → 创建/更新 ADR
- 新术语 → 更新 `CONTEXT.md`
- 反模式 → 更新技能文档

## 脚本工具

| 脚本                    | 用途                        | 命令                                                                                       |
| ----------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| `extract-learning.ts`   | 提取所有 `@learning:*` 注释 | `pnpm exec tsx .agents/scripts/extract-learning.ts --output .agents/learning/extracted.md` |
| `aggregate-learning.ts` | 按月聚合 L2 会话            | `pnpm exec tsx .agents/scripts/aggregate-learning.ts --month 2026-10`                      |
| `learning-index.ts`     | 维护全局索引                | `pnpm exec tsx .agents/scripts/learning-index.ts --rebuild`                                |

## PR 集成

**PR 模板必填字段**：

```markdown
## Learning Notes

- [ ] 无新学习点
- [ ] 有新坑点/模式/决策 → 记录位置: **\_\_**

### 关键学习点 (1-3 条)

1. **Pitfall**: ... → 解决: ...
2. **Pattern**: ... → 适用: ...
3. **Decision**: ... → 理由: ...
```

## 最佳实践

| 做法                             | 理由                                  |
| -------------------------------- | ------------------------------------- |
| 遇到问题立即 `@learning:pitfall` | 避免事后遗忘细节                      |
| 决策时写 `@learning:decision`    | 保留决策上下文，便于复盘              |
| 标签用英文、小写、连字符         | 便于聚合统计 (`#frontend` `#daisyui`) |
| 耗时 > 30min 的问题必记          | 高价值学习点                          |
| 可复用模式标 `@learning:pattern` | 显性化最佳实践                        |

## 反模式

| ❌ 避免            | ✅ 推荐                         |
| ------------------ | ------------------------------- |
| 事后补写模糊注释   | 实时标记具体现象/根因/解决      |
| 只记结果不记过程   | 记录：现象 → 根因 → 尝试 → 解决 |
| 标签随意/中文/重复 | 统一英文标签体系                |
| L1/L2 堆积不做 L3  | 月度必须归纳沉淀                |

## 相关文档

- `docs/adr/0011-agent-learning-mechanism.md`

- 架构决策
- `docs/LESSONS_LEARNED.md`

- 沉淀知识库 (待创建)
- `.agents/learning/`

- 学习数据目录
- `.agents/scripts/extract-learning.ts`

- 提取脚本 (待实现)
- `.agents/scripts/aggregate-learning.ts`

- 聚合脚本 (待实现)
