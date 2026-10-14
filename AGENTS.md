# AGENTS.md

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。
>
> **已澄清（2026-10-09）**：上述设施**不从 git 恢复**——项目将**从零重写**，git 历史中的旧实现仅作行为参考。当前状态见 `PROJECT_STATUS.md`，执行计划见 `REWRITE_PLAN.md`。

## Project Overview

This repository contains **two integrated projects** sharing a single repo but deploying independently:

1. **Astro 7 Personal Blog** — SSG with MDX, Tailwind CSS 4 + daisyUI 5, Pagefind search. Deploys to Codeberg Pages, GitHub Pages, IPFS (Pinata).
2. **tgcloud Telegram Bot** — Mini App on Telegram's V8 isolates serverless platform. Uses tgcloud SDK for DB, Bot API, HTTP.

---

## Quick Commands

```bash
# Development
# 依赖 src/ 的命令已可用：dev / check / build / preview / post:edit
pnpm install          # Node 24 + pnpm 11
pnpm dev              # http://localhost:4321
pnpm check            # astro check: TypeScript + Astro types
pnpm build            # astro build（Pagefind/水印/Mermaid 由 buildPipelineIntegration 提供）
pnpm preview          # astro build + tgcloud 本地预览

# Code Quality
pnpm exec oxlint .             # Lint（package.json 无 oxlint 脚本）
pnpm exec oxfmt --check        # Check formatting
pnpm exec oxfmt --write        # Fix formatting

# Content
pnpm post:edit        # Rust CLI: manage posts (new/edit/list/delete/publish)

# Testing
pnpm exec playwright test  # E2E tests（Chromium；首次需 pnpm exec playwright install chromium）

# tgcloud Bot
pnpm status           # Local vs cloud status
pnpm deploy           # Push to tgcloud
pnpm exec tgcloud migrate   # Apply DB schema
pnpm exec tgcloud run <module>   # Run handler/endpoint locally
pnpm exec tgcloud webhook   # Check/sync webhook
```

---

## Architecture (Pointers)

| Area                               | Document                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------ |
| **System Context (C1)**            | `docs/adr/0001-functional-architecture.md#c1-system-context-系统上下文`  |
| **Container Boundaries (C2)**      | `docs/adr/0001-functional-architecture.md#c2-container-容器运行时边界`   |
| **Deep Module Boundaries (C3)**    | `docs/adr/0001-functional-architecture.md#c3-component-模块深度模块边界` |
| **Code Contracts (C4)**            | `docs/adr/0001-functional-architecture.md#c4-code-关键实现细节`          |
| **Draft Isolation Strategy**       | `docs/adr/0002-draft-isolation-submodule.md`                             |
| **Deployment Strategy**            | `docs/adr/0003-deployment-strategy.md`                                   |
| **Sub-agent Coordination**         | `docs/adr/0004-subagent-coordination.md`                                 |
| **Theme Token Strategy**           | `docs/adr/0005-theme-token-strategy.md`                                  |
| **Visual Design Spec**             | `docs/VISUAL_DESIGN_SPEC.md`                                             |
| **Pagefind UI Approach**           | `docs/adr/0006-pagefind-ui-approach.md`                                  |
| **Client Module Registry**         | `docs/adr/0007-client-module-registry.md`                                |
| **Knowledge Base Architecture**    | `docs/adr/0008-agents-knowledge-base-architecture.md`                    |
| **Knowledge Update Process**       | `docs/adr/0009-knowledge-update-process.md`                              |
| **Module Dependency Graph**        | `docs/architecture-map.md#模块依赖图-module-dependency-graph`            |
| **Interface Contract Matrix**      | `docs/architecture-map.md#接口契约矩阵-interface-contract-matrix`        |
| **Data Flows (Build/Runtime)**     | `docs/architecture-map.md#数据流向-data-flow`                            |
| **Seam Decisions**                 | `docs/architecture-map.md#模块边界决策记录-seam-decisions`               |
| **Dependency Evaluation**          | `docs/adr/0010-dependency-evaluation.md`                                 |
| **Agent Learning Mechanism**       | `docs/adr/0011-agent-learning-mechanism.md`                              |
| **Refactor Plan**                  | `REFACTOR_PLAN.md`                                                       |
| **Telegram Auth Comparison**       | `docs/TELEGRAM_AUTH_COMPARISON.md`                                       |
| **Project Status (authoritative)** | `PROJECT_STATUS.md`                                                      |
| **Rewrite Plan**                   | `REWRITE_PLAN.md`                                                        |
| **ADR Index**                      | `docs/adr/README.md`                                                     |
| **tgcloud Migration (ADR 0012)**   | `docs/adr/0012-tgcloud-migration.md`                                     |

