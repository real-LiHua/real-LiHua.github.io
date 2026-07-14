import type { AstroIntegration } from "astro";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const XHTML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>\n';
const XHTML_DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n';

const walkHtmlFiles = (dirPath: string): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
};

const transformHtml = (html: string): string => {
  // 1. 确保以 XML 声明开头
  let result = html;
  if (!result.startsWith("<?xml")) {
    result = XHTML_DECLARATION + result;
  }

  // 2. 替换 DOCTYPE（可能不在第一行，因为可能有 XML 声明）
  result = result.replace(/<!DOCTYPE html>/iu, XHTML_DOCTYPE.trim());

  return result;
};

export const xhtmlOutputIntegration = (): AstroIntegration => ({
  hooks: {
    "astro:build:done": ({ dir, logger }): void => {
      const clientDir = fileURLToPath(dir);
      const htmlFiles = walkHtmlFiles(clientDir);
      for (const file of htmlFiles) {
        const content = readFileSync(file, "utf8");
        const transformed = transformHtml(content);
        if (transformed !== content) {
          writeFileSync(file, transformed, "utf8");
          const relPath = path.relative(clientDir, file);
          logger.info(`Transformed to XHTML: ${relPath}`);
        }
      }
      logger.info(`XHTML transformation complete (${htmlFiles.length} files)`);
    },
  },
  name: "xhtml-output",
});
