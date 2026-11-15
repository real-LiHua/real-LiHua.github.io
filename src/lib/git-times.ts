import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

export interface GitTimes {
  createdAt: Date;
  updatedAt: Date;
}

const gitTimesCache = new Map<string, GitTimes | null>();

// `git log` lists commits newest first, so the first usable date is the last
// change and the last usable date is the first commit that touched the file.
export const parseGitLogDates = (output: string): GitTimes | null => {
  const dates = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => new Date(line))
    .filter((date) => !Number.isNaN(date.valueOf()));

  if (dates.length === 0) {
    return null;
  }

  return {
    createdAt: dates.at(-1)!,
    updatedAt: dates.at(0)!,
  };
};

export const getGitTimes = (filePath: string, cwd = process.cwd()): GitTimes | null => {
  const absolutePath = resolve(cwd, filePath);
  const cacheKey = `${cwd}\0${absolutePath}`;
  const cached = gitTimesCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let times: GitTimes | null;
  try {
    const output = execFileSync("git", ["log", "--follow", "--format=%aI", "--", absolutePath], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
      windowsHide: true,
    });
    times = parseGitLogDates(output);
  } catch {
    // Git may be unavailable, or the file may be untracked. Callers fall back
    // to the frontmatter publication date.
    times = null;
  }

  gitTimesCache.set(cacheKey, times);
  return times;
};
