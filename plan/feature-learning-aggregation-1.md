---
goal: Implement Monthly Learning Aggregation
version: 1.0
date_created: 2026-10-16
last_updated: 2026-10-16
owner: real-LiHua
status: "Completed"
tags: [feature, agent-learning]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Implement a deterministic CLI that aggregates local monthly learning-session Markdown into an auditable report without modifying source session records.

## 1. Requirements & Constraints

- **REQ-001**: The CLI must require `--month YYYY-MM` and reject invalid calendar months.
- **REQ-002**: The default input directory must be `.agents/learning/sessions/<month>/`; recursively read Markdown files in lexical path order.
- **REQ-003**: Aggregate session count, inline `#tag` frequency, and counts of Pitfalls, Decisions, and Patterns sections.
- **REQ-004**: Generate a Markdown report at `.agents/learning/aggregated/<month>.md` unless `--output <file>` is provided.
- **SEC-001**: Do not read files outside the selected session directory; do not execute or evaluate session content.
- **CON-001**: Keep learning records local and gitignored; do not add generated learning reports to version control.
- **GUD-001**: Use Node built-ins and repository TypeScript/tsx conventions; do not add dependencies.
- **PAT-001**: Export pure parsing/reporting functions and cover them with Node test-runner tests.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Implement, test, document, and verify the monthly aggregation CLI.

| Task     | Description                                                                                                                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Add `.agents/scripts/aggregate-learning.ts` with month validation, bounded recursive Markdown discovery, tag/section counts, report formatting, and CLI output. | ✅        | 2026-10-16 |
| TASK-002 | Add `.agents/scripts/aggregate-learning.test.ts` covering input ordering, tag/section counts, empty directories, and invalid months.                            | ✅        | 2026-10-16 |
| TASK-003 | Update ADR 0011, AGENTS.md usage, and PROJECT_STATUS.md to reflect the implemented command and remaining learning tooling.                                      | ✅        | 2026-10-16 |
| TASK-004 | Run focused tests, repository type check, formatting, Markdown lint, and `git diff --check`; set this plan status to Completed.                                 | ✅        | 2026-10-16 |

## 3. Alternatives

- **ALT-001**: Automatically rewrite `docs/LESSONS_LEARNED.md`; rejected because ADR 0011 requires human review before L3 knowledge is promoted.
- **ALT-002**: Add a Markdown parsing dependency; rejected because the session format can be summarized with bounded built-in parsing and no new runtime dependency.

## 4. Dependencies

- **DEP-001**: `.agents/learning/sessions/<YYYY-MM>/*.md` records following the session-learning format in `docs/adr/0011-agent-learning-mechanism.md`.
- **DEP-002**: Node.js, pnpm, and the existing `tsx` development dependency.

## 5. Files

- **FILE-001**: `.agents/scripts/aggregate-learning.ts` — CLI and pure aggregation/report functions.
- **FILE-002**: `.agents/scripts/aggregate-learning.test.ts` — focused unit tests.
- **FILE-003**: `AGENTS.md` — executable learning command reference.
- **FILE-004**: `docs/adr/0011-agent-learning-mechanism.md` — implementation status and usage.
- **FILE-005**: `PROJECT_STATUS.md` — current learning automation status.
- **FILE-006**: `plan/feature-learning-aggregation-1.md` — execution plan and completion tracking.

## 6. Testing

- **TEST-001**: Run `pnpm exec tsx --test .agents/scripts/aggregate-learning.test.ts`; all assertions must pass.
- **TEST-002**: Run `pnpm check`; Astro/TypeScript diagnostics must report zero errors.
- **TEST-003**: Run `pnpm exec oxfmt --check` on changed TypeScript and Markdown files; formatting must pass.
- **TEST-004**: Run `pnpm exec markdownlint-cli2` on changed Markdown files and `git diff --check`; both must pass.

## 7. Risks & Assumptions

- **RISK-001**: Session files may not follow the ADR template consistently; aggregation reports section counts and preserves source links rather than inferring detailed semantics.
- **ASSUMPTION-001**: Session records use Markdown headings and hashtag tags, and generated reports remain under the gitignored `.agents/learning/` directory.

## 8. Related Specifications / Further Reading

- `docs/adr/0011-agent-learning-mechanism.md`
- `docs/adr/0009-knowledge-update-process.md`
- `.agents/skills/agent-learning/SKILL.md`
