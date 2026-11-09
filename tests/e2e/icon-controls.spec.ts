import { expect, test } from "@playwright/test";

const icon = ".nf-icon";

test("reader controls expose decorative Nerd Font icons with accessible names", async ({
  page,
}) => {
  await page.goto("/posts/first-reading/");

  const navigation = page.getByRole("navigation", { name: "主导航" });
  for (const name of ["首页", "文章"]) {
    const link = navigation.getByRole("link", { name });
    await expect(link.locator(icon)).toHaveCount(1);
    await expect(link.locator(icon)).toHaveAttribute("aria-hidden", "true");
  }
  for (const name of ["搜索", "切换到深色模式"]) {
    const button = navigation.getByRole("button", { name });
    await expect(button.locator(icon).first()).toHaveAttribute("aria-hidden", "true");
  }

  const searchButton = navigation.getByRole("button", { name: "搜索" });
  await searchButton.click();
  const dialog = page.getByRole("dialog", { name: "站内查找" });
  await expect(dialog.getByRole("button", { name: "关闭", exact: true }).locator(icon)).toHaveCount(
    1,
  );
  await expect(dialog.getByRole("button", { name: "搜索" }).locator(icon)).toHaveCount(1);
  await page.keyboard.press("Escape");

  await expect(page.getByRole("button", { name: "关闭文章目录" }).locator(icon)).toHaveCount(1);
  await expect(page.locator(".code-copy").first().locator(icon)).toHaveCount(1);
  await expect(page.locator(".heading-copy").first().locator(icon)).toHaveCount(1);
  await expect(page.locator(".archive-lookup").first().locator(icon)).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: /上一篇.*关于慢慢整理的笔记/u }).locator(icon),
  ).toHaveCount(1);
});

test("archive utilities and secondary links use icons without losing their names", async ({
  page,
}) => {
  await page.goto("/posts/");
  const utilities = page.getByRole("navigation", { name: "其他浏览方式" });
  for (const name of ["浏览文章系列", "订阅 RSS"]) {
    await expect(utilities.getByRole("link", { name }).locator(icon)).toHaveCount(1);
  }

  await page.goto("/topics/reading/");
  await expect(page.getByRole("link", { name: "文章索引" }).locator(icon)).toHaveCount(1);

  await page.goto("/this-page-does-not-exist/");
  await expect(page.getByRole("link", { name: "返回首页" }).locator(icon)).toHaveCount(1);
});
