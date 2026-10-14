#!/usr/bin/env tsx
/**
 * Task-complete — 完成任务，自动运行质量门禁并回写进度。
 *
 * 用法: pnpm exec tsx .agents/scripts/task-complete.ts <task-id> [--strict] [--skip-gate] [--role
 * <role-id>] [--json]
 *
 * 行为:
 *
 * 1. 读取 `<id>.progress` 得到 assignee（或用 --role 覆盖）
 * 2. 运行通用 + 角色专属门禁（复用 run-gate.ts）
 * 3. 写出 `<id>.gate.json`
 * 4. 通过 → 进度标记 done / 100%；失败 → blocked，并写出 `<id>.gate.failure.json`
 * 5. --skip-gate → 跳过门禁，但仍写 `<id>.gate.failure.json` 以便 24h 内补跑
 *
 * 规格: .agents/onboarding/01-communication-protocol.md · 02-quality-gates.md §5/§10
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  findRepoRoot,
  ROLE_IDS,
  runGate,
  writeGateFile,
  type GateResult,
  type RoleId,
} from "./run-gate.ts";

type TaskStatus = "pending" | "in_progress" | "blocked" | "done";

interface TaskProgress {
  taskId: string;
  assignee: RoleId | null;
  percent: number;
  status: TaskStatus;
  updatedAt: string;
  message: string;
  blocker: string | null;
  helpFrom: RoleId | null;
}

const REPO_ROOT = findRepoRoot();

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function phaseDir(taskId: string): string | null {
  const phase = taskId.split(".")[0];
  const dir = join(REPO_ROOT, ".agents", "tasks", `phase-${phase}`);
  return existsSync(dir) ? dir : null;
}

function taskPath(taskId: string, suffix: string): string | null {
  const dir = phaseDir(taskId);
  return dir ? join(dir, `${taskId}.${suffix}`) : null;
}

interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        index += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(token);
    }
  }
  return { positionals, flags };
}

function printHelp(): void {
  console.log(`task-complete — 完成任务并运行质量门禁

用法:
  pnpm exec tsx .agents/scripts/task-complete.ts <task-id> [options]

选项:
  --role <role-id>  覆盖进度文件中的 assignee
  --strict          任何 warning 视为门禁失败
  --skip-gate       紧急跳过门禁（记录 gate.failure.json，需 24h 内补跑）
  --json            以 JSON 输出门禁结果
  --help            显示帮助

角色: ${ROLE_IDS.join(", ")}
`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }
  const { positionals, flags } = parseArgs(argv);
  const taskId = positionals[0];
  if (!taskId) {
    console.error("✗ 缺少任务 ID，例如: task-complete.ts 1.1");
    process.exit(1);
  }

  const progressFile = taskPath(taskId, "progress");
  if (!progressFile) {
    console.error(`✗ 找不到 phase 目录: .agents/tasks/phase-${taskId.split(".")[0]}/`);
    process.exit(1);
  }
  const progress = readJson<TaskProgress>(progressFile);
  if (!progress) {
    console.error(
      `✗ 任务 ${taskId} 尚未领取，请先运行 task-claim.ts ${taskId} --assignee <role-id>`,
    );
    process.exit(1);
  }

  const roleOverride = typeof flags.role === "string" ? (flags.role as RoleId) : undefined;
  const role = roleOverride ?? progress.assignee;
  if (!role || !ROLE_IDS.includes(role)) {
    console.error("✗ 无法确定角色：进度文件无 assignee，且未提供 --role");
    process.exit(1);
  }
  if (progress.status === "done") {
    console.warn(`⚠ 任务 ${taskId} 已是 done，仍会重新运行门禁。`);
  }

  const strict = Boolean(flags.strict);
  const skipGate = Boolean(flags["skip-gate"]);
  const contextFile = taskPath(taskId, "context.json");
  if (!contextFile || !existsSync(contextFile)) {
    console.warn(
      `⚠ 缺少上下文文件 ${taskId}.context.json（见 01-communication-protocol.md §2，完成前应声明输出）`,
    );
  }

  let gate: GateResult;
  if (skipGate) {
    console.warn("⚠ 已跳过门禁（--skip-gate）：记录 gate.failure.json，需在 24h 内补跑");
    gate = {
      taskId,
      role,
      timestamp: new Date().toISOString(),
      strict,
      common: {},
      specific: {},
      overall: "fail",
      commands: [],
    };
  } else {
    console.log(`▶ 运行质量门禁 (task=${taskId} role=${role} strict=${strict})`);
    gate = runGate(role, { taskId, strict, log: (message) => console.log(message) });
    const written = writeGateFile(REPO_ROOT, taskId, gate);
    if (written) console.log(`  门禁结果已写入 ${written}`);
  }

  if (gate.overall !== "pass") {
    const failure = { ...gate, skipped: skipGate, reason: skipGate ? "skip-gate" : "gate-failed" };
    const failureFile = taskPath(taskId, "gate.failure.json");
    if (failureFile) writeJson(failureFile, failure);
  }

  const passed = gate.overall === "pass";
  const updated: TaskProgress = {
    ...progress,
    assignee: role,
    percent: passed ? 100 : progress.percent,
    status: passed ? "done" : "blocked",
    updatedAt: new Date().toISOString(),
    message: passed
      ? "Completed via task-complete"
      : `Gate failed (${skipGate ? "skipped" : "see gate.json"})`,
    blocker: passed ? null : `quality gate ${skipGate ? "skipped" : "failed"}`,
    helpFrom: passed ? null : role === "quality-dx-guardian" ? null : "quality-dx-guardian",
  };
  writeJson(progressFile, updated);

  if (flags.json) {
    console.log(JSON.stringify({ gate, progress: updated }, null, 2));
  } else if (passed) {
    console.log(`\n✓ 任务 ${taskId} 完成（${role}）`);
  } else {
    console.log(`\n✗ 任务 ${taskId} 门禁未通过 → 标记 blocked`);
    console.log(`  详情: ${taskPath(taskId, "gate.failure.json")}`);
  }
  process.exit(passed ? 0 : 1);
}

main();
