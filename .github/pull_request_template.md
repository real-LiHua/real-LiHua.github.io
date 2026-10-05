# Pull Request Template

## Description
<!-- Briefly describe what this PR does -->

## Related Issue
<!-- Link to related issue, e.g., "Fixes #123" or "Part of Phase 2" -->

## Changes Made
<!-- List the key changes -->
- 
- 
- 

---

## Knowledge Base Impact

**Does this PR affect the knowledge base (AGENTS.md, CONTEXT.md, ADRs, task cards, contracts, etc.)?**

- [ ] **No impact** — Pure implementation/refactor without architectural changes
- [ ] **New term(s) introduced** — Added to CONTEXT.md
- [ ] **Interface/contract changed** — Updated `.agents/contracts/*.json` and relevant task cards
- [ ] **File(s) moved/renamed/deleted** — Ran `pnpm exec tsx .agents/scripts/scan-pointers.ts --fix`
- [ ] **Architectural decision made** — Created/updated ADR (number: 000X)
- [ ] **Task card completed** — Updated status, Outputs, Context handoff
- [ ] **Phase completed** — Filled Phase completion checklist

### Details
<!-- If any checkbox above is checked, provide details here -->

| Type | Location | Description |
|------|----------|-------------|
| e.g., New term | CONTEXT.md | Added "TracerBullet" definition |
| e.g., Interface | src/modules/build-pipeline.ts | Added `timeout` field to BuildStage |
| e.g., ADR | docs/adr/0005-theme-token-strategy.md | Recorded CSS Token vs @theme decision |

---

## Verification Checklist

### Required (all must pass)
- [ ] `pnpm check` — TypeScript + Astro types
- [ ] `pnpm build` — Full build + validation
- [ ] `pnpm oxlint` — Linting
- [ ] `pnpm oxfmt --check` — Formatting

### Knowledge Base Guards (run in CI)
- [ ] `pnpm exec tsx .agents/scripts/scan-pointers.ts` — No broken pointers
- [ ] `pnpm exec tsx .agents/scripts/check-terms.ts` — Terms consistent with CONTEXT.md
- [ ] `pnpm exec tsx .agents/scripts/sync-contracts.ts` — Contracts match modules

### Role-Specific Quality Gate
- [ ] `pnpm exec tsx .agents/scripts/run-gate.ts <your-role>`

### Testing
- [ ] `pnpm playwright test` — E2E tests pass
- [ ] Manual verification: [describe what you tested]

---

## Breaking Changes
<!-- If this PR introduces breaking changes, describe them and migration path -->

- [ ] No breaking changes
- [ ] Breaking changes documented in ADR and migration guide

---

## Screenshots / Demo
<!-- If UI changes, add screenshots or link to preview deployment -->

---

## Checklist for Reviewers
- [ ] Code follows project conventions (oxlint/oxfmt pass)
- [ ] Types are correct (pnpm check passes)
- [ ] Knowledge base updated per impact section above
- [ ] Tests cover new functionality
- [ ] No secrets or sensitive data in changes
- [ ] PR title follows `[component] Brief description` format

---

## Deployment Notes
<!-- Any special deployment considerations? -->
- [ ] Standard deployment (merge to main triggers CI/CD)
- [ ] Requires manual steps: [describe]
- [ ] Environment variables changed: [list]