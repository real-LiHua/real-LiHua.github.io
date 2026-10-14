#!/usr/bin/env tsx
/**
 * Subagent-perf — 子智能体绩效管理：KPI 看板、月报、面谈、晋升、PIP。
 *
 * 用法: pnpm exec tsx .agents/scripts/subagent-perf.ts dashboard --role <id> [--live] pnpm exec tsx
 * .agents/scripts/subagent-perf.ts report --role <id> --period <YYYY-MM> [--format markdown|json]
 * pnpm exec tsx .agents/scripts/subagent-perf.ts review --role <id> --period <YYYY-MM> --notes
 * "<md>" pnpm exec tsx .agents/scripts/subagent-perf.ts promote --role <id> --target-level L3
 * [--package <file>] pnpm exec tsx .agents/scripts/subagent-perf.ts pip create --role <id> --issues
 * "<list>" pnpm exec tsx .agents/scripts/subagent-perf.ts pip review --role <id> --pip-id <id>
 * [--outcome pass|extend|redeploy]
 *
 * 数据源: .agents/tasks/**.progress · *.gate.json 输出: .agents/performance/ 规格:
 * .opencode/skills/subagent-performance/SKILL.md
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./run-gate.ts";

const REPO_ROOT = findRepoRoot();
const PERF_DIR = join(REPO_ROOT, ".agents", "performance");
const TASKS_DIR = join(REPO_ROOT, ".agents", "tasks");
const ROLE_IDS = [
  "frontend-architect",
  "content-engineer",
  "build-deploy-engineer",
  "cli-tool-engineer",
  "search-discovery-engineer",
  "quality-dx-guardian",
] as const;
type RoleId = (typeof ROLE_IDS)[number];

interface Progress {
  taskId?: string;
  assignee?: RoleId | null;
  percent?: number;
  status?: string;
  blocker?: string | null;
  helpFrom?: RoleId | null;
}

interface GateFile {
  taskId?: string;
  role?: RoleId;
  overall?: string;
}

interface Metrics {
  tasksTotal: number;
  tasksDone: number;
  tasksBlocked: number;
  gatesPass: number;
  gatesFail: number;
  passRate: number;
  blockers: number;
  helpRequests: number;
}

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function collectMetrics(role: RoleId): Metrics {
  const files = [];
  walk(TASKS_DIR, files);
  const metrics: Metrics = {
    tasksTotal: 0,
    tasksDone: 0,
    tasksBlocked: 0,
    gatesPass: 0,
    gatesFail: 0,
    passRate: 0,
    blockers: 0,
    helpRequests: 0,
  };
  for (const abs of files) {
    if (abs.endsWith(".progress")) {
      const progress = readJson<Progress>(abs);
      if (!progress || progress.assignee !== role) continue;
      metrics.tasksTotal += 1;
      if (progress.status === "done") metrics.tasksDone += 1;
      if (progress.status === "blocked") metrics.tasksBlocked += 1;
      if (progress.blocker) metrics.blockers += 1;
      if (progress.helpFrom) metrics.helpRequests += 1;
    } else if (abs.endsWith(".gate.json")) {
      const gate = readJson<GateFile>(abs);
      if (!gate || gate.role !== role) continue;
      if (gate.overall === "pass") metrics.gatesPass += 1;
      else if (gate.overall === "fail") metrics.gatesFail += 1;
    }
  }
  const runs = metrics.gatesPass + metrics.gatesFail;
  metrics.passRate = runs === 0 ? 0 : Math.round((metrics.gatesPass / runs) * 1000) / 10;
  return metrics;
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

function requireRole(flags: Record<string, string | boolean>): RoleId {
  const value = typeof flags.role === "string" ? flags.role : undefined;
  if (!value || !ROLE_IDS.includes(value as RoleId)) {
    console.error(`✗ 需要 --role <role-id>（可选: ${ROLE_IDS.join(", ")}）`);
    process.exit(1);
  }
  return value as RoleId;
}

function ensurePerfDir(): void {
  mkdirSync(PERF_DIR, { recursive: true });
}

function printHelp(): void {
  console.log(`subagent-perf — 绩效管理

用法:
  subagent-perf dashboard --role <id> [--live]
  subagent-perf report --role <id> --period <YYYY-MM> [--format markdown|json]
  subagent-perf review --role <id> --period <YYYY-MM> --notes "<md>"
  subagent-perf promote --role <id> --target-level L3 [--package <file>]
  subagent-perf pip create --role <id> --issues "<list>"
  subagent-perf pip review --role <id> --pip-id <id> [--outcome pass|extend|redeploy]
`);
}

function cmdDashboard(flags: Record<string, string | boolean>): void {
  const role = requireRole(flags);
  const metrics = collectMetrics(role);
  console.log(`KPI Dashboard — ${role}${flags.live ? " (live)" : ""}`);
  console.log(
    `  任务: 总计 ${metrics.tasksTotal}  完成 ${metrics.tasksDone}  阻塞 ${metrics.tasksBlocked}`,
  );
  console.log(
    `  质量门禁首次通过率: ${metrics.passRate}%  (pass=${metrics.gatesPass} fail=${metrics.gatesFail})`,
  );
  console.log(`  阻塞上报: ${metrics.blockers}  协助请求: ${metrics.helpRequests}`);
  console.log(`  交付效率: ${metrics.tasksDone}/${metrics.tasksTotal} 完成`);
}

function cmdReport(flags: Record<string, string | boolean>): void {
  const role = requireRole(flags);
  const period =
    typeof flags.period === "string" ? flags.period : new Date().toISOString().slice(0, 7);
  const format = flags.format === "json" ? "json" : "markdown";
  const metrics = collectMetrics(role);
  ensurePerfDir();
  if (format === "json") {
    const path = join(PERF_DIR, `report-${role}-${period}.json`);
    writeFileSync(path, `${JSON.stringify({ role, period, metrics }, null, 2)}\n`, "utf8");
    console.log(`✓ 报告已写入 ${path}`);
    return;
  }
  const body = `# Performance Report — ${role} (${period})

- period: ${period}
- generated: ${new Date().toISOString()}

## KPI

| 指标 | 数值 | 优秀标准 |
| ---- | ---- | -------- |
| 任务总数 | ${metrics.tasksTotal} | — |
| 任务完成 | ${metrics.tasksDone} | — |
| 任务阻塞 | ${metrics.tasksBlocked} | 0 |
| 质量门禁首次通过率 | ${metrics.passRate}% | ≥ 95% |
| 阻塞上报次数 | ${metrics.blockers} | 主动上报 |
| 协助请求次数 | ${metrics.helpRequests} | — |

## 建议

- 门禁通过率低于 95% 时，安排与 quality-dx-guardian 结对。
- 阻塞集中在同一模块时，升级为架构问题（创建 ADR）。
`;
  const path = join(PERF_DIR, `report-${role}-${period}.md`);
  writeFileSync(path, body, "utf8");
  console.log(`✓ 报告已写入 ${path}`);
}

function cmdReview(flags: Record<string, string | boolean>): void {
  const role = requireRole(flags);
  const period =
    typeof flags.period === "string" ? flags.period : new Date().toISOString().slice(0, 7);
  const notes = typeof flags.notes === "string" ? flags.notes : "(无记录)";
  ensurePerfDir();
  const body = `# Performance Review — ${role} (${period})

- reviewedAt: ${new Date().toISOString()}
- reviewer: quality-dx-guardian

## 面谈记录

${notes}

## 行动项

- [ ] 制定下月 OKR
- [ ] 讨论技能扩展
`;
  const path = join(PERF_DIR, `review-${role}-${period}.md`);
  writeFileSync(path, body, "utf8");
  console.log(`✓ 面谈记录已写入 ${path}`);
}

function cmdPromote(flags: Record<string, string | boolean>): void {
  const role = requireRole(flags);
  const target = typeof flags["target-level"] === "string" ? flags["target-level"] : undefined;
  if (!target) {
    console.error("✗ 需要 --target-level <L2|L3|L4>");
    process.exit(1);
  }
  const pkg = typeof flags.package === "string" ? flags.package : "(未提供材料包)";
  ensurePerfDir();
  const date = new Date().toISOString().slice(0, 10);
  const body = `# Promotion Package — ${role} → ${target}

- submittedAt: ${new Date().toISOString()}
- package: ${pkg}

## 评估委员会

- 主席: Architect
- 成员: 2-3 位跨职能 Senior/Staff

## 流程

1. 材料包 → 2. 答辩 → 3. 讨论 → 4. 决定

## 决定

- outcome: pending
`;
  const path = join(PERF_DIR, `promo-${role}-${target}-${date}.md`);
  writeFileSync(path, body, "utf8");
  console.log(`✓ 晋升材料已写入 ${path}`);
}

function cmdPipCreate(flags: Record<string, string | boolean>): void {
  const role = requireRole(flags);
  const issues = typeof flags.issues === "string" ? flags.issues : "(未列明)";
  ensurePerfDir();
  const date = new Date().toISOString().slice(0, 10);
  const body = `# Performance Improvement Plan — ${role}

- created: ${date}
- role: ${role}
- issues:
${issues
  .split(/[,;\n]/)
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => `    - ${item}`)
  .join("\n")}
- actions:
    - weekly_pair_programming
    - mandatory_daily_progress_update
    - reduced_concurrent_tasks
- review_date: "${new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)}"
- outcome: "pending"
`;
  const path = join(PERF_DIR, `PIP-${role}-${date}.md`);
  writeFileSync(path, body, "utf8");
  console.log(`✓ PIP 已创建: ${path}`);
}

function cmdPipReview(flags: Record<string, string | boolean>): void {
  const role = requireRole(flags);
  const pipId = typeof flags["pip-id"] === "string" ? flags["pip-id"] : undefined;
  if (!pipId) {
    console.error("✗ 需要 --pip-id <id>");
    process.exit(1);
  }
  const outcome = typeof flags.outcome === "string" ? flags.outcome : "pending";
  if (!["pending", "pass", "extend", "redeploy"].includes(outcome)) {
    console.error("✗ --outcome 必须是 pass | extend | redeploy");
    process.exit(1);
  }
  const candidates = existsSync(PERF_DIR)
    ? readdirSync(PERF_DIR).filter((f) => f.startsWith(`PIP-${role}`) && f.includes(pipId))
    : [];
  if (candidates.length === 0) {
    console.error(`✗ 找不到 PIP: role=${role} id=${pipId}`);
    process.exit(1);
  }
  for (const name of candidates) {
    const path = join(PERF_DIR, name);
    const content = readFileSync(path, "utf8").replace(
      /- outcome: ".*"/,
      `- outcome: "${outcome}"`,
    );
    writeFileSync(path, content, "utf8");
    console.log(`✓ 已更新 ${path} → outcome=${outcome}`);
  }
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
    case "dashboard":
      cmdDashboard(flags);
      break;
    case "report":
      cmdReport(flags);
      break;
    case "review":
      cmdReview(flags);
      break;
    case "promote":
      cmdPromote(flags);
      break;
    case "pip": {
      const action = positionals[1];
      if (action === "create") cmdPipCreate(flags);
      else if (action === "review") cmdPipReview(flags);
      else {
        console.error("✗ pip 子命令必须是 create | review");
        process.exit(1);
      }
      break;
    }
    default:
      console.error(`✗ 未知命令: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main();
