import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Location written by `scripts/prepare-maple-font.mjs` when GitHub Actions runs `pnpm run
 * prepare:font`: the verified release archive is cached under `.cache/maple-font/<tag>/` and the
 * selected TTF/OTF is extracted flat into `.cache/maple-font/input/`.
 */
export const MAPLE_FONT_CACHE_DIRECTORY = ".cache/maple-font";
export const MAPLE_FONT_INPUT_DIRECTORY = "input";

export const mapleFontInputDirectory = (root: string): string =>
  join(root, MAPLE_FONT_CACHE_DIRECTORY, MAPLE_FONT_INPUT_DIRECTORY);

const fontFilePattern = /^MapleMonoNormal-NF-CN[^/]*\.(?:ttf|otf)$/iu;
const regularFilePattern = /-Regular\.(?:ttf|otf)$/iu;

/** Prefer Regular, matching `selectFontEntry` in `scripts/prepare-maple-font.mjs`. */
export const pickMapleFontFile = (names: string[]): string | undefined => {
  const candidates = names.filter((name) => fontFilePattern.test(name));
  return candidates.find((name) => regularFilePattern.test(name)) ?? candidates[0];
};

export const findPreparedMapleFont = (
  root: string,
  listDirectory: (directory: string) => string[] = (directory) => {
    try {
      return readdirSync(directory);
    } catch {
      return [];
    }
  },
): string | undefined => {
  const directory = mapleFontInputDirectory(root);
  const name = pickMapleFontFile(listDirectory(directory));
  return name ? join(directory, name) : undefined;
};
