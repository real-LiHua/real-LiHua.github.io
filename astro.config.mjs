// @ts-check
import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import llmsGenerate from "astro-llms-generate";
import obfuscator from "astro-obfuscator";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  experimental: {
    csp: {
      styleDirective: {
        hashes: ["sha512-styleHash", "sha384-styleHash", "sha256-styleHash"],
      },
      scriptDirective: {
        hashes: ["sha512-scriptHash", "sha384-scriptHash", "sha256-scriptHash"],
      },
    },
  },
  integrations: [
    mdx(),
    sitemap(),
    llmsGenerate(),
    obfuscator({
      excludes: [/\/_worker.js/],
    }),
  ],
  security: { checkOrigin: false },
  site: "https://lihua.codeberg.page",
  trailingSlash: "never",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
});
