# Proposal

## Why

The current checkout is in a transitional state: its manifests describe an Astro site and a Rust post-edit CLI, but their entrypoints and tests are absent. Existing README and Copilot guidance describe capabilities and files that are not present. A verified, checkout-based baseline is needed so future implementation and dependency decisions are made against current evidence rather than stale assumptions.

## What Changes

- Define a `project-baseline` capability for maintaining an accurate, evidence-based description of the repository, toolchain, dependencies, and implementation status.
- Record the current dependency roles, available scripts, repository structure, and lockfile status in the design.
- Require documentation to distinguish declared tooling from implemented behavior, and to identify absent or unverified components rather than infer them from old guidance.

## Capabilities

### New Capabilities

- `project-baseline`: Current project structure, toolchain, dependency roles, and implementation status are documented from repository evidence and kept aligned with their source manifests.

### Modified Capabilities

None.

## Impact

Planning artifacts only in this change. The future documentation work concerns `README.md`, `.github/copilot-instructions.md`, and the project baseline spec. It does not change application code or dependencies. The checkout currently has no `src/`, `tests/`, Astro configuration, Rust CLI entrypoint, or existing `openspec/specs/` capabilities. `package.json` and `pnpm-lock.yaml` describe the JavaScript dependency set; `Cargo.toml` declares Rust dependencies, but no `Cargo.lock` or Rust entrypoint is present.
