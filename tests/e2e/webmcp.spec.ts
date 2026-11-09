import { expect, test } from "@playwright/test";
import { buildSearchIndex } from "../../src/lib/search";

interface TestTool {
  name: string;
  execute: (
    input?: { query?: string; collection?: string; limit?: number; slug?: string },
    context?: { signal?: AbortSignal },
  ) => Promise<{ content: { text: string }[] } | null>;
}

declare global {
  interface Window {
    __webmcpTools?: TestTool[];
    __webmcpConfirmations?: string[];
  }
}

test("WebMCP manifest contains only public post routes", async ({ request }) => {
  const response = await request.get("/_webmcp/manifest.json");
  expect(response.ok()).toBe(true);

  const manifest = (await response.json()) as {
    collections: { name: string; count: number }[];
    entries: { slug: string; url: string; collection?: string; title: string }[];
  };
  expect(manifest.collections).toContainEqual({ name: "posts", count: expect.any(Number) });
  expect(manifest.entries.some((entry) => entry.slug === "posts/first-reading")).toBe(true);
  expect(manifest.entries.every((entry) => entry.collection === "posts")).toBe(true);
  expect(manifest.entries.some((entry) => entry.slug === "/")).toBe(false);
  expect(manifest.entries.every((entry) => /^\/posts\/[^/]+\/$/u.test(entry.url))).toBe(true);
  expect(manifest.entries.some((entry) => entry.url === "/posts/")).toBe(false);
  expect(manifest.entries.some((entry) => entry.url.startsWith("/posts/years/"))).toBe(false);
  expect(manifest.collections.find((collection) => collection.name === "posts")?.count).toBe(
    manifest.entries.length,
  );
});

test("WebMCP registers search, section, navigation, and page-info tools when supported", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__webmcpTools", { value: [] as TestTool[] });
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool: (tool: TestTool) => {
          window.__webmcpTools?.push(tool);
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto("/posts/first-reading/");

  await page.waitForFunction(() => window.__webmcpTools?.length === 4);
  const names = await page.evaluate(() => window.__webmcpTools?.map((tool) => tool.name));
  expect(names).toEqual(["search_content", "list_sections", "go_to", "get_page_info"]);

  const sections = await page.evaluate(async () => {
    const tools = window.__webmcpTools ?? [];
    const tool = tools.find((item) => item.name === "list_sections");
    const result = await tool?.execute({});
    return result?.content[0]?.text ?? "";
  });
  expect(sections).toContain('"name":"posts"');

  const searchResults = await page.evaluate(async () => {
    const tool = window.__webmcpTools?.find((item) => item.name === "search_content");
    const result = await tool?.execute({ query: "把阅读留给一页纸", collection: "posts" });
    return result?.content[0]?.text ?? "";
  });
  expect(searchResults).toContain("把阅读留给一页纸");
  expect(searchResults).toContain("/posts/first-reading/");

  const bodySearchResults = await page.evaluate(async () => {
    const tool = window.__webmcpTools?.find((item) => item.name === "search_content");
    const result = await tool?.execute({ query: "舒适的行宽", collection: "posts" });
    return result?.content[0]?.text ?? "";
  });
  expect(bodySearchResults).toContain("把阅读留给一页纸");
  expect(bodySearchResults).toContain("/posts/first-reading/");
});

test("WebMCP navigation stays inside the public manifest and asks for confirmation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__webmcpTools", { value: [] as TestTool[] });
    Object.defineProperty(window, "__webmcpConfirmations", { value: [] as string[] });
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool: (tool: TestTool) => {
          window.__webmcpTools?.push(tool);
          return Promise.resolve();
        },
        requestUserInteraction: (options: { message: string }) => {
          window.__webmcpConfirmations?.push(options.message);
          return Promise.resolve(false);
        },
      },
    });
  });
  await page.goto("/posts/first-reading/");
  await page.waitForFunction(() => window.__webmcpTools?.length === 4);

  const cancelled = await page.evaluate(async () => {
    const tool = window.__webmcpTools?.find((item) => item.name === "go_to");
    const result = await tool?.execute({ slug: "posts/first-reading" });
    return result?.content[0]?.text ?? "";
  });
  expect(cancelled).toContain('"cancelled":true');
  expect(await page.evaluate(() => window.__webmcpConfirmations)).toEqual([
    expect.stringContaining("/posts/first-reading/"),
  ]);
  expect(new URL(page.url()).pathname).toBe("/posts/first-reading/");

  const missing = await page.evaluate(async () => {
    const tool = window.__webmcpTools?.find((item) => item.name === "go_to");
    const result = await tool?.execute({ slug: "posts/not-public" });
    return result?.content[0]?.text ?? "";
  });
  expect(missing).toContain("Page not found");
  expect(new URL(page.url()).pathname).toBe("/posts/first-reading/");
});

test("WebMCP page info describes the current public post", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__webmcpTools", { value: [] as TestTool[] });
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool: (tool: TestTool) => {
          window.__webmcpTools?.push(tool);
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto("/posts/first-reading/");
  await page.waitForFunction(() => window.__webmcpTools?.length === 4);

  const info = await page.evaluate(async () => {
    const tool = window.__webmcpTools?.find((item) => item.name === "get_page_info");
    const result = await tool?.execute({});
    return result?.content[0]?.text ?? "";
  });
  expect(info).toContain("把阅读留给一页纸");
  expect(info).toContain('"url":"/posts/first-reading/"');
  expect(info).toContain('"lang":"zh-CN"');
});

test("WebMCP search answers from the Orama index instead of the manifest", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__webmcpTools", { value: [] as TestTool[] });
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool: (tool: TestTool) => {
          window.__webmcpTools?.push(tool);
          return Promise.resolve();
        },
      },
    });
  });

  const index = buildSearchIndex([
    {
      id: "orama-only",
      body: "这段正文只存在于合成索引中，包含独特标记词汇。",
      data: {
        title: "合成索引条目",
        description: "供 WebMCP 测试使用的条目。",
        isPreview: false,
        topics: [{ name: "测试" }],
      },
    },
  ]);
  await page.route("**/search-index.json", (route) => route.fulfill({ json: index }));
  await page.goto("/posts/first-reading/");
  await page.waitForFunction(() => window.__webmcpTools?.length === 4);

  const result = await page.evaluate(async () => {
    const tool = window.__webmcpTools?.find((item) => item.name === "search_content");
    const response = await tool?.execute({ query: "独特标记词汇" });
    return response?.content[0]?.text ?? "";
  });
  expect(result).toContain("合成索引条目");
  expect(result).toContain("/posts/orama-only/");
});

test("WebMCP enhancement leaves ordinary pages usable without its browser API", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/posts/");
  await expect(page.getByRole("heading", { name: "文章", exact: true })).toBeVisible();
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("button", { name: "搜索" })
    .click();
  await expect(page.getByRole("dialog", { name: "站内查找" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
