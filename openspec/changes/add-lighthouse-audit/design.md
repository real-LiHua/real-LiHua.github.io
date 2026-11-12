# Design

## Context

See `proposal.md` for motivation and `specs/lighthouse-audit/spec.md` for the required behavior. The site builds to a Node standalone server (`output: "server"`, `@astrojs/node`), so Lighthouse must run against that served production build rather than against `astro dev`. Chrome is not installed as `google-chrome` on the developer machine; `chromium` exists at `/usr/bin/chromium` and Playwright ships a headless shell, so Chrome discovery must handle the Chromium binary explicitly. `.cache/` is already gitignored, which suits generated reports.

## Goals / Non-Goals

**Goals:**

- Add a repeatable local audit (`pnpm`-scriptable command) for the built site covering `/`, one article, and `/search/` by default, overridable from the CLI.
- Report all four Lighthouse categories per route; exit non-zero only on audit failure.
- Keep generated reports out of git (`.cache/lighthouse/`).
- Reuse the production standalone server rather than adding a new static-file server.

**Non-Goals:**

- No CI integration, budgets, score assertions, or Lighthouse CI (`@lhci/cli`) in this change.
- No committed HTML/JSON reports, and no changes to site markup or CSS to chase scores.
- No mobile-emulation breakpoints or throttling profiles beyond Lighthouse defaults in this change.

## Decisions

### Drive Lighthouse programmatically through its Node API with chrome-launcher

Use the `lighthouse` package's Node API (`lighthouse(url, options)`) with `chrome-launcher` to own Chrome lifecycle, instead of shelling out to the CLI. The script controls startup ordering (server ready before audit), chrome flags (`--headless=new`, `--no-sandbox` when root is required), output artifacts, and exit codes in one place.

**Alternative considered:** `lighthouse` CLI via `exec`. Rejected: output parsing for route/score mapping and error classification would be brittle, and the script would still need server lifecycle management around it.

### Serve the built standalone output, don't add a static server

Build with `pnpm build` (or reuse an existing `dist/` when invoked with a flag), start `node ./dist/server/entry.mjs` with `HOST=127.0.0.1` and an OS-chosen or fixed local `PORT`, poll until `/` returns, audit, then `SIGTERM` the server.

**Alternative considered:** serve `dist/` statically with a file server. Rejected: the deploy target is the Node standalone server (adapter `node`), so the audit must exercise the same output path.

### Chrome discovery: explicit search, then actionable error

Resolve Chrome in this order: `CHROME_PATH` env var, `google-chrome`, `chromium`, `chromium-browser` on `PATH`. If none is found, exit non-zero and print the searched names plus how to set `CHROME_PATH`. Do not auto-download Chrome in this change; developers on this machine have `/usr/bin/chromium`.

**Alternative considered:** auto-download Chrome for Testing on first run. Rejected for now: adds a network dependency and cache semantics to a measurement script; revisit if CI adoption is wanted.

### Default routes and CLI overrides

Default routes: `/`, `/posts/first-reading/`, `/search/`. Any arguments passed to the script replace the defaults (`node scripts/lighthouse-audit.mjs / /rss.xml`). Scores print as a compact table; raw JSON is kept in `.cache/lighthouse/<route>-<timestamp>.json`.

**Alternative considered:** audit every emitted HTML file (large and slow). Rejected: the three defaults cover home, an article, and the client-side-ish search page, which dominate what the reader touches.

### No budgets yet

This change wires measurement only. Score thresholds, category gating, and Lighthouse CI come in a follow-up change once baseline numbers exist. The script therefore never fails on a low score, only on audit errors.

## Risks / Trade-offs

- [Audits vary with machine load] → Keep audits sequential, report scores as evidence not gates, and document variance; consider `--quiet` runs in a quiet environment when baselining.
- [Chromium sandboxing fails in this environment] → pass `--no-sandbox` when running as root or when chrome-launcher reports sandbox failure; keep the flag opt-out documented.
- [Server port collision] → bind to an ephemeral port by default (`PORT=0` is unsupported by the entry; pick a high default like `4399` and allow override via env) and fail loudly with the address on startup errors.
- [`dist/` staleness] → the script always rebuilds unless `--skip-build` is passed explicitly, so audits never measure yesterday's output.

## Migration Plan

1. `pnpm add -D lighthouse` and regenerate the lockfile.
2. Add `scripts/lighthouse-audit.mjs` and a `pnpm run lighthouse` script entry.
3. Run the audit on this machine; fix script bugs (not site scores) until it completes and `.cache/lighthouse/` holds the reports.
4. Document the command in `README.md`'s checks table; mark `.cache/lighthouse/` covered by the existing `.cache/` ignore rule (verify).
5. No deployment changes; rollback is removing the script, the script entry, and the dependency.
