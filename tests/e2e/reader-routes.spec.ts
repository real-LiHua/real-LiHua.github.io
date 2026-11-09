import { expect, test } from "@playwright/test";

test("reader routes share navigation and identify preview content", async ({ page }) => {
  for (const route of ["/", "/posts/", "/search/", "/posts/first-reading/"]) {
    await page.goto(route);
    const navigation = page.getByRole("navigation", { name: "主导航" });
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("link", { name: "首页" })).toHaveAttribute("href", "/");
    await expect(navigation.getByRole("link", { name: "文章" })).toHaveAttribute("href", "/posts/");
    await expect(navigation.getByRole("button", { name: "搜索" })).toHaveAttribute(
      "aria-haspopup",
      "dialog",
    );
  }

  await expect(page.getByText(/预览示例/u).first()).toBeVisible();
});

test("missing pages show a helpful page with a truthful 404 response", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist/");

  expect(response?.status()).toBe(404);
  expect(response?.headers().server ?? "").not.toMatch(/iis/i);
  await expect(page.getByRole("heading", { name: "页面未找到" })).toBeVisible();
  await expect(page.getByRole("link", { name: "返回首页" })).toHaveAttribute("href", "/");
});
