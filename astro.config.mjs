// @ts-check
import AstroPWA from "@vite-pwa/astro";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "astro/config";
import { execSync } from "child_process";
import llmsGenerate from "astro-llms-generate";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import obfuscator from "astro-obfuscator";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

function remarkPublishDate() {
  return function (tree, file) {
    const filepath = file.history[0];
    const result = execSync(
      `git log --follow --diff-filter=A -1 --pretty="format:%cI" "${filepath}"`,
    );
    file.data.astro.frontmatter.publishDate = result.toString();
  };
}

function remarkUpdatedDate() {
  return function (tree, file) {
    const filepath = file.history[0];
    const result = execSync(`git log -1 --pretty="format:%cI" "${filepath}"`);
    file.data.astro.frontmatter.updatedDate = result.toString();
  };
}

// https://astro.build/config
export default defineConfig({
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
  trailingSlash: "never",
  output: "static",
  vite: {
    build: { cssMinify: "lightningcss" },
    ssr: { external: ["gaxios"] },
    plugins: [tailwindcss(), cloudflare({ viteEnvironment: { name: "ssr" } })],
  },
  adapter: node({
    mode: "middleware",
  }),
});