---

## Terminology (Single Source)

**All terms defined in `CONTEXT.md`** (49 terms) — do not redefine elsewhere. Consult it before coining a new term; add new terms there first, then use them here.

---

## Sub-Agent Orchestration

### 6 Roles

| Role ID                     | Type        | Focus                                 | Quality Gate            |
| --------------------------- | ----------- | ------------------------------------- | ----------------------- |
| `frontend-architect`        | Stream      | Components, Theme, View Transitions   | Playwright Chromium     |
| `content-engineer`          | Stream      | Content Collections, MDX, Zod, RSS    | Content pipeline + RSS  |
| `build-deploy-engineer`     | Platform    | BuildPipeline, Pagefind, CI/CD        | lychee + vnu            |
| `cli-tool-engineer`         | Platform    | post-edit (Rust), CLI, publishing     | cargo test/clippy/audit |
| `search-discovery-engineer` | Complicated | Pagefind index, Search UI, algorithms | Pagefind index exists   |
| `quality-dx-guardian`       | Enabling    | oxlint/oxfmt/TS/Playwright/ADR        | Full Playwright suite   |

### Daily Commands

```bash
# View tasks
ls .agents/tasks/phase-1/
# Claim task
pnpm exec tsx .agents/scripts/task-claim.ts 1.1 --assignee content-engineer
# Heartbeat (every 30 min)
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 50 --msg "Exported types"
# Report blocker (>15 min stuck)
pnpm exec tsx .agents/scripts/task-progress.ts 1.1 --blocked "Need schema" --help-from quality-dx-guardian
# Complete (runs quality gates)
pnpm exec tsx .agents/scripts/task-complete.ts 1.1
```

**Rules**: Read task card first → Heartbeat every 30min → Block >15min = report → Declare outputs before complete → Gates auto-run on complete.

Full guide: `docs/SUBAGENT_OPERATIONS.md`

---

## Development Workflow

### Branch & Commit

- Feature branches off `main`
- Conventional commits: `feat:`, `fix:`, `chore:`

### Required Checks

```bash
pnpm check && pnpm build && pnpm exec oxlint . && pnpm exec oxfmt --check
```

### PR Template

`.github/pull_request_template.md` — includes KB impact checklist.

---

## Content Management

### Creating Posts

`src/posts/*.md` or `*.mdx` with frontmatter:

```yaml
title: "Post Title"
publishDate: 2026-08-26
description: "Optional"
tags: ["tag1", "tag2"]
authors: ["author"]
image: "/path/to/image.png"
updatedDate: 2026-08-27
```

### Drafts

Place in `src/posts/drafts/` — excluded from production builds automatically (path-based filtering).

> **Planned**: Physical isolation via private Git submodule → `docs/adr/0002-draft-isolation-submodule.md`

### Schema

Defined in `src/content.config.ts` (Zod via `astro/zod`). Types exported from `src/modules/types.ts`.

---

## Security Baseline

- **Secrets**: Never commit; use GitHub Actions secrets（`.github/workflows/`）
- **CSP**: Strict via `BaseLayout.astro` meta tags ⏸
- **Dependencies**: `pnpm audit` — 本地手动执行（`pnpm audit`），CI ⏸
- **Links**: `lychee` — 本地手动执行，CI ⏸
- **Bot Token**: Only in tgcloud secret
- **Watermark**: Zero-width chars on original articles

Full: `docs/SECURITY_WHITEPAPER.md`

---

## Key Files Reference

| File                                    | Purpose                                |
| --------------------------------------- | -------------------------------------- |
| `astro.config.ts`                       | Astro config, integrations, adapter    |
| `package.json`                          | Scripts, deps, lint-staged             |
| `.oxlintrc.json`                        | Lint rules                             |
| `oxfmt.config.ts`                       | Format config                          |
| `Cargo.toml`                            | Rust CLI config                        |
| `.github/pull_request_template.md`      | PR template with KB impact checklist   |
| `src/content.config.ts`                 | Content collections schema             |
| `.github/workflows/deploy.yml`          | 4-platform CI/CD                       |
| `.github/workflows/knowledge-guard.yml` | KB guards (pointers, terms, contracts) |
| `src/modules/*.ts`                      | Deep module interfaces                 |
| `schema.js`                             | tgcloud DB schema                      |
| `handlers/message.js`                   | Telegram handler                       |

---

## Knowledge Base Maintenance

