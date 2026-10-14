import { expect, test } from "@playwright/test";

// E2E runs against the built standalone server (`webServer`), so the Pagefind
// index and UI assets in `/pagefind/` are present.
test.describe("search", () => {
  test("search trigger renders and opens the pagefind container", async ({ page }) => {
    await page.goto("/");

    const trigger = page.locator("[data-pagefind-ui]").first();
    await expect(trigger).toBeAttached();

    await page.getByRole("button", { name: "搜索" }).first().click();
    await expect(trigger).toBeVisible();
  });
});
