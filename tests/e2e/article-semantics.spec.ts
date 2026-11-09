import { expect, test } from "@playwright/test";

test("skip link is the first keyboard control and targets the main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "跳转到正文" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/#main-content$/u);
  await expect(page.getByRole("main")).toBeVisible();
});

test("article headings have unique IDs and copyable direct links", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/posts/first-reading/");

  const headings = page.locator(".article h1, .article-content h2");
  await expect(headings).toHaveCount(3);
  const ids = await headings.evaluateAll((elements) => elements.map((heading) => heading.id));
  expect(ids.every(Boolean)).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);

  await headings.first().locator("xpath=..").getByRole("button", { name: "复制标题链接" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.locator(".article-content [role='status']")).toHaveText("标题链接已复制");
  await expect(page.evaluate(() => navigator.clipboard.readText())).resolves.toBe(
    new URL(`#${ids[0]}`, page.url()).toString(),
  );
});

test("article images and wide tables stay contained on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/posts/first-reading/");

  const image = page.getByRole("img", { name: "预览插图" });
  await expect(image).toBeVisible();
  await expect(image).toHaveJSProperty("naturalWidth", 1200);
  const imageDimensions = await image.evaluate((element) => ({
    width: element.clientWidth,
    parentWidth: element.parentElement?.clientWidth ?? 0,
  }));
  expect(imageDimensions.width).toBeLessThanOrEqual(imageDimensions.parentWidth);

  const tableRegion = page.getByRole("region", { name: "可横向滚动的表格" });
  await expect(tableRegion).toBeVisible();
  const tableDimensions = await tableRegion.evaluate((element) => ({
    clientWidth: element.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    scrollWidth: element.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(tableDimensions.scrollWidth).toBeGreaterThan(tableDimensions.clientWidth);
  expect(tableDimensions.documentWidth).toBeLessThanOrEqual(tableDimensions.viewportWidth);

  await tableRegion.focus();
  await tableRegion.press("ArrowRight");
  await expect.poll(() => tableRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});
