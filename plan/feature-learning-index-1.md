---
goal: Build Deterministic Learning Session Index
version: 1.0
date_created: 2026-10-16
last_updated: 2026-10-16
owner: real-LiHua
status: "Completed"
tags: [feature, agent-learning]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Create a reproducible local JSON index for learning-session Markdown, with metadata and tag statistics available to later learning tools.

## 1. Requirements & Constraints

- **REQ-001**: `pnpm exec tsx .agents/scripts/learning-index.ts --rebuild` must recursively index Markdown files under `.agents/learning/sessions/` in deterministic path order.
- **REQ-002**: Each index entry must contain stable `id`, repository-relative `path`, `title`, nullable `task`, nullable `date`, nullable `assignee`, and unique sorted `tags`.
- **REQ-003**: Write schema-versioned JSON to `.agents/learning/index.json`; `--stats` must print indexed record and distinct tag counts.
- **REQ-004**: Rebuild must be idempotent and must not rewrite the index when serialized content is unchanged.
- **SEC-001**: Read only the learning sessions directory and write only the fixed `.agents/learning/index.json` path.
- **CON-001**: Keep generated index data local and gitignored; do not add dependencies.
- **GUD-001**: Use Node built-ins, strict TypeScript, and the existing `tsx` test runner.
- **PAT-001**: Export a pure session parser plus an index builder that accepts an explicit learning root for isolated tests.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Implement, verify, and document the local learning-session index.

| Task     | Description                                                                                                                                         | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Add `.agents/scripts/learning-index.ts` with Markdown metadata/tag extraction, stable IDs, deterministic JSON, `--rebuild`, and optional `--stats`. | ✅        | 2026-10-16 |
| TASK-002 | Add `.agents/scripts/learning-index.test.ts` for metadata parsing, duplicate tags, deterministic rebuild, empty input, and index write behavior.    | ✅        | 2026-10-16 |
| TASK-003 | Update ADR 0011, AGENTS.md commands, and PROJECT_STATUS.md to document the index schema and command.                                                | ✅        | 2026-10-16 |
| TASK-004 | Run focused tests, `pnpm check`, formatting, Markdown lint, workflow YAML parsing, and `git diff --check`; set this plan status to Completed.       | ✅        | 2026-10-16 |

## 3. Alternatives

- **ALT-001**: Use filesystem modification timestamps as index metadata; rejected because timestamps make rebuild output machine-dependent.
- **ALT-002**: Index extracted reports, aggregates, and pattern documents in the initial schema; rejected because the ADR's required query metadata is session-oriented and these document types do not share a stable metadata contract.

## 4. Dependencies

- **DEP-001**: Session records under `.agents/learning/sessions/` use the ADR 0011 Markdown format.
- **DEP-002**: Node.js built-ins and the existing `tsx` development dependency.

## 5. Files

- **FILE-001**: `.agents/scripts/learning-index.ts` — index CLI, parser, schema, and builder.
- **FILE-002**: `.agents/scripts/learning-index.test.ts` — isolated temporary-directory tests.
- **FILE-003**: `AGENTS.md` — replace the unimplemented learning-index command comment.
- **FILE-004**: `docs/adr/0011-agent-learning-mechanism.md` — document index schema and status.
- **FILE-005**: `PROJECT_STATUS.md` — update remaining learning automation.
- **FILE-006**: `.github/workflows/knowledge-guard.yml` — run the index tests in the learning utility test step.
- **FILE-007**: `plan/feature-learning-index-1.md` — execution checklist and validation record.

## 6. Testing

- **TEST-001**: Run `pnpm exec tsx --test .agents/scripts/learning-index.test.ts`; all assertions must pass.
- **TEST-002**: Run `pnpm check`; diagnostics must report zero errors.
- **TEST-003**: Run `pnpm exec oxfmt --check` on all changed TypeScript, Markdown, and YAML files.
- **TEST-004**: Run `pnpm exec markdownlint-cli2` on changed Markdown files, parse `.github/workflows/knowledge-guard.yml`, and run `git diff --check`.

## 7. Risks & Assumptions

- **RISK-001**: Older session records may omit task metadata; nullable fields preserve valid records without inventing values.
- **ASSUMPTION-001**: Hashtags in session records use lowercase English letters, digits, and hyphens and are written as `#tag`.

## 8. Related Specifications / Further Reading

- `docs/adr/0011-agent-learning-mechanism.md`
- `docs/adr/0009-knowledge-update-process.md`
- `.agents/skills/agent-learning/SKILL.md`
