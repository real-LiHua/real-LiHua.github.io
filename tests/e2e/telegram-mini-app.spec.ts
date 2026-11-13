import { expect, test, type Page } from "@playwright/test";

interface TelegramMockOptions {
  colorScheme: "light" | "dark";
  platform?: string;
  version?: string;
  initData?: string;
  themeParams?: Record<string, string>;
  /** Install window.Telegram.WebApp; pass false to emulate a blocked SDK. */
  installMock?: boolean;
}

// Key naming matches the client's tgWebAppThemeParams payload (snake_case).
const darkThemeParams = {
  bg_color: "#17212b",
  text_color: "#f5f5f5",
  hint_color: "#8a9bab",
  link_color: "#6ab3f3",
  button_color: "#5288c1",
  button_text_color: "#ffffff",
  secondary_bg_color: "#232e3c",
  section_bg_color: "#222c3a",
  section_separator_color: "#0f1720",
  accent_text_color: "#6ab3f3",
  destructive_text_color: "#ef5b5b",
};

const lightThemeParams = {
  bg_color: "#ffffff",
  text_color: "#000000",
  hint_color: "#707579",
  link_color: "#2481cc",
  button_color: "#2481cc",
  button_text_color: "#ffffff",
  secondary_bg_color: "#f4f4f5",
  section_bg_color: "#ffffff",
  section_separator_color: "#e7e8eb",
  accent_text_color: "#2481cc",
  destructive_text_color: "#e53935",
};

const paramsFor = (colorScheme: "light" | "dark") =>
  colorScheme === "dark" ? darkThemeParams : lightThemeParams;

const toCssVariables = (params: Record<string, string>) =>
  Object.entries(params).map(([key, value]) => `--tg-theme-${key.replaceAll("_", "-")}: ${value}`);

// The real client delivers launch parameters in the URL fragment and injects
// --tg-theme-* on the root element. The SDK request is aborted so tests never
// touch the network; the bootstrap under test parses the same fragment.
const mockTelegram = async (page: Page, options: TelegramMockOptions) => {
  const {
    colorScheme,
    platform = "ios",
    version = "8.0",
    initData = "user=%7B%22id%22%3A123%7D&auth_date=1700000000&hash=abc",
    themeParams = paramsFor(colorScheme),
    installMock = true,
  } = options;

  await page.route("https://telegram.org/js/telegram-web-app.js*", (route) => route.abort());
  if (installMock) {
    await page.addInitScript(
      ({ colorScheme, platform, version, initData, themeParams }) => {
        // A real client re-reports the *current* theme on every page load,
        // even when the launch fragment itself is dropped (in-app navigation).
        // Mirror that: boot from the persisted launch record when present.
        const storedRaw = sessionStorage.getItem("tg-launch");
        const stored = storedRaw ? new URLSearchParams(storedRaw) : null;
        const storedScheme = stored?.get("tgWebAppColorScheme");
        const bootedScheme =
          storedScheme === "light" || storedScheme === "dark" ? storedScheme : colorScheme;
        let bootedParams = themeParams;
        try {
          const storedParams = stored?.get("tgWebAppThemeParams");
          if (storedParams) {
            bootedParams = JSON.parse(storedParams);
          }
        } catch {
          // Fall back to the launch params.
        }
        const calls: string[] = [];
        const handlers: Record<string, () => void> = {};
        const webApp = {
          platform,
          version,
          initData,
          colorScheme: bootedScheme,
          themeParams: { ...bootedParams },
          isExpanded: false,
          ready: () => calls.push("ready"),
          expand: () => {
            webApp.isExpanded = true;
            calls.push("expand");
          },
          setHeaderColor: (color: string) => calls.push(`setHeaderColor:${color}`),
          setBackgroundColor: (color: string) => calls.push(`setBackgroundColor:${color}`),
          setBottomBarColor: (color: string) => calls.push(`setBottomBarColor:${color}`),
          isVersionAtLeast: (required: string) =>
            Number(version.split(".")[0]) * 100 + Number(version.split(".")[1] ?? 0) >=
            Number(required.split(".")[0]) * 100 + Number(required.split(".")[1] ?? 0),
          onEvent: (event: string, handler: () => void) => {
            handlers[event] = handler;
          },
        };
        Object.defineProperty(window, "Telegram", { value: { WebApp: webApp } });
        Object.defineProperty(window, "__tgCalls", { value: calls });
        Object.defineProperty(window, "__tgSetScheme", {
          value: (next: "light" | "dark", nextParams: Record<string, string> = themeParams) => {
            webApp.colorScheme = next;
            webApp.themeParams = { ...nextParams };
            handlers["themeChanged"]?.();
          },
        });
      },
      { colorScheme, platform, version, initData, themeParams },
    );
  }

  const fragment = new URLSearchParams({
    tgWebAppData: initData,
    tgWebAppVersion: version,
    tgWebAppPlatform: platform,
    tgWebAppColorScheme: colorScheme,
    tgWebAppThemeParams: JSON.stringify(themeParams),
  });
  await page.goto(`/#${fragment}`);

  const applyThemeParams = (params: Record<string, string>) =>
    page.addStyleTag({
      content: `:root { ${toCssVariables(params)
        .map((declaration) => `${declaration} !important`)
        .join("; ")} }`,
    });

  return { applyThemeParams };
};

