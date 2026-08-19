#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const TASKS_DIR = resolve(ROOT, ".agents/tasks");

interface GateResult {
  taskId: string;
  role: string;
  timestamp: string;
  common: Record<string, "pass" | "fail">;
  specific: Record<string, "pass" | "fail">;
  overall: "pass" | "fail";
}

const ROLE_GATES: Record<string, { common: string[]; specific: string[] }> = {
  "frontend-architect": {
    common: ["pnpm tsc -b", "pnpm oxlint", "pnpm oxfmt --check", "pnpm build"],
    specific: ["pnpm exec playwright test --project=chromium"],
  },
  "content-engineer": {
    common: ["pnpm tsc -b", "pnpm oxlint", "pnpm oxfmt --check", "pnpm build"],
    specific: [],
  },
  "build-deploy-engineer": {
    common: ["pnpm tsc -b", "pnpm oxlint", "pnpm oxfmt --check", "pnpm build"],
    specific: [
      "lychee dist/client",
      "vnu --skip-non-html --filterfile message-filters.txt dist/client",
    ],
  },
  "cli-tool-engineer": {
    common: [],
    specific: ["cargo test", "cargo clippy -p post-edit", "cargo audit"],
  },
  "search-discovery-engineer": {
    common: ["pnpm tsc -b", "pnpm oxlint", "pnpm oxfmt --check", "pnpm build"],
    specific: [],
  },
  "quality-dx-guardian": {
    common: ["pnpm tsc -b", "pnpm oxlint", "pnpm oxfmt --check", "pnpm build"],
    specific: ["pnpm exec playwright test"],
  },
};

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

function findTaskMeta(taskId: string): { assignee: string; phase: string } | null {
  const taskFile = findTaskFile(taskId);
  if (!taskFile) return null;
  const content = readFileSync(taskFile, "utf8");
  const match = content.match(/assignee:\s*["']?(\w+)["']?/);
  if (!match) return null;
  const phase = taskFile.split("/").slice(-2, -1)[0];
  return { assignee: match[1], phase };
}

function runCommand(cmd: string): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: "pipe", timeout: 120000 });
    return { success: true, output: output.trim() };
  } catch (e: any) {
    return { success: false, output: e.stdout?.toString() || e.message };
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args[0] === "--help") {
    console.log(`
Usage: task-complete.ts <task-id> [--skip-gate]

Runs quality gates and marks task as done.
`);
    process.exit(1);
  }

  const taskId = args[0];
  const skipGate = args.includes("--skip-gate");

  const meta = findTaskMeta(taskId);
  if (!meta) {
    console.error(`✗ Task ${taskId} not found`);
    process.exit(1);
  }

  const progressFile = resolve(TASKS_DIR, meta.phase, `${taskId}.progress`);
  if (!existsSync(progressFile)) {
    console.error(`✗ Progress file not found. Run 'claim' first.`);
    process.exit(1);
  }

  const progress = JSON.parse(readFileSync(progressFile, "utf8"));
  const role = meta.assignee;

  console.log(`\n=== Quality Gate for ${taskId} (${role}) ===`);

  if (!skipGate) {
    const gates = ROLE_GATES[role] || { common: [], specific: [] };
    const allCommands = [...gates.common, ...gates.specific];
    const results: Record<string, "pass" | "fail"> = {};

    for (const cmd of allCommands) {
      process.stdout.write(`  Running: ${cmd} ... `);
      const result = runCommand(cmd);
      results[cmd] = result.success ? "pass" : "fail";
      console.log(result.success ? "✓" : "✗");
      if (!result.success) {
        console.log(`    Output: ${result.output.slice(0, 200)}`);
      }
    }

    const overall = Object.values(results).every((r) => r === "pass") ? "pass" : "fail";

    const gateResult: GateResult = {
      taskId,
      role,
      timestamp: new Date().toISOString(),
      common: Object.fromEntries(gates.common.map((c) => [c, results[c]])) as any,
      specific: Object.fromEntries(gates.specific.map((c) => [c, results[c]])) as any,
      overall,
    };

    const gateFile = resolve(TASKS_DIR, meta.phase, `${taskId}.gate.json`);
    writeFileSync(gateFile, JSON.stringify(gateResult, null, 2));
    console.log(`\nGate result: ${overall.toUpperCase()}`);
    console.log(`Saved to: ${gateFile}`);

    if (overall === "fail") {
      console.error("\n✗ Quality gate FAILED. Fix issues before completing.");
      process.exit(1);
    }
  }

  // Update task status to done
  const taskFile = findTaskFile(taskId);
  if (taskFile) {
    let content = readFileSync(taskFile, "utf8");
    content = content.replace(/status:\s*["']?in_progress["']?/, "status: done");
    writeFileSync(taskFile, content);
  }

  // Update progress
  progress.percent = 100;
  progress.status = "done";
  progress.updatedAt = new Date().toISOString();
  progress.message = "Task completed, quality gate passed";
  writeFileSync(progressFile, JSON.stringify(progress, null, 2));

  console.log(`\n✓ Task ${taskId} marked as DONE`);
}

main();
