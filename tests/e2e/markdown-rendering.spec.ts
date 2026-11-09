import { expect, test } from "@playwright/test";

test("preview articles render Markdown as semantic HTML", async ({ page }) => {
  await page.goto("/posts/first-reading/");

  const article = page.locator("article");
  await expect(article.getByRole("heading", { level: 2, name: "阅读界面" }).first()).toBeVisible();
  await expect(article.getByText("舒适的行宽", { exact: true })).toHaveCSS(
    "font-weight",
    /[6-9]00/,
  );
  await expect(article.getByRole("listitem").first()).toHaveText("让读者专注于正文");
});
