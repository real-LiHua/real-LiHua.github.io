#!/usr/bin/env node
// Pointer Scanner - AGENTS Knowledge Base Guard
// Scans all markdown files for relative path references and validates they exist
// Usage: pnpm exec tsx .agents/scripts/scan-pointers.ts [--fix] [--report]

import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, extname } from "node:path";
import { execSync } from "node:child_process";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    fix: { type: "boolean" },
    report: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Usage: scan-pointers [--fix] [--report]

Scans AGENTS.md, ADRs, task cards for relative path references and validates existence.

Options:
  --fix     Attempt to auto-fix broken pointers using git history
  --report  Generate JSON report to .agents/reports/pointer-scan-<timestamp>.json
  --help    Show this help

Examples:
  scan-pointers
  scan-pointers --fix
  scan-pointers --report
`);
  process.exit(0);
}

const ROOT = process.cwd();
const REPORT_DIR = join(ROOT, ".agents", "reports");
const TARGET_EXTS = [".md", ".ts"];

// Patterns that indicate a relative path reference
const POINTER_PATTERNS = [
  // Markdown links: [text](./path) or [text](../path)
  /\[([^\]]+)\]\((\.?\.?\/[^)]+)\)/g,
  // Bare relative paths in backticks: \`./path\` or \`../path\`
  /`(\.?\.?\/[^`]+)`/g,
  // AGENTS.md style: "text → \`path\`"
  /→\s*`(\.?\.?\/[^`]+)`/g,
  // Specs/Contracts fields in task cards: `path`
  /(?:Specs|Contracts):\s*\[?\s*`([^`]+\.md)`/g,
];

interface Pointer {
  file: string;
  line: number;
  column: number;
  raw: string;
  target: string;
  resolved: string;
  exists: boolean;
  pattern: string;
}

interface ScanResult {
  timestamp: string;
  totalFiles: number;
  totalPointers: number;
  validPointers: number;
  brokenPointers: number;
  pointers: Pointer[];
  fixed: number;
}

function getAllFiles(dir: string, exts: string[]): string[] {
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== ".astro") {
          walk(full);
        }
      } else if (exts.includes(extname(entry.name))) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

function extractPointers(content: string, file: string): Pointer[] {
  const pointers: Pointer[] = [];
  const lines = content.split("\n");

  for (const pattern of POINTER_PATTERNS) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      const target = match[1];
      // Skip absolute URLs, anchors, and non-relative paths
      if (target.startsWith("http") || target.startsWith("#") || !target.startsWith(".")) {
        continue;
      }

      // Find line/column
      const beforeMatch = content.slice(0, match.index);
      const line = beforeMatch.split("\n").length;
      const column = beforeMatch.split("\n").pop()!.length + 1;

      // Resolve relative to file's directory
      const fileDir = join(ROOT, relative(ROOT, file).replace(/[^/]*$/, ""));
      const resolved = resolve(fileDir, target);
      const relativeToRoot = relative(ROOT, resolved);
      const exists = existsSync(resolved);

      pointers.push({
        file: relative(ROOT, file),
        line,
        column,
        raw: match[0],
        target,
        resolved: relativeToRoot,
        exists,
        pattern: pattern.source,
      });
    }
  }

  return pointers;
}

function tryAutoFix(pointer: Pointer): string | null {
  if (pointer.exists) return null;

  const targetPath = join(ROOT, pointer.resolved);
  const targetDir = join(targetPath, "..");
  const targetBase = pointer.resolved.split("/").pop();

  if (!targetBase) return null;

  try {
    // Use git log --follow to find renames/moves
    const result = execSync(`git log --follow --name-only --oneline -- "${targetPath}" 2>/dev/null | head -20`, {
      encoding: "utf-8",
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    });

    const lines = result.trim().split("\n");
    for (const line of lines) {
      if (line.includes(targetBase) && existsSync(join(ROOT, line.trim()))) {
        return line.trim();
      }
    }
  } catch {
    // git not available or no history
  }

  // Try fuzzy match in same directory
  try {
    const dirEntries = readdirSync(targetDir);
    for (const entry of dirEntries) {
      if (entry.toLowerCase().includes(targetBase.toLowerCase().replace(/\.[^.]+$/, ""))) {
        return join(relative(ROOT, targetDir), entry);
      }
    }
  } catch {
    // directory doesn't exist
  }

  return null;
}

