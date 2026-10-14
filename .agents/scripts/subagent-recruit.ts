#!/usr/bin/env tsx
/**
 * Subagent-recruit — 招聘：JD 编写、候选人评估、录用初始化。
 *
 * 用法: pnpm exec tsx .agents/scripts/subagent-recruit.ts create-jd --role <id> --department <dept>
 * pnpm exec tsx .agents/scripts/subagent-recruit.ts evaluate --jd <file> --candidate
 * [internal:role|external:file](internal:role|external:file) pnpm exec tsx
 * .agents/scripts/subagent-recruit.ts hire --role <id> --mentor <mentor-id>
 *
 * 输出: .agents/recruitment/ 规格: .opencode/skills/subagent-recruitment/SKILL.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./run-gate.ts";

const REPO_ROOT = findRepoRoot();
const RECRUIT_DIR = join(REPO_ROOT, ".agents", "recruitment");
const ROLE_IDS = [
  "frontend-architect",
  "content-engineer",
  "build-deploy-engineer",
  "cli-tool-engineer",
  "search-discovery-engineer",
  "quality-dx-guardian",
] as const;
type RoleId = (typeof ROLE_IDS)[number];

interface RoleProfile {
  title: string;
  department: string;
  reports_to: string;
  level: string;
  responsibilities: string[];
  required_skills: string[];
  nice_to_have: string[];
  kpis: string[];
}

const ROLE_CATALOG: Record<RoleId, RoleProfile> = {
  "frontend-architect": {
    title: "前端架构师",
    department: "frontend",
    reports_to: "quality-dx-guardian",
    level: "staff",
    responsibilities: ["组件体系与设计系统", "主题 token 治理", "性能与可访问性"],
    required_skills: ["Astro 组件开发", "Tailwind CSS / daisyUI", "Web 性能优化"],
    nice_to_have: ["View Transitions 经验", "视觉回归测试"],
    kpis: ["LCP < 2.5s", "可访问性 0 critical", "组件复用率提升"],
  },
  "content-engineer": {
    title: "内容工程师",
    department: "content",
    reports_to: "frontend-architect",
    level: "senior",
    responsibilities: ["Content Collections 与 Zod schema", "Markdown/MDX 管线", "RSS / SEO"],
    required_skills: ["Astro Content Collections", "Zod", "Markdown/MDX 工具链"],
    nice_to_have: ["Satteri/remark 插件", "i18n"],
    kpis: ["构建 0 Markdown 错误", "RSS/站点地图有效"],
  },
  "build-deploy-engineer": {
    title: "构建部署工程师",
    department: "platform",
    reports_to: "quality-dx-guardian",
    level: "senior",
    responsibilities: ["BuildPipeline", "Pagefind/lychee/vnu 集成", "多平台 CI/CD"],
    required_skills: ["Astro 集成 API", "CI/CD", "Node 构建工具链"],
    nice_to_have: ["IPFS/Pinata", "缓存优化"],
    kpis: ["CI < 8min", "0 broken links", "0 vnu errors"],
  },
  "cli-tool-engineer": {
    title: "CLI 工具工程师",
    department: "platform",
    reports_to: "build-deploy-engineer",
    level: "senior",
    responsibilities: ["post-edit (Rust) CLI", "交互菜单", "发布流程"],
    required_skills: ["Rust / Cargo", "Clap", "CLI 测试"],
    nice_to_have: ["cargo-audit", "跨平台打包"],
    kpis: ["cargo test 全绿", "0 clippy warnings", "0 vulnerabilities"],
  },
  "search-discovery-engineer": {
    title: "搜索发现工程师",
    department: "frontend",
    reports_to: "frontend-architect",
    level: "senior",
    responsibilities: ["Pagefind 索引优化", "搜索 UI 组件", "标签/推荐算法"],
    required_skills: ["Pagefind", "Astro 组件", "TypeScript"],
    nice_to_have: ["语义搜索/向量嵌入", "Elasticsearch/Algolia"],
    kpis: ["搜索响应 < 200ms", "满意率 > 4.5/5", "索引构建 < 30s"],
  },
  "quality-dx-guardian": {
    title: "质量与 DX 守护者",
    department: "enabling",
    reports_to: "quality-dx-guardian",
    level: "staff",
    responsibilities: ["oxlint/oxfmt/TS 门禁", "Playwright E2E", "技术债与规范治理"],
    required_skills: ["Oxlint/Oxfmt", "TypeScript strict", "Playwright"],
    nice_to_have: ["质量度量平台", "供应链安全"],
    kpis: ["门禁 0 errors", "首次通过率 > 95%", "技术债偿还率 > 新增率"],
  },
};

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

function requireString(flags: Record<string, string | boolean>, key: string): string {
  const value = flags[key];
  if (typeof value !== "string" || !value) {
    console.error(`✗ 需要 --${key} <value>`);
    process.exit(1);
  }
  return value;
}

function printHelp(): void {
  console.log(`subagent-recruit — 招聘管理

用法:
  subagent-recruit create-jd --role <id> [--department <dept>]
  subagent-recruit evaluate --jd <file> --candidate <internal:role|external:file>
  subagent-recruit hire --role <id> --mentor <mentor-id>

已知角色: ${ROLE_IDS.join(", ")}
`);
}

function yamlList(values: string[], indent = "  "): string {
  return values.map((value) => `${indent}- ${value}`).join("\n");
}

function cmdCreateJd(flags: Record<string, string | boolean>): void {
  const role = requireString(flags, "role");
  const known = ROLE_IDS.includes(role as RoleId) ? ROLE_CATALOG[role as RoleId] : null;
  const department =
    typeof flags.department === "string" ? flags.department : (known?.department ?? "unassigned");
  const profile: RoleProfile = known ?? {
    title: role,
    department,
    reports_to: "quality-dx-guardian",
    level: "senior",
    responsibilities: ["待填写"],
    required_skills: ["待填写"],
    nice_to_have: ["待填写"],
    kpis: ["待填写"],
  };
  mkdirSync(RECRUIT_DIR, { recursive: true });
  const body = `# Job Description — ${role}

\`\`\`yaml
role_id: "${role}"
title: "${profile.title}"
department: "${department}"
reports_to: "${profile.reports_to}"
level: "${profile.level}"

responsibilities:
${yamlList(profile.responsibilities)}

required_skills:
${yamlList(profile.required_skills)}

nice_to_have:
${yamlList(profile.nice_to_have)}

kpis:
${yamlList(profile.kpis)}

workload_estimate: "2-3 并行任务/周"
\`\`\`
`;
  const path = join(RECRUIT_DIR, `JD-${role}.md`);
  writeFileSync(path, body, "utf8");
  console.log(`✓ JD 已生成: ${path}`);
}

interface Evaluation {
  task_match: number;
  skill_complement: number;
  collab: number;
  maintenance: number;
}

function scoreCandidate(jdRole: string, candidate: string): { scores: Evaluation; total: number } {
  const isInternal = candidate.startsWith("internal:");
  const candidateRole = candidate.replace(/^(internal|external):/, "");
  let scores: Evaluation;
  if (isInternal) {
    const sameRole = candidateRole === jdRole;
    scores = {
      task_match: sameRole ? 60 : 78,
      skill_complement: sameRole ? 40 : 85,
      collab: 90,
      maintenance: 85,
    };
  } else {
    scores = { task_match: 70, skill_complement: 70, collab: 65, maintenance: 60 };
  }
  const total = Math.round(
    scores.task_match * 0.4 +
      scores.skill_complement * 0.25 +
      scores.collab * 0.2 +
      scores.maintenance * 0.15,
  );
  return { scores, total };
}

function cmdEvaluate(flags: Record<string, string | boolean>): void {
  const jd = requireString(flags, "jd");
  const candidate = requireString(flags, "candidate");
  const jdPath = join(REPO_ROOT, jd);
  if (!existsSync(jdPath)) {
    console.error(`✗ 找不到 JD 文件: ${jd}`);
    process.exit(1);
  }
  const jdContent = readFileSync(jdPath, "utf8");
  const jdRole = /role_id:\s*"?([\w-]+)"?/.exec(jdContent)?.[1] ?? "unknown";
  const { scores, total } = scoreCandidate(jdRole, candidate);
  const recommendation = total >= 80 ? "推荐录用" : total >= 60 ? "待培养" : "不匹配";
  mkdirSync(RECRUIT_DIR, { recursive: true });
  const slug = candidate.replace(/[:/]/g, "-");
  const body = `# Candidate Evaluation — ${candidate} for ${jdRole}

- evaluatedAt: ${new Date().toISOString()}
- jd: ${jd}

| 维度 | 权重 | 得分 |
| ---- | ---- | ---- |
| 任务匹配度 | 40% | ${scores.task_match} |
| 技能互补性 | 25% | ${scores.skill_complement} |
| 协作兼容性 | 20% | ${scores.collab} |
| 维护成本 | 15% | ${scores.maintenance} |
| **加权总分** | 100% | **${total}** |

## 结论

${recommendation}
`;
  const path = join(RECRUIT_DIR, `evaluation-${jdRole}-${slug}.md`);
  writeFileSync(path, body, "utf8");
  console.log(`✓ 评估: ${candidate} → 总分 ${total}（${recommendation}）`);
  console.log(`  报告: ${path}`);
}

function cmdHire(flags: Record<string, string | boolean>): void {
  const role = requireString(flags, "role");
  const mentor = requireString(flags, "mentor");
  mkdirSync(RECRUIT_DIR, { recursive: true });
  const body = `# Hire Record — ${role}

- hiredAt: ${new Date().toISOString()}
- mentor: ${mentor}

## 入职清单

- [ ] 生成 \`.opencode/agents/${role}.md\`
- [ ] 注册到 \`.opencode/opencode.json\`
- [ ] 创建专属 Skill 目录
- [ ] 分配初始任务卡
- [ ] 指导 Mentor（${mentor}）
- [ ] 完成首个任务验证（试用期）

## 下一步

\`pnpm exec tsx .agents/scripts/subagent-onboard.ts setup --role ${role}\`
\`pnpm exec tsx .agents/scripts/subagent-onboard.ts assign-mentor --role ${role} --mentor ${mentor}\`
`;
  const path = join(RECRUIT_DIR, `hire-${role}.md`);
  writeFileSync(path, body, "utf8");
  console.log(`✓ 录用记录已写入 ${path}`);
  console.log("  下一步: subagent-onboard setup");
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }
  const { positionals, flags } = parseArgs(argv);
  switch (positionals[0]) {
    case "create-jd":
      cmdCreateJd(flags);
      break;
    case "evaluate":
      cmdEvaluate(flags);
      break;
    case "hire":
      cmdHire(flags);
      break;
    default:
      console.error(`✗ 未知命令: ${positionals[0]}`);
      printHelp();
      process.exit(1);
  }
}

main();
