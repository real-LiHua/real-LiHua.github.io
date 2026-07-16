import type { AstroIntegration } from "astro";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import mermaid from "mermaid";

const root = path.join(import.meta.dirname, "..");

mermaid.initialize({ securityLevel: "loose", startOnLoad: false, theme: "default" });

const findHtmlFiles = (dir: string): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
};

const extractMermaidCode = (html: string): string[] => {
  const regex = /<pre class="mermaid">\s*(?<code>[\s\S]*?)\s*<\/pre>/gu;
  const codes: string[] = [];
  const matches = html.matchAll(regex);
  for (const match of matches) {
    if (match.groups?.code) {
      codes.push(match.groups.code);
    }
  }
  return codes;
};

const replaceMermaidBlocks = async (html: string, codes: string[]): Promise<string> => {
  let result = html;
  const replacements: { from: string; to: string }[] = [];

  const promises = codes.map(async (code) => {
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    try {
      const { svg } = await mermaid.render(id, code);
      return {
        from: `<pre class="mermaid">${code}</pre>`,
        to: `<div class="mermaid">${svg}</div>`,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Mermaid render failed:`, error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  for (const replacement of results) {
    if (replacement) {
      replacements.push(replacement);
    }
  }

  for (const { from, to } of replacements) {
    result = result.replace(from, to);
  }
  return result;
};

const processFile = async (file: string): Promise<number> => {
  const html = readFileSync(file, "utf8");
  const codes = extractMermaidCode(html);
  if (codes.length === 0) {
    return 0;
  }
  const result = await replaceMermaidBlocks(html, codes);
  const count = codes.length;
  if (count > 0) {
    writeFileSync(file, result);
  }
  return count;
};

export const mermaidCompileTimeIntegration = (): AstroIntegration => ({
  hooks: {
    "astro:build:done": async ({ logger }) => {
      logger.info("Rendering Mermaid diagrams at build time...");

      const distDir = path.join(root, "dist/client");
      const htmlFiles = findHtmlFiles(distDir);

      const counts = await Promise.all(htmlFiles.map((file) => processFile(file)));
      const total = counts.reduce((sum, count) => sum + count, 0);

      for (let index = 0; index < htmlFiles.length; index += 1) {
        if (counts[index] > 0) {
          logger.info(
            `Rendered ${counts[index]} mermaid diagram(s) in ${htmlFiles[index].replace(`${distDir}/`, "")}`,
          );
        }
      }

      logger.info(`Mermaid rendering complete: ${total} diagram(s) rendered`);
    },
  },
  name: "mermaid-compile-time",
});
