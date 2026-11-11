# Design

## Context

See `proposal.md` for motivation and `specs/project-baseline/spec.md` for the required documentation behavior.

This change was authored against a transitional checkout: the manifests
described an Astro site and a Rust `post-edit` CLI, but `src/`, `tests/`,
the Astro configuration, and the declared Rust binary path were absent,
while README and Copilot guidance described files that did not exist. That
inventory snapshot is historical — the repository now contains the reader
implementation under `src/` with tests — and is deliberately not duplicated
here. Per the decisions below, `package.json`, `pnpm-lock.yaml`,
`Cargo.toml`, and the current file tree are the evidence sources for
dependency roles and implementation status; the font-acquisition plan
mentioned in that snapshot belongs to the `design-blog-reader-ui` change.

## Goals / Non-Goals

**Goals:**

- Make `README.md` the short, current entrypoint for project purpose, repository status, toolchain, and supported commands.
- Keep detailed dependency and implementation-status notes aligned with the package manifests and lockfiles, while avoiding a second hand-maintained dependency list where linking to the manifests is sufficient.
- Correct Copilot guidance that points to nonexistent files or claims unimplemented components are present.
- Use the `project-baseline` capability as the durable contract for evidence and status labeling.

**Non-Goals:**

- Restore or implement the missing application, tests, Rust CLI, integrations, or deployment services.
- Change dependency versions, move dependencies between manifest groups, approve package build scripts, or create a Rust lockfile.
- Reconstruct the intended product behavior from deleted files, Git history, or historical planning material.

## Decisions

### Use repository manifests as dependency sources of truth

Document direct dependencies from `package.json` and `Cargo.toml`; use lockfiles only to report resolved state. Link to manifests instead of copying every version range into multiple documents. Group dependencies using their declared manifest section and explain inferred purposes as such, without claiming a package is exercised while its usage is unverified. Do not expand a direct-dependency baseline into a transitive package inventory.

**Alternative considered:** Maintain a manually duplicated package/version table in README. Rejected because it will drift independently from the manifests.

### Describe observable checkout state, not the intended future application

The baseline will clearly mark missing entrypoints, tests, and capability specs as absent, and will distinguish declared dependencies and scripts from commands known to execute successfully. Keep feature-level requirements in capability specs rather than reconstructing them from stale links or setup notes.

**Alternative considered:** Preserve the existing capability link list as planned architecture. Rejected because it currently points to nonexistent files and implies requirements that are not in the checkout.

### Keep the baseline in the existing project entrypoints

Update the README as the project overview and adjust `.github/copilot-instructions.md` so its repository shape and validation guidance agree with that overview. Avoid a new standalone dependency-matrix document unless the inventory later becomes too detailed for these entrypoints.

**Alternative considered:** Add a separate project overview and dependency document. Rejected for now because the current repository is small and the extra documents would duplicate the same baseline.

### Validate documentation without treating blocked builds as product failures

Use OpenSpec validation and the repository's Markdown lint command for the planning/documentation changes. Do not use the absent `src/` or Rust entrypoint as a reason to create placeholder code. Record package installation/build verification as blocked until ignored build scripts are explicitly handled by the project owner.

**Alternative considered:** Run or repair the full application build as part of this documentation change. Rejected because application entrypoints are absent and build-script approval changes the dependency execution policy.

## Risks / Trade-offs

- [The checkout may be changing while the baseline is authored] → Re-check manifests and file presence immediately before implementation and document the resulting state, not this snapshot's assumptions.
- [Manifest grouping may not reflect actual imports] → Label roles as declared or inferred, and do not claim a package is exercised while source files are absent.
- [Build validation is blocked by ignored package scripts and missing entrypoints] → Limit this change's acceptance checks to OpenSpec and Markdown validation; leave build restoration for a separate implementation change.
- [Existing uncommitted changes may own README or Copilot guidance] → During implementation, inspect and integrate current file contents; do not overwrite unrelated work.

## Migration Plan

1. Reconfirm repository files, manifests, lockfiles, and existing worktree changes.
2. Update the README and Copilot guidance to reflect the verified checkout and link to the new capability spec.
3. Validate the OpenSpec artifacts and lint the changed Markdown.
4. No application deployment or rollback is required. If the documentation conflicts with the restored implementation, revise the baseline from the implementation evidence before merging.
