#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const AGENTS_DIR = resolve(ROOT, ".opencode/agents");
const ONBOARDING_DIR = resolve(ROOT, ".agents/onboarding");

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args[0] !== "setup") {
    console.log(`
Usage: subagent-onboard.ts setup --role <role-id>
       subagent-onboard.ts assign-mentor --role <role-id> --mentor <mentor-id>
       subagent-onboard.ts create-trial --role <role-id>
       subagent-onboard.ts evaluate-trial --role <role-id>
`);
    process.exit(1);
  }

  const cmd = args[0];
  const roleIdx = args.indexOf("--role");
  const roleId = roleIdx !== -1 ? args[roleIdx + 1] : "";

  if (!roleId) {
    console.error("✗ --role required");
    process.exit(1);
  }

  if (cmd === "setup") {
    ensureDir(ONBOARDING_DIR);
    ensureDir(resolve(ONBOARDING_DIR, "role-specific"));

    // Copy shared onboarding docs if not exist
    const sharedDocs = [
      "00-project-overview.md",
      "01-team-structure.md",
      "02-communication-protocol.md",
      "03-quality-gates.md",
      "04-task-workflow.md",
      "05-tools-access.md",
      "FAQ.md",
      "best-practices.md",
    ];

    for (const doc of sharedDocs) {
      const src = resolve(ONBOARDING_DIR, doc);
      if (!existsSync(src)) {
        writeFileSync(
          src,
          `# ${doc.replace(".md", "").replace(/^\d+-/, "")}\n\nTODO: Add content\n`,
        );
      }
    }

    // Create role-specific guide
    const roleGuide = resolve(ONBOARDING_DIR, "role-specific", `${roleId}.md`);
    if (!existsSync(roleGuide)) {
      writeFileSync(
        roleGuide,
        `# ${roleId} Role Guide\n\n## Core Responsibilities\n- \n\n## Key Files\n- \n\n## Common Tasks\n- \n\n## Mentor: \n\n## Trial Task: \n`,
      );
    }

    // Create workspace
    const workspace = resolve(ROOT, ".agents/workspace", roleId);
    ensureDir(workspace);

    console.log(`✓ Onboarding setup complete for ${roleId}`);
    console.log(`  Workspace: ${workspace}`);
    console.log(`  Guide: ${roleGuide}`);
  }

  if (cmd === "assign-mentor") {
    const mentorIdx = args.indexOf("--mentor");
    const mentor = mentorIdx !== -1 ? args[mentorIdx + 1] : "";
    if (!mentor) {
      console.error("✗ --mentor required");
      process.exit(1);
    }

    const mentorshipFile = resolve(ONBOARDING_DIR, "role-specific", `mentorship-${roleId}.md`);
    writeFileSync(
      mentorshipFile,
      `# Mentorship Plan: ${roleId}\n\n**Mentor**: ${mentor}\n\n## Phase 1 (Day 1-3): Shadowing\n- Observe mentor on 2-3 tasks\n- Learn communication protocol\n\n## Phase 2 (Day 4-5): First Task\n- Independent trial task\n- Daily check-ins\n\n## Phase 3 (Day 6-7): Evaluation\n- Code review by mentor\n- Trial assessment\n`,
    );
    console.log(`✓ Assigned mentor ${mentor} to ${roleId}`);
  }

  if (cmd === "create-trial") {
    const tasksDir = resolve(ROOT, ".agents/tasks/onboarding");
    ensureDir(tasksDir);

    const trialTask = resolve(tasksDir, `${roleId}-trial.md`);
    const content = `# Trial Task: ${roleId}\n\n---\nid: "trial-${roleId}"\ntitle: "Onboarding Trial Task for ${roleId}"\nphase: "onboarding"\nassignee: "${roleId}"\nstatus: "pending"\ndependencies: []\npriority: "high"\nestimated_hours: 4\n---\n\n## Task Description\nComplete a representative task for ${roleId} role to demonstrate capability.\n\n## Acceptance Criteria\n- pnpm build 成功\n- 质量门禁通过\n- 代码符合项目规范\n`;
    writeFileSync(trialTask, content);
    console.log(`✓ Created trial task: ${trialTask}`);
  }

  if (cmd === "evaluate-trial") {
    console.log("📝 Trial evaluation - TODO: implement assessment rubric");
  }
}

main();