| Trigger                 | Action                                              | Script                               |
| ----------------------- | --------------------------------------------------- | ------------------------------------ |
| **L0: Code change**     | Auto-reflect (scripts, types, interfaces)           | —                                    |
| **L1: Phase done**      | Archive tasks, sync CONTEXT.md, update ADRs         | `scan-pointers.ts`, `check-terms.ts` |
| **L2: Breaking change** | Update contracts, task cards, create ADR            | `sync-contracts.ts`                  |
| **L3: Monthly**         | Pointer scan, term check, regression, health report | CI: `knowledge-guard.yml`            |

PRs must declare KB impact in template. CI 运行 pointer/term/contract 检查（advisory，见 `knowledge-guard.yml`）；本地手动执行：`pnpm exec tsx .agents/scripts/{scan-pointers,check-terms,sync-contracts}.ts`。

---

## Current State

`src/`（Astro 博客源码）、`.agents/scripts/`、`.agents/tasks/`、`.github/workflows/`、`src/post-edit/`（Rust CLI）均已在工作区就位，并通过 `pnpm check`、`pnpm build`、`oxlint`、`oxfmt --check` 与 Playwright E2E。`REFACTOR_PLAN.md` 的 8 个 Phase 已执行完毕（记录见 `IMPLEMENTATION_PROGRESS.md`）；项目按 `REWRITE_PLAN.md` **从零重写**（不从 git 恢复）。根级 `handlers/message.js`、`schema.js`、`tgcloud.jsonc` 为 tgcloud Bot 源码；`tgcloud/` 目录从未存在。文中 `⏸` 标注对应**尚未落地**的部分（如 CSP meta、CI 中的 `pnpm audit`、草稿物理隔离子模块），当前权威状态见 `PROJECT_STATUS.md`。

---

## Skill Usage Guide

> **Rule**: When the task matches a skill's description, **invoke the skill first** before writing code or making decisions. Skills provide up-to-date patterns, API references, and project-specific conventions.

### Core Project Skills (Always Relevant)

| Skill                        | When to Use                                       | Trigger Keywords                                          |
| ---------------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| `daisyui`                    | **Always** when writing HTML/JSX/Astro components | Any UI component, styling, class names                    |
| `daisyui-colors`             | When defining/using color tokens, theme variables | `--color-*`, `theme-tokens.css`, dark mode                |
| `daisyui-config`             | When configuring daisyUI plugins, themes          | `@plugin "daisyui"`, `@plugin "daisyui/theme"`            |
| `daisyui-usage`              | When applying daisyUI component patterns          | `btn`, `card`, `navbar`, `modal`, `dropdown`              |
| `context7-mcp` / `find-docs` | **Always** when using any library/framework API   | Astro, Tailwind, Pagefind, Satteri, Zod, Playwright, etc. |

### Task-Type Skills (Match by Task)

| Skill                         | When to Use                                                            | Trigger Keywords                                                     |
| ----------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `frontend-design`             | Designing new UI, reshaping existing, aesthetic direction              | "design", "UI", "visual", "typography", "distinctive"                |
| `codebase-design`             | Designing module interfaces, finding deepening opportunities           | "module boundary", "interface", "seam", "deep module"                |
| `vercel-composition-patterns` | Refactoring components with boolean props, building flexible APIs      | "compound components", "render props", "boolean props"               |
| `web-design-guidelines`       | Reviewing UI for accessibility, UX, best practices                     | "review UI", "accessibility", "audit design", "UX review"            |
| `web-perf`                    | Audit, diagnose, optimize website loading, Core Web Vitals, Lighthouse | "performance", "web vitals", "lighthouse", "load time", "CLS", "LCP" |
| `create-implementation-plan`  | New features, refactoring, upgrades - before writing code              | "plan", "implement", "refactor", "upgrade", "新依赖引入"             |
| `refactor-plan`               | Multi-file refactors needing sequencing, scoping, safety               | "refactor across files", "plan refactor"                             |
| `refactor`                    | Surgical improvements: extract, rename, break down, type safety        | "extract function", "rename", "type safety", "code smell"            |
| `tdd`                         | Building features/fixes test-first, red-green-refactor                 | "test-first", "TDD", "red-green-refactor"                            |
| `diagnosing-bugs`             | Hard bugs, performance regressions, "debug this"                       | "diagnose", "debug", "broken", "slow", "failing"                     |
| `prototype`                   | Throwaway prototypes to answer design questions                        | "prototype", "sanity-check", "explore UI"                            |
| `canvas-design`               | Creating posters, art, diagrams, static visual designs                 | "poster", "diagram", "visual art", "design artifact"                 |
| `role-architect`              | System architecture, module boundaries, tech selection, scalability    | "architecture", "system design", "module boundary", "tech selection" |

