import type { APIRoute } from "astro";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error("The Astro site URL must be configured to generate robots.txt.");
  }

  const sitemapURL = new URL("sitemap-index.xml", site);

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapURL.href}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
