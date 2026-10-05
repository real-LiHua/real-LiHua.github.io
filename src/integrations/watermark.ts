import type { AstroIntegration } from "astro";
import { createHash } from "node:crypto";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";

const ZERO_WIDTH_CHARS = ["\u200B", "\u200C", "\u200D", "\uFEFF"] as const;

const generateWatermark = (content: string, siteId: string): string => {
  const hash = createHash("sha256")
    .update(content + siteId)
    .digest("hex");
  const positions: number[] = [];
  const watermarkChars: string[] = [];

  for (let i = 0; i < 16; i++) {
    const byte = parseInt(hash.slice(i * 2, i * 2 + 2), 16);
    positions.push(byte % content.length);
    watermarkChars.push(ZERO_WIDTH_CHARS[byte % ZERO_WIDTH_CHARS.length]);
  }

  const charArray = content.split("");
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i] % charArray.length;
    charArray.splice(pos, 0, watermarkChars[i]);
  }

  return charArray.join("");
};

const hasWatermark = (content: string): boolean => {
  return ZERO_WIDTH_CHARS.some((char) => content.includes(char));
};

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

const isOriginalPost = (filePath: string): boolean => {
  try {
    const content = readFileSync(filePath, "utf-8");
    const frontmatterEnd = content.indexOf("\n---", 4);
    const frontmatter = frontmatterEnd > 0 ? content.slice(0, frontmatterEnd) : content;

    if (!frontmatter.includes("authors:")) {
      return true;
    }

    const authorsMatch = frontmatter.match(/authors:\s*(.+)/);
    if (!authorsMatch) return true;

    const authorsValue = authorsMatch[1].trim();
    return (
      authorsValue === "[]" || authorsValue === '""' || authorsValue === "''" || authorsValue === ""
    );
  } catch {
    return false;
  }
};

const injectWatermarkIntoTextNodes = (tree: any, siteId: string): void => {
  const textNodes: { node: any; text: string }[] = [];

  const collectTextNodes = (node: any, parentTag: string | null = null): void => {
    // Skip style and script tags entirely
    if (node.type === "element" && (node.tagName === "style" || node.tagName === "script")) {
      return;
    }

    if (node.type === "text") {
      textNodes.push({ node, text: node.value });
    } else if (node.children) {
      const currentTag = node.type === "element" ? node.tagName : parentTag;
      for (const child of node.children) {
        collectTextNodes(child, currentTag);
      }
    }
  };

  collectTextNodes(tree);

  for (const { node, text } of textNodes) {
    if (text.trim().length > 0) {
      node.value = generateWatermark(text, siteId);
    }
  }
};

export const watermarkIntegration = (siteUrl: string): AstroIntegration => ({
  hooks: {
    "astro:build:done": async ({ logger }): Promise<void> => {
      if (process.env.NODE_ENV === "development") {
        logger.info("Skipping watermark in development mode");
        return;
      }

      logger.info("Applying blind watermarks to original articles...");

      const distDir = path.resolve("./dist/client");
      const htmlFiles = await findHtmlFiles(distDir);
      let watermarkedCount = 0;

      for (const htmlFile of htmlFiles) {
        try {
          const content = await readFile(htmlFile, "utf-8");

          if (hasWatermark(content)) {
            continue;
          }

          const relativePath = path.relative(distDir, htmlFile);
          const isPostPage =
            relativePath.startsWith("posts/") && relativePath !== "posts/index.html";

          if (!isPostPage) {
            continue;
          }

          const postSlug = relativePath
            .replace("posts/", "")
            .replace(".html", "")
            .replace("/index", "");
          const postSourcePath = path.resolve(`./src/posts/${postSlug}.md`);
          const postSourcePathMdx = path.resolve(`./src/posts/${postSlug}.mdx`);
          const draftSourcePath = path.resolve(`./src/posts/drafts/${postSlug}.md`);
          const draftSourcePathMdx = path.resolve(`./src/posts/drafts/${postSlug}.mdx`);

          let sourcePath = "";
          if (await stat(postSourcePath).catch(() => false)) sourcePath = postSourcePath;
          else if (await stat(postSourcePathMdx).catch(() => false)) sourcePath = postSourcePathMdx;
          else if (await stat(draftSourcePath).catch(() => false)) sourcePath = draftSourcePath;
          else if (await stat(draftSourcePathMdx).catch(() => false))
            sourcePath = draftSourcePathMdx;

          if (!sourcePath) {
            continue;
          }

          const isOriginal = isOriginalPost(sourcePath);
          if (!isOriginal) {
            continue;
          }

          // Parse HTML and inject watermark only into text nodes
          const tree = fromHtml(content, { fragment: false });
          injectWatermarkIntoTextNodes(tree, siteUrl);
          const watermarkedContent = toHtml(tree, {
            voidTagNames: new Set([
              "area",
              "base",
              "br",
              "col",
              "embed",
              "hr",
              "img",
              "input",
              "link",
              "meta",
              "param",
              "source",
              "track",
              "wbr",
            ]),
          });

          await writeFile(htmlFile, watermarkedContent, "utf-8");
          watermarkedCount++;
          logger.info(`Watermarked: ${relativePath}`);
        } catch (error) {
          logger.warn(`Failed to watermark ${htmlFile}: ${error}`);
        }
      }

      logger.info(`Applied blind watermarks to ${watermarkedCount} original article(s)`);
    },
  },
  name: "watermark",
});