### Documentation & Knowledge Skills

| Skill                | When to Use                                                                                               | Trigger Keywords                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `create-agentsmd`    | Generating/updating AGENTS.md for a repository                                                            | "AGENTS.md", "agent instructions"                                                |
| `create-readme`      | Creating README.md for project                                                                            | "README", "project documentation"                                                |
| `writing-for-agents` | Creating/editing skills, AGENTS.md, CLAUDE.md                                                             | "write skill", "edit AGENTS.md", "agent docs"                                    |
| `domain-modeling`    | Building project glossary, CONTEXT.md, ADRs                                                               | "glossary", "CONTEXT.md", "ADR", "terminology"                                   |
| `research`           | Investigating against primary sources, capturing findings                                                 | "research", "investigate", "gather docs", "compare", "选型", "新依赖"            |
| `agent-learning`     | Capturing pitfalls, patterns, decisions during development; session retros; monthly knowledge aggregation | "learning", "pitfall", "pattern", "decision", "retro", "lessons learned", "复盘" |

### Sub-Agent Orchestration Skills (For Multi-Agent Work)

| Skill                       | When to Use                                               | Trigger Keywords                                  |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| `subagent-planning`         | Dependency topology, parallelism, milestone breakdown     | "plan phase", "parallel tasks", "dependencies"    |
| `subagent-lifecycle`        | Activation, dormancy, degradation, retirement             | "onboard agent", "retire agent", "monthly review" |
| `subagent-onboarding`       | Environment setup, knowledge transfer, probation          | "new agent", "onboard", "trial period"            |
| `subagent-recruitment`      | Role design, candidate evaluation, hiring                 | "hire agent", "role design", "recruit"            |
| `subagent-team-composition` | Capacity planning, skill matrix, load balancing           | "team composition", "capacity", "skill matrix"    |
| `subagent-performance`      | KPIs, monitoring, feedback, promotion                     | "performance review", "KPI", "metrics"            |
| `subagent-communication`    | Task claiming, progress, blockers, context passing        | "task-claim", "task-progress", "blocked"          |
| `subagent-handoff`          | Deliverables, acceptance, rollback points, dependencies   | "handoff", "transition", "deliverables"           |
| `subagent-quality-gate`     | Pre-checklists, automated acceptance, regression blocking | "quality gate", "pre-check", "acceptance"         |
| `subagent-shared-context`   | Project specs, ADRs, interface contracts                  | "shared context", "contracts", "ADR"              |

### Infrastructure & Process Skills

| Skill                        | When to Use                                                                         | Trigger Keywords                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `setup-pre-commit`           | Adding Husky, lint-staged, typecheck, tests to repo                                 | "pre-commit", "husky", "lint-staged"                                     |
| `git-commit`                 | Conventional commits, intelligent staging, message gen                              | "commit", "conventional commit", "stage"                                 |
| `git-guardrails-claude-code` | Blocking dangerous git commands (push, reset --hard)                                | "git hooks", "block push", "safety"                                      |
| `github-issues`              | Creating/managing issues, labels, milestones, dependencies                          | "create issue", "bug report", "feature request"                          |
| `code-review`                | Review changes since fixed point (commit/branch) for standards + spec compliance    | "review code", "review PR", "code review", "standards", "spec"           |
| `security-audit`             | Security guidance, vulnerability review, penetration testing for codebases/APIs/CLI | "security audit", "vulnerability", "penetration test", "security review" |
| `opencode`                   | OpenCode config, migration V1→V2, plugins, MCP servers, providers, models, themes   | "opencode config", "opencode migrate", "opencode plugin", "mcp server"   |
| `migrate-to-shoehorn`        | Replacing `as` assertions with @total-typescript/shoehorn                           | "shoehorn", "test assertions", "partial test data"                       |
| `wizard`                     | Interactive bash wizards for human-only steps                                       | "wizard", "provision", "credentials", "manual steps"                     |
| `report`                     | Reporting OpenCode issues with diagnostics                                          | "report bug", "opencode issue"                                           |

### Role-Specific Skill Mapping

