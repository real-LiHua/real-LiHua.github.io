import { expect, test, type Page } from "@playwright/test";

interface PopupMockOptions {
  version: string;
  initData: string;
  colorScheme?: "light" | "dark";
}

// Minimal Telegram WebApp mock for the popup test page: the head bootstrap
// consumes the fragment (palette), and the page consumes initData + showPopup.
// The SDK request is aborted so tests never touch the network. Note: the
// initScript callback is serialized and runs in the browser, so everything it
// references must be defined inside it (no module-scope helpers).
const mockTelegramPopup = async (
  page: Page,
  { version, initData, colorScheme = "dark" }: PopupMockOptions,
) => {
  await page.route("https://telegram.org/js/telegram-web-app.js*", (route) => route.abort());
  await page.addInitScript(
    ({ version: tgVersion, initData: tgInitData, effectiveColorScheme }) => {
      const calls: string[] = [];
      const webApp = {
        platform: "ios",
        version: tgVersion,
        initData: tgInitData,
        colorScheme: effectiveColorScheme,
        isExpanded: false,
        ready: () => calls.push("ready"),
        expand: () => calls.push("expand"),
        setHeaderColor: () => {},
        setBackgroundColor: () => {},
        setBottomBarColor: () => {},
        // Compare packed major/minor as numbers (8.0 >= 6.2, 6.0 < 6.2).
        isVersionAtLeast: (required: string) =>
          Number(tgVersion.split(".")[0]) * 100 + Number(tgVersion.split(".")[1] ?? 0) >=
          Number(required.split(".")[0]) * 100 + Number(required.split(".")[1] ?? 0),
        showPopup: (params: { title?: string; message: string }) => {
          calls.push(`showPopup:${params.message}`);
        },
        onEvent: () => {},
      };
      Object.defineProperty(window, "Telegram", { value: { WebApp: webApp } });
      Object.defineProperty(window, "__tgCalls", { value: calls });
    },
    { version, initData, effectiveColorScheme: colorScheme },
  );

  const fragment = new URLSearchParams({
    tgWebAppData: initData,
    tgWebAppVersion: version,
    tgWebAppPlatform: "ios",
    tgWebAppColorScheme: colorScheme,
    tgWebAppThemeParams: JSON.stringify({ bg_color: "#17212b", text_color: "#f5f5f5" }),
  });
  await page.goto(`/test/group-popup/#${fragment}`);
};

const launchInitData = (user: Record<string, unknown>) =>
  new URLSearchParams({
    user: JSON.stringify(user),
    auth_date: "1700000000",
    hash: "abc",
  }).toString();

const callsOf = (page: Page) =>
  page.evaluate(() => (window as never as { __tgCalls: string[] }).__tgCalls ?? []);

test("inside Telegram the entry pops the native popup with the resolved nickname", async ({
  page,
}) => {
  await mockTelegramPopup(page, {
    version: "8.0",
    initData: launchInitData({ id: 4242, first_name: "Ada", last_name: "Lovelace" }),
  });

  await expect.poll(() => callsOf(page), { timeout: 5000 }).toContain("showPopup:Ada Lovelace");
  await expect(page.locator("[data-nickname-dialog]")).not.toBeVisible();
  await expect(page.locator("[data-status-env]")).toContainText("Telegram");
  await expect(page.locator("[data-status-nickname]")).toContainText("Ada Lovelace");
});

test("markup in the nickname is delivered to showPopup verbatim", async ({ page }) => {
  const payload = "<img src=x onerror=window.__pwned=1>";
  await mockTelegramPopup(page, {
    version: "8.0",
    initData: launchInitData({ id: 1, first_name: payload }),
  });

  await expect.poll(() => callsOf(page), { timeout: 5000 }).toContain(`showPopup:${payload}`);
  expect(
    await page.evaluate(() => (window as never as { __pwned?: boolean }).__pwned),
  ).toBeUndefined();
});

test("in a plain browser the in-page dialog opens with the placeholder, and re-opens on demand", async ({
  page,
}) => {
  await page.goto("/test/group-popup/");

  const dialog = page.locator("[data-nickname-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("未知用户");
  await expect(page.locator("[data-status-env]")).toContainText("浏览器");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();

  await page.getByRole("button", { name: "再弹一次" }).click();
  await expect(dialog).toBeVisible();

  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test("inside an older client (Bot API < 6.2) the dialog fallback is used instead of showPopup", async ({
  page,
}) => {
  const payload = "<svg onload=window.__pwned=1>";
  await mockTelegramPopup(page, {
    version: "6.0",
    initData: launchInitData({ id: 7, first_name: payload, last_name: "Bond" }),
  });

  const dialog = page.locator("[data-nickname-dialog]");
  await expect(dialog).toBeVisible();
  // textContent keeps the markup literal: no injected elements, no handler runs.
  await expect(dialog.locator("[data-nickname]")).toHaveText(`${payload} Bond`);
  expect(await dialog.locator("svg").count()).toBe(0);
  expect(
    await page.evaluate(() => (window as never as { __pwned?: boolean }).__pwned),
  ).toBeUndefined();
  expect(await callsOf(page)).not.toContainEqual(expect.stringMatching(/^showPopup:/u));
  await expect(page.locator("[data-status-path]")).toContainText("对话框");
});

test("the test page is reachable from the navigation and labeled as a test", async ({ page }) => {
  await page.goto("/");
  const navLink = page.getByRole("link", { name: "昵称弹窗测试" });
  await expect(navLink).toBeVisible();
  await navLink.click();
  await page.waitForURL("**/test/group-popup/**");
  await expect(page.locator("main")).toContainText("测试页面");
  await expect(page.locator("main")).toContainText("-1002025381790");
});
