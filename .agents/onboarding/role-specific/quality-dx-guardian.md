# 角色指南：质量与 DX 守护者

**角色 ID**：`quality-dx-guardian`  
**类型**：Enabling  
**核心职责**：oxlint/oxfmt/TypeScript/Playwright/ADR 治理、代码规范制定、技术债管理、CI 守护

---

## 1. 核心领域

| 领域 | 关键文件 | 关注点 |
|------|----------|--------|
| **代码质量** | `.oxlintrc.json`、`oxlint.config.ts` | 规则集、类型感知、Overrides |
| **格式化** | `oxfmt.config.ts` | Tailwind 排序、嵌入语言、Ignore |
| **TypeScript** | `tsconfig.json` | Strict 模式、路径别名、模块解析 |
| **测试** | `playwright.config.ts` | E2E、组件测试、视觉回归 |
| **CI 守护** | `.github/workflows/knowledge-guard.yml` | Pointers/Terms/Contracts/Regression |
| **架构治理** | `docs/adr/` | ADR 生命周期、决策记录 |
| **技术债** | `.agents/tech-debt/` | 登记、偿还计划、优先级 |

---

## 2. 必读文档

| 文档 | 重点章节 |
|------|----------|
| `AGENTS.md` | Code Style Guidelines、CI Pipeline、Security Considerations |
| `docs/adr/0003-subagent-responsibilities-controls.md` | 角色定义、质量门禁、熔断机制 |
| `docs/adr/0004-agents-knowledge-base-architecture.md` | 知识库架构、指针规范 |
| `docs/adr/0005-knowledge-update-process.md` | L0-L3 触发层、CI 守护、PR 模板 |
| `docs/SECURITY_WHITEPAPER.md` | 安全基线、命令参数引号规范、审计清单 |
| `docs/SUBAGENT_OPERATIONS.md` | 质量门禁速查、故障排查 |

---

## 3. 专属质量门禁

```bash
# 本地预跑（全套）
pnpm exec tsx .agents/scripts/run-gate.ts quality-dx-guardian

# 等价于
pnpm tsc -b && pnpm oxlint && pnpm oxfmt --check && pnpm build
pnpm playwright test
```

**通过标准**：全套 Playwright 通过、0 lint errors、0 fmt diffs、0 type errors。

---

## 4. 核心交付物

| 交付物 | 位置 | 验收标准 |
|--------|------|----------|
| **Lint 配置** | `.oxlintrc.json` / `oxlint.config.ts` | 类型感知开启、Overrides 完善、0 errors |
| **格式化配置** | `oxfmt.config.ts` | Tailwind 排序、JSDoc、Ignore Patterns |
| **TS 配置** | `tsconfig.json` | Strict、路径别名 `@/*`、模块解析 |
| **Playwright 配置** | `playwright.config.ts` | Chromium/Firefox/WebKit、视觉回归、并行 |
| **CI 守护** | `.github/workflows/knowledge-guard.yml` | 4 Job 并行、PR 注释、Artifact 上传 |
| **ADR 模板** | `docs/adr/NNNN-template.md` | Context/Decision/Consequences/Alternatives |
| **技术债登记** | `.agents/tech-debt/` | ID、影响、优先级、偿还计划、Owner |

---

## 4. 核心开发模式

### 4.1 Oxlint 配置

```typescript
// oxlint.config.ts
import { defineConfig } from "oxlint";

export default defineConfig({
  options: { typeAware: true },
  plugins: ["typescript", "unicorn", "import"],
  rules: {
    "no-unused-vars": "error",
    "typescript/no-explicit-any": "error",
    "unicorn/prevent-abbreviations": "off",
  },
  overrides: [
    { files: ["*.astro"], rules: { "no-unused-vars": "off" } },
    { files: ["src/pages/**/*.ts"], rules: { "typescript/no-explicit-any": "off" } },
    { files: ["src/integrations/**/*.ts"], rules: { "unicorn/no-process-exit": "off" } },
    { files: [".husky/*.ts"], rules: { "no-console": "off" } },
  ],
});
```

### 3.2 Oxfmt 配置

```typescript
// oxfmt.config.ts
import { defineConfig } from "oxfmt";

export default defineConfig({
  embeddedLanguageFormatting: "auto",
  printWidth: 100,
  tabWidth: 2,
  singleQuote: true,
  trailingComma: "es5",
  overrides: [
    { files: ["*.astro"], options: { parser: "astro" } },
    { files: ["*.md", "*.mdx"], options: { printWidth: 120 } },
    { files: ["*.css"], options: { css: true } },
  ],
});
```

### 3.3 Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }], ["github"]],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "pnpm preview",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### 3.4 知识库守护 CI

```yaml
# .github/workflows/knowledge-guard.yml
name: Knowledge Base Guard
on:
  pull_request:
    types: [opened, synchronize, reopened]
  schedule:
    - cron: '0 2 1 * *'
  workflow_dispatch:
    inputs:
      full:
        type: boolean
        default: false

jobs:
  pointer-scan:
    # ... scan-pointers.ts --report
  term-check:
    # ... check-terms.ts --report
  contract-sync:
    # ... sync-contracts.ts --report
  regression-check:
    if: github.event_name == 'schedule' || github.event.inputs.full == 'true'
    # ... check-regression.ts HEAD~1
  summary:
    needs: [pointer-scan, term-check, contract-sync, regression-check]
    if: always()
    # 汇总报告 + 失败则 fail
```

