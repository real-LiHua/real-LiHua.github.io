#!/usr/bin/env tsx
/**
 * Learning-index — 重建本地学习会话 JSON 索引。
 *
 * 用法: pnpm exec tsx .agents/scripts/learning-index.ts --rebuild [--stats] 规格:
 * docs/adr/0011-agent-learning-mechanism.md
 */
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const LEARNING_ROOT = join(REPO_ROOT, ".agents", "learning");

export interface LearningSessionIndexEntry {
  id: string;
  path: string;
  title: string;
  task: string | null;
  date: string | null;
  tags: string[];
  assignee: string | null;
}

export interface LearningIndex {
  schemaVersion: 1;
  entries: LearningSessionIndexEntry[];
}

function optionalCapture(content: string, label: string): string | null {
  const match = new RegExp(`^\\s*[-*]\\s*\\*\\*?${label}:?\\*\\*?\\s*(.+?)\\s*$`, "imu").exec(
    content,
  );
  return match?.[1]?.trim() || null;
}

export function parseLearningSession(content: string, path: string): LearningSessionIndexEntry {
  const title = content
    .split(/\r?\n/u)
    .find((line) => /^#\s+\S/u.test(line))
    ?.replace(/^#\s+/u, "")
    .trim();
  const task = optionalCapture(content, "Task ID") ?? optionalCapture(content, "任务 ID");
  const date = optionalCapture(content, "Date") ?? optionalCapture(content, "日期");
  const assignee = optionalCapture(content, "Assignee") ?? optionalCapture(content, "负责人");

  const tags = new Set<string>();
  let inFence = false;
  let tagSectionLevel: number | null = null;
  let tagFenceActive = false;
  for (const line of content.split(/\r?\n/u)) {
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line);
    if (heading) {
      const level = heading[1].length;
      const label = heading[2].replace(/[`*_]/gu, "").trim();
      if (/^(?:标签|tags)$/iu.test(label)) tagSectionLevel = level;
      else if (tagSectionLevel !== null && level <= tagSectionLevel) tagSectionLevel = null;
    }
    if (/^\s*(```|~~~)/u.test(line)) {
      if (inFence) {
        inFence = false;
        if (tagFenceActive) tagSectionLevel = null;
        tagFenceActive = false;
      } else {
        inFence = true;
        tagFenceActive = tagSectionLevel !== null;
      }
      continue;
    }
    if (inFence && !tagFenceActive) continue;
    const withoutInlineCode = line.replace(/`[^`]*`/gu, "");
    for (const [, tag] of withoutInlineCode.matchAll(/(?:^|\s)#([a-z][a-z0-9-]*)\b/gu)) {
      tags.add(tag);
    }
  }

  const normalizedPath = path.replaceAll("\\", "/");
  return {
    id: normalizedPath.replace(/\.md$/iu, ""),
    path: normalizedPath,
    title: title || normalizedPath,
    task,
    date,
    tags: [...tags].sort(),
    assignee,
  };
}

function listMarkdownFiles(directory: string): string[] {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  const files = entries.flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(path);
    return entry.isFile() && extname(entry.name).toLowerCase() === ".md" ? [path] : [];
  });
  return files.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

export function buildLearningIndex(learningRoot: string): LearningIndex {
  const sessionsRoot = join(learningRoot, "sessions");
  const entries = listMarkdownFiles(sessionsRoot).map((absolutePath) =>
    parseLearningSession(readFileSync(absolutePath, "utf8"), relative(learningRoot, absolutePath)),
  );
  return { schemaVersion: 1, entries };
}

export function rebuildLearningIndex(learningRoot: string): {
  index: LearningIndex;
  path: string;
  changed: boolean;
} {
  const index = buildLearningIndex(learningRoot);
  const target = join(learningRoot, "index.json");
  const serialized = `${JSON.stringify(index, null, 2)}\n`;
  let current: string | undefined;
  try {
    current = readFileSync(target, "utf8");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  if (current === serialized) return { index, path: target, changed: false };

  mkdirSync(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, serialized, { encoding: "utf8", flag: "wx" });
    renameSync(temporary, target);
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      // Preserve the original write/rename error.
    }
    throw error;
  }
  return { index, path: target, changed: true };
}

function parseArguments(args: string[]): { rebuild: boolean; stats: boolean } {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      "learning-index — 重建本地学习会话索引\n\n用法:\n  pnpm exec tsx .agents/scripts/learning-index.ts --rebuild [--stats]\n",
    );
    return { rebuild: false, stats: false };
  }
  const known = new Set(["--rebuild", "--stats"]);
  const unknown = args.find((argument) => !known.has(argument));
  if (unknown) throw new Error(`Unknown option "${unknown}".`);
  if (!args.includes("--rebuild")) {
    throw new Error("Usage: learning-index.ts --rebuild [--stats]");
  }
  return { rebuild: true, stats: args.includes("--stats") };
}

function main(): void {
  const { rebuild, stats } = parseArguments(process.argv.slice(2));
  if (!rebuild) return;
  const result = rebuildLearningIndex(LEARNING_ROOT);
  console.log(`✓ ${result.changed ? "已更新" : "索引无变化"}: ${relative(REPO_ROOT, result.path)}`);
  if (stats) {
    const distinctTags = new Set(result.index.entries.flatMap((entry) => entry.tags));
    console.log(`会话记录: ${result.index.entries.length}`);
    console.log(`不同标签: ${distinctTags.size}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
