// Watermark verifier (pnpm verify:watermark).
//
// Walks the built `dist/client/**/*.html` post pages and asserts every one
// carries at least one zero-width watermark character injected by the build
// pipeline. Exits non-zero when a page is missing its watermark.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve(import.meta.dirname, "../../dist/client");
const ZERO_WIDTH = /\u200B|\u200C|\u200D|\uFEFF/u;

const walk = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
};

const main = async (): Promise<void> => {
  let files: string[];
  try {
    files = await walk(distDir);
  } catch {
    console.error(`[verify-watermark] No build found at ${distDir}. Run \`pnpm build\` first.`);
    process.exitCode = 1;
    return;
  }

  const postPages = files.filter((file) => path.relative(distDir, file).startsWith("posts/"));
  const missing: string[] = [];
  for (const file of postPages) {
    const html = await readFile(file, "utf-8");
    if (!ZERO_WIDTH.test(html)) {
      missing.push(path.relative(distDir, file));
    }
  }

  if (missing.length > 0) {
    console.error(`[verify-watermark] ${missing.length} page(s) missing a watermark:`);
    for (const file of missing) {
      console.error(`  - ${file}`);
    }
    process.exitCode = 1;
    return;
  }

  console.info(`[verify-watermark] OK — ${postPages.length} post page(s) watermarked.`);
};

await main();
