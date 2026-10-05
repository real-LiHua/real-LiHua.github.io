#!/usr/bin/env node
// Task Claim Script - Sub-agent Communication Protocol
// Usage: pnpm exec tsx .agents/scripts/task-claim.ts <task-id> --assignee <role-id>

import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    assignee: { type: "string", short: "a" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help || positionals.length === 0) {
  console.log(`
Usage: task-claim <task-id> --assignee <role-id>

Claims a task for the given role, creates progress file.

Example:
  task-claim 1.1 --assignee frontend-architect
  task-claim phase-2/2.1 --assignee build-deploy-engineer
`);
  process.exit(values.help ? 0 : 1);
}

const taskId = positionals[0];
const assignee = values.assignee;

if (!assignee) {
  console.error("Error: --assignee is required");
  process.exit(1);
}

const tasksDir = join(process.cwd(), ".agents", "tasks");
const taskFile = join(tasksDir, `${taskId}.md`);
const progressFile = join(tasksDir, `${taskId}.progress`);

if (!existsSync(taskFile)) {
  console.error(`Error: Task file not found: ${taskFile}`);
  process.exit(1);
}

// Read task metadata
const taskContent = readFileSync(taskFile, "utf-8");
const statusMatch = taskContent.match(/^status:\s*(\w+)/m);
const currentStatus = statusMatch ? statusMatch[1] : "pending";

if (currentStatus === "done") {
  console.error(`Error: Task ${taskId} is already completed`);
  process.exit(1);
}

if (currentStatus === "in_progress") {
  console.warn(`Warning: Task ${taskId} already in progress`);
}

// Create progress file
const progress = {
  taskId,
  assignee,
  percent: 0,
  status: "in_progress",
  updatedAt: new Date().toISOString(),
  message: "Task claimed",
  blocker: null,
  helpFrom: null,
};

const progressDir = dirname(progressFile);
if (!existsSync(progressDir)) {
  mkdirSync(progressDir, { recursive: true });
}

writeFileSync(progressFile, JSON.stringify(progress, null, 2));
console.log(`✓ Claimed task ${taskId} for ${assignee}`);
console.log(`  Progress file: ${progressFile}`);

// Update task file status
const updatedContent = taskContent.replace(
  /^status:\s*\w+/m,
  `status: in_progress`
).replace(
  /^assignee:\s*.*/m,
  `assignee: ${assignee}`
);
writeFileSync(taskFile, updatedContent);
console.log(`  Updated task status: in_progress`);