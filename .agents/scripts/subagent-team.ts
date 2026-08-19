#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const AGENTS_DIR = resolve(ROOT, ".opencode/agents");
const TEAM_DIR = resolve(ROOT, ".agents/team");
const TASKS_DIR = resolve(ROOT, ".agents/tasks");

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadAgentSkills(roleId: string): string[] {
  // Simplified: parse from agent file or use defaults
  const skillMap: Record<string, string[]> = {
    "frontend-architect": ["astro", "tailwind", "daisyui", "typescript", "a11y", "architecture"],
    "content-engineer": ["astro", "markdown", "mdx", "satteri", "rss", "schema"],
    "build-deploy-engineer": ["astro", "ci-cd", "cloudflare", "pagefind", "vnu", "lychee"],
    "cli-tool-engineer": ["rust", "cargo", "clap", "testing", "cli-design"],
    "search-discovery-engineer": ["pagefind", "search", "tagging", "ranking", "astro"],
    "quality-dx-guardian": ["oxlint", "oxfmt", "typescript", "playwright", "ci", "standards"],
  };
  return skillMap[roleId] || [];
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log(`
Usage: subagent-team.ts topology [--format mermaid|graphviz]
       subagent-team.ts skills-matrix [--output <file>]
       subagent-team.ts capacity [--quarter <YYYY-QN>]
       subagent-team.ts rebalance [--dry-run]
       subagent-team.ts form-feature-team --mission "<desc>" --lead <role-id>
       subagent-team.ts health-check [--anonymous] [--output <file>]
`);
    process.exit(1);
  }

  const cmd = args[0];

  if (cmd === "topology") {
    const formatIdx = args.indexOf("--format");
    const format = formatIdx !== -1 ? args[formatIdx + 1] : "mermaid";

    if (format === "mermaid") {
      console.log(`
graph TB
    subgraph Platform
        BDE[Build-Deploy Engineer]
        CTE[CLI Tool Engineer]
    end
    
    subgraph Stream-Aligned
        FA[Frontend Architect]
        CE[Content Engineer]
        SDE[Search Discovery Engineer]
    end
    
    subgraph Enabling
        QDG[Quality-DX Guardian]
    end
    
    QDG -.->|Governance| FA
    QDG -.->|Governance| CE
    QDG -.->|Governance| SDE
    QDG -.->|Governance| BDE
    QDG -.->|Governance| CTE
    
    FA -->|API/Contracts| CE
    FA -->|UI Components| SDE
    CE -->|Content/Schema| SDE
    BDE -->|CI/CD| FA
    BDE -->|CI/CD| CE
    CTE -->|Tooling| FA
    CTE -->|Tooling| CE
      `);
    }
  }

  if (cmd === "skills-matrix") {
    const outputIdx = args.indexOf("--output");
    const output = outputIdx !== -1 ? args[outputIdx + 1] : "";

    const agents = readdirSync(AGENTS_DIR)
      .filter((f) => f.endsWith(".md") && !f.startsWith("role-"))
      .map((f) => f.replace(".md", ""));

    const allSkills = new Set<string>();
    const matrix: Record<string, string[]> = {};
    for (const agent of agents) {
      const skills = loadAgentSkills(agent);
      matrix[agent] = skills;
      skills.forEach((s) => allSkills.add(s));
    }

    const sortedSkills = Array.from(allSkills).sort();
    let md = "# Skills Matrix\n\n| Skill ";
    for (const agent of agents) md += `| ${agent} `;
    md += "|\n|---";
    for (let i = 0; i < agents.length; i++) md += "|---";
    md += "|\n";

    for (const skill of sortedSkills) {
      md += `| ${skill} `;
      for (const agent of agents) {
        const level = matrix[agent].includes(skill) ? "●" : "○";
        md += `| ${level} `;
      }
      md += "|\n";
    }

    if (output) {
      ensureDir(dirname(resolve(ROOT, output)));
      writeFileSync(resolve(ROOT, output), md);
      console.log(`✓ Skills matrix written to ${output}`);
    } else {
      console.log(md);
    }
  }

  if (cmd === "capacity") {
    const quarterIdx = args.indexOf("--quarter");
    const quarter =
      quarterIdx !== -1
        ? args[quarterIdx + 1]
        : `2026-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

    ensureDir(TEAM_DIR);
    const planFile = resolve(TEAM_DIR, `capacity-plan-${quarter}.md`);

    const agents = readdirSync(AGENTS_DIR)
      .filter((f) => f.endsWith(".md") && !f.startsWith("role-"))
      .map((f) => f.replace(".md", ""));

    let md = `# Capacity Plan: ${quarter}\n\n`;
    for (const agent of agents) {
      md += `## ${agent}\n- Capacity: 20h/week\n- Current: 16h/week\n- Buffer: 4h/week\n- Max Concurrent: 3\n\n`;
    }

    writeFileSync(planFile, md);
    console.log(`✓ Capacity plan: ${planFile}`);
  }

  if (cmd === "rebalance") {
    const dryRun = args.includes("--dry-run");
    console.log(`${dryRun ? "[DRY RUN] " : ""}Rebalancing...`);
    console.log("TODO: Implement load analysis and task redistribution");
  }

  if (cmd === "form-feature-team") {
    const missionIdx = args.indexOf("--mission");
    const leadIdx = args.indexOf("--lead");
    const mission = missionIdx !== -1 ? args[missionIdx + 1] : "";
    const lead = leadIdx !== -1 ? args[leadIdx + 1] : "";

    if (!mission || !lead) {
      console.error("✗ --mission and --lead required");
      process.exit(1);
    }

    ensureDir(TEAM_DIR);
    const teamId = `ft-${Date.now()}`;
    const teamFile = resolve(TEAM_DIR, `${teamId}.md`);

    const content = `# Feature Team: ${teamId}\n\n**Mission**: ${mission}\n**Lead**: ${lead}\n**Created**: ${new Date().toISOString().slice(0, 10)}\n\n## Members\n- ${lead} (Lead)\n- \n\n## Duration: 4 weeks\n\n## Ceremonies\n- Daily Standup: 15min\n- Weekly Sync: 30min\n- Retrospective: End\n`;

    writeFileSync(teamFile, content);
    console.log(`✓ Formed feature team: ${teamFile}`);
  }

  if (cmd === "health-check") {
    const anonymous = args.includes("--anonymous");
    const outputIdx = args.indexOf("--output");
    const output = outputIdx !== -1 ? args[outputIdx + 1] : "";

    const report =
      `# Team Health Check - ${new Date().toISOString().slice(0, 7)}\n\n` +
      `## Psychological Safety: 4.2/5\n` +
      `## Workload Balance: 0.85\n` +
      `## Knowledge Silo Risk: Low\n` +
      `## Cross-team Collaboration: High\n` +
      `## Innovation Rate: Medium\n\n` +
      `## Action Items\n- [ ] Schedule tech talk\n- [ ] Review knowledge sharing\n`;

    if (output) {
      ensureDir(dirname(resolve(ROOT, output)));
      writeFileSync(resolve(ROOT, output), report);
      console.log(`✓ Health check: ${output}`);
    } else {
      console.log(report);
    }
  }
}

main();
