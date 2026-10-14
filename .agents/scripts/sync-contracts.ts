#!/usr/bin/env tsx
/**
 * Sync-contracts — 契约同步检查。
 *
 * 用法: pnpm exec tsx .agents/scripts/sync-contracts.ts [--report] [--json] [--strict]
 *
 * 功能:
 *
 * 1. 校验 .agents/contracts/*.json（可解析、含 $schema/title）
 * 2. 提取每份契约声明的符号（properties 键）
 * 3. 校验任务卡 Inputs/Contracts 字段引用的契约文件存在
 * 4. Src/modules/*.ts 缺失时记为 skipped（重写期预期）
 *
 * 退出码: 默认 advisory 0；`--strict` 在契约非法或引用缺失时退出 1。 规格: docs/adr/0009-knowledge-update-process.md §3.3
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { findRepoRoot } from "./run-gate.ts";

const REPO_ROOT = findRepoRoot();
const CONTRACTS_DIR = join(REPO_ROOT, ".agents", "contracts");
const TASKS_DIR = join(REPO_ROOT, ".agents", "tasks");

interface ContractInfo {
  file: string;
  valid: boolean;
  title: string | null;
  symbols: string[];
  error?: string;
}

interface ContractRef {
  file: string;
  line: number;
  ref: string;
  resolved: string | null;
  status: "ok" | "missing" | "skipped";
}

interface ContractReport {
  timestamp: string;
  contracts: ContractInfo[];
  refs: ContractRef[];
  modulesSkipped: boolean;
  invalidContracts: number;
  missingRefs: number;
}

function readDirJson(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((entry) => entry.endsWith(".json"))
      .sort();
  } catch {
    return [];
  }
}

function inspectContract(abs: string): ContractInfo {
  const file = relative(REPO_ROOT, abs).split("\\").join("/");
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(abs, "utf8"));
  } catch (error) {
    return { file, valid: false, title: null, symbols: [], error: (error as Error).message };
  }
  const root = parsed as Record<string, unknown>;
  const title = typeof root.title === "string" ? root.title : null;
  const symbols =
    root.properties && typeof root.properties === "object"
      ? Object.keys(root.properties as object)
      : [];
  const valid = Boolean(root.$schema) && Boolean(title);
  return { file, valid, title, symbols, error: valid ? undefined : "缺少 $schema 或 title" };
}

function walkTaskCards(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walkTaskCards(abs, out);
    else if (entry.endsWith(".md")) out.push(abs);
  }
}

function collectRefs(): ContractRef[] {
  const cards: string[] = [];
  walkTaskCards(TASKS_DIR, cards);
  const knownContracts = new Set(readDirJson(CONTRACTS_DIR).map((name) => name));
  const refs: ContractRef[] = [];
  for (const abs of cards) {
    const rel = relative(REPO_ROOT, abs).split("\\").join("/");
    const lines = readFileSync(abs, "utf8").split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!/\*\*Contracts?\*\*/.test(line)) continue;
      const tokens = [...line.matchAll(/`([^`]+)`|\[([^\]]+)\]/g)]
        .flatMap((match) => [match[1], match[2]])
        .flatMap((value) => (value ? value.split(/[,\s]+/) : []))
        .map((value) => value.trim())
        .filter(
          (value) =>
            value.length > 0 &&
            (value.endsWith(".json") || value.endsWith(".ts") || value.endsWith(".md")),
        );
      for (const ref of tokens) {
        if (ref.startsWith("src/")) {
          refs.push({ file: rel, line: index + 1, ref, resolved: ref, status: "skipped" });
          continue;
        }
        const candidate = ref.startsWith(".")
          ? ref
          : knownContracts.has(basename(ref)) && !ref.includes("/")
            ? `.agents/contracts/${ref}`
            : ref;
        const resolved = candidate.split("\\").join("/");
        const exists = existsSync(join(REPO_ROOT, resolved));
        refs.push({ file: rel, line: index + 1, ref, resolved, status: exists ? "ok" : "missing" });
      }
    }
  }
  return refs;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`sync-contracts — 契约同步检查

用法:
  pnpm exec tsx .agents/scripts/sync-contracts.ts [options]

选项:
  --report   写入 .agents/reports/contract-sync-<timestamp>.json
  --json     以 JSON 输出
  --strict   契约非法或引用缺失时退出码 1
  --help     显示帮助
`);
    return;
  }
  const flags = new Set(argv.filter((token) => token.startsWith("--")));

  const contracts = readDirJson(CONTRACTS_DIR).map((name) =>
    inspectContract(join(CONTRACTS_DIR, name)),
  );
  const refs = collectRefs();
  const invalidContracts = contracts.filter((contract) => !contract.valid).length;
  const missingRefs = refs.filter((ref) => ref.status === "missing").length;
  const modulesSkipped = !existsSync(join(REPO_ROOT, "src", "modules"));

  const report: ContractReport = {
    timestamp: new Date().toISOString(),
    contracts,
    refs,
    modulesSkipped,
    invalidContracts,
    missingRefs,
  };

  if (flags.has("--report")) {
    const ts = report.timestamp.replace(/[:.]/g, "-");
    const path = join(REPO_ROOT, ".agents", "reports", `contract-sync-${ts}.json`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`✓ 报告已写入 ${path}`);
  }

  if (flags.has("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`sync-contracts — 契约 ${contracts.length} 份，引用 ${refs.length} 处`);
    for (const contract of contracts) {
      const mark = contract.valid ? "✓" : "✗";
      console.log(
        `  ${mark} ${contract.file}  (${contract.symbols.length} symbols)${contract.error ? ` — ${contract.error}` : ""}`,
      );
    }
    if (modulesSkipped) console.log("  ℹ src/modules/ 不存在 → 模块导出对比已跳过（重写期预期）");
    const missing = refs.filter((ref) => ref.status === "missing");
    if (missing.length) {
      console.log(`✗ ${missing.length} 处契约引用缺失:`);
      for (const ref of missing) console.log(`  ${ref.file}:${ref.line}  ${ref.ref}`);
    } else {
      console.log("✓ 任务卡契约引用均有效");
    }
  }

  process.exit(flags.has("--strict") && (invalidContracts > 0 || missingRefs > 0) ? 1 : 0);
}

main();
