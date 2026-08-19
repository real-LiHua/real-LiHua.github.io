#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const AGENTS_DIR = resolve(ROOT, ".opencode/agents");
const RECRUITMENT_DIR = resolve(ROOT, ".agents/recruitment");

interface JobDescription {
  role_id: string;
  title: string;
  department: string;
  reports_to: string;
  level: string;
  responsibilities: string[];
  required_skills: string[];
  nice_to_have: string[];
  kpis: string[];
  workload_estimate: string;
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function generateJDTemplate(roleId: string, department: string): JobDescription {
  return {
    role_id: roleId,
    title: roleId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    department,
    reports_to: department === "frontend" ? "frontend-architect" : "build-deploy-engineer",
    level: "senior",
    responsibilities: [`${roleId} 核心职责 1`, `${roleId} 核心职责 2`],
    required_skills: ["TypeScript", "Astro", "相关领域专业技能"],
    nice_to_have: ["相关生态经验"],
    kpis: ["任务完成率 > 90%", "质量门禁通过率 > 95%"],
    workload_estimate: "2-3 并行任务/周",
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args[0] !== "create-jd") {
    console.log(`
Usage: subagent-recruit.ts create-jd --role <role-id> --department <dept>
       subagent-recruit.ts evaluate --jd <jd-file> --candidate <agent-id>
       subagent-recruit.ts hire --role <role-id> --mentor <mentor-id>
`);
    process.exit(1);
  }

  const cmd = args[0];

  if (cmd === "create-jd") {
    const roleIdx = args.indexOf("--role");
    const deptIdx = args.indexOf("--department");
    const roleId = roleIdx !== -1 ? args[roleIdx + 1] : "";
    const department = deptIdx !== -1 ? args[deptIdx + 1] : "frontend";

    if (!roleId) {
      console.error("✗ --role required");
      process.exit(1);
    }

    ensureDir(RECRUITMENT_DIR);
    const jd = generateJDTemplate(roleId, department);
    const file = resolve(RECRUITMENT_DIR, `JD-${roleId}.md`);

    const content =
      `# Job Description: ${jd.title}\n\n` +
      Object.entries(jd)
        .map(([k, v]) => `## ${k}\n${Array.isArray(v) ? v.map((x) => `- ${x}`).join("\n") : v}`)
        .join("\n\n");

    writeFileSync(file, content);
    console.log(`✓ Created JD: ${file}`);
  }

  if (cmd === "evaluate") {
    console.log("📋 Candidate evaluation - TODO: implement scoring model");
  }

  if (cmd === "hire") {
    console.log("🎉 Hiring - TODO: initialize agent, assign mentor, create trial task");
  }
}

main();
