# Task Card Template

Copy this to `.agents/tasks/phase-X/N.md` and fill in.

````markdown
# Task N: <Title>

## Metadata

- **ID**: X.N (e.g., 1.1, 2.3)
- **Phase**: <Phase name>
- **Assignee**: <role-id>
- **Status**: pending | in_progress | blocked | done
- **Dependencies**: ["X.M", "Y.K"] # Task IDs that must complete first
- **Estimated Hours**: <number>
- **CreatedAt**: <ISO timestamp>
- **StartedAt**: <ISO timestamp>
- **CompletedAt**: <ISO timestamp>

## Inputs

- **Files**: [list of input files]
- **Specs**: [links to specs/ADRs]
- **Contracts**: [interface contracts from .agents/contracts/]

## Description

<What needs to be done, why, and any constraints>

## Acceptance Criteria

- [ ] Criterion 1 (verifiable)
- [ ] Criterion 2 (verifiable)
- [ ] ...

## Verification Commands

```bash
# Commands to verify completion
pnpm check
pnpm build
# Role-specific:
pnpm playwright test --project=chromium
```
````

## Outputs

- **Files**: [list of output files created/modified]
- **Tests**: [new/updated test files]
- **Contracts**: [updated interface contracts]

## Context (for handoff)

```json
{
  "exports": { "TypeName": "description" },
  "contracts": { "interfaceName": "Zod schema or TS interface" },
  "notes": "Any important context for next task"
}
```

## Blocker History

| Date | Blocker | Resolved | Help From |
| ---- | ------- | -------- | --------- |
|      |         |          |           |

````

---

# Example: Phase 1 Task 1.1

```markdown
# Task 1.1: Export types from content.config.ts

## Metadata
- **ID**: 1.1
- **Phase**: Phase 1: Types and Interfaces
- **Assignee**: content-engineer
- **Status**: pending
- **Dependencies**: []
- **Estimated Hours**: 2
- **CreatedAt**: 2026-10-05T10:00:00Z

## Inputs
- **Files**: [src/content.config.ts]
- **Specs**: [docs/adr/0001-functional-architecture.md#3.1-content-pipeline-module]
- **Contracts**: [src/modules/types.ts]

## Description
Export PostFrontmatter, TelegramAuthConfig, BlogCollection types from content.config.ts
to src/modules/types.ts for cross-module reuse. Eliminates 'as unknown as' in pages.

## Acceptance Criteria
- [ ] types.ts exports PostFrontmatter, TelegramAuthConfig, BlogCollection
- [ ] src/utils/content.ts imports and uses these types
- [ ] src/pages/posts/[id].astro uses imported types instead of inline inference
- [ ] pnpm check passes with zero 'any' leakage

## Verification Commands
```bash
pnpm check
grep -r "as unknown as" src/pages/posts/
````

## Outputs

- **Files**: [src/modules/types.ts, src/utils/content.ts, src/pages/posts/[id].astro]
- **Tests**: []
- **Contracts**: [src/modules/content-pipeline.ts types updated]

## Context

```json
{
  "exports": { "PostFrontmatter": "z.infer<typeof postFrontmatterSchema>" },
  "contracts": { "BlogCollection": "CollectionEntry<'blog'>" },
  "notes": "TelegramAuthConfig is optional in schema, handle undefined in consumers"
}
```

```

```
