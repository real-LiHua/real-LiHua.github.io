#!/usr/bin/env tsx
/**
 * Task-progress — 更新任务进度 / 上报阻塞 / 请求协助。
 *
 * 用法: pnpm exec tsx .agents/scripts/task-progress.ts <task-id> <percent> --msg "<message>" pnpm
 * exec tsx .agents/scripts/task-progress.ts <task-id> --blocked "<reason>" --help-from <role-id>
 *
 * 进度文件遵循 `.agents/onboarding/01-communication-protocol.md` 的约定。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

function progressPath(taskId: string): string | null {
  const phase = taskId.split(".")[0];
  const dir = join(REPO_ROOT, ".agents", "tasks", `phase-${phase}`);
  return existsSync(dir) ? join(dir, `${taskId}.progress`) : null;
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
  console.log(`task-progress — 更新进度 / 上报阻塞

用法:
  pnpm exec tsx .agents/scripts/task-progress.ts <task-id> <percent> --msg "<message>"
  pnpm exec tsx .agents/scripts/task-progress.ts <task-id> --blocked "<reason>" [--help-from <role-id>]

选项:
  --msg "<text>"         进度消息
  --blocked "<reason>"   标记阻塞并记录原因
  --help-from <role-id>  请求协助的角色
  --help                 显示帮助
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
    console.error('✗ 缺少任务 ID，例如: task-progress.ts 1.1 50 --msg "Exported types"');
    process.exit(1);
  }

  const path = progressPath(taskId);
  if (!path) {
    console.error(`✗ 找不到进度文件所在目录: .agents/tasks/phase-${taskId.split(".")[0]}/`);
    process.exit(1);
  }

  const existing = readJson<TaskProgress>(path);
  if (!existing) {
    console.error(
      `✗ 任务 ${taskId} 尚未领取，请先运行 task-claim.ts ${taskId} --assignee <role-id>`,
    );
    process.exit(1);
  }

  const blocked = typeof flags.blocked === "string" ? flags.blocked : null;
  const helpFromRaw = typeof flags["help-from"] === "string" ? flags["help-from"] : null;
  if (helpFromRaw && !ROLE_IDS.includes(helpFromRaw as RoleId)) {
    console.warn(`⚠ 未知的 --help-from 角色: ${helpFromRaw}（可选: ${ROLE_IDS.join(", ")}）`);
  }

  let percent = existing.percent;
  const percentToken = positionals[1];
  if (percentToken !== undefined) {
    const parsed = Number(percentToken);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      console.error(`✗ 进度必须是 0-100 的整数，收到: ${percentToken}`);
      process.exit(1);
    }
    percent = parsed;
  }

  const message = typeof flags.msg === "string" ? flags.msg : (existing.message ?? "");
  let status: TaskStatus;
  let blocker: string | null;
  let helpFrom: RoleId | null;

  if (blocked) {
    status = "blocked";
    blocker = blocked;
    helpFrom = (helpFromRaw as RoleId | null) ?? existing.helpFrom ?? null;
  } else {
    status = percent >= 100 ? "done" : "in_progress";
    blocker = null;
    helpFrom = null;
  }

  const progress: TaskProgress = {
    taskId,
    assignee: existing.assignee,
    percent,
    status,
    updatedAt: new Date().toISOString(),
    message: blocked ? `Blocked: ${blocked}` : message,
    blocker,
    helpFrom,
  };
  writeJson(path, progress);

  const icon = status === "blocked" ? "⛔" : status === "done" ? "✓" : "▶";
  console.log(`${icon} ${taskId} → ${percent}% [${status}]`);
  if (progress.message) console.log(`  ${progress.message}`);
  if (helpFrom) console.log(`  ↳ 请求协助: ${helpFrom}`);
  if (status === "done") console.log("  下一步: 运行 task-complete.ts " + taskId);
}

main();
