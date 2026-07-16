import favicons from "astro-favicons";
import { buildHooksIntegration } from "./src/integrations/build-hooks";
import { satteriConfigIntegration } from "./src/integrations/satteri-config";
import { defineConfig } from "astro/config";
import minify from "astro-minify-html-swc";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

const isDev = process.env.NODE_ENV === "development";

export default defineConfig({
  adapter: node({
    mode: "standalone",
  }),
  integrations: [
    favicons(),
    mdx(),
    sitemap(),
    satteriConfigIntegration(),
    ...(isDev ? [] : [minify()]),
    buildHooksIntegration(),
  ],
  security: { checkOrigin: false },
  site: process.env.SITE_URL ?? "http://localhost:4321",
  trailingSlash: "ignore",
  vite: {
    build: { cssMinify: "lightningcss" },
    plugins: [tailwindcss()],
  },
});
