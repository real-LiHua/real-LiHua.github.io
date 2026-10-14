import { expect, test } from "@playwright/test";

test.describe("theme toggle", () => {
  test("defaults to a theme before first paint and toggles on click", async ({ page }) => {
    await page.goto("/");

    const root = page.locator("html");
    const initial = await root.getAttribute("data-theme");
    expect(["light", "dark"]).toContain(initial);

    await page.locator("[data-theme-toggle]").first().click();
    const toggled = await root.getAttribute("data-theme");
    expect(toggled).not.toBe(initial);
  });

  test("persists the choice across reloads", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-theme-toggle]").first().click();
    const chosen = await page.locator("html").getAttribute("data-theme");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", chosen ?? "light");
  });
});
