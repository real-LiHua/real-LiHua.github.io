#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const AGENTS_DIR = resolve(ROOT, ".opencode/agents");
const LIFECYCLE_DIR = resolve(ROOT, ".agents/lifecycle");

const STATES = [
  "created",
  "onboarding",
  "active",
  "idle",
  "deprecated",
  "archived",
  "failed",
] as const;
type State = (typeof STATES)[number];

interface AgentStatus {
  role_id: string;
  state: State;
  created_at: string;
  updated_at: string;
  last_task_at: string | null;
  metrics: {
    tasks_completed: number;
    tasks_failed: number;
    quality_gate_pass_rate: number;
  };
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function getStatusFile(roleId: string) {
  return resolve(LIFECYCLE_DIR, `${roleId}.status.json`);
}

function loadStatus(roleId: string): AgentStatus | null {
  const file = getStatusFile(roleId);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function saveStatus(status: AgentStatus) {
  ensureDir(LIFECYCLE_DIR);
  writeFileSync(getStatusFile(status.role_id), JSON.stringify(status, null, 2));
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(`
Usage: subagent-lifecycle.ts status [--role <id>] [--all]
       subagent-lifecycle.ts activate|suspend|resume|deprecate|archive --role <id> --reason <str>
       subagent-lifecycle.ts evaluate --role <id> --period <YYYY-MM>
       subagent-lifecycle.ts monthly-review
       subagent-lifecycle.ts cleanup-idle
`);
    process.exit(1);
  }

  const cmd = args[0];

  if (cmd === "status") {
    const allIdx = args.indexOf("--all");
    const roleIdx = args.indexOf("--role");

    if (allIdx !== -1 || roleIdx === -1) {
      // Show all
      const agents = readdirSync(AGENTS_DIR).filter(
        (f) => f.endsWith(".md") && !f.startsWith("role-"),
      );
      for (const agent of agents) {
        const roleId = agent.replace(".md", "");
        const status = loadStatus(roleId);
        console.log(
          `${roleId}: ${status?.state || "unknown"} (tasks: ${status?.metrics.tasks_completed || 0})`,
        );
      }
    } else {
      const roleId = args[roleIdx + 1];
      const status = loadStatus(roleId);
      if (status) console.log(JSON.stringify(status, null, 2));
      else console.log(`No status for ${roleId}`);
    }
  }

  if (["activate", "suspend", "resume", "deprecate", "archive"].includes(cmd)) {
    const roleIdx = args.indexOf("--role");
    const reasonIdx = args.indexOf("--reason");
    const roleId = roleIdx !== -1 ? args[roleIdx + 1] : "";
    const reason = reasonIdx !== -1 ? args[reasonIdx + 1] : "manual";

    if (!roleId) {
      console.error("✗ --role required");
      process.exit(1);
    }

    const validStates: Record<string, State> = {
      activate: "active",
      suspend: "idle",
      resume: "active",
      deprecate: "deprecated",
      archive: "archived",
    };

    const newState = validStates[cmd];
    if (!newState) {
      console.error("✗ Invalid command");
      process.exit(1);
    }

    let status = loadStatus(roleId);
    if (!status) {
      status = {
        role_id: roleId,
        state: "created",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_task_at: null,
        metrics: { tasks_completed: 0, tasks_failed: 0, quality_gate_pass_rate: 100 },
      };
    }

    const oldState = status.state;
    status.state = newState;
    status.updated_at = new Date().toISOString();
    saveStatus(status);

    console.log(`✓ ${roleId}: ${oldState} → ${newState} (reason: ${reason})`);

    // Log transition
    const logFile = resolve(LIFECYCLE_DIR, "transitions.log");
    const log = `[${new Date().toISOString()}] ${roleId}: ${oldState} → ${newState} (${reason})\n`;
    writeFileSync(logFile, log, { flag: "a" });
  }

  if (cmd === "evaluate") {
    const roleIdx = args.indexOf("--role");
    const periodIdx = args.indexOf("--period");
    const roleId = roleIdx !== -1 ? args[roleIdx + 1] : "";
    const period = periodIdx !== -1 ? args[periodIdx + 1] : new Date().toISOString().slice(0, 7);

    if (!roleId) {
      console.error("✗ --role required");
      process.exit(1);
    }

    const status = loadStatus(roleId);
    if (!status) {
      console.error("✗ No status found");
      process.exit(1);
    }

    // Simulate metrics collection
    const report =
      `# Performance Report: ${roleId} - ${period}\n\n` +
      `## Metrics\n` +
      `- Tasks Completed: ${status.metrics.tasks_completed}\n` +
      `- Tasks Failed: ${status.metrics.tasks_failed}\n` +
      `- Quality Gate Pass Rate: ${status.metrics.quality_gate_pass_rate}%\n` +
      `\n## Rating: meets_expectations\n\n` +
      `## Actions: continue_active\n`;

    const reportFile = resolve(LIFECYCLE_DIR, `performance-${roleId}-${period}.md`);
    writeFileSync(reportFile, report);
    console.log(`✓ Generated report: ${reportFile}`);
  }

  if (cmd === "monthly-review") {
    const agents = readdirSync(AGENTS_DIR).filter(
      (f) => f.endsWith(".md") && !f.startsWith("role-"),
    );
    console.log(`\n=== Monthly Review ${new Date().toISOString().slice(0, 7)} ===\n`);
    for (const agent of agents) {
      const roleId = agent.replace(".md", "");
      const status = loadStatus(roleId);
      if (status) {
        console.log(
          `${roleId}: ${status.state} | Completed: ${status.metrics.tasks_completed} | Pass Rate: ${status.metrics.quality_gate_pass_rate}%`,
        );
      }
    }
  }

  if (cmd === "cleanup-idle") {
    const agents = readdirSync(AGENTS_DIR).filter(
      (f) => f.endsWith(".md") && !f.startsWith("role-"),
    );
    let cleaned = 0;
    for (const agent of agents) {
      const roleId = agent.replace(".md", "");
      const status = loadStatus(roleId);
      if (status && status.state === "idle") {
        // Check last task time
        if (status.last_task_at) {
          const daysSince =
            (Date.now() - new Date(status.last_task_at).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince > 30) {
            status.state = "deprecated";
            status.updated_at = new Date().toISOString();
            saveStatus(status);
            console.log(`⚠ ${roleId}: idle > 30 days → deprecated`);
            cleaned++;
          }
        }
      }
    }
    console.log(`Cleaned ${cleaned} idle agents`);
  }
}

main();
