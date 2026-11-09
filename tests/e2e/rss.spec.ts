import { expect, test } from "@playwright/test";

test("RSS endpoint includes published entries and excludes previews", async ({ request, page }) => {
  const response = await request.get("/rss.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/xml");

  const xml = await response.text();
  const parsed = await page.evaluate((source) => {
    const document = new DOMParser().parseFromString(source, "application/xml");
    return {
      root: document.documentElement.localName,
      version: document.documentElement.getAttribute("version"),
      parseError: document.querySelector("parsererror")?.textContent,
      titles: [...document.querySelectorAll("item > title")].map(
        (title) => title.textContent ?? "",
      ),
    };
  }, xml);

  expect(parsed).toEqual({
    root: "rss",
    version: "2.0",
    parseError: undefined,
    titles: ["把阅读留给一页纸"],
  });
});
