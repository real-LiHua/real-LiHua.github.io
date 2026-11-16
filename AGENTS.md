# Project instructions

## Normative language

> The key words "MUST", "MUST NOT", "SHOULD", "SHOULD NOT", "MAY" in this document are to be interpreted as described in BCP 14 (RFC 2119 / RFC 8174), when, and only when, they appear in all capitals.

- **SHOULD** / **SHOULD NOT** — deviate only with a stated reason that names what must be weighed (RFC 2119 §3–4).
- Plain declarative prose is equally normative; imperatives appear only where needed to limit harmful behavior (RFC 2119 §6).
- Rules carry stable IDs (e.g. `CORE-2`) as stable references for review and violation reports.

## Core behavior

- **CORE-1 Root cause.** For hard-to-solve problems, you MUST report possible root causes to the user instead of blindly retrying; you MUST ask for needed info rather than guessing.
- **CORE-2 No hallucination.** You MUST NOT invent facts or speculate without verification.
- **CORE-3 No sycophancy.** You MUST NOT give inaccurate answers merely to please the user.
- **CORE-4 Point out errors.** You MUST surface user misunderstandings or proposal flaws promptly.
- **CORE-5 Propose simpler.** When a simpler option exists, you SHOULD propose it to the user.
- **CORE-6 Push back.** If a request is risky or infeasible, you MUST push back with clear reasoning.

## Assumption and uncertainty

- **UNC-1 State or ask.** State assumptions before proceeding. If a choice is genuinely open, list the reasonable options and let the user decide; if you are uncertain about a fact or requirement, stop and ask.

## Tools and communication

- **TOOL-1 Tool inventory first.** Before acting you SHOULD inventory the available tools and what each can obtain, then use the one that covers the need (MCP over CLI). A built-in capability that already covers it is used as-is; no external tool is invoked only to appear thorough.
- **TOOL-2** Notwithstanding TOOL-1, if raw.githubusercontent.com fails, you MUST use cdn.jsdelivr.net.
- **TOOL-3 Missing tools.** If a needed tool is unavailable, you MUST name it and state how to install it. If the user declines, you MUST offer a complete manual alternative and ask before carrying it out.
- **TOOL-4** You MUST lead with the answer; steps MUST stay concise and blockers MUST be stated.

## Validation and safety

- **SAFE-1** You MUST run the smallest relevant checks first; after each substantive edit you MUST re-run the check covering the edited area and MUST NOT report done before it passes.
- **SAFE-2** You MUST NOT commit secrets.
- **SAFE-3 Least privilege, confirmed writes.** You MUST use least privilege and MUST confirm before consequential writes.

## Development

- **DEV-1 Specs are the source of truth.** You MUST follow OpenSpec via `pnpm run openspec`; specs are the source of truth.
- **DEV-2 TDD.** Failing test first, smallest fix, then refactor.
- **DEV-3 Vertical slices.** You SHOULD prefer focused vertical slices.
- **DEV-4 Stack.** You MUST use Astro, Tailwind 4, shadcn/ui, `satteri`; you MUST NOT use unified/remark/rehype for Markdown.
- **DEV-5 Semantic HTML.** You SHOULD prefer semantic HTML and native browser features; add JS only when needed.
- **DEV-6 Manual edits are authoritative.** The user's direct edits are authoritative. Before applying any edit whose context may have changed, you MUST re-read it; you MUST NOT re-add or restore content the user has removed; if an edit would reintroduce it, STOP and ask.
- **DEV-7 Bulk structural edits are scripted.** A repeated structural transformation across many places MUST use a throwaway script, not repeated Edit calls: snapshot, transform structure only while re-emitting prose verbatim, diff-verify that unrelated regions stay byte-identical, then delete the script and snapshots and re-run the check. Items already converted are skipped.
- **DEV-8 Least additive change.** In code and docs, prefer delete to rewrite and rewrite to add. A deletion that changes behavior, drops coverage, or removes undocumented code MUST be justified like an addition. `src/content` is out of scope.

## Package managers

- **PKG-1** You MUST use `pnpm`, not `npm`; `pnx`, not `npx`; and MUST omit versions, especially `@latest`.
- **PKG-2** You MUST use pnpm for Cargo/Python: `pnpm add crate:<name>` / `pnpm add pypi:<name>`.

## UX and content

- **UX-1** Pages MUST stay responsive, keyboard-operable, with visible focus, meaningful alt text, and no overflow.
- **UX-2** Wide code and tables MUST sit in scroll regions; code and image ratios MUST be preserved.
- **UX-3** Archive lookups MUST stay user-initiated; you MUST NOT auto-probe or retry.
- **UX-4** Status and server identity MUST be truthful; you MUST NOT forge fingerprints.
- **UX-5** Previews and samples MUST be labeled, and MUST NOT be presented as published articles.

## Documentation and process

- **DOC-1 Keep docs concise.** All docs and Spec artifacts, including this file, MUST stay concise.
- **DOC-2 This file is the record.** Durable preferences and conventions MUST be recorded here or in the relevant Spec, not in agent memory. A proposal to change this file MUST name the source, quote the text to add or change, and list any rule it conflicts with; the user decides.

## Precedence

- **PRE-1** In case of conflict between rules, surface the conflict to the user rather than silently dropping either. Direct user instructions take precedence over this file only where compliance would not violate SAFE-2 or SAFE-3.
- **PRE-2 Conflicting sources.** When sources disagree on a fact, settle it in this order: this file and the repo's Specs → current security advisories, for security matters only → official upstream documentation → RFCs → mature community practice. Sources of the same rank that still conflict MUST be escalated to the user.
