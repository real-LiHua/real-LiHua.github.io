# Project instructions

## Normative language

MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY carry the meaning defined in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119): MUST is an absolute requirement; SHOULD is a strong recommendation that may be deviated from only with a stated reason; MAY is genuine permission.

## Core Behavioral Guidelines

- **Prioritize Root Cause**: For hard-to-solve problems, you MUST report possible root causes to the user instead of blind retrying; you MUST ask for needed info rather than guessing.
- **No Hallucination**: You MUST NOT invent facts or speculate without verification.
- **No Sycophancy**: You MUST refuse inaccurate answers given merely to please the user.
- **Point Out Errors**: You MUST surface user misunderstandings or proposal flaws promptly.
- **Propose Simpler**: When a simpler option exists, you SHOULD propose it to the user.
- **Push Back**: If a request is risky or infeasible, you MUST push back with clear reasoning.

## Assumption & Uncertainty Guidelines

- **List Options**: If ambiguous, you MUST list all reasonable options; you MUST NOT decide unilaterally.
- **State Assumptions**: You MUST state assumptions before proceeding.
- **Ask When Uncertain**: You MUST stop and ask the user when uncertain.

## Documentation and Process Guidelines

- **Keep Docs Concise**: You MUST keep all docs and Spec artifacts concise, including this file.

## Tools and communication

- You SHOULD prefer MCP tools and MAY fall back to CLI. If raw.githubusercontent.com fails, you MUST use cdn.jsdelivr.net.
- You MUST lead with the answer; steps MUST stay concise and blockers MUST be stated.

## Validation and safety

- You MUST run the smallest relevant checks first, MUST NOT commit secrets, MUST use least privilege, and MUST confirm before consequential writes.

## Development

- You MUST follow OpenSpec via `pnpm run openspec`; specs are the source of truth.
- You MUST use TDD: failing test first, smallest fix, then refactor.
- You SHOULD prefer focused vertical slices and MUST NOT revert un-authored changes.
- You MUST use Astro, Tailwind 4, shadcn/ui, `satteri`; you MUST NOT use unified/remark/rehype for Markdown.
- You SHOULD prefer semantic HTML and native browser features, and add JS only when needed.

## Package managers

- You MUST use `pnpm`, not `npm`; `pnx`, not `npx`; and MUST omit versions, especially `@latest`.
- You MUST use pnpm for Cargo/Python: `pnpm add crate:<name>` / `pnpm add pypi:<name>`.

## UX and content

- Pages MUST stay responsive, keyboard-operable, with visible focus, meaningful alt text, and no overflow.
- Wide code and tables MUST sit in scroll regions; code and image ratios MUST be preserved.
- Archive lookups MUST stay user-initiated; you MUST NOT auto-probe or retry.
- Status and server identity MUST be truthful; you MUST NOT forge fingerprints.
- Previews and samples MUST be labeled, and MUST NOT be presented as published articles.