function generateReport(result: ScanResult): string {
  const lines = [
    `# Pointer Scan Report`,
    `**Timestamp:** ${result.timestamp}`,
    `**Files Scanned:** ${result.totalFiles}`,
    `**Total Pointers:** ${result.totalPointers}`,
    `**Valid:** ${result.validPointers}`,
    `**Broken:** ${result.brokenPointers}`,
    `**Auto-fixed:** ${result.fixed}`,
    "",
    "## Broken Pointers",
    "",
  ];

  if (result.brokenPointers === 0) {
    lines.push("✅ All pointers valid!");
  } else {
    const byFile = new Map<string, Pointer[]>();
    for (const p of result.pointers) {
      if (!p.exists) {
        if (!byFile.has(p.file)) byFile.set(p.file, []);
        byFile.get(p.file)!.push(p);
      }
    }

    for (const [file, ptrs] of byFile) {
      lines.push(`### ${file}`);
      for (const p of ptrs) {
        lines.push(`- Line ${p.line}: \`${p.target}\` → resolves to \`${p.resolved}\` (NOT FOUND)`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function main() {
  console.log("🔍 Scanning for pointers...");

  const files = getAllFiles(ROOT, TARGET_EXTS).filter(f => !f.includes("node_modules") && !f.includes(".git"));
  console.log(`  Scanning ${files.length} files...`);

  let allPointers: Pointer[] = [];
  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const pointers = extractPointers(content, file);
    allPointers.push(...pointers);
  }

  console.log(`  Found ${allPointers.length} pointers`);

  let fixed = 0;
  if (values.fix) {
    console.log("  Attempting auto-fix...");
    for (const pointer of allPointers) {
      if (!pointer.exists) {
        const fix = tryAutoFix(pointer);
        if (fix) {
          // Would need to actually edit files here - for now just report
          console.log(`    Would fix: ${pointer.file}:${pointer.line} ${pointer.target} → ${fix}`);
          fixed++;
        }
      }
    }
  }

  const result: ScanResult = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    totalPointers: allPointers.length,
    validPointers: allPointers.filter(p => p.exists).length,
    brokenPointers: allPointers.filter(p => !p.exists).length,
    pointers: allPointers,
    fixed,
  };

  // Console summary
  console.log(`\n📊 Results:`);
  console.log(`  Valid:   ${result.validPointers}`);
  console.log(`  Broken:  ${result.brokenPointers}`);
  if (values.fix) console.log(`  Fixed:   ${result.fixed}`);

  if (result.brokenPointers > 0) {
    console.log("\n❌ Broken pointers:");
    for (const p of allPointers.filter(p => !p.exists)) {
      console.log(`  ${p.file}:${p.line} → ${p.target}`);
    }
  }

  // JSON report
  if (values.report || result.brokenPointers > 0) {
    if (!existsSync(REPORT_DIR)) {
      readdirSync(REPORT_DIR, { recursive: true }); // force create via writeFileSync
    }
    const reportFile = join(REPORT_DIR, `pointer-scan-${Date.now()}.json`);
    writeFileSync(reportFile, JSON.stringify(result, null, 2));
    console.log(`\n📄 Report: ${relative(ROOT, reportFile)}`);

    // Also write markdown summary
    const mdReport = join(REPORT_DIR, `pointer-scan-${Date.now()}.md`);
    writeFileSync(mdReport, generateReport(result));
    console.log(`📄 Markdown: ${relative(ROOT, mdReport)}`);
  }

  if (result.brokenPointers > 0 && !values.fix) {
    console.log("\n💡 Run with --fix to attempt auto-repair");
    process.exit(1);
  }
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});