| Role                        | Primary Skills                                                                                                         | Secondary Skills                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-architect`        | `daisyui*`, `frontend-design`, `vercel-composition-patterns`, `web-design-guidelines`, `web-perf`                      | `codebase-design`, `prototype`, `create-implementation-plan`, `agent-learning`                                                                    |
| `content-engineer`          | `context7-mcp` (Astro, Satteri, Zod), `domain-modeling`, `tdd`                                                         | `refactor`, `create-implementation-plan`, `agent-learning`                                                                                        |
| `build-deploy-engineer`     | `context7-mcp` (Astro, CI/CD, Pagefind), `create-implementation-plan`, `refactor-plan`                                 | `diagnosing-bugs`, `setup-pre-commit`, `research` (依赖体积/构建影响), `agent-learning`, `security-audit`                                         |
| `cli-tool-engineer`         | `context7-mcp` (Rust, Clap, Cargo), `tdd`, `refactor`                                                                  | `create-implementation-plan`, `migrate-to-shoehorn`, `research` (Rust 依赖评估), `agent-learning`, `opencode`                                     |
| `search-discovery-engineer` | `context7-mcp` (Pagefind), `frontend-design`, `prototype`                                                              | `codebase-design`, `tdd`, `create-implementation-plan`, `agent-learning`, `web-perf`                                                              |
| `quality-dx-guardian`       | `context7-mcp` (Oxlint, Oxfmt, Playwright, TypeScript), `setup-pre-commit`, `codebase-design`, `web-design-guidelines` | `refactor-plan`, `domain-modeling`, `writing-for-agents`, `research` (依赖守护 CI), `agent-learning`, `code-review`, `security-audit`, `opencode` |

### Decision Flowchart

```text
Task received
    │
    ├─► Writing UI/Components?          → daisyui, daisyui-usage, daisyui-colors
    ├─► Using library/framework API?    → context7-mcp / find-docs (REQUIRED)
    ├─► Designing architecture/module?  → codebase-design, vercel-composition-patterns, role-architect
    ├─► Creating visual design/art?     → canvas-design
    ├─► Refactoring multi-file?         → refactor-plan → refactor
    ├─► Building feature test-first?    → tdd
    ├─► Debugging hard bug/perf issue?  → diagnosing-bugs
    ├─► Web performance issue?          → web-perf
    ├─► Writing/updating agent docs?    → writing-for-agents, create-agentsmd
    ├─► Building domain glossary/ADR?   → domain-modeling
    ├─► Managing sub-agents?            → subagent-* (match specific need)
    ├─► Setting up CI/git hooks?        → setup-pre-commit, git-commit, git-guardrails
    ├─► Need new dependency?            → research → create-implementation-plan → 0010-dependency-evaluation.md
    ├─► Hit a pitfall/pattern/decision? → agent-learning → @learning:* / session retro
    ├─► Security review needed?         → security-audit
    ├─► Code review needed?             → code-review
    ├─► OpenCode config/migration?      → opencode
    └─► Research needed?                → research
```

### Common Mistakes to Avoid

| ❌ Don't                                   | ✅ Do                                           |
| ------------------------------------------ | ----------------------------------------------- |
| Guess API signatures from memory           | Invoke `context7-mcp` for current docs          |
| Write CSS without daisyUI tokens           | Use `daisyui-colors` + `theme-tokens.css`       |
| Refactor without plan                      | Run `refactor-plan` first                       |
| Debug by random changes                    | Use `diagnosing-bugs` loop                      |
| Design UI in isolation                     | Use `frontend-design` + `web-design-guidelines` |
| Skip skill for "simple" tasks              | Skills encode project-specific conventions      |
| Add dependency without L1/L2/L3 evaluation | Follow `0010-dependency-evaluation.md` 三层评估 |
| 忽略许可证/安全/体积审计                   | CI 自动拦截 + 人工复核                          |
| 引入依赖无 ADR 记录 (架构级)               | 创建 ADR 记录选型理由、退出策略                 |

### Quick Reference Card

```bash
# Most common skill invocations in this project:
skill daisyui                 # Before ANY component work
skill context7-mcp           # Before ANY library usage (Astro, Tailwind, Pagefind, etc.)
skill codebase-design        # Before defining module interfaces
skill create-implementation-plan  # Before multi-file features/refactors
skill frontend-design        # Before new UI/visual decisions
skill web-perf               # Before performance optimization
skill tdd                    # Before new feature/bug fix
skill writing-for-agents     # Before editing AGENTS.md, skills, CLAUDE.md
skill domain-modeling        # Before updating CONTEXT.md, creating ADRs
skill agent-learning         # Capture pitfall/pattern/decision during dev
skill security-audit         # Before security review / pen test
skill code-review            # Before PR review (standards + spec)
skill opencode               # Before OpenCode config/migration

# Learning commands
pnpm exec tsx .agents/scripts/extract-learning.ts --output .agents/learning/extracted.md
pnpm exec tsx .agents/scripts/aggregate-learning.ts --month 2026-10
pnpm exec tsx .agents/scripts/learning-index.ts --rebuild --stats
```