### 3.5 ADR 模板

```markdown
# Architecture Decision Record: <标题>

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
<背景、问题、约束>

## Decision
<决策内容、关键理由>

## Consequences
### Positive
- ...
### Negative / Trade-offs
- ...

## Alternatives Considered
1. <方案1> - 拒绝理由
2. <方案2> - 拒绝理由

## Related ADRs
- 000X-<related>.md
```

---

## 5. 专属质量门禁细则

| 检查项 | 工具 | 标准 |
|--------|------|------|
| **全套测试** | `pnpm playwright test` | 全通过、无 flaky |
| **类型检查** | `pnpm tsc -b` | 0 errors |
| **Lint** | `pnpm oxlint` | 0 errors |
| **格式** | `pnpm oxfmt --check` | 0 diffs |
| **构建** | `pnpm build` | success |
| **指针扫描** | `scan-pointers.ts` | 0 broken |
| **术语检查** | `check-terms.ts` | 0 undefined/redefined |
| **契约同步** | `sync-contracts.ts` | 100% 匹配 |

---

## 6. 常见任务类型

| 任务类型 | 典型触发 | 关键产出 |
|----------|----------|----------|
| **规范制定/更新** | 新技术栈/最佳实践 | oxlint/oxfmt/TS/Playwright 配置更新 |
| **ADR 创建/更新** | 架构决策/重构 | ADR 文档 + 状态流转 |
| **CI 守护增强** | 新检查项/误报 | knowledge-guard.yml + 脚本增强 |
| **技术债登记/偿还** | 重构/审计 | tech-debt 登记 + 偿还 PR |
| **规范培训/文档** | 新人入职/变更 | Onboarding 文档、最佳实践、FAQ 更新 |

---

## 7. 常见坑与规避

| 坑 | 症状 | 规避 |
|----|------|------|
| **Oxlint 类型感知未开启** | 漏报 `no-explicit-any` 等 | `options: { typeAware: true }` + `oxlint-tsgolint` |
| **Oxfmt Tailwind 类未排序** | 类名顺序不一致 | `embeddedLanguageFormatting: "auto"` 默认已启用 |
| **Playwright flaky 测试** | CI 偶发失败 | `retries: 2`、显式等待、避免硬编码等待 |
| **ADR 过期未更新** | 决策过期仍标记 Accepted | 季度审查、Deprecated/Superseded 流转 |
| **技术债堆积** | 无人认领、无偿还计划 | 登记强制 Owner + 截止日期 + 偿还 PR 关联 |
| **指针失效未发现** | 文档链接 404 | 月度 `scan-pointers` + CI 注释 PR |
| **术语定义漂移** | 同一概念多定义 | 仅 CONTEXT.md 定义、别处仅引用 |

---

## 8. 关键文件清单

```
.oxlintrc.json / oxlint.config.ts
oxfmt.config.ts
tsconfig.json
playwright.config.ts
.github/workflows/knowledge-guard.yml
docs/adr/
├── 0001-functional-architecture.md
├── 0002-draft-isolation-submodule.md
├── 0003-subagent-responsibilities-controls.md
├── 0004-agents-knowledge-base-architecture.md
├── 0005-knowledge-update-process.md
└── NNNN-template.md
.agents/
├── scripts/
│   ├── scan-pointers.ts
│   ├── check-terms.ts
│   ├── sync-contracts.ts
│   ├── run-gate.ts
│   └── check-regression.ts
├── tasks/
│   ├── phase-1..8/
│   ├── TASK_TEMPLATE.md
│   ├── PHASE_COMPLETION_TEMPLATE.md
│   └── MONTHLY_HEALTH_TEMPLATE.md
├── lifecycle/
│   └── performance-<role>-<YYYY-MM>.md
├── team/
│   ├── skills-matrix.yaml
│   └── capacity-plan-<quarter>.md
├── contracts/
│   ├── content-pipeline.ts
│   ├── build-pipeline.ts
│   └── ...
└── tech-debt/
    └── <adr-id>-<description>.md
```

---

## 9. 协作接口

| 依赖角色 | 协作内容 | 接口 |
|----------|----------|------|
| 全角色 | 代码规范、门禁、ADR 评审 | PR Review、ADR 评论、CI 状态 |
| `frontend-architect` | a11y、性能、组件规范 | Playwright 配置、组件测试 |
| `content-engineer` | 类型规范、Schema 规范 | oxlint overrides、Zod Schema 规范 |
| `build-deploy-engineer` | CI 守护、部署规范 | knowledge-guard.yml、deploy.yml |
| `cli-tool-engineer` | Rust 代码规范 | cargo clippy/audit 配置 |
| `search-discovery-engineer` | 搜索测试、性能基线 | Playwright 搜索测试 |

---

## 10. 学习资源

| 资源 | 链接 |
|------|------|
| Oxlint 文档 | https://oxc.rs/docs/guide/usage/linter/ |
| Oxfmt 文档 | https://oxc.rs/docs/guide/usage/formatter/ |
| Playwright | https://playwright.dev/docs/intro |
| ADR 指南 | https://adr.github.io/ |
| 技术债管理 | https://martinfowler.com/bliki/TechnicalDebt.html |

---

**核心口诀**：配置即代码 → 类型感知零容忍 → 门禁自动化入 CI → ADR 记录决策 → 技术债显性化登记 → 月度巡检季度评审 → 全员共治质量文化