#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const TASKS_DIR = resolve(ROOT, ".agents/tasks");

interface Progress {
  taskId: string;
  assignee: string;
  percent: number;
  status: "pending" | "in_progress" | "blocked" | "done";
  updatedAt: string;
  message: string;
  blocker: string | null;
  helpFrom: string | null;
}

function findProgressFile(taskId: string): string | null {
  const phases = ["phase-1", "phase-2", "phase-3"];
  for (const phase of phases) {
    const file = resolve(TASKS_DIR, phase, `${taskId}.progress`);
    if (existsSync(file)) return file;
  }
  return null;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(`
Usage: task-progress.ts <task-id> <percent> [--msg <message>] [--blocked <reason>] [--help-from <agent>]

Examples:
  task-progress.ts 1.1 50 --msg "Implementing function"
  task-progress.ts 1.1 --blocked "Need schema from content-engineer" --help-from content-engineer
`);
    process.exit(1);
  }

  const taskId = args[0];
  const percent = parseInt(args[1], 10);
  const msgIdx = args.indexOf("--msg");
  const blockedIdx = args.indexOf("--blocked");
  const helpIdx = args.indexOf("--help-from");

  const message = msgIdx !== -1 ? args[msgIdx + 1] : "Progress update";
  const blocker = blockedIdx !== -1 ? args[blockedIdx + 1] : null;
  const helpFrom = helpIdx !== -1 ? args[helpIdx + 1] : null;

  const progressFile = findProgressFile(taskId);
  if (!progressFile) {
    console.error(`✗ Progress file for ${taskId} not found. Run 'claim' first.`);
    process.exit(1);
  }

  const existing = JSON.parse(readFileSync(progressFile, "utf8")) as Progress;
  const updated: Progress = {
    ...existing,
    percent: isNaN(percent) ? existing.percent : percent,
    status: blocker ? "blocked" : percent >= 100 ? "done" : "in_progress",
    updatedAt: new Date().toISOString(),
    message,
    blocker,
    helpFrom,
  };

  writeFileSync(progressFile, JSON.stringify(updated, null, 2));
  console.log(`✓ Progress updated: ${taskId} - ${updated.percent}% - ${updated.status}`);
  if (blocker) console.log(`  ⚠ BLOCKED: ${blocker} (help from: ${helpFrom || "any"})`);
}

main();
