import { expect, test } from "@playwright/test";

test("theme defaults to the system preference and an explicit choice persists", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  await expect(page.locator("html")).toHaveClass(/dark/u);
  await page.getByRole("button", { name: "切换到浅色模式" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/u);

  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/u);
  await page.goto("/posts/");
  await expect(page.locator("html")).not.toHaveClass(/dark/u);
});

test("theme toggle applies and restores dark mode across navigation", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  await expect(page.locator("html")).not.toHaveClass(/dark/u);
  await page.getByRole("button", { name: "切换到深色模式" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/u);

  await page.goto("/posts/first-reading/");
  await expect(page.locator("html")).toHaveClass(/dark/u);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/u);
});
