# Tasks

## 1. Add the dependency and script

- [x] 1.1 Add `lighthouse` as a devDependency with `pnpm add -D lighthouse`; confirm `pnpm-lock.yaml` updates and `node_modules/.bin/lighthouse` exists.
- [x] 1.2 Add `scripts/lighthouse-audit.mjs`: build (skip only with `--skip-build`), start `node ./dist/server/entry.mjs` on `HOST=127.0.0.1` with a high default `PORT` (override via env), poll until ready, audit each route (defaults `/`, `/posts/first-reading/`, `/search/`; CLI args replace them) with the `performance`, `accessibility`, `best-practices`, `seo` categories via the Lighthouse Node API, write JSON reports under `.cache/lighthouse/`, print a per-route four-score summary, and `SIGTERM` the server in a `finally` block.
- [x] 1.3 Chrome discovery in the script: `CHROME_PATH`, then `google-chrome`/`chromium`/`chromium-browser` on `PATH`; non-zero with the searched names when none is found; pass `--headless=new` and `--no-sandbox` when needed.
- [x] 1.4 Add a `lighthouse` script entry to `package.json` (`node scripts/lighthouse-audit.mjs`).

## 2. Verify the audit end to end

- [x] 2.1 Run `pnpm run lighthouse`; confirm all three routes audit successfully, the four scores print per route, reports exist under `.cache/lighthouse/`, and `git status` shows no reports.
- [x] 2.2 Confirm `node scripts/lighthouse-audit.mjs /posts/small-steps/ --skip-build` audits exactly `/posts/small-steps/` instead of the defaults (also checked `/rss.xml`, which audits to `n/a` scores without failing).
- [x] 2.3 Confirm `CHROME_PATH=/nonexistent node scripts/lighthouse-audit.mjs / --skip-build` fails non-zero with the actionable message and leaves no orphaned server process.

## 3. Document and validate

- [x] 3.1 Add a `pnpm run lighthouse` row to the checks table in `README.md`.
- [x] 3.2 Validate the change with `node_modules/.bin/openspec validate add-lighthouse-audit --strict`; fix any reported issues in the change artifacts.
- [x] 3.3 Lint the changed Markdown (`node_modules/.bin/markdownlint-cli2 README.md 'openspec/changes/add-lighthouse-audit/**/*.md'`).
