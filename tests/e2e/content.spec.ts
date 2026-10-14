import { expect, test } from "@playwright/test";

test.describe("content", () => {
  test("renders a post with headings and code", async ({ page }) => {
    await page.goto("/posts/hello-world/");

    await expect(page.getByRole("heading", { level: 1, name: "Hello, World" })).toBeVisible();
    await expect(page.locator("article pre code")).toContainText("Hello");
  });

  test("renders the table of contents for a post with headings", async ({ page }) => {
    await page.goto("/posts/hello-world/");
    await expect(page.locator("[data-toc-link]").first()).toBeVisible();
  });

  test("marks external links with target, rel and an external class", async ({ page }) => {
    await page.goto("/posts/hello-world/");

    const link = page.locator('article a[href="https://docs.astro.build"]');
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveClass(/\bexternal\b/u);
  });

  test("serves a valid RSS feed", async ({ request }) => {
    const response = await request.get("/rss.xml");
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).toContain("<rss");
    expect(xml).toContain("<item>");
  });

  test("draft posts are excluded from the archive", async ({ page }) => {
    await page.goto("/posts/");
    await expect(page.getByText("草稿示例")).toHaveCount(0);
  });
});
