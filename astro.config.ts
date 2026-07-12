import AstroPWA from "@vite-pwa/astro";
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import { execSync } from "node:child_process";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { visit } from "unist-util-visit";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rehypeTableAlign = () => (tree: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(tree, "element", (el: any) => {
    if (el.tagName === "th" || el.tagName === "td") {
      const align = el.properties?.align;
      if (align) {
        const existing = el.properties?.style ?? "";
        el.properties.style = `${existing} text-align: ${align}`.trim();
        delete el.properties.align;
      }
    }
  });
};

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
  ],
  markdown: {
    processor: unified({
      rehypePlugins: [rehypeTableAlign],
      remarkPlugins: [remarkPublishDate, remarkUpdatedDate],
    }),
  },
  security: { checkOrigin: false },
  site: process.env.SITE_URL ?? "http://localhost:4321",
  trailingSlash: "ignore",
  vite: {
    build: { cssMinify: "lightningcss" },
    plugins: [tailwindcss()],
  },
});
