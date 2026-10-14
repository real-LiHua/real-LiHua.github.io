#!/usr/bin/env tsx
/**
 * Task-claim — 领取一个 Phase 任务，创建/更新 `.progress` 进度文件。
 *
 * 用法: pnpm exec tsx .agents/scripts/task-claim.ts <task-id> --assignee <role-id> [--force]
 *
 * 进度文件遵循 `.agents/onboarding/01-communication-protocol.md` 的约定。 任务卡为只读输入，本脚本不会修改任务卡。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROLE_IDS = [
  "frontend-architect",
  "content-engineer",
  "build-deploy-engineer",
  "cli-tool-engineer",
  "search-discovery-engineer",
  "quality-dx-guardian",
] as const;

type RoleId = (typeof ROLE_IDS)[number];
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

function findRepoRoot(start: string = process.cwd()): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) return resolve(start);
    dir = parent;
  }
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

function findTaskCard(taskId: string): string | null {
  const dir = phaseDir(taskId);
  if (!dir) return null;
  const files = readdirSync(dir);
  const exact = files.find((file) => file === `${taskId}.md`);
  if (exact) return join(dir, exact);
  const prefixed = files.find((file) => file.startsWith(`${taskId}-`) && file.endsWith(".md"));
  return prefixed ? join(dir, prefixed) : null;
}

function progressPath(taskId: string): string | null {
  const dir = phaseDir(taskId);
  return dir ? join(dir, `${taskId}.progress`) : null;
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
  console.log(`task-claim — 领取任务并创建进度文件

用法:
  pnpm exec tsx .agents/scripts/task-claim.ts <task-id> --assignee <role-id> [--force]

选项:
  --assignee <role-id>  领取者角色（必填）
  --force               覆盖已被其他角色领取的进行中任务
  --help                显示帮助
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
    console.error("✗ 缺少任务 ID，例如: task-claim.ts 1.1 --assignee content-engineer");
    process.exit(1);
  }
  const assignee = typeof flags.assignee === "string" ? (flags.assignee as RoleId) : undefined;
  if (!assignee || !ROLE_IDS.includes(assignee)) {
    console.error(`✗ 无效或缺失 --assignee（可选: ${ROLE_IDS.join(", ")}）`);
    process.exit(1);
  }

  const card = findTaskCard(taskId);
  if (!card) {
    console.error(`✗ 找不到任务卡 ${taskId}（.agents/tasks/phase-*/）`);
    console.error("  提示: 先确认任务卡已创建，路径为 .agents/tasks/phase-<N>/<id>.md");
    process.exit(1);
  }

  const path = progressPath(taskId);
  if (!path) {
    console.error(`✗ 找不到 phase 目录: .agents/tasks/phase-${taskId.split(".")[0]}/`);
    process.exit(1);
  }

  const existing = readJson<TaskProgress>(path);
  if (
    existing &&
    existing.assignee &&
    existing.assignee !== assignee &&
    (existing.status === "in_progress" || existing.status === "blocked") &&
    !flags.force
  ) {
    console.error(`✗ 任务 ${taskId} 已由 ${existing.assignee} 领取（status=${existing.status}）。`);
    console.error("  如需强制接管，请加 --force。");
    process.exit(1);
  }

  const progress: TaskProgress = {
    taskId,
    assignee,
    percent: existing?.percent ?? 0,
    status: "in_progress",
    updatedAt: new Date().toISOString(),
    message: `Claimed by ${assignee}`,
    blocker: null,
    helpFrom: null,
  };
  writeJson(path, progress);

  console.log(`✓ 已领取任务 ${taskId}`);
  console.log(`  任务卡: ${card}`);
  console.log(`  进度文件: ${path}`);
  console.log("  下一步: 每 30min 运行 task-progress；完成时运行 task-complete");
}

main();
