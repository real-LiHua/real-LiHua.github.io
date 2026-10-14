#!/usr/bin/env tsx
/**
 * Subagent-lifecycle — 子智能体生命周期管理。
 *
 * 用法: pnpm exec tsx .agents/scripts/subagent-lifecycle.ts status [--role <id>] [--all] pnpm exec
 * tsx .agents/scripts/subagent-lifecycle.ts activate|suspend|resume|deprecate|archive --role <id>
 * [--reason <str>] pnpm exec tsx .agents/scripts/subagent-lifecycle.ts evaluate --role <id>
 * --period <YYYY-MM> pnpm exec tsx .agents/scripts/subagent-lifecycle.ts monthly-review pnpm exec
 * tsx .agents/scripts/subagent-lifecycle.ts cleanup-idle [--dry-run]
 *
 * 状态机: CREATED → ONBOARDING → ACTIVE → (IDLE) → DEPRECATED → ARCHIVED FAILED → REMEDIATION → ACTIVE
 * 状态文件: .agents/lifecycle/<role>.status.json；变更日志: .agents/lifecycle/transitions.log 规格:
 * .opencode/skills/subagent-lifecycle/SKILL.md · docs/adr/0004-subagent-coordination.md
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./run-gate.ts";

const REPO_ROOT = findRepoRoot();
const LIFECYCLE_DIR = join(REPO_ROOT, ".agents", "lifecycle");
const LOG_FILE = join(LIFECYCLE_DIR, "transitions.log");

const ROLE_IDS = [
  "frontend-architect",
  "content-engineer",
  "build-deploy-engineer",
  "cli-tool-engineer",
  "search-discovery-engineer",
  "quality-dx-guardian",
] as const;
type RoleId = (typeof ROLE_IDS)[number];

const STATES = [
  "CREATED",
  "ONBOARDING",
  "ACTIVE",
  "IDLE",
  "DEPRECATED",
  "ARCHIVED",
  "FAILED",
  "REMEDIATION",
] as const;
type LifecycleState = (typeof STATES)[number];

interface Transition {
  at: string;
  from: LifecycleState;
  to: LifecycleState;
  reason: string;
}

interface RoleStatus {
  role: RoleId;
  state: LifecycleState;
  since: string;
  reason: string | null;
  history: Transition[];
}

const ALLOWED_FROM: Record<
  "activate" | "suspend" | "resume" | "deprecate" | "archive",
  LifecycleState[]
> = {
  activate: ["CREATED", "ONBOARDING", "IDLE", "FAILED", "REMEDIATION", "DEPRECATED"],
  suspend: ["ACTIVE"],
  resume: ["IDLE"],
  deprecate: ["ACTIVE", "IDLE"],
  archive: ["DEPRECATED", "FAILED", "IDLE", "ACTIVE"],
};

function statusPath(role: RoleId): string {
  return join(LIFECYCLE_DIR, `${role}.status.json`);
}

function readStatus(role: RoleId): RoleStatus | null {
  try {
    return JSON.parse(readFileSync(statusPath(role), "utf8")) as RoleStatus;
  } catch {
    return null;
  }
}

function writeStatus(status: RoleStatus): void {
  mkdirSync(LIFECYCLE_DIR, { recursive: true });
  writeFileSync(statusPath(status.role), `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

function defaultStatus(role: RoleId): RoleStatus {
  return { role, state: "CREATED", since: new Date().toISOString(), reason: null, history: [] };
}

function transition(role: RoleId, to: LifecycleState, reason: string): RoleStatus {
  const current = readStatus(role) ?? defaultStatus(role);
  const from = current.state;
  const at = new Date().toISOString();
  current.history.push({ at, from, to, reason });
  current.state = to;
  current.since = at;
  current.reason = reason || null;
  writeStatus(current);
  mkdirSync(LIFECYCLE_DIR, { recursive: true });
  appendFileSync(LOG_FILE, `${at}\t${role}\t${from} → ${to}\t${reason || "-"}\n`, "utf8");
  return current;
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

function resolveRole(flags: Record<string, string | boolean>): RoleId {
  const value = typeof flags.role === "string" ? flags.role : undefined;
  if (!value || !ROLE_IDS.includes(value as RoleId)) {
    console.error(`✗ 需要 --role <role-id>（可选: ${ROLE_IDS.join(", ")}）`);
    process.exit(1);
  }
  return value as RoleId;
}

function printHelp(): void {
  console.log(`subagent-lifecycle — 生命周期管理

用法:
  subagent-lifecycle status [--role <id>|--all]
  subagent-lifecycle activate|suspend|resume|deprecate|archive --role <id> [--reason <str>]
  subagent-lifecycle evaluate --role <id> --period <YYYY-MM>
  subagent-lifecycle monthly-review
  subagent-lifecycle cleanup-idle [--dry-run]

状态: ${STATES.join(", ")}
`);
}

function cmdStatus(flags: Record<string, string | boolean>): void {
  const roles = flags.all
    ? [...ROLE_IDS]
    : typeof flags.role === "string"
      ? [flags.role as RoleId]
      : [...ROLE_IDS];
  if (typeof flags.role === "string" && !ROLE_IDS.includes(flags.role as RoleId)) {
    console.error(`✗ 未知角色: ${flags.role}`);
    process.exit(1);
  }
  console.log("role                       state        since");
  for (const role of roles) {
    const status = readStatus(role) ?? defaultStatus(role);
    const since = status.since.replace("T", " ").slice(0, 19);
    const note = status.reason ? `  (${status.reason})` : "";
    console.log(`${role.padEnd(26)} ${status.state.padEnd(12)} ${since}${note}`);
  }
}

function cmdChange(
  action: keyof typeof ALLOWED_FROM,
  flags: Record<string, string | boolean>,
): void {
  const role = resolveRole(flags);
  const reason = typeof flags.reason === "string" ? flags.reason : "";
  const current = readStatus(role) ?? defaultStatus(role);
  if (!ALLOWED_FROM[action].includes(current.state)) {
    console.error(`✗ ${role} 当前状态 ${current.state}，不允许 ${action}`);
    process.exit(1);
  }
  const target: LifecycleState =
    action === "activate"
      ? "ACTIVE"
      : action === "suspend"
        ? "IDLE"
        : action === "resume"
          ? "ACTIVE"
          : action === "deprecate"
            ? "DEPRECATED"
            : "ARCHIVED";
  const status = transition(role, target, reason);
  console.log(`✓ ${role}: ${status.state}${reason ? ` (${reason})` : ""}`);
}

function perfTemplate(role: RoleId, period: string): string {
  return `# Performance Review — ${role} (${period})

- role: ${role}
- period: "${period}"
- metrics:
    tasks_completed: 0
    tasks_failed: 0
    avg_quality_gate_pass_rate: "n/a"
    avg_completion_time_hours: 0
    blocker_reports: 0
    help_requests: 0
    innovation_contributions: 0
- rating: "meets_expectations" # exceeds / meets / below / critical
- actions:
    - continue_active
`;
}

function cmdEvaluate(flags: Record<string, string | boolean>): void {
  const role = resolveRole(flags);
  const period =
    typeof flags.period === "string" ? flags.period : new Date().toISOString().slice(0, 7);
  mkdirSync(LIFECYCLE_DIR, { recursive: true });
  const path = join(LIFECYCLE_DIR, `performance-${role}-${period}.md`);
  writeFileSync(path, perfTemplate(role, period), "utf8");
  console.log(`✓ 绩效评估模板已写入 ${path}（请填写 metrics 后运行 subagent-perf report）`);
}

function cmdMonthlyReview(): void {
  const period = new Date().toISOString().slice(0, 7);
  mkdirSync(LIFECYCLE_DIR, { recursive: true });
  for (const role of ROLE_IDS) {
    const path = join(LIFECYCLE_DIR, `performance-${role}-${period}.md`);
    if (!existsSync(path)) writeFileSync(path, perfTemplate(role, period), "utf8");
  }
  console.log(`✓ 已为 ${ROLE_IDS.length} 个角色生成 ${period} 月度评估模板（.agents/lifecycle/）`);
}

function cmdCleanupIdle(flags: Record<string, string | boolean>): void {
  const dryRun = Boolean(flags["dry-run"]);
  const now = Date.now();
  let acted = 0;
  for (const role of ROLE_IDS) {
    const status = readStatus(role);
    if (!status || status.state !== "IDLE") continue;
    const idleDays = Math.floor((now - Date.parse(status.since)) / 86_400_000);
    let target: LifecycleState | null = null;
    if (idleDays > 60) target = "ARCHIVED";
    else if (idleDays > 30) target = "DEPRECATED";
    if (!target) continue;
    acted += 1;
    if (dryRun) console.log(`  [dry-run] ${role}: IDLE ${idleDays}d → 建议 ${target}`);
    else
      console.log(
        `✓ ${role}: IDLE ${idleDays}d → ${transition(role, target, `cleanup-idle ${idleDays}d`).state}`,
      );
  }
  if (acted === 0) console.log("✓ 无需要处理的长期空闲角色");
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }
  const { positionals, flags } = parseArgs(argv);
  const command = positionals[0];
  switch (command) {
    case "status":
      cmdStatus(flags);
      break;
    case "activate":
    case "suspend":
    case "resume":
    case "deprecate":
    case "archive":
      cmdChange(command, flags);
      break;
    case "evaluate":
      cmdEvaluate(flags);
      break;
    case "monthly-review":
      cmdMonthlyReview();
      break;
    case "cleanup-idle":
      cmdCleanupIdle(flags);
      break;
    default:
      console.error(`✗ 未知命令: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main();
