// @ts-check
import AstroPWA from "@vite-pwa/astro";
import { defineConfig } from "astro/config";
import { execSync } from "node:child_process";
import llmsGenerate from "astro-llms-generate";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import obfuscator from "astro-obfuscator";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

const remarkPublishDate = () => {
  const publishDatePlugin = (_tree, file) => {
    const [filepath] = file.history;
    const result = execSync(
      `git log --follow --diff-filter=A -1 --pretty="format:%cI" "${filepath}"`,
    );
    file.data.astro.frontmatter.publishDate = result.toString();
  };
  return publishDatePlugin;
};

const remarkUpdatedDate = () => {
  const updatedDatePlugin = (_tree, file) => {
    const [filepath] = file.history;
    const result = execSync(`git log -1 --pretty="format:%cI" "${filepath}"`);
    file.data.astro.frontmatter.updatedDate = result.toString();
  };
  return updatedDatePlugin;
};

// https://astro.build/config
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
    llmsGenerate(),
    sitemap(),
    obfuscator({
      excludes: [/dist\/server/],
    }),
  ],
  markdown: {
    remarkPlugins: [remarkPublishDate, remarkUpdatedDate],
  },
  security: { checkOrigin: false },
  site: "https://lihua.codeberg.page",
  trailingSlash: "always",
  vite: {
    build: { cssMinify: "lightningcss" },
    plugins: [tailwindcss()],
  },
});
