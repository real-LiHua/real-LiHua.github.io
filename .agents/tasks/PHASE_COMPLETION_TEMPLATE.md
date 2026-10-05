# Phase Completion Checklist Template

Copy to `.agents/tasks/phase-N/COMPLETION_CHECKLIST.md` when starting a Phase.

```markdown
# Phase N: <Phase Title> — Completion Checklist

## Phase Overview

- **Phase**: N
- **Title**: <Phase Title>
- **Start Date**: <YYYY-MM-DD>
- **Target End Date**: <YYYY-MM-DD>
- **Actual End Date**: <YYYY-MM-DD>

## Task Summary

| Task ID | Title | Assignee | Status | Hours Est. | Hours Actual |
| ------- | ----- | -------- | ------ | ---------- | ------------ |
| N.1     |       |          |        |            |              |
| N.2     |       |          |        |            |              |
| N.3     |       |          |        |            |              |

## Completion Criteria (from REFACTOR_PLAN.md)

### Verify Commands

- [ ] `pnpm check` — TypeScript + Astro types
- [ ] `pnpm build` — Full build + validation
- [ ] `pnpm playwright test` — E2E tests (if applicable)
- [ ] Phase-specific verify: <command from plan>

### Knowledge Base Updates

- [ ] **All task cards**: status=done, Outputs filled, Context handoff JSON complete
- [ ] **Task cards archived**: Moved to `.agents/tasks/archive/phase-N/`
- [ ] **REFACTOR_PLAN.md**: Phase N checkboxes ticked, any rollback notes added
- [ ] **CONTEXT.md**: New/changed terms synchronized
- [ ] **ADRs**: Status updated (Proposed → Accepted/Deprecated)
- [ ] **Pointers**: `pnpm exec tsx .agents/scripts/scan-pointers.ts` passes
- [ ] **Contracts**: `pnpm exec tsx .agents/scripts/sync-contracts.ts` passes
- [ ] **Terms**: `pnpm exec tsx .agents/scripts/check-terms.ts` passes

### Documentation

- [ ] **AGENTS.md**: Updated if new commands/roles/patterns introduced
- [ ] **Architecture docs**: Updated if module boundaries changed
- [ ] **CHANGELOG.md**: Entry added (if exists)

## Quality Gates

- [ ] All role-specific quality gates passed for completed tasks
- [ ] No outstanding blockers (all task cards status ≠ blocked)
- [ ] Regression check: `pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1` passes

## Handoff to Next Phase

- [ ] Context handoff JSON from each task card reviewed
- [ ] Blocking dependencies for next Phase identified
- [ ] Next Phase task cards created with Specs/Contracts filled
- [ ] Milestone report generated: `.agents/milestones/phase-N.md`

## Sign-off

| Role                | Name | Date | Signature |
| ------------------- | ---- | ---- | --------- |
| Phase Lead          |      |      |           |
| quality-dx-guardian |      |      |           |

## Retrospective Notes

### What Went Well

-
-

### What Could Improve

-
-

### Action Items for Next Phase

- [ ]
- [ ]

## Metrics

| Metric                        | Target | Actual |
| ----------------------------- | ------ | ------ |
| Tasks completed               | N      |        |
| Total hours                   |        |        |
| Blocker count                 | 0      |        |
| Blocker resolution time (avg) | < 2h   |        |
| Quality gate pass rate        | 100%   |        |
| Regression count              | 0      |        |
```

---

## Quick Completion Commands

```bash
# 1. Archive task cards
mkdir -p .agents/tasks/archive/phase-N
mv .agents/tasks/phase-N/*.md .agents/tasks/archive/phase-N/
mv .agents/tasks/phase-N/*.progress .agents/tasks/archive/phase-N/ 2>/dev/null || true

# 2. Generate milestone report
cat > .agents/milestones/phase-N.md << 'EOF'
# Milestone: Phase N Complete
**Date**: $(date -u +"%Y-%m-%d")
**Tasks**: $(ls .agents/tasks/archive/phase-N/*.md | wc -l)
**Duration**: <days> days
**Key Deliverables**: <list>
EOF

# 3. Update REFACTOR_PLAN.md checkboxes (manual)

# 4. Run final verification
pnpm check && pnpm build && pnpm playwright test

# 5. Run knowledge base guards
pnpm exec tsx .agents/scripts/scan-pointers.ts
pnpm exec tsx .agents/scripts/check-terms.ts
pnpm exec tsx .agents/scripts/sync-contracts.ts
pnpm exec tsx .agents/scripts/check-regression.ts HEAD~1
```
