#!/usr/bin/env tsx
/**
 * Check-regression — 对比基准 commit 与当前工作树的结构性指标，检测回归。
 *
 * 用法: pnpm exec tsx .agents/scripts/check-regression.ts [base-ref] [--json] [--report] [--baseline]
 *
 * 设计原则（安全、非破坏性）: - 使用只读 git 命令（ls-tree / ls-files / grep），绝不修改工作树 - 结构性指标：文件数、总字节、按扩展名分布、Markdown
 * 数、ADR 数 - 工具性指标（best-effort）：TODO/FIXME/HACK 标记数 - 可选写入
 * baseline：`.agents/reports/regression-baseline.json`
 *
 * 规格: docs/adr/0009-knowledge-update-process.md §3.4 · .agents/onboarding/02-quality-gates.md §6
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { findRepoRoot } from "./run-gate.ts";

const REPO_ROOT = findRepoRoot();
const DEFAULT_BASE = "HEAD~1";
const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".astro",
  ".md",
  ".mdx",
  ".json",
  ".css",
  ".html",
  ".yml",
  ".yaml",
  ".rs",
  ".toml",
]);

interface ExtensionStat {
  files: number;
  bytes: number;
}

interface Metrics {
  files: number;
  bytes: number;
  byExtension: Record<string, ExtensionStat>;
  markdownFiles: number;
  adrCount: number;
}

interface RegressionReport {
  baseRef: string;
  baseResolved: string | null;
  timestamp: string;
  base: Metrics | null;
  current: Metrics;
  delta: { files: number; bytes: number };
  todoMarkers: number;
  regression: boolean;
  notes: string[];
}

function runGit(args: string[]): { ok: boolean; stdout: string } {
  const result = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
  return { ok: result.status === 0, stdout: (result.stdout ?? "").trim() };
}

function emptyMetrics(): Metrics {
  return { files: 0, bytes: 0, byExtension: {}, markdownFiles: 0, adrCount: 0 };
}

function addFile(metrics: Metrics, path: string, bytes: number): void {
  metrics.files += 1;
  metrics.bytes += bytes;
  const ext = extname(path) || "(none)";
  const stat = metrics.byExtension[ext] ?? { files: 0, bytes: 0 };
  stat.files += 1;
  stat.bytes += bytes;
  metrics.byExtension[ext] = stat;
  if (ext === ".md" || ext === ".mdx") metrics.markdownFiles += 1;
  if (path.startsWith("docs/adr/") && (path.endsWith(".md") || path.endsWith(".mdx")))
    metrics.adrCount += 1;
}

/** 解析 `git ls-tree -r -l <ref>` 输出：`<mode> <type> <sha> <size>\t<path>`。 */
function metricsFromTree(ref: string): Metrics | null {
  const { ok, stdout } = runGit(["ls-tree", "-r", "-l", ref]);
  if (!ok) return null;
  const metrics = emptyMetrics();
  for (const line of stdout.split("\n")) {
    if (!line) continue;
    const [meta, path] = line.split("\t");
    if (!meta || !path) continue;
    const tokens = meta.trim().split(/\s+/);
    const bytes = Number.parseInt(tokens[3] ?? "0", 10);
    addFile(metrics, path, Number.isFinite(bytes) ? bytes : 0);
  }
  return metrics;
}

/** 当前工作树：`git ls-files` 列出的路径 + 文件系统 stat。 */
function metricsFromWorktree(): Metrics {
  const { stdout } = runGit(["ls-files"]);
  const metrics = emptyMetrics();
  for (const path of stdout.split("\n")) {
    if (!path) continue;
    const abs = join(REPO_ROOT, path);
    let bytes = 0;
    try {
      bytes = statSync(abs).size;
    } catch {
      bytes = 0; // 已在索引但工作树缺失（例如有意移除的设施）
    }
    addFile(metrics, path, bytes);
  }
  return metrics;
}

