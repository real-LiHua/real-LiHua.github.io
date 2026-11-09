# Tasks

## 1. Align project entrypoint documentation

- [x] 1.1 Update `README.md` to describe the verified repository, toolchain, available scripts, and missing implementation areas; replace links to absent capability specs with links that exist, then verify every README link resolves and Markdown lint passes for the file.
- [x] 1.2 Update `.github/copilot-instructions.md` to match the current repository layout and commands, distinguishing declared tooling from implemented behavior; verify referenced paths and package scripts exist and Markdown lint passes for the file.

## 2. Verify the project baseline

- [x] 2.1 Compare the published dependency overview and implementation-status statements with `package.json`, `pnpm-lock.yaml`, `Cargo.toml`, and the current file tree; verify discrepancies and absent entrypoints are labeled accurately.
- [x] 2.2 Validate the change and its scenarios with `node_modules/.bin/openspec validate document-project-dependency-baseline --strict`, then lint `README.md`, `.github/copilot-instructions.md`, and all change artifacts with `node_modules/.bin/markdownlint-cli2 README.md .github/copilot-instructions.md 'openspec/changes/document-project-dependency-baseline/**/*.md'`.
