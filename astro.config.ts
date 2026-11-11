import type { AstroIntegration } from "astro";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import { markdownProcessor } from "./src/lib/markdown";
import { defineConfig } from "astro/config";
import astroWebMCP from "astro-webmcp";
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

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
  ? (createRequire(import.meta.url)(
      "vite-plugin-font",
    ) as typeof import("vite-plugin-font").default)
  : undefined;
const mapleFontModuleId = "virtual:blog-maple-font";
const resolvedMapleFontModuleId = `\0${mapleFontModuleId}`;
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
    return `import { css } from ${JSON.stringify(`${mapleFontPath}?subsets`)};\nexport const family = css.family;`;
  },
};

const mapleFontIntegration: AstroIntegration = {
  name: "blog-maple-font",
  hooks: {
    "astro:config:setup": async ({ injectScript, updateConfig }) => {
      if (isFontBuild && Font) {
        injectScript("page", `import "${mapleFontModuleId}";`);
        updateConfig({
          vite: {
            plugins: [
              Font.vite({
                scanFiles: ["src/**/*.{astro,md,mdx,ts,tsx,js,jsx,css}"],
              }),
              mapleFontEntryPlugin,
            ],
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
  site: "https://real-lihua.github.io",
  integrations: [mapleFontIntegration, webmcpIntegration],
  markdown: {
    processor: markdownProcessor,
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
