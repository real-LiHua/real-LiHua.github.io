#!/usr/bin/env tsx
/**
 * Subagent-team — 团队组合管理：拓扑、技能矩阵、容量规划、负载再平衡、特性团队、健康度。
 *
 * 用法: pnpm exec tsx .agents/scripts/subagent-team.ts topology [--format mermaid|graphviz] pnpm exec
 * tsx .agents/scripts/subagent-team.ts skills-matrix [--output <file>] pnpm exec tsx
 * .agents/scripts/subagent-team.ts capacity --quarter <YYYY-Qn> pnpm exec tsx
 * .agents/scripts/subagent-team.ts rebalance [--dry-run] pnpm exec tsx
 * .agents/scripts/subagent-team.ts form-feature-team --mission "<str>" --lead <id> pnpm exec tsx
 * .agents/scripts/subagent-team.ts health-check [--anonymous] [--output <file>]
 *
 * 输出: .agents/team/ 规格: .opencode/skills/subagent-team-composition/SKILL.md
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./run-gate.ts";

const REPO_ROOT = findRepoRoot();
const TEAM_DIR = join(REPO_ROOT, ".agents", "team");
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

const TEAM_TYPE: Record<RoleId, string> = {
  "frontend-architect": "Stream",
  "content-engineer": "Stream",
  "build-deploy-engineer": "Platform",
  "cli-tool-engineer": "Platform",
  "search-discovery-engineer": "Stream",
  "quality-dx-guardian": "Enabling",
};

const SKILLS_MATRIX = `| 技能 \\ 角色      | Frontend | Content | Build | CLI | Search | Quality |
| ---------------- | -------- | ------- | ----- | --- | ------ | ------- |
| Astro 组件       | ●●●      | ●○○     | ●○○   | ○○○ | ●○○    | ●●○     |
| Tailwind/daisyUI | ●●●      | ●○○     | ○○○   | ○○○ | ●○○    | ●○○     |
| Markdown/MDX     | ●○○      | ●●●     | ●○○   | ○○○ | ●○○    | ●○○     |
| Rust/Cargo       | ○○○      | ○○○     | ○○○   | ●●● | ○○○    | ○○○     |
| CI/CD            | ●○○      | ○○○     | ●●●   | ●○○ | ○○○    | ●○○     |
| 测试/质量        | ●●○      | ●○○     | ●○○   | ●○○ | ●○○    | ●●●     |
| 搜索/索引        | ●○○      | ●○○     | ●○○   | ○○○ | ●●●    | ○○○     |
| 架构设计         | ●●●      | ●●○     | ●●○   | ●○○ | ●○○    | ●○○     |

图例: ●●● 精通 / ●●○ 熟练 / ●○○ 了解 / ○○○ 无
`;

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
  console.log(`subagent-team — 团队组合管理

用法:
  subagent-team topology [--format mermaid|graphviz]
  subagent-team skills-matrix [--output <file>]
  subagent-team capacity --quarter <YYYY-Qn>
  subagent-team rebalance [--dry-run]
  subagent-team form-feature-team --mission "<str>" --lead <id>
  subagent-team health-check [--anonymous] [--output <file>]
`);
}

function ensureTeamDir(): void {
  mkdirSync(TEAM_DIR, { recursive: true });
}

function cmdTopology(flags: Record<string, string | boolean>): void {
  const format = flags.format === "graphviz" ? "graphviz" : "mermaid";
  if (format === "graphviz") {
    const lines = [
      "digraph team {",
      "  rankdir=TB;",
      '  quality [label="Quality-DX Guardian", shape=box];',
    ];
    for (const role of ROLE_IDS) {
      if (role === "quality-dx-guardian") continue;
      lines.push(`  "${role}" [label="${role} (${TEAM_TYPE[role]})", shape=box];`);
      lines.push(`  quality -> "${role}" [style=dashed];`);
    }
    lines.push("}");
    console.log(lines.join("\n"));
    return;
  }
  const lines = [
    "graph TD",
    '  Q["Quality-DX Guardian\\n(Enabling)"]',
    ...ROLE_IDS.filter((role) => role !== "quality-dx-guardian").map(
      (role) => `  Q -.-> ${role.replace(/-/g, "_")}["${role}\\n(${TEAM_TYPE[role]})"]`,
    ),
  ];
  console.log(lines.join("\n"));
}

function cmdSkillsMatrix(flags: Record<string, string | boolean>): void {
  const out = typeof flags.output === "string" ? flags.output : join(TEAM_DIR, "skills-matrix.md");
  ensureTeamDir();
  const body = `# Skills Matrix\n\nGenerated: ${new Date().toISOString()}\n\n${SKILLS_MATRIX}`;
  writeFileSync(join(REPO_ROOT, out), body, "utf8");
  console.log(`✓ 技能矩阵已写入 ${out}`);
}

function cmdCapacity(flags: Record<string, string | boolean>): void {
  const quarter = typeof flags.quarter === "string" ? flags.quarter : "current";
  ensureTeamDir();
  const roles = ROLE_IDS.map(
    (role) =>
      `  ${role}:\n    capacity_hours_per_week: 16\n    current_allocation: 0\n    buffer: 16\n    max_concurrent_tasks: 3`,
  ).join("\n");
  const body = `# Capacity Plan — ${quarter}

\`\`\`yaml
quarter: "${quarter}"
roles:
${roles}

hiring_plan: []
\`\`\`
`;
  const path = join(TEAM_DIR, `capacity-plan-${quarter}.md`);
  writeFileSync(path, body, "utf8");
  console.log(`✓ 容量规划已写入 ${path}`);
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
    else if (abs.endsWith(".progress")) out.push(abs);
  }
}

function activeCounts(): Record<RoleId, number> {
  const counts = Object.fromEntries(ROLE_IDS.map((role) => [role, 0])) as Record<RoleId, number>;
  const files: string[] = [];
  walk(TASKS_DIR, files);
  for (const abs of files) {
    try {
      const progress = JSON.parse(readFileSync(abs, "utf8")) as {
        assignee?: RoleId;
        status?: string;
      };
      if (
        progress.assignee &&
        progress.status === "in_progress" &&
        ROLE_IDS.includes(progress.assignee)
      ) {
        counts[progress.assignee] += 1;
      }
    } catch {
      // ignore
    }
  }
  return counts;
}

function cmdRebalance(flags: Record<string, string | boolean>): void {
  const dryRun = Boolean(flags["dry-run"]);
  const counts = activeCounts();
  const max = Math.max(...Object.values(counts), 1);
  const lines = [
    "# Rebalance Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| 角色 | 进行中 | 负载 |",
    "| ---- | ------ | ---- |",
  ];
  for (const role of ROLE_IDS) {
    const load = Math.round((counts[role] / max) * 100);
    lines.push(`| ${role} | ${counts[role]} | ${load}% |`);
  }
  lines.push("", "## 建议", "");
  const busy = ROLE_IDS.filter((role) => counts[role] >= 5);
  const idle = ROLE_IDS.filter((role) => counts[role] === 0);
  if (busy.length) lines.push(`- 队列积压（≥5）: ${busy.join(", ")} → 启用跨职能支援`);
  if (idle.length) lines.push(`- 空闲角色: ${idle.join(", ")} → 可承接转移任务`);
  if (!busy.length && !idle.length) lines.push("- 负载均衡，无需调整");
  const body = `${lines.join("\n")}\n`;
  if (dryRun) {
    console.log(body);
    console.log("(dry-run: 未写入文件)");
    return;
  }
  ensureTeamDir();
  const path = join(TEAM_DIR, `rebalance-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(path, body, "utf8");
  console.log(`✓ 再平衡报告已写入 ${path}`);
}

function cmdFormFeatureTeam(flags: Record<string, string | boolean>): void {
  const mission = typeof flags.mission === "string" ? flags.mission : undefined;
  const lead = typeof flags.lead === "string" ? flags.lead : undefined;
  if (!mission || !lead) {
    console.error('✗ 需要 --mission "<str>" --lead <role-id>');
    process.exit(1);
  }
  if (!ROLE_IDS.includes(lead as RoleId)) {
    console.error(`✗ 未知 lead 角色: ${lead}`);
    process.exit(1);
  }
  const slug =
    mission
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "feature";
  ensureTeamDir();
  const members = [
    ...new Set([lead, "frontend-architect", "content-engineer", "quality-dx-guardian"]),
  ];
  const body = `# Feature Team — ${mission}

\`\`\`yaml
feature_team:
  id: "ft-${new Date().toISOString().slice(0, 10)}-${slug}"
  mission: "${mission}"
  members:
${members.map((member) => `    - ${member}${member === lead ? " (Lead)" : ""}`).join("\n")}
  duration: "4 weeks"
  ceremonies:
    - daily_standup: 15min
    - weekly_sync: 30min
    - retro: 结束时
\`\`\`
`;
  const path = join(TEAM_DIR, `feature-team-${slug}.md`);
  writeFileSync(path, body, "utf8");
  console.log(`✓ 特性团队已组建: ${path}`);
}

function cmdHealthCheck(flags: Record<string, string | boolean>): void {
  const month = new Date().toISOString().slice(0, 7);
  const out =
    typeof flags.output === "string" ? flags.output : join(TEAM_DIR, `health-${month}.md`);
  const anonymous = Boolean(flags.anonymous);
  const body = `# Team Health Report — ${month}

- generated: ${new Date().toISOString()}
- anonymous: ${anonymous}

\`\`\`yaml
team_health:
  psychological_safety: "?/5"
  workload_balance: 0.85 # 方差系数 < 0.3
  knowledge_silo_risk: "待评估"
  cross_team_collaboration: "待评估"
  innovation_rate: "待评估"
\`\`\`
${anonymous ? "\n> 匿名模式：不记录个人归因。\n" : ""}`;
  ensureTeamDir();
  writeFileSync(join(REPO_ROOT, out), body, "utf8");
  console.log(`✓ 团队健康度报告已写入 ${out}`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }
  const { positionals, flags } = parseArgs(argv);
  switch (positionals[0]) {
    case "topology":
      cmdTopology(flags);
      break;
    case "skills-matrix":
      cmdSkillsMatrix(flags);
      break;
    case "capacity":
      cmdCapacity(flags);
      break;
    case "rebalance":
      cmdRebalance(flags);
      break;
    case "form-feature-team":
      cmdFormFeatureTeam(flags);
      break;
    case "health-check":
      cmdHealthCheck(flags);
      break;
    default:
      console.error(`✗ 未知命令: ${positionals[0]}`);
      printHelp();
      process.exit(1);
  }
}

main();
