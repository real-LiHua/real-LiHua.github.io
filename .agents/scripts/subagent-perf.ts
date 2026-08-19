#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const PERF_DIR = resolve(ROOT, ".agents/performance");
const LIFECYCLE_DIR = resolve(ROOT, ".agents/lifecycle");

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(`
Usage: subagent-perf.ts dashboard --role <id> [--live]
       subagent-perf.ts report --role <id> --period <YYYY-MM>
       subagent-perf.ts review --role <id> --period <YYYY-MM> --notes "<md>"
       subagent-perf.ts promote --role <id> --target-level <L1-L4> --package <file>
       subagent-perf.ts pip create --role <id> --issues "<list>"
       subagent-perf.ts pip review --role <id> --pip-id <id>
`);
    process.exit(1);
  }

  const cmd = args[0];

  if (cmd === "dashboard") {
    const roleIdx = args.indexOf("--role");
    const roleId = roleIdx !== -1 ? args[roleIdx + 1] : "";

    if (!roleId) {
      console.error("✗ --role required");
      process.exit(1);
    }

    const statusFile = resolve(LIFECYCLE_DIR, `${roleId}.status.json`);
    if (!existsSync(statusFile)) {
      console.error("✗ No status");
      process.exit(1);
    }

    const status = JSON.parse(readFileSync(statusFile, "utf8"));
    console.log(`
╔═══════════════════════════════════════════╗
║  Performance Dashboard: ${roleId.padEnd(25)}║
╠═══════════════════════════════════════════╣
║ State: ${status.state.padEnd(36)}║
║ Tasks Completed: ${String(status.metrics.tasks_completed).padEnd(28)}║
║ Quality Gate Pass: ${String(status.metrics.quality_gate_pass_rate + "%").padEnd(26)}║
║ Tasks Failed: ${String(status.metrics.tasks_failed).padEnd(31)}║
╚═══════════════════════════════════════════╝
    `);
  }

  if (cmd === "report") {
    const roleIdx = args.indexOf("--role");
    const periodIdx = args.indexOf("--period");
    const roleId = roleIdx !== -1 ? args[roleIdx + 1] : "";
    const period = periodIdx !== -1 ? args[periodIdx + 1] : new Date().toISOString().slice(0, 7);

    if (!roleId) {
      console.error("✗ --role required");
      process.exit(1);
    }

    ensureDir(PERF_DIR);
    const reportFile = resolve(PERF_DIR, `report-${roleId}-${period}.md`);
    if (!existsSync(reportFile)) {
      console.error("✗ Report not found. Run lifecycle evaluate first.");
      process.exit(1);
    }
    console.log(readFileSync(reportFile, "utf8"));
  }

  if (cmd === "review") {
    const roleIdx = args.indexOf("--role");
    const periodIdx = args.indexOf("--period");
    const notesIdx = args.indexOf("--notes");
    const roleId = roleIdx !== -1 ? args[roleIdx + 1] : "";
    const period = periodIdx !== -1 ? args[periodIdx + 1] : new Date().toISOString().slice(0, 7);
    const notes = notesIdx !== -1 ? args[notesIdx + 1] : "";

    ensureDir(PERF_DIR);
    const reviewFile = resolve(PERF_DIR, `review-${roleId}-${period}.md`);
    const content = `# Performance Review: ${roleId} - ${period}\n\n**Date**: ${new Date().toISOString().slice(0, 10)}\n\n## Notes\n${notes || "No notes provided."}\n\n## Action Items\n- [ ] \n`;
    writeFileSync(reviewFile, content);
    console.log(`✓ Created review: ${reviewFile}`);
  }

  if (cmd === "promote") {
    console.log("📈 Promotion evaluation - TODO: implement");
  }

  if (cmd === "pip") {
    const pipCmd = args[1];
    if (pipCmd === "create") {
      const roleIdx = args.indexOf("--role");
      const issuesIdx = args.indexOf("--issues");
      const roleId = roleIdx !== -1 ? args[roleIdx + 1] : "";
      const issues = issuesIdx !== -1 ? args[issuesIdx + 1] : "";

      ensureDir(PERF_DIR);
      const pipFile = resolve(PERF_DIR, `PIP-${roleId}-${Date.now()}.md`);
      writeFileSync(
        pipFile,
        `# Performance Improvement Plan: ${roleId}\n\n**Created**: ${new Date().toISOString().slice(0, 10)}\n\n## Issues\n${issues}\n\n## Actions\n- [ ] \n\n## Review Date: \n\n## Outcome: \n`,
      );
      console.log(`✓ Created PIP: ${pipFile}`);
    }
  }
}

main();
