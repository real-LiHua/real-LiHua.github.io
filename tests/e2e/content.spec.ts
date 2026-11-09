import { expect, test } from "@playwright/test";
import { FRONTMATTER_LIMITS, postFrontmatterSchema } from "../../src/modules/types";

test.describe("content", () => {
  test("enforces frontmatter length and collection limits", () => {
    const validAtLimits = {
      title: "t".repeat(FRONTMATTER_LIMITS.title),
      description: "d".repeat(FRONTMATTER_LIMITS.description),
      image: "i".repeat(FRONTMATTER_LIMITS.image),
      tags: Array.from({ length: FRONTMATTER_LIMITS.tags }, () =>
        "t".repeat(FRONTMATTER_LIMITS.tag),
      ),
      authors: Array.from({ length: FRONTMATTER_LIMITS.authors }, () =>
        "a".repeat(FRONTMATTER_LIMITS.author),
      ),
      telegramAuth: {
        enabled: true,
        groupId: "g".repeat(FRONTMATTER_LIMITS.groupId),
        groupName: "n".repeat(FRONTMATTER_LIMITS.groupName),
        customMessage: "m".repeat(FRONTMATTER_LIMITS.customMessage),
      },
    };

    const invalidFrontmatter = [
      { ...validAtLimits, title: `${validAtLimits.title}t` },
      { ...validAtLimits, description: `${validAtLimits.description}d` },
      { ...validAtLimits, image: `${validAtLimits.image}i` },
      { ...validAtLimits, tags: ["t".repeat(FRONTMATTER_LIMITS.tag + 1)] },
      { ...validAtLimits, tags: [...validAtLimits.tags, "overflow"] },
      { ...validAtLimits, authors: ["a".repeat(FRONTMATTER_LIMITS.author + 1)] },
      { ...validAtLimits, authors: [...validAtLimits.authors, "overflow"] },
      {
        ...validAtLimits,
        telegramAuth: {
          ...validAtLimits.telegramAuth,
          groupId: `${validAtLimits.telegramAuth.groupId}g`,
        },
      },
      {
        ...validAtLimits,
        telegramAuth: {
          ...validAtLimits.telegramAuth,
          groupName: `${validAtLimits.telegramAuth.groupName}n`,
        },
      },
      {
        ...validAtLimits,
        telegramAuth: {
          ...validAtLimits.telegramAuth,
          customMessage: `${validAtLimits.telegramAuth.customMessage}m`,
        },
      },
    ];

    expect(postFrontmatterSchema.safeParse(validAtLimits).success).toBe(true);
    for (const frontmatter of invalidFrontmatter) {
      expect(postFrontmatterSchema.safeParse(frontmatter).success).toBe(false);
    }
  });

  test("renders a post with headings and code", async ({ page }) => {
    await page.goto("/posts/hello-world/");

    await expect(page.getByRole("heading", { level: 1, name: "Hello, World" })).toBeVisible();
    await expect(page.locator("article pre code")).toContainText("Hello");
  });

  test("renders the table of contents for a post with headings", async ({ page }) => {
    await page.goto("/posts/hello-world/");
    await expect(page.locator("[data-toc-link]").first()).toBeVisible();
  });

  test("emits page-specific JSON-LD alongside the primary schema", async ({ page }) => {
    await page.goto("/about/");
    const aboutSchemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(aboutSchemas.map((schema) => JSON.parse(schema))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ "@type": "WebSite" }),
        expect.objectContaining({ "@type": "Person", name: "李华" }),
      ]),
    );

    await page.goto("/posts/hello-world/");
    const postSchemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(postSchemas.map((schema) => JSON.parse(schema))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ "@type": "BlogPosting" }),
        expect.objectContaining({ "@type": "BreadcrumbList" }),
      ]),
    );
  });

  test("uses the default share image when a post has no custom image", async ({
    page,
    request,
  }) => {
    await page.goto("/posts/hello-world/");
    const imageUrl = "https://real-lihua.github.io/og-default.png";
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", imageUrl);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      "LiHua.dev：记录、文章与技术实验",
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", imageUrl);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    const imageResponse = await request.get("/og-default.png");
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()["content-type"]).toContain("image/png");
  });

  test("marks external links with target, rel and an external class", async ({ page }) => {
    await page.goto("/posts/hello-world/");

    const link = page.locator('article a[href="https://docs.astro.build"]');
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveClass(/\bexternal\b/u);
  });

  test("serves a valid RSS feed", async ({ request }) => {
    const response = await request.get("/rss.xml");
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).toContain("<rss");
    expect(xml).toContain("<item>");
  });

  test("excludes protected posts from the sitemap", async ({ request }) => {
    const response = await request.get("/sitemap-0.xml");
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).toContain("https://real-lihua.github.io/posts/hello-world/");
    expect(xml).not.toContain("https://real-lihua.github.io/posts/protected-example/");
  });

  test("draft posts are excluded from the archive", async ({ page }) => {
    await page.goto("/posts/");
    await expect(page.getByText("草稿示例")).toHaveCount(0);
  });
});
