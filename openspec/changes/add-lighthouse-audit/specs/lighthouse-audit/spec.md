# Spec: lighthouse-audit

## Purpose

Define how the repository measures built-site quality with Lighthouse so the reader-facing output is audited repeatably, locally, and without inventing budgets in this change.

## ADDED Requirements

### Requirement: Audit the production build, not the dev server

The audit tooling SHALL build the site and compare its production output, served through the same standalone Node server used by `pnpm preview`-style deployments, before running Lighthouse.

#### Scenario: Audit input

- **WHEN** the audit script runs,
- **THEN** it executes `astro build` (or reuses an up-to-date `dist/`), starts the built server on a local port, waits for it to answer, and only then launches Chrome for Lighthouse.

### Requirement: Representative built routes

The audit SHALL cover at least the home page, one article page, and the search entry, and SHALL allow the route list to be overridden from the command line.

#### Scenario: Default route set

- **WHEN** the audit runs without arguments,
- **THEN** it audits `/`, `/posts/first-reading/`, and `/search/` and prints one summary row per route.

#### Scenario: Custom routes

- **WHEN** the audit is invoked with explicit paths,
- **THEN** it audits exactly those paths instead of the defaults.

### Requirement: Four Lighthouse categories

Every audited route SHALL run with the `performance`, `accessibility`, `best-practices`, and `seo` categories enabled, and the per-route summary SHALL report all four scores.

#### Scenario: Summary output

- **WHEN** an audit completes for a route,
- **THEN** the output includes the four category scores (0–100) for that route.

### Requirement: Reports are local artifacts, not committed content

Lighthouse JSON/HTML reports SHALL be written under `.cache/lighthouse/` (gitignored) so auditing the site never adds generated files to the repository.

#### Scenario: Report location

- **WHEN** the audit finishes,
- **THEN** findings are available under `.cache/lighthouse/` and no report file appears in `git status`.

### Requirement: Failing audits are distinguishable from low scores

The audit command SHALL exit non-zero when Lighthouse itself errors (Chrome missing, server did not start, evaluation failed) and SHALL NOT fail merely because a category scores below an arbitrary threshold; no budgets or assertions are enforced by this capability yet.

#### Scenario: Chrome missing

- **WHEN** no Chrome/Chromium binary is found and `CHROME_PATH` is unset,
- **THEN** the script exits non-zero with a message naming the searched locations/environment variable.

#### Scenario: Low performance score

- **WHEN** a route audits successfully but scores low in a category,
- **THEN** the script still exits zero and reports the score.
