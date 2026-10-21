#!/usr/bin/env tsx
/**
 * Extract-learning — 从源码注释提取结构化学习记录。
 *
 * 用法: pnpm exec tsx .agents/scripts/extract-learning.ts [--output <file>] 规格:
 * docs/adr/0011-agent-learning-mechanism.md
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SOURCE_EXTENSIONS = new Set([
  ".astro",
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".mjs",
  ".rs",
  ".scss",
  ".ts",
  ".tsx",
]);
const SKIP_DIRS = new Set([
  ".git",
  ".astro",
  ".cache",
  ".pnpm-store",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "target",
  "test-results",
]);
const LEARNING_TAGS = new Set(["decision", "gotcha", "pattern", "pitfall", "ref", "todo"]);

export interface LearningEntry {
  file: string;
  line: number;
  tag: string;
  attributes: Record<string, unknown>;
  text: string;
}

function commentText(line: string): string | undefined {
  const comment = /^\s*(?:\/\/|\/\*|\*|<!--)\s?(.*?)\s*(?:\*\/|-->)?\s*$/.exec(line);
  return comment?.[1];
}

export function extractLearningFromContent(content: string, file: string): LearningEntry[] {
  const entries: LearningEntry[] = [];
  const lines = content.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const comment = commentText(line);
    if (!comment || !comment.includes("@learning:")) continue;
    const marker = /^@learning:([a-z-]+)\b(?:\s+(\{.*\}))?(?:\s+(.*))?$/.exec(comment.trim());
    if (!marker) {
      throw new Error(`${file}:${index + 1}: malformed @learning marker.`);
    }
    const [, tag, rawAttributes, text = ""] = marker;
    if (!LEARNING_TAGS.has(tag)) {
      throw new Error(`${file}:${index + 1}: unsupported @learning tag "${tag}".`);
    }
    let attributes: Record<string, unknown> = {};
    if (rawAttributes) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawAttributes);
      } catch (error) {
        throw new Error(`${file}:${index + 1}: invalid JSON in @learning attributes.`, {
          cause: error,
        });
      }
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error(`${file}:${index + 1}: @learning attributes must be a JSON object.`);
      }
      attributes = parsed as Record<string, unknown>;
    }
    entries.push({ file, line: index + 1, tag, attributes, text: text.trim() });
  }
  return entries;
}

function collectSourceFiles(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collectSourceFiles(absolutePath, files);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
      files.push(absolutePath);
    }
  }
  return files;
}

export function formatLearningReport(entries: LearningEntry[]): string {
  const lines = ["# Extracted Learning", "", `提取条目：${entries.length}`, ""];
  if (entries.length === 0) {
    lines.push("未发现 `@learning:*` 注释。", "");
    return lines.join("\n");
  }

  for (const tag of [...LEARNING_TAGS].sort()) {
    const taggedEntries = entries.filter((entry) => entry.tag === tag);
    if (taggedEntries.length === 0) continue;
    lines.push(`## ${tag}`, "");
    for (const entry of taggedEntries) {
      const attrs =
        Object.keys(entry.attributes).length > 0 ? ` ${JSON.stringify(entry.attributes)}` : "";
      const text = entry.text || "(未填写说明)";
      lines.push(`- \`${entry.file}:${entry.line}\`${attrs} ${text}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function parseOutputPath(args: string[]): string {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      "extract-learning — 从源码注释提取学习记录\n\n用法:\n  pnpm exec tsx .agents/scripts/extract-learning.ts [--output <file>]\n",
    );
    return "";
  }
  const outputIndex = args.indexOf("--output");
  const output = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
  if (outputIndex >= 0 && (!output || output.startsWith("--"))) {
    throw new Error("Usage: extract-learning.ts [--output <file>]");
  }
  return (
    output ??
    join(".agents", "learning", `extracted-${new Date().toISOString().replace(/[:.]/g, "-")}.md`)
  );
}

function main(): void {
  const outputPath = parseOutputPath(process.argv.slice(2));
  if (!outputPath) return;
  const entries = collectSourceFiles(REPO_ROOT).flatMap((absolutePath) =>
    extractLearningFromContent(
      readFileSync(absolutePath, "utf8"),
      relative(REPO_ROOT, absolutePath),
    ),
  );
  const absoluteOutput = resolve(REPO_ROOT, outputPath);
  mkdirSync(dirname(absoluteOutput), { recursive: true });
  writeFileSync(absoluteOutput, formatLearningReport(entries), "utf8");
  console.log(`✓ 已提取 ${entries.length} 条学习记录至 ${relative(REPO_ROOT, absoluteOutput)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
