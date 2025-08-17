// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import llmsGenerate from 'astro-llms-generate';

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: 'https://lihua.codeberg.page',
  trailingSlash: 'never',
  integrations: [mdx(), sitemap(), llmsGenerate(), tailwindcss()]
});
