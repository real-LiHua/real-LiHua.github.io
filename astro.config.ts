import type { AstroIntegration } from "astro";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import { markdownProcessor } from "./src/lib/markdown";
import { defineConfig } from "astro/config";
import astroWebMCP from "astro-webmcp";
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { fontPlugin } from "vite-plugin-font";
import githubDark from "@shikijs/themes/github-dark";

// GitHub Dark keeps code surfaces matching the design system, but its comment
// color (#6a737d, 3.05:1 on #24292e) fails WCAG AA. Swap comments to GitHub's
// current github-dark comment color (#8b949e, 4.77:1).
const githubDarkAA = {
  ...githubDark,
  name: "github-dark-aa",
  tokenColors: (githubDark.tokenColors ?? []).map((rule) => {
    const rawScopes = rule.scope === undefined ? [] : [rule.scope].flat();
    const scopes = rawScopes.filter((scope): scope is string => typeof scope === "string");
    const isCommentRule = scopes.some((scope) => scope.includes("comment"));
    return isCommentRule && rule.settings?.foreground === "#6a737d"
      ? { ...rule, settings: { ...rule.settings, foreground: "#8b949e" } }
      : rule;
  }),
};

const oramaClientEntry = fileURLToPath(new URL("src/lib/orama-webmcp-client.ts", import.meta.url));
const oramaPackageEntry = fileURLToPath(
  new URL("node_modules/@orama/orama/dist/esm/index.js", import.meta.url),
);

const isFontBuild =
  process.env.GITHUB_ACTIONS === "true" &&
  Boolean(process.env.MAPLE_FONT_RELEASE_TAG) &&
  process.env.NODE_ENV !== "development";
// Loaded via createRequire (CJS entry) instead of an ESM import: the Vite config
// runner is closed before dynamic imports resolve, and loading the package unconditionally
// breaks local builds where cn-font-split's native binding cannot be downloaded.
const Font = isFontBuild
  ? (createRequire(import.meta.url)("vite-plugin-font") as typeof fontPlugin)
  : undefined;
const mapleFontModuleId = "virtual:blog-maple-font";
const resolvedMapleFontModuleId = `\0${mapleFontModuleId}`;
// Nerd Font glyphs are emitted at runtime via String.fromCodePoint in
// src/lib/icons.ts, so the scanners never see the raw Private Use Area
// characters. Whitelist them explicitly or the subsets drop the icons.
const iconGlyphCodePoints = ((): string[] => {
  try {
    const source = readFileSync(new URL("src/lib/icons.ts", import.meta.url), "utf8");
    const codePoints = [...source.matchAll(/glyph\(\s*0x(?<hex>[0-9a-f]+)\s*\)/giu)].map((match) =>
      Number.parseInt(match.groups!.hex, 16),
    );
    return [...new Set(codePoints)].map((codePoint) => String.fromCodePoint(codePoint));
  } catch {
    return [];
  }
})();
const mapleFontInputDirectory = fileURLToPath(new URL(".cache/maple-font/input/", import.meta.url));
const defaultMapleFontPath = join(mapleFontInputDirectory, "MapleMonoNormal-NF-CN.ttf");
const mapleFontPath = ((): string => {
  // The extracted archive ships weight-suffixed files (e.g. MapleMonoNormal-NF-CN-Regular.ttf),
  // so resolve the real file name instead of assuming it.
  try {
    const match = readdirSync(mapleFontInputDirectory).find((name) =>
      /^MapleMonoNormal-NF-CN[^/]*\.(?:ttf|otf)$/iu.test(name),
    );
    return match ? join(mapleFontInputDirectory, match) : defaultMapleFontPath;
  } catch {
    return defaultMapleFontPath;
  }
})();
const postsDirectory = fileURLToPath(new URL("src/content/posts/", import.meta.url));

const listPostRoutes = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listPostRoutes(path);
    }
    if (!entry.isFile() || !/\.mdx?$/u.test(entry.name)) {
      return [];
    }
    const id = relative(postsDirectory, path)
      .replace(/\.mdx?$/u, "")
      .split(sep)
      .join("/");
    return [`/posts/${id}/`];
  });

