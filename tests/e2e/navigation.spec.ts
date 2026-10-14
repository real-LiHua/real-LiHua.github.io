import { expect, test } from "@playwright/test";

test.describe("navigation", () => {
  test("home page renders the hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/LiHua\.dev/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("记录");
  });

  test("navbar links to the post archive", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "文章" }).first().click();
    await expect(page).toHaveURL(/\/posts\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("文章");
  });

  test("tags index lists tag links", async ({ page }) => {
    await page.goto("/tags/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("标签");
    await expect(page.getByRole("link", { name: /#astro/ })).toBeVisible();
  });

  test("unknown routes render the 404 page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist/");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("页面未找到")).toBeVisible();
  });
});
