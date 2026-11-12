import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const postsDirectory = fileURLToPath(new URL("../../src/content/posts/", import.meta.url));

function getPreviewTitles(): Set<string> {
  const titles = new Set<string>();

  for (const file of readdirSync(postsDirectory)) {
    if (!file.endsWith(".md")) {
      continue;
    }

    const source = readFileSync(join(postsDirectory, file), "utf8");
    if (!/^isPreview:\s*true$/mu.test(source)) {
      continue;
    }

    const title = source.match(/^title:\s*(?<title>.+)$/mu)?.groups?.title?.trim();
    if (title) {
      titles.add(title);
    }
  }

  return titles;
}

test("home and archive list several preview articles from the content collection", async ({
  page,
}) => {
  for (const route of ["/", "/posts/"]) {
    await page.goto(route);

    const articles = page.locator(".post-list article");
    await expect(articles).toHaveCount(4);
    await expect(page.getByText("预览示例 · 以下内容仅用于界面预览")).toBeVisible();

    for (const article of await articles.all()) {
      await expect(article.getByRole("link")).toHaveAttribute("href", /^\/posts\/[^/]+\/$/u);
    }
  }
});

test("each preview collection entry has a rendered article route", async ({ page }) => {
  await page.goto("/posts/");
  const entries = await page.locator(".post-list article h2 a").evaluateAll((links) =>
    links.map((link) => ({
      title: link.textContent?.trim() ?? "",
      href: (link as HTMLAnchorElement).href,
    })),
  );
  const previewTitles = getPreviewTitles();

  for (const { href, title } of entries) {
    await page.goto(href);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    if (previewTitles.has(title)) {
      await expect(page.getByText("预览示例 · 非正式发布文章")).toBeVisible();
    }
    await expect(page.locator(".article-content").locator("> *").first()).toBeVisible();
  }
});

test("Orama indexes articles from the content collection", async ({ page }) => {
  await page.goto("/search/");
  const searchPage = page.locator("main");
  await searchPage.getByRole("searchbox", { name: "搜索文章" }).fill("代码片段的阅读节奏");
  await searchPage.getByRole("button", { name: "搜索" }).click();

  await expect(searchPage.getByRole("link", { name: "代码片段的阅读节奏" })).toHaveAttribute(
    "href",
    "/posts/reading-code-samples/",
  );
  const previewResult = searchPage
    .locator(".search-results li")
    .filter({ hasText: "代码片段的阅读节奏" });
  await expect(previewResult.getByText("预览示例")).toBeVisible();
});
