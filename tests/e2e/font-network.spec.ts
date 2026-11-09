import { expect, test } from "@playwright/test";

test("reader pages do not request fonts from external providers", async ({ page }) => {
  const externalFontRequests: string[] = [];

  page.on("request", (request) => {
    if (request.resourceType() !== "font") {
      return;
    }

    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== new URL("http://localhost:4321").origin) {
      externalFontRequests.push(request.url());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "最近的文章" })).toBeVisible();
  expect(externalFontRequests).toEqual([]);
});