test("bootstrap inside Telegram calls ready/expand and marks <html> with telegram", async ({
  page,
}) => {
  await mockTelegram(page, { colorScheme: "dark" });

  await expect(page.locator("html")).toHaveClass(/telegram/u);
  const calls = await page.evaluate(() => (window as never as { __tgCalls: string[] }).__tgCalls);
  expect(calls).toContain("ready");
  expect(calls).toContain("expand");
});

test("browser without a Telegram launch keeps the regular appearance", async ({ page }) => {
  await page.route("https://telegram.org/js/telegram-web-app.js*", (route) => route.abort());
  await page.goto("/");

  await expect(page.locator("html")).not.toHaveClass(/telegram/u);
  await expect(page.locator("[data-theme-toggle]")).toBeVisible();
});

test("inside Telegram, client dark palette is forced and the theme toggle is hidden", async ({
  page,
}) => {
  await mockTelegram(page, { colorScheme: "dark" });

  await expect(page.locator("html")).toHaveClass(/dark/u);
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 33, 43)");
  await expect(page.locator("[data-theme-toggle]")).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("reader-theme"))).toBeNull();
});

test("inside Telegram, client light palette is forced", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" }); // system pref must be ignored
  await mockTelegram(page, { colorScheme: "light" });

  await expect(page.locator("html")).not.toHaveClass(/dark/u);
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("[data-theme-toggle]")).toBeHidden();
});

test("Telegram launch with the SDK unreachable still forces client colors", async ({ page }) => {
  // No window.Telegram mock is installed and the SDK request is aborted.
  await mockTelegram(page, { colorScheme: "dark", installMock: false });

  // Entry is the fragment, so the palette is forced before the SDK could load.
  await expect(page.locator("html")).toHaveClass(/telegram/u);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 33, 43)");
  await expect(page.locator("[data-theme-toggle]")).toBeHidden();
});

test("themeChanged re-applies the client scheme without a reload", async ({ page }) => {
  const { applyThemeParams } = await mockTelegram(page, { colorScheme: "dark" });

  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 33, 43)");
  await applyThemeParams(lightThemeParams);
  await page.evaluate(() =>
    (window as never as { __tgSetScheme: (s: "light" | "dark") => void }).__tgSetScheme("light"),
  );

  await expect(page.locator("html")).not.toHaveClass(/dark/u);
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("client palette follows the client across in-app page navigations", async ({ page }) => {
  await mockTelegram(page, { colorScheme: "dark" });

  await expect(page.locator("html")).toHaveClass(/telegram/u);
  await page.getByRole("link", { name: "文章" }).click();
  await page.waitForURL("**/posts/**");

  // The fragment is gone after navigation; the client mode must survive it.
  await expect(page.locator("html")).toHaveClass(/telegram/u);
  await expect(page.locator("html")).toHaveClass(/dark/u);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 33, 43)");
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "dark");
  await expect(page.locator("[data-theme-toggle]")).toBeHidden();
  const calls = await page.evaluate(() => (window as never as { __tgCalls: string[] }).__tgCalls);
  expect(calls).toContain("ready");
  expect(calls).toContain("expand");
});

test("a theme change persists across in-app page navigations", async ({ page }) => {
  await mockTelegram(page, { colorScheme: "dark" });
  await page.evaluate(
    (params) =>
      (
        window as never as {
          __tgSetScheme: (s: "light" | "dark", p: Record<string, string>) => void;
        }
      ).__tgSetScheme("light", params),
    lightThemeParams,
  );

  await page.getByRole("link", { name: "文章" }).click();
  await page.waitForURL("**/posts/**");

  await expect(page.locator("html")).not.toHaveClass(/dark/u);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("chrome colors use Telegram keywords, bottom bar gated on Bot API 7.10", async ({ page }) => {
  await mockTelegram(page, { colorScheme: "dark", version: "8.0" });

  const calls = await page.evaluate(() => (window as never as { __tgCalls: string[] }).__tgCalls);
  expect(calls).toContain("setHeaderColor:bg_color");
  expect(calls).toContain("setBackgroundColor:bg_color");
  expect(calls).toContain("setBottomBarColor:bottom_bar_bg_color");
});

test("older clients skip the bottom bar call without errors", async ({ page }) => {
  await mockTelegram(page, { colorScheme: "light", version: "6.9" });

  const calls = await page.evaluate(() => (window as never as { __tgCalls: string[] }).__tgCalls);
  expect(calls).toContain("setHeaderColor:bg_color");
  expect(calls).toContain("setBackgroundColor:bg_color");
  expect(calls.some((call) => call.startsWith("setBottomBarColor"))).toBe(false);
});
