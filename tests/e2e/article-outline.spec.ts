import { expect, test } from "@playwright/test";

test("outline lists article headings and supports opening, closing, and navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 700 });
  await page.goto("/posts/first-reading/");

  const toggle = page.locator("[data-outline-toggle]");
  const outline = page.getByRole("navigation", { name: "文章目录" });
  await expect(page.getByRole("button", { name: "打开文章目录" })).toHaveCount(1);
  await expect(outline).toBeHidden();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(outline.getByRole("link")).toHaveCount(3);

  const headingId = await page.locator(".article-content h2").first().getAttribute("id");
  expect(headingId).toBeTruthy();
  await outline.getByRole("link").nth(1).click();
  expect(new URL(page.url()).hash).toBe(`#${encodeURIComponent(headingId!)}`);
  await expect(outline).toBeVisible();

  const closeToggle = page.getByRole("button", { name: "关闭文章目录" });
  await closeToggle.focus();
  await page.keyboard.press("Space");
  await expect(outline).toBeHidden();
});

test("outline highlights the reading section and uses viewport-specific defaults", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/posts/first-reading/");

  const toggle = page.getByRole("button", { name: "关闭文章目录" });
  const outline = page.getByRole("navigation", { name: "文章目录" });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(outline).toBeVisible();

  const heading = page.locator(".article-content h2").first();
  const id = await heading.getAttribute("id");
  const activeLink = outline.locator(`a[href="#${id}"]`);
  await heading.evaluate((element) => {
    window.scrollTo(
      0,
      element.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3,
    );
  });
  await expect(activeLink).toHaveAttribute("aria-current", "location");

  await page.setViewportSize({ width: 400, height: 700 });
  await page.reload();
  await expect(page.getByRole("button", { name: "打开文章目录" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.getByRole("navigation", { name: "文章目录" })).toBeHidden();
});

test("outline stays in the wide viewport margin and tracks active entries in a long list", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/posts/first-reading/");

  const outline = page.getByRole("navigation", { name: "文章目录" });
  const panel = page.locator("[data-outline-panel]");
  await expect(outline).toBeVisible();

  const placement = await page.evaluate(() => {
    const article = document.querySelector(".article")!.getBoundingClientRect();
    const widget = document.querySelector("[data-outline-widget]")!.getBoundingClientRect();
    return { articleRight: article.right, widgetLeft: widget.left };
  });
  expect(placement.widgetLeft).toBeLessThan(placement.articleRight);
  expect(placement.widgetLeft).toBeLessThan(1600 / 2);

  const activeLink = outline.getByRole("link").last();
  const activeHeading = page.locator(".article-content h2").last();
  await activeLink.evaluate((link) => {
    const list = link.closest("ul")!;
    const item = link.closest("li")!;
    for (let index = 0; index < 30; index += 1) {
      const filler = document.createElement("li");
      filler.textContent = `目录占位 ${index + 1}`;
      list.prepend(filler);
    }
    list.append(item);
  });

  await activeHeading.evaluate((element) => {
    window.scrollTo(
      0,
      element.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3,
    );
  });
  await expect(activeLink).toHaveAttribute("aria-current", "location");
  const scrollState = await page.evaluate(() => ({
    article: window.scrollY,
    panel: document.querySelector("[data-outline-panel]")!.scrollTop,
    activeVisible: (() => {
      const panelRect = document.querySelector("[data-outline-panel]")!.getBoundingClientRect();
      const activeRect = document
        .querySelector('[data-outline-panel] [aria-current="location"]')!
        .getBoundingClientRect();
      return activeRect.top >= panelRect.top && activeRect.bottom <= panelRect.bottom;
    })(),
  }));
  expect(scrollState.panel).toBeGreaterThan(0);
  expect(scrollState.activeVisible).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollState.article);
  await expect(panel).toBeVisible();
});

test("outline nests subsection links under their nearest parent heading", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 700 });
  await page.goto("/posts/small-steps/");

  const outline = page.getByRole("navigation", { name: "文章目录" });
  await page.getByRole("button", { name: "打开文章目录" }).click();

  const parent = outline.getByRole("link", { name: "从一个问题开始" });
  await expect(parent.locator("xpath=..").locator("ul")).toContainText("先验证一个小步骤");
  await expect(
    parent.locator("xpath=..").locator("ul").getByRole("link", { name: "先验证一个小步骤" }),
  ).toHaveAttribute("href", "#先验证一个小步骤");
});

