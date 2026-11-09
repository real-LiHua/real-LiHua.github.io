import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRssItems } from "../../src/lib/rss-items";

describe("createRssItems", () => {
  it("orders published entries and excludes preview entries", () => {
    const items = createRssItems(
      [
        {
          id: "older",
          data: {
            title: "Older article",
            description: "Older description",
            publishedAt: new Date("2026-01-01"),
            isPreview: false,
          },
        },
        {
          id: "sample",
          data: {
            title: "Preview sample",
            description: "Preview description",
            publishedAt: new Date("2026-03-01"),
            isPreview: true,
          },
        },
        {
          id: "newer",
          data: {
            title: "Newer article",
            description: "Newer description",
            publishedAt: new Date("2026-02-01"),
            isPreview: false,
          },
        },
      ],
      new URL("https://example.test/"),
    );

    assert.deepEqual(
      items.map(({ title, link, description, pubDate }) => ({
        title,
        link,
        description,
        pubDate,
      })),
      [
        {
          title: "Newer article",
          link: "https://example.test/posts/newer/",
          description: "Newer description",
          pubDate: new Date("2026-02-01"),
        },
        {
          title: "Older article",
          link: "https://example.test/posts/older/",
          description: "Older description",
          pubDate: new Date("2026-01-01"),
        },
      ],
    );
  });
});
