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

test("theme keeps the color-scheme meta in sync and returns to the system default", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  const html = page.locator("html");
  const meta = page.locator('meta[name="color-scheme"]');

  await expect(meta).toHaveAttribute("content", "light dark");
  await expect(html).toHaveCSS("color-scheme", "light dark");

  await page.getByRole("button", { name: "切换到深色模式" }).click();
  await expect(meta).toHaveAttribute("content", "dark");
  await expect(html).toHaveCSS("color-scheme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("reader-theme"))).toBe("dark");

  await page.getByRole("button", { name: "切换到浅色模式" }).click();
  await expect(meta).toHaveAttribute("content", "light dark");
  await expect(html).not.toHaveClass(/dark/u);
  expect(await page.evaluate(() => localStorage.getItem("reader-theme"))).toBeNull();
});

test("theme follows the system preference while no override is stored", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  await expect(page.locator("html")).not.toHaveClass(/dark/u);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/u);
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "light dark");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/u);
});

test("theme changes made in another tab apply here", async ({ context, page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  const otherTab = await context.newPage();
  await otherTab.emulateMedia({ colorScheme: "light" });
  await otherTab.goto("/");
  await otherTab.getByRole("button", { name: "切换到深色模式" }).click();

  await expect(page.locator("html")).toHaveClass(/dark/u);
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "dark");

  await otherTab.close();
});