const publicPostRoutes = new Set(listPostRoutes(postsDirectory));

const mapleFontEntryPlugin = {
  name: "blog-maple-font-entry",
  resolveId(id: string) {
    return id === mapleFontModuleId ? resolvedMapleFontModuleId : undefined;
  },
  load(id: string) {
    if (id !== resolvedMapleFontModuleId) {
      return undefined;
    }
    if (!isFontBuild) {
      return "export {};\n";
    }
    // Import the subset module for its side effect: it pulls in the generated
    // metrics/result CSS, which Astro bundles into the layout stylesheet so the
    // @font-face rules are actually loaded by the page.
    return `import "${mapleFontPath}?subsets";\n`;
  },
};

const mapleFontIntegration: AstroIntegration = {
  name: "blog-maple-font",
  hooks: {
    "astro:config:setup": ({ updateConfig }) => {
      if (isFontBuild && Font) {
        updateConfig({
          vite: {
            plugins: [
              Font.vite({
                scanFiles: ["src/**/*.{astro,md,mdx,ts,tsx,js,jsx,css}"],
                whiteList: iconGlyphCodePoints,
              }),
              mapleFontEntryPlugin,
            ],
          },
        });
      } else {
        updateConfig({
          vite: {
            plugins: [mapleFontEntryPlugin],
          },
        });
      }
    },
  },
};

const webmcpIntegration = astroWebMCP({
  collections: ["posts"],
  declarativeCSS: false,
  skills: false,
  search: {
    backend: "orama",
    oramaIndexUrl: "/search-index.json",
  },
});
const webmcpSetup = webmcpIntegration.hooks["astro:config:setup"];
if (webmcpSetup) {
  webmcpIntegration.hooks["astro:config:setup"] = async (context) => {
    await webmcpSetup({
      ...context,
      config: { ...context.config, output: "static" },
      injectScript: (stage, content) => {
        // The integration ships the Orama import with Vite's ignore comment, which
        // leaves the bare specifier in the browser bundle. Let Vite resolve it so
        // the aliased client entry (with the Mandarin tokenizer) is bundled.
        const resolvedContent = content.includes("__WEBMCP_CONFIG__")
          ? content.replaceAll(/\/\*\s*@vite-ignore\s*\*\/\s*/gu, "")
          : content;
        return context.injectScript(stage === "head-inline" ? "page" : stage, resolvedContent);
      },
    });
  };
}
const webmcpBuildDone = webmcpIntegration.hooks["astro:build:done"];
if (webmcpBuildDone) {
  webmcpIntegration.hooks["astro:build:done"] = async (context) => {
    await webmcpBuildDone(context);
    const manifestPath = join(fileURLToPath(context.dir), "_webmcp/manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      collections: { name: string; count: number }[];
      entries: { url?: string; collection?: string }[];
    };
    manifest.entries = manifest.entries.filter(
      (entry) => entry.collection === "posts" && entry.url && publicPostRoutes.has(entry.url),
    );
    manifest.collections = manifest.collections.filter((collection) => collection.name === "posts");
    if (manifest.collections[0]) {
      manifest.collections[0].count = manifest.entries.length;
    }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  };
}

export default defineConfig({
  adapter: node({ mode: "standalone" }),
  output: "server",
  // Overridable so the Codeberg Pages mirror can emit its own canonical URL;
  // defaults to the GitHub Pages site.
  site: process.env.SITE_URL ?? "https://real-lihua.github.io",
  integrations: [mapleFontIntegration, webmcpIntegration],
  markdown: {
    processor: markdownProcessor,
    shikiConfig: {
      theme: githubDarkAA,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: [
        { find: /^@orama\/orama$/u, replacement: oramaClientEntry },
        { find: /^@orama\/orama-real$/u, replacement: oramaPackageEntry },
      ],
    },
  },
});