function countTodoMarkers(): number {
  const { ok, stdout } = runGit([
    "grep",
    "-n",
    "-E",
    "TODO|FIXME|HACK",
    "--",
    "*.ts",
    "*.md",
    "*.astro",
    "*.rs",
  ]);
  if (!ok || !stdout) return 0;
  return stdout.split("\n").filter(Boolean).length;
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

function printHelp(): void {
  console.log(`check-regression — 对比基准 commit 的结构性指标

用法:
  pnpm exec tsx .agents/scripts/check-regression.ts [base-ref] [options]

选项:
  --json       以 JSON 输出报告
  --report     写入 .agents/reports/regression-<timestamp>.json
  --baseline   将当前指标写入 .agents/reports/regression-baseline.json
  --help       显示帮助

默认 base-ref: ${DEFAULT_BASE}
`);
}

function pct(delta: number, base: number): string {
  if (base === 0) return delta === 0 ? "±0%" : "n/a";
  return `${delta >= 0 ? "+" : ""}${((delta / base) * 100).toFixed(1)}%`;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }
  const { positionals, flags } = parseArgs(argv);
  const baseRef = positionals[0] ?? DEFAULT_BASE;

  const resolved = runGit(["rev-parse", "--verify", `${baseRef}^{commit}`]);
  const baseResolved = resolved.ok ? resolved.stdout : null;
  const base = baseResolved ? metricsFromTree(baseResolved) : null;
  const current = metricsFromWorktree();
  const notes: string[] = [];

  if (!base) notes.push(`无法解析 base-ref '${baseRef}'（跳过基准对比）`);
  if (!existsSync(join(REPO_ROOT, "src")))
    notes.push("src/ 当前不存在（重写期预期：构建/类型门禁将失败）");
  if (!existsSync(join(REPO_ROOT, ".agents", "tasks")))
    notes.push(".agents/tasks/ 当前不存在（重写期预期）");

  const delta = {
    files: current.files - (base?.files ?? 0),
    bytes: current.bytes - (base?.bytes ?? 0),
  };
  const todoMarkers = countTodoMarkers();
  // 回归判定（保守）：文件数或字节数下降超过 10% 才标记，避免重写期噪声。
  const regression = Boolean(
    base &&
    base.files > 0 &&
    (delta.files < -Math.ceil(base.files * 0.1) || delta.bytes < -Math.ceil(base.bytes * 0.1)),
  );

  const report: RegressionReport = {
    baseRef,
    baseResolved,
    timestamp: new Date().toISOString(),
    base,
    current,
    delta,
    todoMarkers,
    regression,
    notes,
  };

  // baseline 读写（可选）
  const baselinePath = join(REPO_ROOT, ".agents", "reports", "regression-baseline.json");
  if (flags.baseline) {
    mkdirSync(dirname(baselinePath), { recursive: true });
    writeFileSync(
      baselinePath,
      `${JSON.stringify({ timestamp: report.timestamp, metrics: current }, null, 2)}\n`,
      "utf8",
    );
    console.log(`✓ baseline 已写入 ${baselinePath}`);
  }

  if (flags.report) {
    const ts = report.timestamp.replace(/[:.]/g, "-");
    const reportPath = join(REPO_ROOT, ".agents", "reports", `regression-${ts}.json`);
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`✓ 报告已写入 ${reportPath}`);
  }

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `check-regression — base=${baseResolved ? baseResolved.slice(0, 12) : "(unresolved)"} (${baseRef})`,
    );
    if (base) {
      console.log(
        `  文件: ${base.files} → ${current.files}  (${delta.files >= 0 ? "+" : ""}${delta.files}, ${pct(delta.files, base.files)})`,
      );
      console.log(
        `  字节: ${base.bytes} → ${current.bytes}  (${delta.bytes >= 0 ? "+" : ""}${delta.bytes}, ${pct(delta.bytes, base.bytes)})`,
      );
    } else {
      console.log(`  当前文件: ${current.files}，字节: ${current.bytes}`);
    }
    console.log(
      `  Markdown: ${current.markdownFiles}  ADR: ${current.adrCount}  TODO/FIXME/HACK: ${todoMarkers}`,
    );
    for (const note of notes) console.log(`  ⚠ ${note}`);
    console.log(`  ${regression ? "✗ 检测到结构性回归" : "✓ 无明显结构性回归（仅警告，不阻断）"}`);
  }

  // 非破坏性、advisory：始终退出 0，除非显式 --fail-on-regression。
  process.exit(flags["fail-on-regression"] && regression ? 1 : 0);
}

main();
