#!/usr/bin/env tsx
/**
 * Subagent-onboard — 子智能体入职：环境配置、导师制、试用期考核。
 *
 * 用法: pnpm exec tsx .agents/scripts/subagent-onboard.ts setup --role <id> pnpm exec tsx
 * .agents/scripts/subagent-onboard.ts assign-mentor --role <id> --mentor <mentor-id> pnpm exec tsx
 * .agents/scripts/subagent-onboard.ts create-trial --role <id> pnpm exec tsx
 * .agents/scripts/subagent-onboard.ts evaluate-trial --role <id> [--result pass|extend|fail]
 *
 * 产出: .agents/workspace/<role>/ （onboarding.json、reading-list.md、trial-task.md …） 规格:
 * .opencode/skills/subagent-onboarding/SKILL.md
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./run-gate.ts";

const REPO_ROOT = findRepoRoot();
const ROLE_IDS = [
  "frontend-architect",
  "content-engineer",
  "build-deploy-engineer",
  "cli-tool-engineer",
  "search-discovery-engineer",
  "quality-dx-guardian",
] as const;
type RoleId = (typeof ROLE_IDS)[number];

const ONBOARDING_DOCS = [
  "00-project-overview.md",
  "01-communication-protocol.md",
  "02-quality-gates.md",
  "03-task-workflow.md",
  "04-tools-access.md",
  "05-best-practices.md",
  "06-faq.md",
];

interface OnboardingRecord {
  role: RoleId;
  startedAt: string;
  phase: "ONBOARDING" | "ACTIVE" | "FAILED";
  mentor: RoleId | null;
  checklist: Record<string, boolean>;
  trial: { createdAt: string; result: string } | null;
}

function workspaceDir(role: RoleId): string {
  return join(REPO_ROOT, ".agents", "workspace", role);
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function setLifecycle(role: RoleId, state: string, reason: string): void {
  const dir = join(REPO_ROOT, ".agents", "lifecycle");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${role}.status.json`);
  const existing = readJson<{ history?: unknown[] }>(path);
  const record = {
    role,
    state,
    since: new Date().toISOString(),
    reason,
    history: existing?.history ?? [],
  };
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
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
  console.log(`subagent-onboard — 入职管理

用法:
  subagent-onboard setup --role <id>
  subagent-onboard assign-mentor --role <id> --mentor <mentor-id>
  subagent-onboard create-trial --role <id>
  subagent-onboard evaluate-trial --role <id> [--result pass|extend|fail]
`);
}

function cmdSetup(flags: Record<string, string | boolean>): void {
  const role = resolveRole(flags);
  const dir = workspaceDir(role);
  mkdirSync(dir, { recursive: true });

  const docsDir = join(REPO_ROOT, ".agents", "onboarding");
  const available = existsSync(docsDir) ? readdirSync(docsDir) : [];
  const record: OnboardingRecord = {
    role,
    startedAt: new Date().toISOString(),
    phase: "ONBOARDING",
    mentor: null,
    checklist: Object.fromEntries(ONBOARDING_DOCS.map((doc) => [doc, false])),
    trial: null,
  };
  writeJson(join(dir, "onboarding.json"), record);

  const readingList = [
    `# Reading List — ${role}`,
    "",
    "> 必读文档包（.agents/onboarding/）",
    "",
    ...ONBOARDING_DOCS.map((doc) => `- [ ] ${doc}${available.includes(doc) ? "" : "  ⚠ 缺失"}`),
    `- [ ] role-specific/${role}.md${existsSync(join(docsDir, "role-specific", `${role}.md`)) ? "" : "  ⚠ 缺失"}`,
    "",
    "## 共享上下文",
    "",
    "- ADR — `docs/adr/`",
    "- 契约 — `.agents/contracts/`",
    "- 术语表 — `CONTEXT.md`",
    "",
  ].join("\n");
  writeFileSync(join(dir, "reading-list.md"), readingList, "utf8");

  const adrDir = join(REPO_ROOT, "docs", "adr");
  const contractsDir = join(REPO_ROOT, ".agents", "contracts");
  const contextLinks = {
    adr: existsSync(adrDir) ? readdirSync(adrDir).filter((f) => f.endsWith(".md")) : [],
    contracts: existsSync(contractsDir)
      ? readdirSync(contractsDir).filter((f) => f.endsWith(".json"))
      : [],
    terms: "CONTEXT.md",
  };
  writeJson(join(dir, "context-links.json"), contextLinks);

  setLifecycle(role, "ONBOARDING", "onboard setup");
  console.log(`✓ ${role} 入职环境已就绪: ${dir}`);
  console.log("  下一步: assign-mentor → create-trial → evaluate-trial");
}

function cmdAssignMentor(flags: Record<string, string | boolean>): void {
  const role = resolveRole(flags);
  const mentor = typeof flags.mentor === "string" ? flags.mentor : undefined;
  if (!mentor || !ROLE_IDS.includes(mentor as RoleId)) {
    console.error(`✗ 需要 --mentor <role-id>（可选: ${ROLE_IDS.join(", ")}）`);
    process.exit(1);
  }
  if (mentor === role) {
    console.error("✗ mentor 不能是本人");
    process.exit(1);
  }
  const dir = workspaceDir(role);
  const record = readJson<OnboardingRecord>(join(dir, "onboarding.json"));
  if (!record) {
    console.error(`✗ 尚未 setup，请先运行: subagent-onboard setup --role ${role}`);
    process.exit(1);
  }
  record.mentor = mentor as RoleId;
  writeJson(join(dir, "onboarding.json"), record);

  const plan = `# Mentorship Plan — ${role}

- mentor: ${mentor}
- started: ${new Date().toISOString().slice(0, 10)}

## 职责

| 角色 | 职责 | 时间投入 |
| ---- | ---- | -------- |
| Primary Mentor | 技术指导、代码评审、文化传递 | 30min/天 × 2 周 |
| Buddy | 流程答疑、工具使用 | 按需 |
| Architect Reviewer | 架构决策把关 | 关键节点 |
`;
  writeFileSync(join(dir, "mentorship-plan.md"), plan, "utf8");
  console.log(`✓ ${role} 导师已分配: ${mentor}`);
}

const TRIAL_TEMPLATE = (role: RoleId, mentor: RoleId | null): string => `# Trial Task — ${role}

\`\`\`yaml
id: "trial-001"
title: "首个独立任务"
assignee: "${role}"
mentor: "${mentor ?? "TBD"}"
type: "trial"
estimated_hours: 4
acceptance:
  - pnpm exec tsc -b 成功
  - 无 oxlint 新增错误
  - 变更符合角色专属门禁
\`\`\`

## 考核维度

| 维度 | 标准 |
| ---- | ---- |
| task_completion | 任务完成度 100% |
| quality_gate | 首次通过率 ≥ 80% |
| communication | 进度更新及时、阻塞主动上报 |
| learning | 文档阅读完整、问题质量 |
`;

function cmdCreateTrial(flags: Record<string, string | boolean>): void {
  const role = resolveRole(flags);
  const dir = workspaceDir(role);
  const record = readJson<OnboardingRecord>(join(dir, "onboarding.json"));
  if (!record) {
    console.error(`✗ 尚未 setup，请先运行: subagent-onboard setup --role ${role}`);
    process.exit(1);
  }
  record.trial = { createdAt: new Date().toISOString(), result: "pending" };
  writeJson(join(dir, "onboarding.json"), record);
  writeFileSync(join(dir, "trial-task.md"), TRIAL_TEMPLATE(role, record.mentor), "utf8");
  console.log(`✓ ${role} 试用期任务已创建: ${join(dir, "trial-task.md")}`);
}

function cmdEvaluateTrial(flags: Record<string, string | boolean>): void {
  const role = resolveRole(flags);
  const dir = workspaceDir(role);
  const record = readJson<OnboardingRecord>(join(dir, "onboarding.json"));
  if (!record) {
    console.error(`✗ 尚未 setup，请先运行: subagent-onboard setup --role ${role}`);
    process.exit(1);
  }
  const result = typeof flags.result === "string" ? flags.result : "pending";
  if (!["pending", "pass", "extend", "fail"].includes(result)) {
    console.error("✗ --result 必须是 pass | extend | fail");
    process.exit(1);
  }
  const evaluation = `# Trial Evaluation — ${role}

- evaluatedAt: ${new Date().toISOString()}
- mentor: ${record.mentor ?? "TBD"}
- dimensions:
    task_completion: "TBD"
    quality_gate: "TBD"
    communication: "TBD"
    learning: "TBD"
- result: "${result}"
`;
  writeFileSync(join(dir, "trial-evaluation.md"), evaluation, "utf8");
  if (record.trial) record.trial.result = result;

  if (result === "pass") {
    record.phase = "ACTIVE";
    for (const key of Object.keys(record.checklist)) record.checklist[key] = true;
    setLifecycle(role, "ACTIVE", "trial passed");
  } else if (result === "fail") {
    record.phase = "FAILED";
    setLifecycle(role, "FAILED", "trial failed");
  }
  writeJson(join(dir, "onboarding.json"), record);
  console.log(`✓ ${role} 试用期考核已记录: result=${result}`);
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
    case "setup":
      cmdSetup(flags);
      break;
    case "assign-mentor":
      cmdAssignMentor(flags);
      break;
    case "create-trial":
      cmdCreateTrial(flags);
      break;
    case "evaluate-trial":
      cmdEvaluateTrial(flags);
      break;
    default:
      console.error(`✗ 未知命令: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main();
