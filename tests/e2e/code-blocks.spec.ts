import { expect, test } from "@playwright/test";

test("code blocks expose a language badge and keyboard-operable copy control", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/posts/first-reading/");

  const codeBlock = page.locator(".code-block").filter({ hasText: "const answer = 42;" });
  await expect(codeBlock).toHaveCount(1);
  await expect(codeBlock.getByText("ts", { exact: true })).toBeVisible();

  const copyButton = codeBlock.getByRole("button", { name: "复制代码" });
  const copyStatus = page.locator("#main-content").getByRole("status");
  await copyButton.focus();
  await page.keyboard.press("Enter");

  await expect(copyStatus).toHaveText("已复制到剪贴板");
  await expect(page.evaluate(() => navigator.clipboard.readText())).resolves.toBe(
    "const answer = 42; // This line stays inside its code block on narrow screens.",
  );

  const dimensions = await codeBlock.locator("pre").evaluate((element) => ({
    blockClientWidth: element.clientWidth,
    blockScrollWidth: element.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  expect(dimensions.blockScrollWidth).toBeGreaterThan(dimensions.blockClientWidth);
});

test("code copy failure is announced without success feedback", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error("Clipboard access denied")),
      },
    });
  });
  await page.goto("/posts/first-reading/");

  const codeBlock = page.locator(".code-block").filter({ hasText: "const answer = 42;" });
  const copyStatus = page.locator("#main-content").getByRole("status");
  await expect(codeBlock).toHaveCount(1);
  await codeBlock.getByRole("button", { name: "复制代码" }).click();

  await expect(copyStatus).toHaveText("复制失败");
  await expect(copyStatus).not.toHaveText("已复制到剪贴板");
});
