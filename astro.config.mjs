// @ts-check

import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";
import llmsGenerate from "astro-llms-generate";
import mdx from "@astrojs/mdx";
import obfuscator from "astro-obfuscator";
import sitemap from "@astrojs/sitemap";
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
    ssr: { external: ["gaxios"] },
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
});