test("outline panel opens away from a toggle dragged to either viewport edge", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 700 });
  await page.goto("/posts/first-reading/");

  const toggle = page.locator("[data-outline-toggle]");
  const panel = page.locator("[data-outline-panel]");

  for (const edge of ["left", "right"] as const) {
    const initial = await toggle.boundingBox();
    expect(initial).not.toBeNull();
    const targetX = edge === "left" ? 8 : 392 - initial!.width;
    await page.mouse.move(initial!.x + initial!.width / 2, initial!.y + initial!.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetX + initial!.width / 2, 300, { steps: 6 });
    await page.mouse.up();

    await toggle.click();
    await expect(panel).toBeVisible();
    const bounds = await page.evaluate(() => {
      const toggleRect = document.querySelector("[data-outline-toggle]")!.getBoundingClientRect();
      const panelRect = document.querySelector("[data-outline-panel]")!.getBoundingClientRect();
      return {
        panelLeft: panelRect.left,
        panelRight: panelRect.right,
        panelTop: panelRect.top,
        panelBottom: panelRect.bottom,
        toggleLeft: toggleRect.left,
        toggleRight: toggleRect.right,
        toggleTop: toggleRect.top,
        toggleBottom: toggleRect.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(bounds.panelLeft).toBeGreaterThanOrEqual(0);
    expect(bounds.panelRight).toBeLessThanOrEqual(bounds.viewportWidth);
    expect(bounds.panelTop).toBeGreaterThanOrEqual(0);
    expect(bounds.panelBottom).toBeLessThanOrEqual(bounds.viewportHeight);
    expect(bounds.panelRight <= bounds.toggleLeft || bounds.panelLeft >= bounds.toggleRight).toBe(
      true,
    );

    await toggle.click();
    await expect(panel).toBeHidden();
  }
});

test("outline can be dragged with the pointer without toggling and stays in the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 700 });
  await page.goto("/posts/first-reading/");

  const toggle = page.getByRole("button", { name: "打开文章目录" });
  const initial = await toggle.boundingBox();
  expect(initial).not.toBeNull();
  await page.mouse.move(initial!.x + initial!.width / 2, initial!.y + initial!.height / 2);
  await page.mouse.down();
  await page.mouse.move(395, 695, { steps: 6 });
  await page.mouse.up();

  const moved = await toggle.boundingBox();
  expect(moved).not.toBeNull();
  expect(moved!.x).toBeGreaterThan(initial!.x);
  expect(moved!.x + moved!.width).toBeLessThanOrEqual(400);
  expect(moved!.y + moved!.height).toBeLessThanOrEqual(700);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("outline touch dragging is supported and the panel fits on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/posts/first-reading/");

  const toggle = page.getByRole("button", { name: "打开文章目录" });
  const start = await toggle.boundingBox();
  expect(start).not.toBeNull();

  await page.evaluate(
    ({ x, y }) => {
      const button = document.querySelector("[data-outline-toggle]");
      if (!button) throw new Error("Outline toggle was not rendered");

      button.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          clientX: x,
          clientY: y,
          pointerId: 7,
          pointerType: "touch",
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientX: x + 80,
          clientY: y + 80,
          pointerId: 7,
          pointerType: "touch",
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          clientX: x + 80,
          clientY: y + 80,
          pointerId: 7,
          pointerType: "touch",
        }),
      );
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    },
    { x: start!.x + start!.width / 2, y: start!.y + start!.height / 2 },
  );

  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();

  const outline = page.getByRole("navigation", { name: "文章目录" });
  await expect(outline).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    panelRight: document.querySelector("[data-outline-panel]")?.getBoundingClientRect().right ?? 0,
    panelLeft: document.querySelector("[data-outline-panel]")?.getBoundingClientRect().left ?? 0,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  expect(dimensions.panelLeft).toBeGreaterThanOrEqual(0);
  expect(dimensions.panelRight).toBeLessThanOrEqual(dimensions.viewportWidth);
});
