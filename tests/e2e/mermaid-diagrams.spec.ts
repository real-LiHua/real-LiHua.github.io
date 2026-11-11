import { expect, test } from "@playwright/test";

test("mermaid diagrams render as build-time SVG without client scripts", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/posts/reading-code-samples/");

  const diagram = page.locator("div.mermaid[data-mermaid-ssg='true']");
  await expect(diagram).toHaveCount(1);
  await expect(diagram.locator("pre.mermaid")).toHaveCount(0);
  await expect(page.locator("script[src*='mermaid']")).toHaveCount(0);

  const rect = diagram.locator("svg rect").first();
  await expect(rect).toBeVisible();
  const geometry = await diagram.locator("svg").evaluate((element) => ({
    svgWidth: element.getBoundingClientRect().width,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(geometry.svgWidth).toBeGreaterThan(0);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
});

test("diagram colors follow the light and dark theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/posts/reading-code-samples/");

  const canvas = page.locator("div.mermaid[data-mermaid-ssg='true'] svg rect").first();
  const readCanvasFill = () => canvas.evaluate((element) => getComputedStyle(element).fill);
  const canvasFillMatchesPage = () =>
    canvas.evaluate(
      (element) =>
        getComputedStyle(element).fill === getComputedStyle(document.body).backgroundColor,
    );

  const lightFill = await readCanvasFill();
  await expect.poll(canvasFillMatchesPage, { timeout: 1000 }).toBe(true);

  await page.getByRole("button", { name: "切换到深色模式" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/u);
  await expect.poll(canvasFillMatchesPage, { timeout: 1000 }).toBe(true);

  const darkFill = await readCanvasFill();
  expect(darkFill).not.toBe(lightFill);
  expect(darkFill).not.toBe("rgb(255, 255, 255)");
});
