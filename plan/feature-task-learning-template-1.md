---
goal: Generate Learning Session Template on Task Completion
version: 1.0
date_created: 2026-10-16
last_updated: 2026-10-16
owner: real-LiHua
status: "Completed"
tags: [feature, agent-learning, task-workflow]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Integrate local learning-session template creation into successful task completion while preserving existing session notes and keeping failed or skipped tasks unchanged.

## 1. Requirements & Constraints

- **REQ-001**: Create a session template only when `task-complete.ts` receives a passing quality-gate result.
- **REQ-002**: Store the template at `.agents/learning/sessions/<YYYY-MM>/session-<task-id>.md` using the completion date in UTC.
- **REQ-003**: Populate task ID, title from the task card heading, date, and assignee; include empty Pitfalls, Decisions, Patterns, and Tags sections.
- **REQ-004**: Never overwrite an existing learning-session file; report whether a template was created or already exists.
- **SEC-001**: Accept only task IDs matching `^\d+(?:\.\d+)+$` before resolving task paths.
- **CON-001**: Keep generated session data inside the gitignored `.agents/learning/` tree and add no dependencies.
- **GUD-001**: Preserve gate handling and progress status behavior; surface template I/O errors rather than hiding them.
- **PAT-001**: Export pure template formatting and a focused file-creation helper for Node test-runner tests.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Implement and validate successful-task learning-template generation.

| Task     | Description                                                                                                                                                                    | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------- |
| TASK-001 | Refactor `.agents/scripts/task-complete.ts` with a main-module guard and add task-ID validation, task-card title extraction, and completion-date template formatting.          | ✅        | 2026-10-16 |
| TASK-002 | Add a non-overwriting session-file helper at `.agents/learning/sessions/<YYYY-MM>/session-<task-id>.md`; call it only after a passing gate and report created/existing status. | ✅        | 2026-10-16 |
| TASK-003 | Add `.agents/scripts/task-complete.test.ts` for template contents, invalid IDs, successful creation, existing-file preservation, and UTC month placement.                      | ✅        | 2026-10-16 |
| TASK-004 | Update ADR 0011, ADR 0009, AGENTS.md, PROJECT_STATUS.md, and workflow tests to document the completed integration.                                                             | ✅        | 2026-10-16 |
| TASK-005 | Run tests, `pnpm check`, formatting, Markdown lint, workflow YAML parsing, and `git diff --check`; set this plan status to Completed.                                          | ✅        | 2026-10-16 |

## 3. Alternatives

- **ALT-001**: Generate templates when a task is claimed; rejected because many claimed tasks may not complete and would leave misleading session records.
- **ALT-002**: Rewrite an existing session template on each successful retry; rejected because it could erase human-authored learning notes.

## 4. Dependencies

- **DEP-001**: `.agents/scripts/task-complete.ts` existing gate result and task progress flow.
- **DEP-002**: Task card Markdown under `.agents/tasks/phase-<N>/`.
- **DEP-003**: Gitignored `.agents/learning/` local data directory.
- **DEP-004**: Node.js built-ins and existing `tsx` test runner.

## 5. Files

- **FILE-001**: `.agents/scripts/task-complete.ts` — template integration, task validation, and import-safe entry point.
- **FILE-002**: `.agents/scripts/task-complete.test.ts` — unit tests for formatting and non-overwriting creation.
- **FILE-003**: `.github/workflows/knowledge-guard.yml` — include task completion tests in learning utility tests.
- **FILE-004**: `AGENTS.md` — update the learning workflow command status and guidance.
- **FILE-005**: `docs/adr/0009-knowledge-update-process.md` — mark task-complete learning integration implemented.
- **FILE-006**: `docs/adr/0011-agent-learning-mechanism.md` — document template generation behavior and status.
- **FILE-007**: `PROJECT_STATUS.md` — update remaining learning automation status.
- **FILE-008**: `plan/feature-task-learning-template-1.md` — execution and validation record.

## 6. Testing

- **TEST-001**: Run `pnpm exec tsx --test .agents/scripts/task-complete.test.ts`; all assertions must pass.
- **TEST-002**: Run `pnpm check`; Astro/TypeScript diagnostics must report zero errors.
- **TEST-003**: Run `pnpm exec oxfmt --check` on all changed TypeScript, Markdown, and YAML files.
- **TEST-004**: Run `pnpm exec markdownlint-cli2` on changed Markdown files, parse `.github/workflows/knowledge-guard.yml`, and run `git diff --check`.

## 7. Risks & Assumptions

- **RISK-001**: Existing task cards may have nonstandard headings; fall back to the task ID as the title rather than abort completion.
- **ASSUMPTION-001**: Task IDs use dot-separated numeric components and task completion dates use UTC calendar dates.

## 8. Related Specifications / Further Reading

- `docs/adr/0011-agent-learning-mechanism.md`
- `docs/adr/0009-knowledge-update-process.md`
- `.agents/skills/agent-learning/SKILL.md`
- `.agents/scripts/task-complete.ts`
