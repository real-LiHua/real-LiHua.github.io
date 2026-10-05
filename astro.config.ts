import favicons from "astro-favicons";
import { buildHooksIntegration } from "./src/integrations/build-hooks";
import { satteriConfigIntegration } from "./src/integrations/satteri-config";
import { watermarkIntegration } from "./src/integrations/watermark";
import { defineConfig } from "astro/config";
import minify from "astro-minify-html-swc";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";

const isDev = process.env.NODE_ENV === "development";

// Fetch bot username at build time (non-dev only)
let telegramBotUsername = "your_bot";
if (!isDev) {
  try {
    // Use getSecret via a small script that runs with Astro's env
    const result = execSync("pnpm tsx scripts/fetch-bot-username.ts", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "production" },
    });
    telegramBotUsername = result.trim() || "your_bot";
    console.log(`[build] Telegram bot username: @${telegramBotUsername}`);
  } catch (error) {
    console.warn("[build] Failed to fetch bot username, using fallback:", error);
  }
}

export default defineConfig({
  adapter: node({
    mode: "standalone",
  }),
  integrations: [
    favicons(),
    mdx(),
    sitemap(),
    satteriConfigIntegration(),
    ...(isDev ? [] : [minify(), watermarkIntegration(String(process.env.SITE_URL ?? "http://localhost:4321"))]),
    buildHooksIntegration(),
  ],
  security: { checkOrigin: false },
  site: process.env.SITE_URL ?? "http://localhost:4321",
  trailingSlash: "ignore",
  vite: {
    build: { cssMinify: "lightningcss" },
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.TELEGRAM_BOT_USERNAME": JSON.stringify(telegramBotUsername),
    },
  },
});
