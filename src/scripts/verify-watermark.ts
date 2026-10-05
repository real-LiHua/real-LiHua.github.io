import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const ZERO_WIDTH_CHARS = ["\u200B", "\u200C", "\u200D", "\uFEFF"] as const;

const findHtmlFiles = async (dir: string): Promise<string[]> => {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findHtmlFiles(fullPath)));
    } else if (entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
};

const countWatermarks = (content: string): number => {
  let count = 0;
  for (const char of ZERO_WIDTH_CHARS) {
    const regex = new RegExp(char, "g");
    const matches = content.match(regex);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
};

const main = async (): Promise<void> => {
  const distDir = path.resolve("./dist/client");

  if (!(await stat(distDir).catch(() => false))) {
    console.error("Error: dist/client directory not found. Run 'pnpm build' first.");
    process.exit(1);
  }

  console.log("Scanning for watermarks in built HTML files...\n");

  const htmlFiles = await findHtmlFiles(distDir);
  let totalWatermarked = 0;
  let totalFiles = 0;
  let postFiles = 0;

  for (const htmlFile of htmlFiles) {
    const content = await readFile(htmlFile, "utf-8");
    const relativePath = path.relative(distDir, htmlFile);
    const isPostPage = relativePath.startsWith("posts/") && relativePath !== "posts/index.html";

    if (isPostPage) {
      postFiles++;
      const watermarkCount = countWatermarks(content);
      const hasWm = watermarkCount > 0;

      if (hasWm) {
        totalWatermarked++;
        console.log(`✓ WATERMARKED: ${relativePath} (${watermarkCount} zero-width chars)`);
      } else {
        console.log(`✗ NO WATERMARK: ${relativePath}`);
      }
    }

    totalFiles++;
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total HTML files: ${totalFiles}`);
  console.log(`Post pages scanned: ${postFiles}`);
  console.log(`Watermarked posts: ${totalWatermarked}`);
  console.log(`Non-watermarked posts: ${postFiles - totalWatermarked}`);

  if (totalWatermarked === 0 && postFiles > 0) {
    console.log("\n⚠ Warning: No watermarks found in any post pages.");
    process.exit(1);
  } else if (totalWatermarked > 0) {
    console.log("\n✓ Verification passed: Watermarks detected in original articles.");
  }
};

main().catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});
