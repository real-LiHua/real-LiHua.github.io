// Build Pipeline — deep module.
//
// Wraps the post-build stages behind a single `execute()` so callers (the Astro
// integration in `src/integrations/build-pipeline.ts`) never see the individual
// stages, file walking or error aggregation
// (see docs/adr/0001-functional-architecture.md §3.2).
//
// Stages run serially and a failing stage is recorded but does not abort the
// pipeline. Mermaid is rendered at markdown-processing time by Satteri, so it is
// intentionally not a build stage here.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import type { Element, Nodes, Root } from "hast";
import type { BuildLogger, BuildReport, BuildStage, BuildStageResult } from "./types";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT = 60_000;
const ZERO_WIDTH_CHARS = ["\u200B", "\u200C", "\u200D", "\uFEFF"] as const;

export interface FileWalker {
  findHtmlFiles(dir: URL): Promise<URL[]>;
}

export interface BuildPipeline {
  /** Run every registered stage against `distDir`. */
  execute(distDir: URL, logger: BuildLogger): Promise<BuildReport>;
  /** Register an extra stage (used by tests / extensions). */
  registerStage(stage: BuildStage): void;
}

/** Recursive `*.html` walker shared by the watermark stage. */
class HtmlFileWalker implements FileWalker {
  async findHtmlFiles(dir: URL): Promise<URL[]> {
    const found: URL[] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
      if (entry.isDirectory()) {
        found.push(...(await this.findHtmlFiles(child)));
      } else if (entry.name.endsWith(".html")) {
        found.push(child);
      }
    }

    return found;
  }
}

const walker = new HtmlFileWalker();

/**
 * Astro hands `astro:build:done` the final output dir. Depending on the adapter this may already be
 * the client dir (`dist/client`) or its parent (`dist/`). Resolve whichever directory actually
 * holds the static site.
 */
const resolveClientDir = async (distDir: URL): Promise<URL> => {
  const nested = new URL("client/", distDir);
  try {
    if ((await stat(nested)).isDirectory()) {
      return nested;
    }
  } catch {
    // fall through — distDir is already the client dir
  }
  return distDir;
};

const generateWatermark = (seed: string, siteId: string): string => {
  const hash = createHash("sha256")
    .update(seed + siteId)
    .digest("hex");
  let marker = "";
  for (let i = 0; i < 8; i++) {
    const byte = Number.parseInt(hash.slice(i * 2, i * 2 + 2), 16);
    marker += ZERO_WIDTH_CHARS[byte % ZERO_WIDTH_CHARS.length];
  }
  return marker;
};

const hasWatermark = (content: string): boolean =>
  ZERO_WIDTH_CHARS.some((char) => content.includes(char));

const findArticle = (node: Nodes | Root): Element | undefined => {
  if (node.type === "element" && node.tagName === "article") {
    return node;
  }
  if ("children" in node) {
    for (const child of node.children as Nodes[]) {
      const found = findArticle(child);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
};

/**
 * Append one hidden, zero-width fingerprint to the article. Inserting the marker between visible
 * characters (the previous approach) corrupted copy/paste and accessible names, so the fingerprint
 * lives in a single `display:none` span.
 */
const injectWatermark = (root: Root, seed: string, siteId: string): boolean => {
  const article = findArticle(root);
  if (!article) {
    return false;
  }

  article.children.push({
    type: "element",
    tagName: "span",
    properties: { "aria-hidden": "true", style: "display:none", "data-watermark": "" },
    children: [{ type: "text", value: generateWatermark(seed, siteId) }],
  });
  return true;
};

// ===== Stages =====

const pagefindStage: BuildStage = {
  name: "pagefind",
  timeout: 120_000,
  async run(distDir, logger) {
    const clientDir = await resolveClientDir(distDir);
    // Run from the repo root so the CLI auto-loads `pagefind.yaml`
    // (docs/SEARCH_TUNING.md §1).
    await execFileAsync("pagefind", ["--site", clientDir.pathname], {
      cwd: process.cwd(),
      timeout: 120_000,
    });
    logger.info("Pagefind index generated");
  },
};

const linkCheckStage: BuildStage = {
  name: "lychee",
  timeout: 180_000,
  async run(distDir, logger) {
    const clientDir = await resolveClientDir(distDir);
    // `--offline`: only validate local file links — deterministic and network-free.
    await execFileAsync("lychee", ["--offline", "--no-progress", clientDir.pathname], {
      timeout: 180_000,
    });
    logger.info("Link check complete");
  },
};

const htmlValidateStage: BuildStage = {
  name: "vnu",
  timeout: 120_000,
  async run(distDir, logger) {
    const clientDir = await resolveClientDir(distDir);
    await execFileAsync(
      "vnu",
      ["--skip-non-html", "--filterfile", "message-filters.txt", clientDir.pathname],
      { timeout: 120_000 },
    );
    logger.info("HTML validation complete");
  },
};

const watermarkStage: BuildStage = {
  name: "watermark",
  async run(distDir, logger) {
    const siteId = process.env.SITE_URL ?? "http://localhost:4321";
    const clientDir = await resolveClientDir(distDir);
    const files = await walker.findHtmlFiles(clientDir);
    let count = 0;

    for (const file of files) {
      const relative = path.relative(clientDir.pathname, file.pathname);
      if (!relative.startsWith("posts/") || relative === "posts/index.html") {
        continue;
      }

      const original = await readFile(file, "utf-8");
      if (hasWatermark(original)) {
        continue;
      }

      const tree = fromHtml(original, { fragment: false });
      if (!injectWatermark(tree, relative, siteId)) {
        continue;
      }
      await writeFile(file, toHtml(tree), "utf-8");
      count++;
    }

    logger.info(`Watermarked ${count} post page(s)`);
  },
};

const DEFAULT_STAGES: BuildStage[] = [
  pagefindStage,
  linkCheckStage,
  htmlValidateStage,
  watermarkStage,
];

// ===== Runner =====

const runStage = async (
  stage: BuildStage,
  distDir: URL,
  logger: BuildLogger,
): Promise<BuildStageResult> => {
  const started = Date.now();
  const timeout = stage.timeout ?? DEFAULT_TIMEOUT;

  try {
    await Promise.race([
      stage.run(distDir, logger),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Stage "${stage.name}" timed out after ${timeout}ms`)),
          timeout,
        );
      }),
    ]);
    return { name: stage.name, success: true, duration: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Stage "${stage.name}" failed: ${message}`);
    return { name: stage.name, success: false, duration: Date.now() - started, error: message };
  }
};

class DefaultBuildPipeline implements BuildPipeline {
  #stages: BuildStage[] = [...DEFAULT_STAGES];

  registerStage(stage: BuildStage): void {
    this.#stages.push(stage);
  }

  async execute(distDir: URL, logger: BuildLogger): Promise<BuildReport> {
    const started = Date.now();
    const stages: BuildStageResult[] = [];

    for (const stage of this.#stages) {
      logger.info(`Running stage: ${stage.name}`);
      stages.push(await runStage(stage, distDir, logger));
    }

    return {
      stages,
      success: stages.every((stage) => stage.success),
      duration: Date.now() - started,
    };
  }
}

export const buildPipeline: BuildPipeline = new DefaultBuildPipeline();
