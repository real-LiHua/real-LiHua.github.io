#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const TASKS_DIR = resolve(ROOT, ".agents/tasks");

interface TaskMeta {
  id: string;
  title: string;
  phase: string;
  assignee: string;
  status: "pending" | "in_progress" | "blocked" | "done";
  dependencies: string[];
  priority: "critical" | "high" | "medium" | "low";
  estimated_hours: number;
}

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

function findTaskFile(taskId: string): string | null {
  const phases = ["phase-1", "phase-2", "phase-3"];
  for (const phase of phases) {
    const phaseDir = resolve(TASKS_DIR, phase);
    if (!existsSync(phaseDir)) continue;
    const files = readdirSync(phaseDir);
    for (const file of files) {
      if ((file.startsWith(`${taskId}-`) || file === `${taskId}.md`) && file.endsWith(".md")) {
        return resolve(phaseDir, file);
      }
    }
  }
  return null;
}

function parseTaskMeta(content: string): TaskMeta | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    const yaml = match[1];
    const meta: Record<string, string> = {};
    for (const line of yaml.split("\n")) {
      const [key, ...rest] = line.split(":");
      if (key && rest.length) {
        meta[key.trim()] = rest
          .join(":")
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
    return {
      id: meta.id || "",
      title: meta.title || "",
      phase: meta.phase || "",
      assignee: meta.assignee || "",
      status: (meta.status as any) || "pending",
      dependencies: meta.dependencies ? JSON.parse(meta.dependencies) : [],
      priority: (meta.priority as any) || "medium",
      estimated_hours: parseInt(meta.estimated_hours || "0", 10),
    };
  } catch {
    return null;
  }
}

function writeProgress(progress: Progress): void {
  const taskFile = findTaskFile(progress.taskId);
  if (!taskFile) throw new Error(`Task ${progress.taskId} not found`);
  const phaseDir = dirname(taskFile);
  const progressFile = resolve(phaseDir, `${progress.taskId}.progress`);
  writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  console.log(`✓ Progress written: ${progressFile}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args[0] !== "claim") {
    console.log(`
Usage: task-claim.ts claim <task-id> [--assignee <name>]

Example:
  task-claim.ts claim 1.1 --assignee cli-tool-engineer
`);
    process.exit(1);
  }

  const taskId = args[1];
  const assigneeIdx = args.indexOf("--assignee");
  const assignee = assigneeIdx !== -1 ? args[assigneeIdx + 1] : "unknown";

  const taskFile = findTaskFile(taskId);
  if (!taskFile) {
    console.error(`✗ Task ${taskId} not found in ${TASKS_DIR}`);
    process.exit(1);
  }

  const content = readFileSync(taskFile, "utf8");
  const meta = parseTaskMeta(content);
  if (!meta) {
    console.error(`✗ Failed to parse task metadata`);
    process.exit(1);
  }

  // Update task status
  const updatedContent = content.replace(/status:\s*["']?pending["']?/, "status: in_progress");
  writeFileSync(taskFile, updatedContent);

  // Create progress file
  const progress: Progress = {
    taskId: meta.id,
    assignee,
    percent: 0,
    status: "in_progress",
    updatedAt: new Date().toISOString(),
    message: "Task claimed, starting work",
    blocker: null,
    helpFrom: null,
  };
  writeProgress(progress);

  console.log(`✓ Claimed task ${taskId} (${meta.title}) by ${assignee}`);
}

main();
