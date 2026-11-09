import { expect, test } from "@playwright/test";

test("eligible external links open separately with an encoded Archive lookup", async ({ page }) => {
  await page.goto("/posts/first-reading/");

  const original = page.getByRole("link", { name: "外部链接" });
  const archive = page.getByRole("link", { name: "查看 Internet Archive 快照" });
  const originalUrl = "https://example.com/article?from=blog&tag=a%2Fb";
  const archiveUrl = `https://web.archive.org/web/*/${encodeURIComponent(originalUrl)}`;

  await expect(original).toHaveAttribute("href", originalUrl);
  await expect(original).toHaveAttribute("target", "_blank");
  await expect(original).toHaveAttribute("rel", /noopener noreferrer/u);
  await expect(archive).toHaveAttribute("href", archiveUrl);
  await expect(archive).toHaveAttribute("target", "_blank");

  for (const name of ["内部链接", "邮件链接", "已有快照"]) {
    const link = page.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    await expect(
      link.locator("xpath=..").getByRole("link", { name: "查看 Internet Archive 快照" }),
    ).toHaveCount(0);
  }
});

test("archive lookups are user-initiated and do not retry or redirect the article", async ({
  context,
  page,
}) => {
  const requests: string[] = [];
  context.on("request", (request) => {
    if (/^(?:https:\/\/example\.com|https:\/\/web\.archive\.org)/u.test(request.url())) {
      requests.push(request.url());
    }
  });
  await page.goto("/posts/first-reading/");
  expect(requests).toEqual([]);

  await context.route("https://web.archive.org/**", (route) => route.abort());
  const archive = page.getByRole("link", { name: "查看 Internet Archive 快照" });
  await expect(archive).toHaveCount(1);
  await archive.click();

  await expect.poll(() => requests).toHaveLength(1);
  expect(requests[0]).toBe(
    `https://web.archive.org/web/*/${encodeURIComponent(
      "https://example.com/article?from=blog&tag=a%2Fb",
    )}`,
  );
  await expect(page).toHaveURL(/\/posts\/first-reading\/$/u);
});
