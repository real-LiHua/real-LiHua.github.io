import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { findPreparedMapleFont, mapleFontInputDirectory, pickMapleFontFile } from "./maple-font";

/** Family name reported by the Maple Mono Normal NF CN font metadata. */
export const OG_FONT_FAMILY = "Maple Mono Normal NF CN";

const projectRoot = process.cwd();

interface ResolveMapleFontOptions {
  env?: Record<string, string | undefined>;
  exists?: (path: string) => boolean;
  listDirectory?: (path: string) => string[];
  root?: string;
  home?: string;
}

/**
 * Locate the Maple Mono Normal NF CN font used to render OpenGraph images.
 *
 * Mirrors the site font strategy: GitHub Actions prepares the verified release into
 * `.cache/maple-font/input`, while local builds use the installed system font. `MAPLE_FONT_PATH`
 * overrides both when the font lives elsewhere.
 */
export function resolveMapleFontPath(options: ResolveMapleFontOptions = {}): string {
  const env = options.env ?? process.env;
  const exists = options.exists ?? existsSync;
  const listDirectory =
    options.listDirectory ??
    ((directory: string) => {
      try {
        return readdirSync(directory);
      } catch {
        return [];
      }
    });
  const root = options.root ?? projectRoot;
  const home = options.home ?? homedir();

  const configuredPath = env.MAPLE_FONT_PATH?.trim();
  if (configuredPath) {
    if (exists(configuredPath)) {
      return configuredPath;
    }
    throw new Error(`MAPLE_FONT_PATH points to a missing font file: ${configuredPath}`);
  }

  // Same file `astro.config.ts` feeds to vite-plugin-font in CI.
  const preparedFont = findPreparedMapleFont(root, listDirectory);
  if (preparedFont) {
    return preparedFont;
  }

  const systemDirectories = [
    join(root, "public", "fonts"),
    join("/usr/share/fonts", "maple"),
    join("/usr/local/share/fonts", "maple"),
    join(home, ".local", "share", "fonts", "maple"),
    join(home, "Library", "Fonts"),
    "/Library/Fonts",
  ];
  for (const directory of systemDirectories) {
    const systemFont = pickMapleFontFile(listDirectory(directory));
    if (systemFont) {
      return join(directory, systemFont);
    }
  }

  throw new Error(
    [
      "Cannot locate the Maple Mono Normal NF CN font for OpenGraph images.",
      "Install the font, run `pnpm run prepare:font` in GitHub Actions, or set MAPLE_FONT_PATH to a TTF/OTF file.",
      `Searched: ${[mapleFontInputDirectory(root), ...systemDirectories].join(", ")}`,
    ].join("\n"),
  );
}
