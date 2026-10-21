#!/usr/bin/env tsx
/**
 * Aggregate-learning — 汇总指定月份的本地学习会话记录。
 *
 * 用法: pnpm exec tsx .agents/scripts/aggregate-learning.ts --month YYYY-MM [--output <file>] 规格:
 * docs/adr/0011-agent-learning-mechanism.md
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const LEARNING_ROOT = join(REPO_ROOT, ".agents", "learning");

type LearningSection = "pitfalls" | "decisions" | "patterns";

interface SessionSummary {
  path: string;
  title: string;
  tags: string[];
  sections: Record<LearningSection, number>;
}

interface LearningAggregate {
  month: string;
  sessions: SessionSummary[];
  tagCounts: Map<string, number>;
  sectionCounts: Record<LearningSection, number>;
}

const SECTION_PATTERNS: Record<LearningSection, RegExp> = {
  pitfalls: /^(?:pitfalls?|遇到的问题|坑点|问题与解决方案)$/iu,
  decisions: /^(?:decisions?|决策记录|决策)$/iu,
  patterns: /^(?:patterns?|可复用模式|模式)$/iu,
};

function validateMonth(month: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(month)) {
    throw new Error(`Invalid month "${month}". Expected YYYY-MM.`);
  }
}

function collectMarkdownFiles(directory: string): string[] {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  return entries
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectMarkdownFiles(path);
      return entry.isFile() && extname(entry.name).toLowerCase() === ".md" ? [path] : [];
    })
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function countSectionItems(lines: string[], headingIndex: number, headingLevel: number): number {
  let count = 0;
  let inFence = false;
  const isTableSeparator = (line: string | undefined): boolean =>
    Boolean(line && /^\|\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?$/u.test(line.trim()));
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (/^\s*(```|~~~)/u.test(lines[index])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = /^(#{1,6})\s+/.exec(lines[index]);
    if (heading && heading[1].length <= headingLevel) break;
    const line = lines[index].trim();
    if (/^(?:[-*+]\s+|\d+[.)]\s+)/u.test(line)) count += 1;
    else if (/^\|/u.test(line) && !isTableSeparator(line) && !isTableSeparator(lines[index + 1])) {
      count += 1;
    }
  }
  return count;
}

function summarizeSession(content: string, path: string): SessionSummary {
  const lines = content.split(/\r?\n/u);
  const title =
    lines
      .find((line) => /^#\s+\S/u.test(line))
      ?.replace(/^#\s+/u, "")
      .trim() || path;
  const sections: Record<LearningSection, number> = { pitfalls: 0, decisions: 0, patterns: 0 };
  const tags: string[] = [];
  let inFence = false;
  let tagSectionLevel: number | null = null;
  let tagFenceActive = false;

  for (const [index, line] of lines.entries()) {
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
    if (heading) {
      const sectionName = heading[2]
        .replace(/[`*_]/gu, "")
        .replace(/\s*[（(][^）)]*[）)]\s*$/u, "")
        .trim();
      const section = (Object.keys(SECTION_PATTERNS) as LearningSection[]).find((key) =>
        SECTION_PATTERNS[key].test(sectionName),
      );
      if (section) {
        sections[section] += countSectionItems(lines, index, heading[1].length);
      }
    }
    const withoutInlineCode = line.replace(/`[^`]*`/gu, "");
    for (const [, tag] of withoutInlineCode.matchAll(/(?:^|\s)#([a-z][a-z0-9-]*)\b/gu)) {
      tags.push(tag);
    }
  }
  return { path, title, tags: [...new Set(tags)], sections };
}

export function aggregateLearning(month: string, sessionsDirectory: string): LearningAggregate {
  validateMonth(month);
  const files = collectMarkdownFiles(sessionsDirectory);
  const sessions = files.map((file) =>
    summarizeSession(readFileSync(file, "utf8"), relative(REPO_ROOT, file)),
  );
  const tagCounts = new Map<string, number>();
  const sectionCounts: Record<LearningSection, number> = {
    pitfalls: 0,
    decisions: 0,
    patterns: 0,
  };
  for (const session of sessions) {
    for (const tag of session.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    for (const section of Object.keys(sectionCounts) as LearningSection[]) {
      sectionCounts[section] += session.sections[section];
    }
  }
  return { month, sessions, tagCounts, sectionCounts };
}

export function formatAggregateReport(aggregate: LearningAggregate): string {
  const lines = [
    `# Learning Aggregate — ${aggregate.month}`,
    "",
    `- Sessions: ${aggregate.sessions.length}`,
    `- Pitfalls: ${aggregate.sectionCounts.pitfalls}`,
    `- Decisions: ${aggregate.sectionCounts.decisions}`,
    `- Patterns: ${aggregate.sectionCounts.patterns}`,
    "",
    "## Tag Frequency",
    "",
  ];
  const tags = [...aggregate.tagCounts].sort(
    ([leftTag, leftCount], [rightTag, rightCount]) =>
      rightCount - leftCount || (leftTag < rightTag ? -1 : leftTag > rightTag ? 1 : 0),
  );
  if (tags.length === 0) lines.push("No tags recorded.", "");
  else {
    for (const [tag, count] of tags) lines.push(`- \`#${tag}\`: ${count}`);
    lines.push("");
  }
  lines.push("## Sessions", "");
  if (aggregate.sessions.length === 0) lines.push("No session records found.", "");
  for (const session of aggregate.sessions) {
    const tagsText = session.tags.length
      ? ` — ${session.tags.map((tag) => `#${tag}`).join(" ")}`
      : "";
    lines.push(`- **${session.title}** — \`${session.path}\`${tagsText}`);
  }
  lines.push(
    "",
    "> Review this report before promoting any findings to `docs/LESSONS_LEARNED.md`.",
    "",
  );
  return lines.join("\n");
}

function parseArguments(args: string[]): { month: string; output?: string } {
  let month: string | undefined;
  let output: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];
    if (argument === "--month" && value && !value.startsWith("--")) {
      month = value;
      index += 1;
    } else if (argument === "--output" && value && !value.startsWith("--")) {
      output = value;
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      console.log(
        "aggregate-learning — 汇总指定月份的本地学习会话\n\n用法:\n  pnpm exec tsx .agents/scripts/aggregate-learning.ts --month YYYY-MM [--output <file>]\n",
      );
      return { month: "" };
    } else {
      throw new Error("Usage: aggregate-learning.ts --month YYYY-MM [--output <file>]");
    }
  }
  if (!month) throw new Error("Missing required --month YYYY-MM.");
  validateMonth(month);
  return { month, ...(output ? { output } : {}) };
}

function main(): void {
  const { month, output } = parseArguments(process.argv.slice(2));
  if (!month) return;
  const sessionsDirectory = join(LEARNING_ROOT, "sessions", month);
  const destination = output ?? join(LEARNING_ROOT, "aggregated", `${month}.md`);
  const aggregate = aggregateLearning(month, sessionsDirectory);
  const absoluteDestination = resolve(REPO_ROOT, destination);
  if (
    aggregate.sessions.some((session) => resolve(REPO_ROOT, session.path) === absoluteDestination)
  ) {
    throw new Error("The output path must not overwrite a learning session.");
  }
  mkdirSync(dirname(absoluteDestination), { recursive: true });
  writeFileSync(absoluteDestination, formatAggregateReport(aggregate), "utf8");
  console.log(
    `✓ 已汇总 ${aggregate.sessions.length} 条会话记录至 ${relative(REPO_ROOT, absoluteDestination)}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
