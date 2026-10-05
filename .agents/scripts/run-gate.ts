#!/usr/bin/env node
// Run Quality Gate Script - Sub-agent Quality Gate
// Usage: pnpm exec tsx .agents/scripts/run-gate.ts <role-id> [--strict]

import { parseArgs } from "node:util";
import { execSync } from "node:child_process";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    strict: { type: "boolean", short: "s" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help || positionals.length === 0) {
  console.log(`
Usage: run-gate <role-id> [--strict]

Runs common + role-specific quality gates.

Roles:
  frontend-architect, content-engineer, build-deploy-engineer,
  cli-tool-engineer, search-discovery-engineer, quality-dx-guardian

Example:
  run-gate frontend-architect
  run-gate cli-tool-engineer --strict
`);
  process.exit(values.help ? 0 : 1);
}

const role = positionals[0];
const strict = values.strict === true;

const validRoles = [
  "frontend-architect",
  "content-engineer",
  "build-deploy-engineer",
  "cli-tool-engineer",
  "search-discovery-engineer",
  "quality-dx-guardian",
];

if (!validRoles.includes(role)) {
  console.error(`Error: Invalid role. Must be one of: ${validRoles.join(", ")}`);
  process.exit(1);
}

console.log(`🔍 Running quality gates for role: ${role}${strict ? " (strict mode)" : ""}\n`);

const runCmd = (cmd: string, label: string): boolean => {
  try {
    execSync(cmd, { stdio: "pipe" });
    console.log(`  ✓ ${label}`);
    return true;
  } catch (e) {
    console.error(`  ✗ ${label}: ${(e as Error).message}`);
    return false;
  }
};

// Common gates
const commonResults = {
  tsc: runCmd("pnpm tsc -b", "TypeScript check"),
  oxlint: runCmd("pnpm oxlint", "Oxlint"),
  oxfmt: runCmd("pnpm oxfmt --check", "Oxfmt check"),
  build: runCmd("pnpm build", "Build"),
};

// Role-specific gates
const roleGates: Record<string, [string, string][]> = {
  "frontend-architect": [
    ["pnpm playwright test --project=chromium", "Playwright (Chromium)"],
  ],
  "content-engineer": [
    ["pnpm build && node -e \"require('./dist/server/entry.mjs')\"", "Content pipeline + RSS"],
  ],
  "build-deploy-engineer": [
    ["lychee dist/client", "Link check (lychee)"],
    ["vnu --skip-non-html dist/client", "HTML validate (vnu)"],
  ],
  "cli-tool-engineer": [
    ["cargo test -p post-edit", "Cargo test"],
    ["cargo clippy -p post-edit", "Cargo clippy"],
    ["cargo audit", "Cargo audit"],
  ],
  "search-discovery-engineer": [
    ["pnpm build && ls dist/client/pagefind/*.json", "Pagefind index exists"],
  ],
  "quality-dx-guardian": [
    ["pnpm playwright test", "Full Playwright suite"],
  ],
};

const specificResults: Record<string, boolean> = {};
for (const [cmd, label] of roleGates[role] || []) {
  specificResults[label] = runCmd(cmd, label);
}

const allPassed = [
  ...Object.values(commonResults),
  ...Object.values(specificResults),
].every(r => r);

if (strict) {
  // In strict mode, also check for warnings
  try {
    execSync("pnpm oxlint 2>&1 | grep -i warning", { stdio: "pipe" });
    console.warn("  ⚠ Strict mode: Oxlint warnings detected");
  } catch {
    // No warnings
  }
}

console.log(`\n${allPassed ? "✅ ALL GATES PASSED" : "❌ SOME GATES FAILED"}`);

if (!allPassed) {
  process.exit(1);
}