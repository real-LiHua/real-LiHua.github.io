import { expect, test } from "@playwright/test";

test("reader pages remain legible and fit desktop and narrow viewports", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 360, height: 800 },
    { width: 320, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/posts/first-reading/");
    await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "把阅读留给一页纸" })).toBeVisible();

    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      articleFontSize: Number.parseFloat(
        getComputedStyle(document.querySelector(".article")!).fontSize,
      ),
    }));

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.articleFontSize).toBeGreaterThanOrEqual(18);
  }
});
