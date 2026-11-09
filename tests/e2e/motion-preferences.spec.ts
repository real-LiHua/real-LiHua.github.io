import { expect, test } from "@playwright/test";

test("normal motion opens the outline more gently than it closes and preserves focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 400, height: 700 });
  await page.goto("/posts/first-reading/");

  const toggle = page.locator("[data-outline-toggle]");
  const panel = page.locator("[data-outline-panel]");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toHaveAttribute("data-state", "open");
  await expect(toggle).toBeFocused();

  const openDuration = await panel.evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).transitionDuration) * 1000,
  );
  expect(openDuration).toBeGreaterThan(0);

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toHaveAttribute("data-state", "closing");
  const closeDuration = await panel.evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).transitionDuration) * 1000,
  );
  expect(closeDuration).toBeLessThan(openDuration);
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();

  const themeToggle = page.getByRole("button", { name: "切换到深色模式" });
  const themeDuration = await themeToggle.evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).transitionDuration) * 1000,
  );
  expect(themeDuration).toBeGreaterThan(0);
});

test("reduced motion suppresses theme and outline transitions without impairing controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 400, height: 700 });
  await page.goto("/posts/first-reading/");

  const toggle = page.locator("[data-outline-toggle]");
  const panel = page.locator("[data-outline-panel]");
  await toggle.focus();
  await page.keyboard.press("Enter");

  await expect(panel).toBeVisible();
  await expect(toggle).toBeFocused();
  await expect(panel).toHaveCSS("transition-duration", "0s");

  await page.keyboard.press("Enter");
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(page.getByRole("button", { name: "切换到深色模式" })).toHaveCSS(
    "transition-duration",
    "0s",
  );
});
