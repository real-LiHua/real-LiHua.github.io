import { expect, test } from "@playwright/test";

// Verifies the Telegram auth gate is enforced *server-side*: the protected body
// must never appear in the static HTML, only an auth wall plus a deep link.
test.describe("telegram auth", () => {
  test("protected posts render a wall, not the body", async ({ page }) => {
    await page.goto("/posts/protected-example/");

    const wall = page.locator("[data-telegram-auth]").first();
    await expect(wall).toBeVisible();
    await expect(page.getByRole("heading", { name: "此文章需要验证" })).toBeVisible();

    const html = await page.content();
    expect(html).not.toContain("这段正文不会出现在静态构建的 HTML 中");
  });

  test("the auth endpoint refuses unverified requests", async ({ request }) => {
    const response = await request.get("/api/posts/protected-example");
    expect(response.status()).toBe(401);
  });

  test("public posts are readable and unlock without auth", async ({ request }) => {
    const response = await request.get("/api/posts/hello-world");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { html?: string };
    expect(body.html).toContain("欢迎");
  });
});
