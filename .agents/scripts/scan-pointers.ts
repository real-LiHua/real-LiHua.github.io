#!/usr/bin/env tsx
/**
 * Scan-pointers — 扫描 AGENTS.md / docs / .agents 中的相对路径引用，验证其有效性。
 *
 * 用法: pnpm exec tsx .agents/scripts/scan-pointers.ts [--fix] [--report] [--json] [--strict]
 *
 * 扫描范围:
 *
 * - 根目录 *.md 与 AGENTS.md
 * - Docs/**.md
 * - .agents/**.md（排除 .agents/skills/） 跳过:
 *   .opencode/**、node_modules/**、dist/**、.astro/**、target/**、playwright-report/**
 *
 * 提取:
 *
 * - Markdown 链接 [text](relative/path) → 相对当前文件解析
 * - 行内代码 `path/to/file.ts` → 相对仓库根解析 跳过含 `⏸`（待重写设施）的行与围栏代码块。
 *
 * 规格: docs/adr/0009-knowledge-update-process.md §3.1
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { findRepoRoot } from "./run-gate.ts";

const REPO_ROOT = findRepoRoot();

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".astro",
  "target",
  "playwright-report",
  "test-results",
  "coverage",
  ".cache",
  ".pnpm-store",
]);

const PATH_EXT = new Set([
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
  ".sh",
  ".txt",
]);

interface Pointer {
  file: string;
  line: number;
  kind: "link" | "code";
  raw: string;
  target: string;
  resolved: string;
  exists: boolean;
}

interface ScanReport {
  timestamp: string;
  scannedFiles: number;
  total: number;
  broken: number;
  pointers: Pointer[];
  fixable: { file: string; line: number; from: string; to: string }[];
}

function walkMarkdown(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith(".") && entry !== ".agents") {
      // 允许进入 .agents 根，其余隐藏目录跳过
      if (dir !== REPO_ROOT) continue;
    }
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
      walkMarkdown(abs, out);
    } else if (stat.isFile() && entry.endsWith(".md")) {
      out.push(abs);
    }
  }
}

function collectScanFiles(): string[] {
  const files: string[] = [];
  // 根级 Markdown
  for (const entry of readdirSync(REPO_ROOT)) {
    if (entry.endsWith(".md")) files.push(join(REPO_ROOT, entry));
  }
  walkMarkdown(join(REPO_ROOT, "docs"), files);
  walkMarkdown(join(REPO_ROOT, ".agents"), files);
  return [...new Set(files)].sort();
}

function normalizeRelative(baseDir: string, target: string): string | null {
  const cleaned = target.split("#")[0].trim();
  if (!cleaned) return null;
  if (/^(https?:|mailto:|tel:|data:|\/\/)/i.test(cleaned)) return null;
  if (cleaned.startsWith("#") || cleaned.startsWith("/") || cleaned.startsWith("~")) return null;
  if (/[*?[\]{}<>|$="'`\\]/.test(cleaned)) return null;
  if (cleaned.startsWith("@")) return null; // npm scope，非仓库路径
  const abs = resolve(baseDir, cleaned);
  return relative(REPO_ROOT, abs);
}

function isPathLike(token: string): boolean {
  if (token.length < 3 || !token.includes("/")) {
    // 允许单文件名，但必须有被认可的扩展名
    const ext = extname(token);
    return ext.length > 1 && PATH_EXT.has(ext);
  }
  if (/[*?[\]{}<>|$="'`\\]/.test(token)) return false;
  return /\.[A-Za-z][A-Za-z0-9]*$/.test(token) || token.endsWith("/");
}

function scanFile(abs: string): Pointer[] {
  let content: string;
  try {
    content = readFileSync(abs, "utf8");
  } catch {
    return [];
  }
  const rel = relative(REPO_ROOT, abs);
  const baseDir = dirname(abs);
  const pointers: Pointer[] = [];
  let inFence = false;

  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (line.includes("⏸")) continue;

    const record = (kind: "link" | "code", target: string): void => {
      const resolved = normalizeRelative(kind === "link" ? baseDir : REPO_ROOT, target);
      if (resolved === null) return;
      const exists = existsSync(join(REPO_ROOT, resolved));
      pointers.push({
        file: rel,
        line: index + 1,
        kind,
        raw: target,
        target: target.split("#")[0],
        resolved: resolved.split(sep).join("/"),
        exists,
      });
    };

    // Markdown links
    const linkRe = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkRe.exec(line)) !== null) {
      record("link", match[1]);
    }

    // Inline code
    const codeRe = /`([^`]+)`/g;
    while ((match = codeRe.exec(line)) !== null) {
      for (const token of match[1].split(/\s+/)) {
        const trimmed = token.replace(/[.,;:)]+$/, "");
        if (isPathLike(trimmed)) record("code", trimmed);
      }
    }
  }
  return pointers;
}

/** Git 重命名映射：old path → new path。 */
function renameMap(): Map<string, string> {
  const map = new Map<string, string>();
  const result = spawnSync(
    "git",
    ["log", "--diff-filter=R", "-M", "--name-status", "--pretty=format:", "-z"],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  if (result.status !== 0 || !result.stdout) return map;
  const records = result.stdout.split("\0").filter(Boolean);
  for (let index = 0; index < records.length; index += 1) {
    const status = records[index];
    if (!/^R\d+$/.test(status)) continue;
    const oldPath = records[index + 1];
    const newPath = records[index + 2];
    if (oldPath && newPath) map.set(oldPath, newPath);
    index += 2;
  }
  return map;
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
  console.log(`scan-pointers — 扫描并验证相对路径引用

用法:
  pnpm exec tsx .agents/scripts/scan-pointers.ts [options]

选项:
  --fix      基于 git 重命名映射自动修复失效引用
  --report   写入 .agents/reports/pointer-scan-<timestamp>.json
  --json     以 JSON 输出报告
  --strict   存在失效引用时退出码 1（默认 advisory 退出 0）
  --help     显示帮助
`);
}

function applyFixes(
  broken: Pointer[],
  renames: Map<string, string>,
  fixable: ScanReport["fixable"],
): Set<string> {
  const touched = new Set<string>();
  const perFile = new Map<string, Pointer[]>();
  for (const pointer of broken) {
    const list = perFile.get(pointer.file) ?? [];
    list.push(pointer);
    perFile.set(pointer.file, list);
  }
  for (const [file, pointers] of perFile) {
    const abs = join(REPO_ROOT, file);
    let content = readFileSync(abs, "utf8");
    let changed = false;
    for (const pointer of pointers) {
      const renamed = renames.get(pointer.resolved);
      if (!renamed) continue;
      const newTarget =
        pointer.kind === "link"
          ? relative(dirname(abs), join(REPO_ROOT, renamed)).split(sep).join("/")
          : renamed;
      const original = pointer.target;
      if (!content.includes(original)) continue;
      content = content.split(original).join(newTarget);
      fixable.push({ file, line: pointer.line, from: original, to: newTarget });
      changed = true;
    }
    if (changed) {
      writeFileSync(abs, content, "utf8");
      touched.add(file);
    }
  }
  return touched;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }
  const { flags } = parseArgs(argv);
  const files = collectScanFiles();
  const pointers: Pointer[] = [];
  for (const file of files) pointers.push(...scanFile(file));
  const broken = pointers.filter((pointer) => !pointer.exists);

  const fixable: ScanReport["fixable"] = [];
  if (flags.fix && broken.length > 0) {
    const touched = applyFixes(broken, renameMap(), fixable);
    for (const file of touched) console.log(`✓ 已修复 ${file}`);
    if (fixable.length === 0) console.log("  无可用 git 重命名映射，未修改文件");
  }

  const report: ScanReport = {
    timestamp: new Date().toISOString(),
    scannedFiles: files.length,
    total: pointers.length,
    broken: broken.length,
    pointers,
    fixable,
  };

  if (flags.report) {
    const ts = report.timestamp.replace(/[:.]/g, "-");
    const path = join(REPO_ROOT, ".agents", "reports", `pointer-scan-${ts}.json`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`✓ 报告已写入 ${path}`);
  }

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`scan-pointers — 扫描 ${files.length} 个文件，发现 ${pointers.length} 个引用`);
    if (broken.length === 0) {
      console.log("✓ 无失效引用");
    } else {
      console.log(`✗ ${broken.length} 个失效引用:`);
      for (const pointer of broken.slice(0, 100)) {
        console.log(
          `  ${pointer.file}:${pointer.line}  [${pointer.kind}] ${pointer.raw} → ${pointer.resolved}`,
        );
      }
      if (broken.length > 100) console.log(`  ... 其余 ${broken.length - 100} 个见报告`);
    }
  }

  process.exit(flags.strict && broken.length > 0 ? 1 : 0);
}

main();
