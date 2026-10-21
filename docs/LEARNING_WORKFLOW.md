# Learning Workflow

This guide describes the operating steps for the learning tools. The learning model and template formats are defined in [ADR 0011](./adr/0011-agent-learning-mechanism.md); the PR checklist remains in `.github/pull_request_template.md`.

## Capture

1. When a task passes its quality gate, `task-complete.ts` creates `.agents/learning/sessions/<UTC YYYY-MM>/session-<task-id>.md`.
2. Fill in the generated Pitfalls, Decisions, Patterns, and Tags sections. The task ID, task-card title, assignee, and UTC date are prefilled.
3. If a session file already exists, the completion command preserves it. Edit that file directly to add or correct learning notes.
4. For source-level pitfalls, decisions, patterns, gotchas, todos, or references, add a supported `@learning:<tag>` comment beside the relevant code.

## Review and Index

Run these commands from the repository root:

```bash
# Extract source @learning comments to a local Markdown report.
pnpm exec tsx .agents/scripts/extract-learning.ts --output .agents/learning/extracted-YYYY-MM.md

# Rebuild the deterministic session index and print record/tag counts.
pnpm exec tsx .agents/scripts/learning-index.ts --rebuild --stats

# Aggregate one month of session records.
pnpm exec tsx .agents/scripts/aggregate-learning.ts --month YYYY-MM
```

`extract-learning.ts` scans source comments; `learning-index.ts` indexes session Markdown; `aggregate-learning.ts` summarizes session tags and Pitfalls/Decisions/Patterns entries for the selected month. These are separate inputs and reports: the monthly aggregator does not merge extracted source comments into session records. Review the extracted report and monthly aggregate alongside their source files.

## Promote Reviewed Knowledge

After reviewing reports and source records:

1. Promote recurring, reusable lessons into the matching section of `docs/LESSONS_LEARNED.md`; remove stale or duplicate guidance instead of copying whole reports.
2. Update `CONTEXT.md` only when the project introduces a term that needs a canonical definition.
3. Create or update an ADR when the lesson records an architectural decision.
4. Update the relevant skill or operational document when a lesson changes repeatable implementation guidance.
5. Complete the Learning Notes section in `.github/pull_request_template.md`, linking each captured note to its source file.

Generated extraction reports, indexes, session records, and aggregates are under the gitignored `.agents/learning/` directory. Commit reviewed knowledge only in the tracked documentation that was updated during promotion.
