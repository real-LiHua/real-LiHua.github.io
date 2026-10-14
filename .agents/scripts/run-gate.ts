#!/usr/bin/env tsx
/**
 * Run-gate — 运行通用质量门禁 + 角色专属质量门禁。
 *
 * 用法: pnpm exec tsx .agents/scripts/run-gate.ts <role-id> [--strict] [--task <task-id>] [--json]
 *
 * 通用门禁: tsc -b / oxlint . / oxfmt --check / build 角色专属门禁: 见 SPECIFIC_GATES（对齐 docs/TESTING.md §3 与
 * docs/adr/0004）
 *
 * 本文件同时导出 `runGate()` / `writeGateFile()`，供 task-complete.ts 复用。 规格: docs/SUBAGENT_OPERATIONS.md ·
 * .agents/onboarding/02-quality-gates.md · docs/TESTING.md
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROLE_IDS = [
  "frontend-architect",
  "content-engineer",
  "build-deploy-engineer",
  "cli-tool-engineer",
  "search-discovery-engineer",
  "quality-dx-guardian",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];
export type GateStatus = "pass" | "fail" | "skip";

export interface GateCommandSpec {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
}

export interface GateCommandResult extends GateCommandSpec {
  status: GateStatus;
  exitCode: number | null;
  output: string;
}

export interface GateResult {
  taskId?: string;
  role: RoleId;
  timestamp: string;
  strict: boolean;
  common: Record<string, GateStatus>;
  specific: Record<string, GateStatus>;
  overall: "pass" | "fail";
  commands: GateCommandResult[];
}

/** 每命令超时（10 分钟），避免门禁挂起。 */
const TIMEOUT_MS = 600_000;

const COMMON_GATES: readonly GateCommandSpec[] = [
  { name: "tsc", command: "pnpm", args: ["exec", "tsc", "-b"] },
  { name: "oxlint", command: "pnpm", args: ["exec", "oxlint", "."] },
  { name: "oxfmt", command: "pnpm", args: ["exec", "oxfmt", "--check"] },
  { name: "build", command: "pnpm", args: ["build"] },
];

const SPECIFIC_GATES: Record<RoleId, readonly GateCommandSpec[]> = {
  "frontend-architect": [
    {
      name: "playwright-chromium",
      command: "pnpm",
      args: ["exec", "playwright", "test", "--project=chromium"],
    },
  ],
  "content-engineer": [
    {
      name: "content-pipeline",
      command: "sh",
      args: ["-c", "pnpm build && node -e \"require('./dist/server/entry.mjs')\""],
    },
  ],
  "build-deploy-engineer": [
    { name: "lychee", command: "lychee", args: ["dist/client"] },
    { name: "vnu", command: "pnpm", args: ["exec", "vnu", "--skip-non-html", "dist/client"] },
  ],
  "cli-tool-engineer": [
    { name: "cargo-test", command: "cargo", args: ["test"] },
    { name: "cargo-clippy", command: "cargo", args: ["clippy", "-p", "post-edit"] },
    { name: "cargo-audit", command: "cargo", args: ["audit"] },
  ],
  "search-discovery-engineer": [
    {
      name: "pagefind-index",
      command: "sh",
      args: ["-c", "pnpm build && ls dist/client/pagefind/*.json"],
    },
  ],
  "quality-dx-guardian": [
    { name: "playwright", command: "pnpm", args: ["exec", "playwright", "test"] },
  ],
};

/** 从 cwd 向上查找仓库根（含 .git 的目录）。 */
export function findRepoRoot(start: string = process.cwd()): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

/** 定位任务卡所在 phase 目录（.agents/tasks/phase-<N>/）。 */
export function findTaskDir(repoRoot: string, taskId: string): string | null {
  const phase = taskId.split(".")[0];
  const dir = join(repoRoot, ".agents", "tasks", `phase-${phase}`);
  return existsSync(dir) ? dir : null;
}

function runCommand(spec: GateCommandSpec, strict: boolean): GateCommandResult {
  const startedAt = Date.now();
  const result = spawnSync(spec.command, [...spec.args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: TIMEOUT_MS,
  });
  const elapsedMs = Date.now() - startedAt;
  const errno = result.error as NodeJS.ErrnoException | undefined;
  if (errno?.code === "ENOENT") {
    return {
      ...spec,
      status: "fail",
      exitCode: null,
      output: `✗ command not found: ${spec.command}`,
    };
  }
  const raw = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  const exitCode = result.status;
  let status: GateStatus = exitCode === 0 ? "pass" : "fail";
  // --strict: 任何 warning 视为失败（对齐 .agents/onboarding/02-quality-gates.md §8）。
  if (status === "pass" && strict && /(^|\n)\s*warn(ing)?\b/i.test(raw)) {
    status = "fail";
  }
  const output = `${raw}\n(exit ${exitCode ?? "n/a"} in ${elapsedMs}ms)`.trim();
  return { ...spec, status, exitCode, output };
}

