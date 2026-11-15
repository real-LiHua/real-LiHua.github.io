import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildArticleMetadata } from "../../src/lib/article-metadata";

const publishedAt = new Date("2026-11-04T00:00:00.000Z");

describe("buildArticleMetadata", () => {
  it("maps the series title to section and topic names to tags", () => {
    const metadata = buildArticleMetadata(
      {
        publishedAt,
        topics: [{ name: "技术" }, { name: "写作" }],
        series: { title: "安静阅读笔记" },
      },
      { author: "李华" },
    );

    assert.equal(metadata.author, "李华");
    assert.equal(metadata.section, "安静阅读笔记");
    assert.deepEqual(metadata.tags, ["技术", "写作"]);
  });

  it("omits section when the post has no series", () => {
    const metadata = buildArticleMetadata({ publishedAt, topics: [{ name: "阅读" }] });

    assert.equal(metadata.section, undefined);
    assert.deepEqual(metadata.tags, ["阅读"]);
  });

  it("uses the resolved modification time and falls back to the publication time", () => {
    const createdAt = new Date("2026-11-09T22:47:14.000Z");
    const updatedAt = new Date("2026-11-12T10:39:24.000Z");

    assert.deepEqual(buildArticleMetadata({ publishedAt: createdAt, updatedAt, topics: [] }), {
      publishedTime: createdAt,
      modifiedTime: updatedAt,
      tags: [],
    });

    assert.deepEqual(buildArticleMetadata({ publishedAt, topics: [] }), {
      publishedTime: publishedAt,
      modifiedTime: publishedAt,
      tags: [],
    });
  });

  it("drops a blank author and blank topic names", () => {
    const metadata = buildArticleMetadata(
      { publishedAt, topics: [{ name: "  " }, { name: " 阅读 " }] },
      { author: "   " },
    );

    assert.equal(metadata.author, undefined);
    assert.deepEqual(metadata.tags, ["阅读"]);
  });
});
