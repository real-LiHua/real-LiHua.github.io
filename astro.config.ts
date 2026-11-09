import { defineConfig } from "astro/config";
import { readFileSync, readdirSync } from "node:fs";
import { relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import node from "@astrojs/node";
import { mermaid as satteriMermaid } from "@xingwangzhe/satteri-mermaid";
import { pluginLanguageBadge as expressiveCodeLanguageBadge } from "expressive-code-language-badge";
import minifyHtml from "astro-minify-html-swc";
import { buildPipelineIntegration } from "./src/integrations/build-pipeline";
import { satteriExternalLinks } from "./src/plugins/satteri-external-links";

const postsDirectory = fileURLToPath(new URL("src/posts/", import.meta.url));

const listPostFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}${sep}${entry.name}`;
    if (entry.isDirectory()) {
      return listPostFiles(path);
    }
    return entry.isFile() && /\.mdx?$/u.test(entry.name) ? [path] : [];
  });

const protectedPostPaths = new Set(
  listPostFiles(postsDirectory).flatMap((filePath) => {
    const source = readFileSync(filePath, "utf8");
    const frontmatter = source.match(/^---\r?\n(?<content>[\s\S]*?)\r?\n---(?:\r?\n|$)/u)?.groups
      ?.content;
    const authConfig = frontmatter?.match(
      /^telegramAuth:\s*\r?\n(?<config>(?:[ \t]+.*(?:\r?\n|$))*)/mu,
    )?.groups?.config;
    if (!authConfig || !/^[ \t]+enabled:\s*true\s*$/mu.test(authConfig)) {
      return [];
    }

    const id = relative(postsDirectory, filePath)
      .replace(/\.mdx?$/u, "")
      .split(sep)
      .join("/");
    return [`/posts/${id}/`];
  }),
);

export default defineConfig({
  adapter: node({
    mode: "standalone",
  }),
  build: {
    assets: "assets",
    inlineStylesheets: "auto",
  },
  compressHTML: true,
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !protectedPostPaths.has(new URL(page).pathname),
    }),
    minifyHtml(),
    buildPipelineIntegration(),
  ],
  markdown: {
    processor: satteri({
      mdastPlugins: [satteriMermaid(), expressiveCodeLanguageBadge()],
      hastPlugins: [satteriExternalLinks()],
    }),
    shikiConfig: {
      themes: { dark: "github-dark", light: "github-light" },
      wrap: true,
    },
    syntaxHighlight: "shiki",
  },
  prefetch: {
    defaultStrategy: "viewport",
    prefetchAll: true,
  },
  site: "https://real-lihua.github.io",
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["@xingwangzhe/satteri-mermaid", "mermaid"],
    },
  },
});
