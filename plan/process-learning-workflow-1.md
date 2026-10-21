---
goal: Document the Agent Learning Workflow
version: 1.0
date_created: 2026-10-16
last_updated: 2026-10-16
owner: real-LiHua
status: "Completed"
tags: [process, agent-learning, documentation]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Provide one concise operational guide for capturing, indexing, aggregating, reviewing, and promoting project learning without duplicating the authoritative learning formats.

## 1. Requirements & Constraints

- **REQ-001**: Document the task completion, L1 extraction, index rebuild, monthly aggregation, and human-reviewed promotion sequence with executable repository commands.
- **REQ-002**: State the actual session path `.agents/learning/sessions/<YYYY-MM>/session-<task-id>.md` and generated paths `.agents/learning/index.json` and `.agents/learning/aggregated/<YYYY-MM>.md`.
- **REQ-003**: Include acceptance guidance for session metadata, tags, report review, and updates to `docs/LESSONS_LEARNED.md`, ADRs, and `CONTEXT.md`.
- **CON-001**: Treat ADR 0011 as the learning mechanism specification and this guide as its operating procedure.
- **CON-002**: Keep generated learning data local and gitignored; promote only reviewed knowledge to tracked documentation.
- **GUD-001**: Include only supported commands and existing output formats; do not promise automatic session or lesson editing.
- **PAT-001**: Update PR template completion status and learning pointers rather than duplicating its Learning Notes template.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Publish and validate a concise end-to-end learning operations guide.

| Task     | Description                                                                                                                                                                | Completed | Date       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Create `docs/LEARNING_WORKFLOW.md` with ordered task-complete, extraction, index, monthly aggregate, review, and knowledge-promotion steps.                                | ✅        | 2026-10-16 |
| TASK-002 | Update `docs/adr/0011-agent-learning-mechanism.md`, `docs/adr/0009-knowledge-update-process.md`, and `PROJECT_STATUS.md` to reflect existing PR/skill artifacts and guide. | ✅        | 2026-10-16 |
| TASK-003 | Add a single targeted learning-workflow pointer in `AGENTS.md` and validate commands against each script's `--help` or CLI behavior.                                       | ✅        | 2026-10-16 |
| TASK-004 | Run Markdown lint, formatting, pointer scan, and `git diff --check`; set this plan status to Completed.                                                                    | ✅        | 2026-10-16 |

Validation note: strict pointer scanning reported 187 unresolved references repository-wide; filtered output contains no references to `docs/LEARNING_WORKFLOW.md` or this plan.

## 3. Alternatives

- **ALT-001**: Expand ADR 0011 with a full operator's manual; rejected because decision rationale and step-by-step operation serve different audiences.
- **ALT-002**: Duplicate the PR Learning Notes checklist in the guide; rejected because `.github/pull_request_template.md` is its single source of truth.

## 4. Dependencies

- **DEP-001**: `.agents/scripts/task-complete.ts`, `extract-learning.ts`, `learning-index.ts`, and `aggregate-learning.ts`.
- **DEP-002**: `docs/adr/0011-agent-learning-mechanism.md` and `.github/pull_request_template.md`.
- **DEP-003**: Markdownlint, Oxfmt, and the existing pointer scanner.

## 5. Files

- **FILE-001**: `docs/LEARNING_WORKFLOW.md` — practical learning capture and synthesis steps.
- **FILE-002**: `docs/adr/0011-agent-learning-mechanism.md` — completion checklist and guide pointer.
- **FILE-003**: `docs/adr/0009-knowledge-update-process.md` — learning workflow status and guide reference.
- **FILE-004**: `PROJECT_STATUS.md` — current remaining learning work.
- **FILE-005**: `AGENTS.md` — contextual pointer to the detailed guide.
- **FILE-006**: `plan/process-learning-workflow-1.md` — execution checklist.

## 6. Testing

- **TEST-001**: Run `pnpm exec markdownlint-cli2` on changed Markdown files; report zero issues.
- **TEST-002**: Run `pnpm exec oxfmt --check` on changed documentation; report all files formatted.
- **TEST-003**: Run `pnpm exec tsx .agents/scripts/scan-pointers.ts --strict`; report no newly broken pointers.
- **TEST-004**: Run `git diff --check`; report no whitespace errors.

## 7. Risks & Assumptions

- **RISK-001**: Local learning records are gitignored, so they are unavailable to teammates unless explicitly shared outside the standard local workflow.
- **ASSUMPTION-001**: The PR template already contains the required Learning Notes section and remains its authoritative checklist.

## 8. Related Specifications / Further Reading

- `docs/adr/0011-agent-learning-mechanism.md`
- `docs/adr/0009-knowledge-update-process.md`
- `.github/pull_request_template.md`
- `.agents/skills/agent-learning/SKILL.md`
