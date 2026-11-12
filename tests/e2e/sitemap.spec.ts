import { expect, test } from "@playwright/test";

test("sitemap index lists prerendered pages and is discoverable", async ({ request, page }) => {
  const indexResponse = await request.get("/sitemap-index.xml");
  expect(indexResponse.status()).toBe(200);

  const indexXML = await indexResponse.text();
  expect(indexXML).toContain("/sitemap-0.xml");

  const sitemapResponse = await request.get("/sitemap-0.xml");
  expect(sitemapResponse.status()).toBe(200);

  const sitemapXML = await sitemapResponse.text();
  expect(sitemapXML).toContain("/posts/first-reading/");
  expect(sitemapXML).not.toContain("/404");

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap-index\.xml/u);

  await page.goto("/");
  await expect(page.locator('link[rel="sitemap"]')).toHaveAttribute("href", "/sitemap-index.xml");
});
