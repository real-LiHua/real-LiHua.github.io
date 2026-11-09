import { expect, test } from "@playwright/test";

test("shared search dialog returns results without leaving the current page", async ({ page }) => {
  await page.goto("/posts/");
  await page.getByRole("button", { name: "搜索" }).click();

  const dialog = page.getByRole("dialog", { name: "站内查找" });
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(dialogBox!.x + dialogBox!.width / 2).toBeCloseTo(viewport!.width / 2, 0);
  expect(dialogBox!.y + dialogBox!.height / 2).toBeCloseTo(viewport!.height / 2, 0);
  await dialog.getByRole("searchbox", { name: "搜索文章" }).fill("舒适的行宽");
  await dialog.getByRole("button", { name: "搜索" }).click();

  await expect(dialog.getByRole("link", { name: "把阅读留给一页纸" })).toHaveAttribute(
    "href",
    "/posts/first-reading/",
  );
  await expect(page).toHaveURL(/\/posts\/$/u);
});

test("search dialog closes with Escape and restores focus to its opener", async ({ page }) => {
  await page.goto("/posts/first-reading/");
  const opener = page.getByRole("button", { name: "搜索" });
  await opener.click();
  await expect(page.getByRole("dialog", { name: "站内查找" })).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog", { name: "站内查找" })).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "站内查找" })).toBeHidden();
  await expect(opener).toBeFocused();
});

test("search returns matching published article links", async ({ page }) => {
  await page.goto("/search/");
  const searchPage = page.locator("main");
  await searchPage.getByRole("searchbox", { name: "搜索文章" }).fill("舒适的行宽");
  await searchPage.getByRole("button", { name: "搜索" }).click();

  await expect(searchPage.getByRole("link", { name: "把阅读留给一页纸" })).toHaveAttribute(
    "href",
    "/posts/first-reading/",
  );
});

test("search matches a single-character query", async ({ page }) => {
  await page.goto("/search/?q=一");
  const searchPage = page.locator("main");

  await expect(searchPage.locator("[data-search-status]")).toHaveText(/找到 \d+ 篇文章。/u);
  await expect(searchPage.getByRole("link", { name: "把阅读留给一页纸" })).toBeVisible();
});

test("empty search queries request a non-empty term", async ({ page }) => {
  await page.goto("/search/?q=%20%20");

  await expect(page.locator("main [data-search-status]")).toHaveText("请输入搜索关键词。");
  await expect(page.getByRole("listitem")).toHaveCount(0);
});

test("search communicates when there are no matching articles", async ({ page }) => {
  await page.goto("/search/?q=qzxvbnmlkjhgfdsa");

  await expect(page.locator("main [data-search-status]")).toHaveText("没有找到匹配文章。");
  await expect(page.getByRole("listitem")).toHaveCount(0);
});

test("search reports when the generated index is unavailable", async ({ page }) => {
  await page.route("**/search-index.json", (route) => route.abort());
  await page.goto("/search/?q=舒适的行宽");

  await expect(page.locator("main [data-search-status]")).toHaveText(
    "搜索暂时不可用，请稍后重试。",
  );
  await expect(page.getByRole("listitem")).toHaveCount(0);
});
