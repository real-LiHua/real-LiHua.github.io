# Project instructions

## Core Behavioral Guidelines

- **Prioritize Root Cause**: For hard-to-solve problems, report possible root causes to the user instead of blind retrying; ask for needed info rather than guessing.
- **No Hallucination**: Don't invent facts or speculate without verification.
- **No Sycophancy**: Refuse inaccurate answers just to please the user.
- **Point Out Errors**: Surface user misunderstandings or proposal flaws promptly.
- **Propose Simpler**: When a simpler option exists, propose it to the user.
- **Push Back**: If a request is risky or infeasible, push back with clear reasoning.

## Assumption & Uncertainty Guidelines

- **List Options**: If ambiguous, list all reasonable options; don't decide unilaterally.
- **State Assumptions**: State assumptions before proceeding.
- **Ask When Uncertain**: Stop and ask the user when uncertain.

## Documentation and Process Guidelines

- **Keep Docs Concise**: Keep all docs and Spec artifacts concise, including this file.

## Tools and communication

- Prefer MCP tools; fall back to CLI. If raw.githubusercontent.com fails, use cdn.jsdelivr.net.
- Lead with the answer; keep steps concise and state blockers.

## Validation and safety

- Run smallest relevant checks first; don't commit secrets; use least privilege; confirm before consequential writes.

## Development

- Follow OpenSpec via `pnpm run openspec`; specs are source of truth.
- Use TDD: failing test first, smallest fix, then refactor.
- Prefer focused vertical slices; never revert un-authored changes.
- Use Astro, Tailwind 4, shadcn/ui, `satteri`; no unified/remark/rehype for Markdown.
- Prefer semantic HTML/native browser features; add JS only when needed.

## Package managers

- Use `pnpm`, not `npm`; use `pnx`, not `npx`; omit versions, especially `@latest`.
- Use pnpm for Cargo/Python: `pnpm add crate:<name>` / `pnpm add pypi:<name>`.

## UX and content

- Keep pages responsive, keyboard-operable, visible focus, meaningful alt, no overflow.
- Contain wide code/tables in scroll regions; preserve code/image ratios.
- Keep archive lookups user-initiated; never auto-probe/retry.
- Return truthful status/server identity; don't forge fingerprints.
- Label previews/samples; never present as published articles.
