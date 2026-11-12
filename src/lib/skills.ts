import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { SKILL_QUERIES } from "./skill-queries";

interface LockedSkill {
  source: string;
  sourceType: string;
  skillPath: string;
  computedHash: string;
}

interface SkillsLock {
  version: number;
  skills: Record<string, LockedSkill>;
}

interface SkillFrontmatter {
  name?: unknown;
  description?: unknown;
}

export interface InstalledSkill {
  name: string;
  displayName: string;
  description: string;
  /** Raw URL of the upstream SKILL.md; the lock file carries no pinned commit. */
  url: string;
  publisher: { identifier: string; displayName: string };
  representativeQueries: readonly string[];
}

const MAX_DESCRIPTION_LENGTH = 200;
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/u;
const GITHUB_SOURCE_PATTERN = /^(?<owner>[^/]+)\/[^/]+$/u;

/**
 * Keep the catalog description to one readable sentence.
 *
 * The upstream descriptions are written for an agent's context, so the full text (sometimes 2,000
 * characters) would bloat the catalog without adding discovery value.
 */
export function summarizeDescription(description: string): string {
  const text = description.replaceAll(/\s+/gu, " ").trim();
  const sentence = /^(.*?[.!?])(?:\s|$)/su.exec(text)?.[1] ?? text;

  if (sentence.length <= MAX_DESCRIPTION_LENGTH) {
    return sentence;
  }

  const clipped = sentence.slice(0, MAX_DESCRIPTION_LENGTH);
  return `${clipped.slice(0, Math.max(clipped.lastIndexOf(" "), 1))}…`;
}

function readFrontmatter(skillFile: string, name: string): SkillFrontmatter {
  const source = readFileSync(skillFile, "utf8");
  const block = FRONTMATTER_PATTERN.exec(source)?.[1];

  if (!block) {
    throw new Error(`Skill "${name}" has no YAML frontmatter: ${skillFile}`);
  }

  const parsed: unknown = parseYaml(block);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`Skill "${name}" frontmatter is not a mapping: ${skillFile}`);
  }

  return parsed as SkillFrontmatter;
}

/**
 * Read the vendored skills that are actually installed.
 *
 * `skills-lock.json` lists every known skill, including ones that were never synced to
 * `.agents/skills`; only the installed ones have a SKILL.md to point at, so the rest are skipped.
 */
export function loadInstalledSkills(): InstalledSkill[] {
  const repositoryRoot = process.cwd();
  const lockPath = join(repositoryRoot, "skills-lock.json");

  if (!existsSync(lockPath)) {
    throw new Error(`Cannot find skills-lock.json at ${lockPath}.`);
  }

  const lock = JSON.parse(readFileSync(lockPath, "utf8")) as SkillsLock;

  return Object.entries(lock.skills)
    .sort(([first], [second]) => first.localeCompare(second))
    .flatMap(([name, entry]) => {
      const skillFile = join(repositoryRoot, ".agents", "skills", name, "SKILL.md");
      if (!existsSync(skillFile)) {
        return [];
      }

      const frontmatter = readFrontmatter(skillFile, name);
      const description =
        typeof frontmatter.description === "string" ? frontmatter.description.trim() : "";
      const queries = SKILL_QUERIES[name];

      if (!description) {
        throw new Error(`Skill "${name}" has no description in its frontmatter.`);
      }
      if (!queries || queries.length < 2 || queries.length > 5) {
        throw new Error(
          `Skill "${name}" needs 2 to 5 representative queries in src/lib/skill-queries.ts.`,
        );
      }
      if (entry.sourceType !== "github") {
        throw new Error(`Skill "${name}" is not sourced from GitHub: ${entry.sourceType}`);
      }

      const owner = GITHUB_SOURCE_PATTERN.exec(entry.source)?.groups?.owner;
      if (!owner) {
        throw new Error(`Skill "${name}" has an unexpected source: ${entry.source}`);
      }

      return [
        {
          name,
          displayName: typeof frontmatter.name === "string" ? frontmatter.name : name,
          description: summarizeDescription(description),
          url: `https://raw.githubusercontent.com/${entry.source}/HEAD/${entry.skillPath}`,
          publisher: { identifier: `github.com/${owner}`, displayName: owner },
          representativeQueries: queries,
        },
      ];
    });
}
