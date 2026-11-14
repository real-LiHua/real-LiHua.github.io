import { expect, test } from "@playwright/test";

test("MDX pages use auto-imported components without imports", async ({ page }) => {
  await page.goto("/test/auto-import/");

  await expect(page.getByRole("heading", { level: 1, name: "MDX 自动导入" })).toBeVisible();
  await expect(page.locator("main .auto-import-demo .nf-icon")).toHaveCount(1);
});
