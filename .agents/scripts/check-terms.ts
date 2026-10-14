#!/usr/bin/env tsx
/**
 * Check-terms — 术语一致性检查。
 *
 * 用法: pnpm exec tsx .agents/scripts/check-terms.ts [--report] [--json] [--strict]
 *
 * 功能:
 *
 * 1. 读取 CONTEXT.md 术语表（格式: `**Term** — definition`）
 * 2. 扫描 docs/**、.agents/**（排除 skills）、根级 *.md 中的术语定义
 * 3. 报告: CONTEXT 内重复定义 / 别处重复定义（redefined）/ 未登记的外部定义
 *
 * 退出码: 默认 advisory 0；`--strict` 在存在重复/覆盖定义时退出 1。 规格: docs/adr/0009-knowledge-update-process.md §3.2
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { findRepoRoot } from "./run-gate.ts";

const REPO_ROOT = findRepoRoot();
const CONTEXT_FILE = join(REPO_ROOT, "CONTEXT.md");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".astro",
  "target",
  "playwright-report",
  "test-results",
]);
/** `**Term** — definition`（支持 em dash / en dash / 连字符）。 */
const DEF_RE = /^\*\*([^*]+)\*\*\s*[—–-]\s+\S/;

interface Definition {
  file: string;
  line: number;
  term: string;
}

interface TermReport {
  timestamp: string;
  contextTerms: string[];
  redefined: Definition[];
  duplicatesInContext: Definition[];
  externalDefinitions: Definition[];
  scannedFiles: number;
}

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = join(dir, entry);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      if (abs === join(REPO_ROOT, ".agents", "skills")) continue;
      if (abs === join(REPO_ROOT, ".opencode")) continue;
      walk(abs, out);
    } else if (stat.isFile() && entry.endsWith(".md")) {
      out.push(abs);
    }
  }
}

function collectMarkdown(): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(REPO_ROOT)) {
    if (entry.endsWith(".md")) files.push(join(REPO_ROOT, entry));
  }
  walk(join(REPO_ROOT, "docs"), files);
  walk(join(REPO_ROOT, ".agents"), files);
  return [...new Set(files)].sort();
}

function parseDefinitions(abs: string): Definition[] {
  const rel = relative(REPO_ROOT, abs);
  let content: string;
  try {
    content = readFileSync(abs, "utf8");
  } catch {
    return [];
  }
  const out: Definition[] = [];
  let inFence = false;
  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || line.includes("⏸")) continue;
    const match = DEF_RE.exec(line);
    if (match) out.push({ file: rel, line: index + 1, term: match[1].trim() });
  }
  return out;
}

const TERM_NOISE = new Set([
  "Positive",
  "Trade-offs",
  "Consequences",
  "Context",
  "Decision",
  "Status",
]);

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`check-terms — 术语一致性检查

用法:
  pnpm exec tsx .agents/scripts/check-terms.ts [options]

选项:
  --report   写入 .agents/reports/term-check-<timestamp>.json
  --json     以 JSON 输出
  --strict   存在重复/覆盖定义时退出码 1
  --help     显示帮助
`);
    return;
  }
  const flags = new Set(argv.filter((token) => token.startsWith("--")));

  const contextDefs = existsSync(CONTEXT_FILE) ? parseDefinitions(CONTEXT_FILE) : [];
  const contextTerms = new Set(contextDefs.map((def) => def.term));

  const duplicatesInContext: Definition[] = [];
  {
    const seen = new Set<string>();
    for (const def of contextDefs) {
      if (seen.has(def.term)) duplicatesInContext.push(def);
      else seen.add(def.term);
    }
  }

  const files = collectMarkdown().filter((abs) => abs !== CONTEXT_FILE);
  const redefined: Definition[] = [];
  const externalDefinitions: Definition[] = [];
  for (const abs of files) {
    for (const def of parseDefinitions(abs)) {
      if (TERM_NOISE.has(def.term)) continue;
      if (contextTerms.has(def.term)) redefined.push(def);
      else externalDefinitions.push(def);
    }
  }

  const report: TermReport = {
    timestamp: new Date().toISOString(),
    contextTerms: [...contextTerms].sort(),
    redefined,
    duplicatesInContext,
    externalDefinitions,
    scannedFiles: files.length,
  };

  if (flags.has("--report")) {
    const ts = report.timestamp.replace(/[:.]/g, "-");
    const path = join(REPO_ROOT, ".agents", "reports", `term-check-${ts}.json`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`✓ 报告已写入 ${path}`);
  }

  if (flags.has("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `check-terms — CONTEXT.md 术语 ${contextTerms.size} 个，扫描 ${files.length} 个文件`,
    );
    if (duplicatesInContext.length) {
      console.log(`✗ CONTEXT.md 内重复定义 ${duplicatesInContext.length} 个:`);
      for (const def of duplicatesInContext) console.log(`  ${def.file}:${def.line}  ${def.term}`);
    } else {
      console.log("✓ CONTEXT.md 内无重复定义");
    }
    if (redefined.length) {
      console.log(`✗ 别处重复定义（应改为引用 CONTEXT.md）${redefined.length} 个:`);
      for (const def of redefined) console.log(`  ${def.file}:${def.line}  ${def.term}`);
    } else {
      console.log("✓ 无重复定义");
    }
    if (externalDefinitions.length) {
      console.log(
        `ℹ 未登记的外部定义 ${externalDefinitions.length} 个（advisory，建议评估是否入 CONTEXT.md）`,
      );
    }
  }

  const failing = duplicatesInContext.length + redefined.length > 0;
  process.exit(flags.has("--strict") && failing ? 1 : 0);
}

main();
