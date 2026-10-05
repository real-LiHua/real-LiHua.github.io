# Monthly Knowledge Base Health Check Template

Generate at: `docs/KNOWLEDGE_HEALTH_<YYYY-MM>.md`

````markdown
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

| File       | Broken Count | Common Issue |
| ---------- | ------------ | ------------ |
| AGENTS.md  |              |              |
| Task cards |              |              |
| ADRs       |              |              |

### Actions Taken

- [ ] Fixed broken pointers in AGENTS.md
- [ ] Updated task card Specs/Contracts
- [ ] Fixed ADR cross-references
- [ ] Ran `scan-pointers --fix`

## 2. Term Health

| Metric                   | Count | Trend | Notes     |
| ------------------------ | ----- | ----- | --------- |
| Terms in CONTEXT.md      |       | ↗/↘/→ |           |
| Undefined term usages    |       | ↗/↘/→ | Target: 0 |
| Redefined term instances |       | ↗/↘/→ | Target: 0 |
| New terms added          |       |       |           |

### New Terms Added This Month

| Term | Definition Source | Added By |
| ---- | ----------------- | -------- |
|      |                   |          |

### Undefined Terms Found

| Term | Files | Suggested Action                    |
| ---- | ----- | ----------------------------------- |
|      |       | Add to CONTEXT.md / Remove / Rename |

### Redefined Terms

| Term | Files | Action Taken                            |
| ---- | ----- | --------------------------------------- |
|      |       | Moved to CONTEXT.md / Removed duplicate |

## 3. Contract Health

| Metric            | Count | Trend | Target |
| ----------------- | ----- | ----- | ------ |
| Module interfaces |       |       | 7      |
| Contract files    |       |       | 7      |
| Matched           |       |       | 100%   |
| Missing contracts |       |       | 0      |
| Missing modules   |       |       | 0      |
| Version drift     |       |       | 0      |

### Mismatches Resolved

| Module | Issue | Resolution |
| ------ | ----- | ---------- |
|        |       |            |

### Version Updates

| Contract | Old Version | New Version | Reason |
| -------- | ----------- | ----------- | ------ |
|          |             |             |        |

## 4. ADR Status

| Status     | Count | Change |
| ---------- | ----- | ------ |
| Accepted   |       |        |
| Proposed   |       |        |
| Deprecated |       |        |
| Superseded |       |        |

### ADR Changes

| ADR | Old Status | New Status | Reason |
| --- | ---------- | ---------- | ------ |
|     |            |            |        |

### Overdue Reviews

| ADR | Last Review | Owner | Action Needed |
| --- | ----------- | ----- | ------------- |
|     |             |       |               |

## 5. Task & Phase Progress

| Phase   | Status | Tasks Done / Total | Blockers | Target Date |
| ------- | ------ | ------------------ | -------- | ----------- |
| Phase 1 |        | /                  |          |             |
| Phase 2 |        | /                  |          |             |
| ...     |        |                    |          |             |

### Blocker Analysis

| Blocker | Duration | Task | Resolved? | Resolution Time |
| ------- | -------- | ---- | --------- | --------------- |
|         |          |      |           |                 |

## 6. Quality Metrics

| Metric                 | This Month | Last Month | Target |
| ---------------------- | ---------- | ---------- | ------ |
| Build success rate     |            |            | 100%   |
| Quality gate pass rate |            |            | 100%   |
| Regression count       |            |            | 0      |
| Avg blocker resolution |            |            | < 2h   |
| PR merge time (avg)    |            |            | < 24h  |

## 7. Action Items

| #   | Action | Owner | Due Date | Status |
| --- | ------ | ----- | -------- | ------ |
| 1   |        |       |          |        |
| 2   |        |       |          |        |
| 3   |        |       |          |        |

## 8. Risks & Concerns

| Risk | Impact | Likelihood | Mitigation |
| ---- | ------ | ---------- | ---------- |
|      |        |            |            |

## 9. Sign-off

| Role                      | Name | Date | Approved |
| ------------------------- | ---- | ---- | -------- |
| quality-dx-guardian       |      |      |          |
| frontend-architect        |      |      |          |
| content-engineer          |      |      |          |
| build-deploy-engineer     |      |      |          |
| cli-tool-engineer         |      |      |          |
| search-discovery-engineer |      |      |          |

---

## Generation Commands

```bash
# Run all health checks
pnpm exec tsx .agents/scripts/scan-pointers.ts --report
pnpm exec tsx .agents/scripts/check-terms.ts --report
pnpm exec tsx .agents/scripts/sync-contracts.ts --report
pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1 --report

# Collect reports
ls -la .agents/reports/*-$(date +%Y%m)*.json

# Create report from template
cp .agents/tasks/MONTHLY_HEALTH_TEMPLATE.md docs/KNOWLEDGE_HEALTH_$(date +%Y-%m).md
# Fill in the data from reports
```
````

```

```
