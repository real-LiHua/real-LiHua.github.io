import { defineConfig } from "astro/config";
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

export default defineConfig({
  adapter: node({
    mode: "standalone",
  }),
  build: {
    assets: "assets",
    inlineStylesheets: "auto",
  },
  compressHTML: true,
  integrations: [mdx(), sitemap(), minifyHtml(), buildPipelineIntegration()],
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
