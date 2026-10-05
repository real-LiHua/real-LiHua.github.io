#!/usr/bin/env node
// Task Progress Script - Sub-agent Communication Protocol
// Usage: pnpm exec tsx .agents/scripts/task-progress.ts <task-id> <percent> [--msg <message>] [--blocked <reason>] [--help-from <role-id>]

import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    msg: { type: "string", short: "m" },
    blocked: { type: "string", short: "b" },
    "help-from": { type: "string", short: "h" },
    help: { type: "boolean" },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help || positionals.length < 2) {
  console.log(`
Usage: task-progress <task-id> <percent> [--msg <message>] [--blocked <reason>] [--help-from <role-id>]

Updates task progress percentage and status.

Examples:
  task-progress 1.1 50 --msg "Implementing types export"
  task-progress 2.1 75 --blocked "Waiting for schema types" --help-from content-engineer
  task-progress 3.1 100 --msg "Completed component refactor"
`);
  process.exit(values.help ? 0 : 1);
}

const taskId = positionals[0];
const percent = parseInt(positionals[1], 10);

if (isNaN(percent) || percent < 0 || percent > 100) {
  console.error("Error: percent must be 0-100");
  process.exit(1);
}

const progressFile = join(process.cwd(), ".agents", "tasks", `${taskId}.progress`);

if (!existsSync(progressFile)) {
  console.error(`Error: Progress file not found: ${progressFile}`);
  console.error("  Run task-claim first to initialize progress");
  process.exit(1);
}

const progress = JSON.parse(readFileSync(progressFile, "utf-8"));

progress.percent = percent;
progress.updatedAt = new Date().toISOString();

if (values.msg) {
  progress.message = values.msg;
}

if (values.blocked) {
  progress.status = "blocked";
  progress.blocker = values.blocked;
  if (values["help-from"]) {
    progress.helpFrom = values["help-from"];
  }
  console.log(`🚫 Task ${taskId} BLOCKED: ${values.blocked}`);
  if (values["help-from"]) {
    console.log(`   Help requested from: ${values["help-from"]}`);
  }
} else if (percent === 100) {
  progress.status = "done";
  progress.blocker = null;
  progress.helpFrom = null;
  console.log(`✅ Task ${taskId} marked as done (100%)`);
} else {
  progress.status = "in_progress";
  console.log(`📈 Task ${taskId} progress: ${percent}% - ${values.msg || progress.message}`);
}

writeFileSync(progressFile, JSON.stringify(progress, null, 2));
