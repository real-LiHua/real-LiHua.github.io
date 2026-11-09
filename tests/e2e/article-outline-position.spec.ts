import { expect, test } from "@playwright/test";

test("outline toggle starts on the ergonomic side for each viewport size", async ({ page }) => {
  const toggle = page.locator("[data-outline-toggle]");

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/posts/first-reading/");
  let bounds = await toggle.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeLessThan(1280 / 2);
  expect(bounds!.y + bounds!.height / 2).toBeCloseTo(720 / 2, -1);

  await page.setViewportSize({ width: 400, height: 700 });
  await page.evaluate(() => localStorage.removeItem("article-outline-position"));
  await page.reload();
  bounds = await toggle.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x + bounds!.width).toBeGreaterThan(400 / 2);
  expect(bounds!.y + bounds!.height / 2).toBeGreaterThan(700 / 2);
});

test("outline toggle returns to its dragged position after reloading the article", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 700 });
  await page.goto("/posts/first-reading/");

  const toggle = page.locator("[data-outline-toggle]");
  const initial = await toggle.boundingBox();
  expect(initial).not.toBeNull();
  await page.mouse.move(initial!.x + initial!.width / 2, initial!.y + initial!.height / 2);
  await page.mouse.down();
  await page.mouse.move(70, 180, { steps: 6 });
  await page.mouse.up();

  const moved = await toggle.boundingBox();
  expect(moved).not.toBeNull();
  await page.reload();

  const restored = await toggle.boundingBox();
  expect(restored).not.toBeNull();
  expect(restored!.x).toBeCloseTo(moved!.x, 0);
  expect(restored!.y).toBeCloseTo(moved!.y, 0);
});

test("outline toggle ignores invalid saved positions and remains within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 700 });
  await page.addInitScript(() => {
    localStorage.setItem("article-outline-position", "{invalid");
  });
  await page.goto("/posts/first-reading/");

  const toggle = page.locator("[data-outline-toggle]");
  const bounds = await toggle.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(400);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(700);
});

test("outline toggle clamps saved coordinates when the viewport becomes smaller", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 700 });
  await page.addInitScript(() => {
    localStorage.setItem("article-outline-position", JSON.stringify({ left: 9999, top: -100 }));
  });
  await page.goto("/posts/first-reading/");

  const bounds = await page.locator("[data-outline-toggle]").boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x + bounds!.width).toBeCloseTo(400, 0);
  expect(bounds!.y).toBe(0);
});
