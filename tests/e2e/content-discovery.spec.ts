import { expect, test } from "@playwright/test";

test("archive exposes available years and topics", async ({ page }) => {
  await page.goto("/posts/");

  await expect(page.getByRole("link", { name: "2026" })).toHaveAttribute(
    "href",
    "/posts/years/2026/",
  );
  await expect(page.getByRole("link", { name: "阅读", exact: true })).toHaveAttribute(
    "href",
    "/topics/reading/",
  );
  await expect(page.getByRole("link", { name: "写作", exact: true })).toHaveAttribute(
    "href",
    "/topics/writing/",
  );
  await expect(page.getByRole("link", { name: "技术", exact: true })).toHaveAttribute(
    "href",
    "/topics/technology/",
  );
});

test("archive groups browsing links separately from article results on all viewport sizes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/posts/");

  const browseSection = page.getByRole("region", { name: "浏览文章" });
  const yearNavigation = browseSection.getByRole("navigation", { name: "按年份浏览" });
  const topicNavigation = browseSection.getByRole("navigation", { name: "按主题浏览" });
  const utilityNavigation = browseSection.getByRole("navigation", { name: "其他浏览方式" });
  await expect(yearNavigation.getByRole("link", { name: "2026" })).toBeVisible();
  await expect(topicNavigation.getByRole("link", { name: "技术" })).toBeVisible();
  await expect(utilityNavigation.getByRole("link", { name: "浏览文章系列" })).toBeVisible();
  await expect(utilityNavigation.getByRole("link", { name: "订阅 RSS" })).toBeVisible();

  const desktopLayout = await page.evaluate(() => {
    const browseGrid = document.querySelector(".archive-browse-grid")!;
    const columns = getComputedStyle(browseGrid).gridTemplateColumns.split(" ").length;
    const preview = document.querySelector(".archive-preview-note")!.getBoundingClientRect();
    const browse = document.querySelector(".archive-discovery")!.getBoundingClientRect();
    const actions = document.querySelector(".archive-utilities")!.getBoundingClientRect();
    const listHeading = document.querySelector(".archive-list-heading")!.getBoundingClientRect();
    return {
      columns,
      noteGap: browse.top - preview.bottom,
      actionsBottom: actions.bottom,
      listTop: listHeading.top,
    };
  });
  expect(desktopLayout.columns).toBe(2);
  expect(desktopLayout.noteGap).toBeGreaterThanOrEqual(24);
  expect(desktopLayout.listTop - desktopLayout.actionsBottom).toBeGreaterThanOrEqual(32);

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileColumns = await page
    .locator(".archive-browse-grid")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(mobileColumns).toBe(1);
  await expect(page.getByRole("link", { name: "订阅 RSS" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("year archive lists only articles from the selected year", async ({ page }) => {
  await page.goto("/posts/years/2026/");

  const titles = await page.locator(".post-list h2").allTextContents();
  expect(titles).toEqual([
    "把阅读留给一页纸",
    "关于慢慢整理的笔记",
    "代码片段的阅读节奏",
    "把复杂问题拆成小步骤",
  ]);
  await expect(page.getByRole("link", { name: "文章", exact: true })).toHaveAttribute(
    "href",
    "/posts/",
  );
});

test("topic archive lists only articles assigned to that topic", async ({ page }) => {
  await page.goto("/topics/writing/");

  const titles = await page.locator(".post-list h2").allTextContents();
  expect(titles).toEqual(["关于慢慢整理的笔记", "代码片段的阅读节奏", "把复杂问题拆成小步骤"]);
  await expect(page.getByRole("heading", { name: "写作" })).toBeVisible();
});

test("unknown year and topic routes return truthful 404 responses", async ({ page }) => {
  const yearResponse = await page.goto("/posts/years/1999/");
  expect(yearResponse?.status()).toBe(404);

  const topicResponse = await page.goto("/topics/unassigned/");
  expect(topicResponse?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "页面未找到" })).toBeVisible();
});

test("article pages link to immediate older and newer articles", async ({ page }) => {
  await page.goto("/posts/reading-code-samples/");

  await expect(page.getByRole("link", { name: /上一篇.*把复杂问题拆成小步骤/u })).toHaveAttribute(
    "href",
    "/posts/small-steps/",
  );
  await expect(page.getByRole("link", { name: /下一篇.*关于慢慢整理的笔记/u })).toHaveAttribute(
    "href",
    "/posts/notes-on-making/",
  );
});

test("chronological boundary articles omit the unavailable direction", async ({ page }) => {
  await page.goto("/posts/first-reading/");
  await expect(page.getByRole("link", { name: /上一篇.*关于慢慢整理的笔记/u })).toHaveAttribute(
    "href",
    "/posts/notes-on-making/",
  );
  await expect(page.getByText("下一篇")).toHaveCount(0);

  await page.goto("/posts/small-steps/");
  await expect(page.getByRole("link", { name: /下一篇.*代码片段的阅读节奏/u })).toHaveAttribute(
    "href",
    "/posts/reading-code-samples/",
  );
  await expect(page.getByText("上一篇")).toHaveCount(0);
});

test("series archive uses authored order and series links stay separate from chronology", async ({
  page,
}) => {
  await page.goto("/series/quiet-reading/");

  const seriesTitles = await page.locator(".post-list h2").allTextContents();
  expect(seriesTitles).toEqual(["关于慢慢整理的笔记", "代码片段的阅读节奏"]);
  await expect(page.getByRole("link", { name: "关于慢慢整理的笔记" })).toHaveAttribute(
    "href",
    "/posts/notes-on-making/",
  );
  await expect(page.getByText("第 1 篇 · 2026-10-28")).toBeVisible();
  await expect(page.getByRole("link", { name: "代码片段的阅读节奏" })).toHaveAttribute(
    "href",
    "/posts/reading-code-samples/",
  );
  await expect(page.getByText("第 2 篇 · 2026-10-20")).toBeVisible();

  await page.goto("/posts/notes-on-making/");
  await expect(page.getByRole("link", { name: /系列下一篇.*代码片段的阅读节奏/u })).toHaveAttribute(
    "href",
    "/posts/reading-code-samples/",
  );
  await expect(page.getByRole("link", { name: /下一篇.*把阅读留给一页纸/u })).toHaveAttribute(
    "href",
    "/posts/first-reading/",
  );

  await page.goto("/posts/first-reading/");
  await expect(page.locator("[data-series-navigation]")).toHaveCount(0);
});
