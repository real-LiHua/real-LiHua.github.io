# Monthly Knowledge Base Health Check Template

> 由 `quality-dx-guardian` 执行（L3 月度检查，见 `AGENTS.md`「Knowledge Base Maintenance」）。
> 输出到 `docs/KNOWLEDGE_HEALTH_<YYYY-MM>.md`。

```markdown
# Knowledge Base Health Report — <YYYY-MM>

## Overview

- **Period**: <YYYY-MM-01> to <YYYY-MM-Last>
- **Prepared by**: quality-dx-guardian
- **Reviewed by**: <all roles>

## 1. Pointer Health

| Metric                | Count | Trend | Notes     |
| --------------------- | ----- | ----- | --------- |
| Total pointers        |       | ↗/↘/→ |           |
| Valid pointers        |       | ↗/↘/→ |           |
| Broken pointers       |       | ↗/↘/→ | Target: 0 |
| Auto-fixed this month |       |       |           |

### Top Broken Pointer Sources

| File | Broken Count | Common Issue |
| ---- | ------------ | ------------ |
|      |              |              |

## 2. Terminology Health

| Metric               | Count | Trend | Notes                |
| -------------------- | ----- | ----- | -------------------- |
| Defined terms        |       | ↗/↘/→ | `CONTEXT.md`         |
| Undefined used terms |       | ↗/↘/→ | Target: 0            |
| Redefined terms      |       | ↗/↘/→ | Must stay in CONTEXT |

## 3. Interface Contracts

| Contract                   | Status   | Drift | Notes |
| -------------------------- | -------- | ----- | ----- |
| `.agents/contracts/*.json` | ✅/⚠️/❌ |       |       |
| `src/modules/types.ts`     | ✅/⚠️/❌ |       |       |

## 4. Quality Gates Trend

| Gate                        | Pass Rate | Notes |
| --------------------------- | --------- | ----- |
| `pnpm check`                |           |       |
| `pnpm build`                |           |       |
| `pnpm exec oxlint .`        |           |       |
| `pnpm exec oxfmt --check`   |           |       |
| `pnpm exec playwright test` |           |       |
| `cargo clippy -p post-edit` |           |       |

## 5. Task / Lifecycle

- **Tasks completed**: <n>
- **Blocked tasks**: <n>
- **Idle agents (>14d)**: <list>
- **Gate failures this month**: <n>（≥3 触发 REMEDIATION）

## 6. Findings & Actions

| Finding | Severity | Owner | Action | Due |
| ------- | -------- | ----- | ------ | --- |
|         |          |       |        |     |

## 7. Next Month Focus

- [ ] <focus 1>
- [ ] <focus 2>
```