export interface RunGateOptions {
  /** 关联的任务 ID，会写入结果对象（不写文件）。 */
  taskId?: string;
  /** 严格模式：任何 warning 视为失败。 */
  strict?: boolean;
  /** 日志回调，默认静默。 */
  log?: (message: string) => void;
}

export function runGate(role: RoleId, options: RunGateOptions = {}): GateResult {
  const strict = options.strict ?? false;
  const log = options.log ?? (() => {});
  const commands: GateCommandResult[] = [];
  const common: Record<string, GateStatus> = {};
  const specific: Record<string, GateStatus> = {};

  log(`▶ 通用门禁 (${role})`);
  for (const spec of COMMON_GATES) {
    const result = runCommand(spec, strict);
    commands.push(result);
    common[spec.name] = result.status;
    log(`  ${result.status === "pass" ? "✓" : "✗"} ${spec.name}`);
  }

  log(`▶ 角色专属门禁 (${role})`);
  for (const spec of SPECIFIC_GATES[role] ?? []) {
    const result = runCommand(spec, strict);
    commands.push(result);
    specific[spec.name] = result.status;
    log(`  ${result.status === "pass" ? "✓" : "✗"} ${spec.name}`);
  }

  const allPass =
    Object.values(common).every((status) => status === "pass") &&
    Object.values(specific).every((status) => status === "pass");

  return {
    taskId: options.taskId,
    role,
    timestamp: new Date().toISOString(),
    strict,
    common,
    specific,
    overall: allPass ? "pass" : "fail",
    commands,
  };
}

/** 写出 `.agents/tasks/phase-<N>/<taskId>.gate.json`，返回路径（找不到 phase 目录则返回 null）。 */
export function writeGateFile(repoRoot: string, taskId: string, gate: GateResult): string | null {
  const dir = findTaskDir(repoRoot, taskId);
  if (!dir) return null;
  const target = join(dir, `${taskId}.gate.json`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(gate, null, 2)}\n`, "utf8");
  return target;
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
  console.log(`run-gate — 通用 + 角色专属质量门禁

用法:
  pnpm exec tsx .agents/scripts/run-gate.ts <role-id> [--strict] [--task <task-id>] [--json]

角色: ${ROLE_IDS.join(", ")}
选项:
  --strict        任何 warning 视为失败
  --task <id>     结果写入 .agents/tasks/phase-<N>/<id>.gate.json
  --json          以 JSON 输出结果
  --help          显示帮助
`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }
  const { positionals, flags } = parseArgs(argv);
  const role = positionals[0] as RoleId | undefined;
  if (!role || !ROLE_IDS.includes(role)) {
    console.error(`✗ 未知角色: ${role ?? "(缺失)"}`);
    console.error(`  可选角色: ${ROLE_IDS.join(", ")}`);
    process.exit(1);
  }
  const strict = Boolean(flags.strict);
  const taskId = typeof flags.task === "string" ? flags.task : undefined;
  const gate = runGate(role, { taskId, strict, log: (message) => console.log(message) });
  if (taskId) {
    const written = writeGateFile(findRepoRoot(), taskId, gate);
    if (written) console.log(`  门禁结果已写入 ${written}`);
  }
  if (flags.json) {
    console.log(JSON.stringify(gate, null, 2));
  } else {
    console.log(
      `\n${gate.overall === "pass" ? "✓ GATE PASS" : "✗ GATE FAIL"}  role=${role}  strict=${strict}`,
    );
    for (const command of gate.commands) {
      if (command.status !== "pass") {
        console.log(
          `\n--- ${command.name} (exit ${command.exitCode ?? "n/a"}) ---\n${command.output}`,
        );
      }
    }
  }
  process.exit(gate.overall === "pass" ? 0 : 1);
}

const isMainModule = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return (
      pathToFileURL(realpathSync(entry)).href ===
      pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href
    );
  } catch {
    return false;
  }
})();

if (isMainModule) main();
