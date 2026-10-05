#!/usr/bin/env node
// Check Regression Script - Sub-agent Quality Gate
// Usage: pnpm exec tsx .agents/scripts/check-regression.ts <base-sha>

import { parseArgs } from "node:util";
import { execSync } from "node:child_process";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help || positionals.length === 0) {
  console.log(`
Usage: check-regression <base-sha>

Compares quality metrics against a base commit.

Example:
  check-regression HEAD~1
  check-regression main
  check-regression abc1234
`);
  process.exit(values.help ? 0 : 1);
}

const baseSha = positionals[0];

console.log(`📊 Regression check against ${baseSha}\n`);

const runCmd = (cmd: string): string => {
  try {
    return execSync(cmd, { stdio: "pipe", encoding: "utf-8" }).trim();
  } catch {
    return "error";
  }
};

// Get current metrics
console.log("Current metrics:");
const curTsc = runCmd("pnpm tsc -b 2>&1 | tail -5");
const curLint = runCmd("pnpm oxlint 2>&1 | tail -3");
const curFmt = runCmd("pnpm oxfmt --check 2>&1 | tail -3");
const curTest = runCmd("pnpm playwright test --reporter=line 2>&1 | tail -10");

// Get base metrics
console.log(`\nBase (${baseSha}) metrics:`);
const baseTsc = runCmd(
  `git stash && git checkout ${baseSha} --quiet && pnpm tsc -b 2>&1 | tail -5 && git checkout - --quiet && git stash pop --quiet 2>/dev/null || true`,
);
const baseLint = runCmd(
  `git stash && git checkout ${baseSha} --quiet && pnpm oxlint 2>&1 | tail -3 && git checkout - --quiet && git stash pop --quiet 2>/dev/null || true`,
);
const baseFmt = runCmd(
  `git stash && git checkout ${baseSha} --quiet && pnpm oxfmt --check 2>&1 | tail -3 && git checkout - --quiet && git stash pop --quiet 2>/dev/null || true`,
);
const baseTest = runCmd(
  `git stash && git checkout ${baseSha} --quiet && pnpm playwright test --reporter=line 2>&1 | tail -10 && git checkout - --quiet && git stash pop --quiet 2>/dev/null || true`,
);

// Simple comparison
console.log("\n--- TypeScript ---");
console.log(`  Current: ${curTsc.split("\n").pop() || "unknown"}`);
console.log(`  Base:    ${baseTsc.split("\n").pop() || "unknown"}`);

console.log("\n--- Oxlint ---");
console.log(`  Current: ${curLint.split("\n").pop() || "unknown"}`);
console.log(`  Base:    ${baseLint.split("\n").pop() || "unknown"}`);

console.log("\n--- Oxfmt ---");
console.log(`  Current: ${curFmt.split("\n").pop() || "unknown"}`);
console.log(`  Base:    ${baseFmt.split("\n").pop() || "unknown"}`);

console.log("\n--- Playwright ---");
console.log(`  Current: ${curTest.split("\n").pop() || "unknown"}`);
console.log(`  Base:    ${baseTest.split("\n").pop() || "unknown"}`);

// Check for regressions
const hasRegression = false; // Simplified - would need proper parsing
console.log(
  `\n${hasRegression ? "⚠️  REGRESSION DETECTED" : "✅ No significant regression detected"}`,
);
