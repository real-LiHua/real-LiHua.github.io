import AstroPWA from "@vite-pwa/astro";
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import { execSync } from "node:child_process";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import obfuscator from "astro-obfuscator";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const publishDatePlugin = (_tree: any, file: any) => {
  const [filepath] = file.history;
  const result = execSync(
    `git log --follow --diff-filter=A -1 --pretty="format:%cI" "${filepath}"`,
  );
  file.data.astro.frontmatter.publishDate = result.toString();
};

const remarkPublishDate = () => publishDatePlugin;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updatedDatePlugin = (_tree: any, file: any) => {
  const [filepath] = file.history;
  const result = execSync(`git log -1 --pretty="format:%cI" "${filepath}"`);
  file.data.astro.frontmatter.updatedDate = result.toString();
};

const remarkUpdatedDate = () => updatedDatePlugin;

export default defineConfig({
  adapter: node({
    mode: "standalone",
  }),
  integrations: [
    mdx(),
    AstroPWA({
      devOptions: {
        enabled: true,
      },
    }),
    sitemap(),
    obfuscator({
      excludes: [/dist\/server/u],
    }),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkPublishDate, remarkUpdatedDate],
    }),
  },
  security: { checkOrigin: false },
  site: "https://lihua.codeberg.page",
  trailingSlash: "ignore",
  vite: {
    build: { cssMinify: "lightningcss" },
    plugins: [tailwindcss()],
  },
});
