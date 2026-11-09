# Design

## Context

See `proposal.md` for motivation and `specs/project-baseline/spec.md` for the required documentation behavior.

The current checkout has `README.md`, `package.json`, `pnpm-lock.yaml`, `Cargo.toml`, TypeScript/Astro tooling configuration, Playwright configuration, and GitHub Copilot setup files. It does not have `src/`, `tests/`, an Astro config, the Rust binary path declared in `Cargo.toml`, or any main capability specs under `openspec/specs/`. The README links to capability specs that are currently absent, and `.github/copilot-instructions.md` describes a different repository layout and missing files. Treat these as documentation drift, not evidence that the described features exist.

`package.json` declares pnpm 11.3.0 and Astro 7.4.4. Its direct dependencies are grouped as follows; the categories describe manifest placement and package roles suggested by names, not verified imports:

| Declared group                                     | Packages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Astro and integrations                             | `astro`, `@astrojs/markdown-satteri`, `@astrojs/mdx`, `@astrojs/node`, `@astrojs/rss`, `@astrojs/sitemap`, `@astrojs/ts-plugin`, `expressive-code-language-badge`                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Styling, content, and rendering                    | `@tailwindcss/typography`, `@tailwindcss/vite`, `@xingwangzhe/satteri-mermaid`, `animate.css`, `mdast-util-toc`, `mermaid`, `satteri`, `tailwindcss`, `typescript`, `vite-plugin-font`                                                                                                                                                                                                                                                                                                                                                                                            |
| Validation, authoring, and tests (devDependencies) | `@astrojs/check`, `@fission-ai/openspec`, `@fontsource/twinkle-star`, `@mermaid-js/mermaid-cli`, `@playwright/mcp`, `@playwright/test`, `@shikijs/colorized-brackets`, `@tailwindcss/postcss`, `@tgcloud/cli`, `@types/hast`, `@types/mdast`, `astro-favicons`, `astro-minify-html-swc`, `dayjs`, `execa`, `hast-util-from-html`, `hast-util-to-html`, `hast-util-to-text`, `husky`, `jsonc-parser`, `lint-staged`, `markdownlint`, `markdownlint-cli2`, `mermaid-wasm-renderer`, `oxfmt`, `oxlint`, `pagefind`, `playwright`, `shadcn`, `skills`, `tinyglobby`, `tsx`, `vnu-jar` |

`Cargo.toml` declares a Rust 2024 package named `post-edit`, with `anyhow`, `bat`, `chrono`, `clap` (derive), `gray_matter` (YAML), `itertools`, `pinyin`, `serde`, `skim`, and `slug`. Its binary path is `src/rust/main.rs`, which is absent, and there is no `Cargo.lock`.

The package scripts expose Astro dev/check/build/preview commands, Pagefind post-build indexing, Playwright tests, Markdown linting, `post-edit`, watermark verification, and `tgcloud` operations. The watermark script path is absent. OpenSpec is a dev dependency, and `shadcn` is declared as development tooling for initializing and managing project-owned UI components. `vite-plugin-font` is currently declared as a direct runtime dependency but does not include font files; the UI change now plans to use it only in GitHub Actions to optimize the latest stable official Maple Mono Normal NF CN TTF/OTF release. Its implementation should move the plugin to `devDependencies`; local development uses the developer's installed system font. The build will cache and checksum-verify the release archive and emit local WOFF2 subsets with the SIL OFL 1.1 attribution. pnpm reported its lockfile up to date during dependency status checking, but installation stopped because build scripts for esbuild, puppeteer, sharp, and vnu-jar are ignored. This is not a successful build or runtime verification.

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

Document direct dependencies from `package.json` and `Cargo.toml`; use lockfiles only to report resolved state. Link to manifests instead of copying every version range into multiple documents. Group dependencies using their declared manifest section and explain inferred purposes as such, because the absent source tree prevents verifying actual usage. Do not expand a direct-dependency baseline into a transitive package inventory.

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
