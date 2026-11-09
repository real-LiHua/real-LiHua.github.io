import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

async function findCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return findCssFiles(path);
      }
      return entry.isFile() && entry.name.endsWith(".css") ? [path] : [];
    }),
  );
  return nested.flat();
}

export async function checkFontOutput(outputDir) {
  const cssFiles = await findCssFiles(outputDir);
  const fontFiles = new Set();
  let hasFontFace = false;

  for (const cssPath of cssFiles) {
    const css = await readFile(cssPath, "utf8");
    const fontFaces = css.match(/@font-face\s*\{[^}]*\}/giu) ?? [];
    for (const fontFace of fontFaces) {
      hasFontFace = true;
      const urls = [...fontFace.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/giu)];
      for (const [, , source] of urls) {
        if (/^(?:https?:)?\/\//iu.test(source) || /^data:/iu.test(source)) {
          throw new Error(`Generated font CSS contains an external font URL: ${source}`);
        }
        if (!/\.woff2(?:[?#]|$)/iu.test(source)) {
          continue;
        }

        const pathPart = decodeURIComponent(source.split(/[?#]/u, 1)[0]);
        const fontPath = pathPart.startsWith("/")
          ? resolve(outputDir, `.${pathPart}`)
          : resolve(dirname(cssPath), pathPart);
        const relativePath = relative(outputDir, fontPath);
        if (relativePath.startsWith(`..${sep}`) || relativePath === "..") {
          throw new Error(`Generated font asset is outside the site output: ${source}`);
        }
        if (!(await stat(fontPath)).isFile()) {
          throw new Error(`Generated WOFF2 font asset does not exist: ${source}`);
        }
        fontFiles.add(fontPath);
      }
    }
  }

  if (!hasFontFace || fontFiles.size === 0) {
    throw new Error("No generated local WOFF2 font assets were found in the site output");
  }
  return { cssFiles, fontFiles: [...fontFiles] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.env.GITHUB_ACTIONS !== "true") {
    console.log("Font output verification skipped outside GitHub Actions.");
  } else {
    const outputDir = process.argv[2] ?? "dist/client";
    const result = await checkFontOutput(outputDir);
    console.log(`Verified ${result.fontFiles.length} local WOFF2 font asset(s).`);
  }
}
