#!/usr/bin/env node
// Task Complete Script - Sub-agent Communication Protocol
// Usage: pnpm exec tsx .agents/scripts/task-complete.ts <task-id> [--skip-gate]

import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    "skip-gate": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help || positionals.length === 0) {
  console.log(`
Usage: task-complete <task-id> [--skip-gate]

Completes a task, runs quality gates, archives outputs.

Example:
  task-complete 1.1
  task-complete 2.1 --skip-gate
`);
  process.exit(values.help ? 0 : 1);
}

const taskId = positionals[0];
const skipGate = values["skip-gate"] === true;

const tasksDir = join(process.cwd(), ".agents", "tasks");
const progressFile = join(tasksDir, `${taskId}.progress`);
const gateFile = join(tasksDir, `${taskId}.gate.json`);
const taskFile = join(tasksDir, `${taskId}.md`);

if (!existsSync(progressFile)) {
  console.error(`Error: Progress file not found: ${progressFile}`);
  process.exit(1);
}

const progress = JSON.parse(readFileSync(progressFile, "utf-8"));

if (progress.status === "blocked" && !skipGate) {
  console.error(`Error: Task ${taskId} is blocked: ${progress.blocker}`);
  console.error("  Resolve blocker first or use --skip-gate (not recommended)");
  process.exit(1);
}

console.log(`🔍 Running quality gates for task ${taskId}...`);

const gateResult = {
  taskId,
  role: progress.assignee,
  timestamp: new Date().toISOString(),
  common: {} as Record<string, string>,
  specific: {} as Record<string, string>,
  overall: "pass" as "pass" | "fail",
};

const runCmd = (cmd: string, label: string): boolean => {
  try {
    execSync(cmd, { stdio: "pipe", cwd: process.cwd() });
    console.log(`  ✓ ${label}`);
    return true;
  } catch (e) {
    console.error(`  ✗ ${label}: ${(e as Error).message}`);
    return false;
  }
};

// Common gates
gateResult.common.tsc = runCmd("pnpm tsc -b", "TypeScript check") ? "pass" : "fail";
gateResult.common.oxlint = runCmd("pnpm oxlint", "Oxlint") ? "pass" : "fail";
gateResult.common.oxfmt = runCmd("pnpm oxfmt --check", "Oxfmt check") ? "pass" : "fail";
gateResult.common.build = runCmd("pnpm build", "Build") ? "pass" : "fail";

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

const specificGates = roleGates[progress.assignee] || [];
for (const [cmd, label] of specificGates) {
  gateResult.specific[label.toLowerCase().replace(/\s+/g, "-")] = runCmd(cmd, label) ? "pass" : "fail";
}

// Determine overall
const allResults = [
  ...Object.values(gateResult.common),
  ...Object.values(gateResult.specific),
];
gateResult.overall = allResults.every(r => r === "pass") ? "pass" : "fail";

writeFileSync(gateFile, JSON.stringify(gateResult, null, 2));

if (gateResult.overall === "fail") {
  console.error(`\n❌ Quality gate FAILED for task ${taskId}`);
  console.error(`   Gate report: ${gateFile}`);
  console.error(`   Fix issues and re-run task-complete`);
  process.exit(1);
}

console.log(`\n✅ All quality gates PASSED`);

// Update task file status
if (existsSync(taskFile)) {
  const taskContent = readFileSync(taskFile, "utf-8");
  const updatedContent = taskContent
    .replace(/^status:\s*\w+/m, "status: done")
    .replace(/^completedAt:\s*.*/m, `completedAt: ${new Date().toISOString()}`)
    .replace(/^outputs:\s*$/m, `outputs: [${progress.message}]`);
  writeFileSync(taskFile, updatedContent);
}

console.log(`📦 Task ${taskId} completed and archived`);
console.log(`   Gate report: ${gateFile}`);