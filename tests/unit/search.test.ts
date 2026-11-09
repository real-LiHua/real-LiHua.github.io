import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { load, search } from "@orama/orama";
import {
  buildSearchIndex,
  createSearchDatabase,
  stripMarkdownForSearch,
  type SearchablePost,
} from "../../src/lib/search";
import { searchProperties } from "../../src/lib/search-config";

const posts: SearchablePost[] = [
  {
    id: "first-reading",
    body: "## 阅读界面\n\n阅读界面尽量保持安静：**舒适的行宽**，以及不会打断正文的导航。",
    data: {
      title: "把阅读留给一页纸",
      description: "一个用于展示文章列表与阅读版式的示例条目。",
      isPreview: false,
      topics: [{ name: "阅读" }],
    },
  },
  {
    id: "reading-code-samples",
    body: "## 代码示例\n\n```ts\nconst answer = 42;\n```\n\n让代码片段保持易读。",
    data: {
      title: "代码片段的阅读节奏",
      description: "让代码示例保持易读，也让上下文留在读者视线里。",
      isPreview: true,
      topics: [{ name: "技术" }, { name: "写作" }],
    },
  },
  {
    id: "notes-on-making",
    body: "关于慢慢整理的笔记，用来检查常见虚词不会把无关文章带进结果。",
    data: {
      title: "关于慢慢整理的笔记",
      description: "用于展示文章索引与首页摘要的另一条示例内容。",
      isPreview: true,
      topics: [{ name: "写作" }],
    },
  },
];

function createLoadedDatabase() {
  const database = createSearchDatabase();
  load(database, buildSearchIndex(posts));
  return database;
}

describe("stripMarkdownForSearch", () => {
  it("keeps prose and drops markdown syntax, link targets, and comments", () => {
    const text = stripMarkdownForSearch(
      "## 标题\n\n**重点**与[链接](https://example.com)。\n\n![预览图](/preview-image.svg)\n\n<!-- 注释 -->\n\n```ts\nconst answer = 42;\n```",
    );

    assert.match(text, /标题/u);
    assert.match(text, /重点/u);
    assert.match(text, /链接/u);
    assert.match(text, /const answer = 42/u);
    assert.doesNotMatch(text, /example\.com|preview-image\.svg|\*\*|##|```|注释/u);
  });
});

describe("Orama search index", () => {
  it("matches a multi-word Chinese query with the Mandarin tokenizer", async () => {
    const database = createLoadedDatabase();
    const results = await search(database, {
      term: "舒适的行宽",
      properties: [...searchProperties],
      tolerance: 0,
    });

    assert.equal(results.hits[0]?.document.url, "/posts/first-reading/");
    assert.equal(results.hits[0]?.document.isPreview, false);
  });

  it("carries the preview state needed to label results", async () => {
    const database = createLoadedDatabase();
    const results = await search(database, {
      term: "代码片段",
      properties: [...searchProperties],
      tolerance: 0,
    });

    assert.equal(results.hits[0]?.document.url, "/posts/reading-code-samples/");
    assert.equal(results.hits[0]?.document.isPreview, true);
  });

  it("does not match a query that only shares a common particle", async () => {
    const database = createLoadedDatabase();
    const results = await search(database, {
      term: "舒适的行宽",
      properties: [...searchProperties],
      tolerance: 0,
    });

    assert.equal(results.count, 1);
  });

  it("matches a query made only of a stop word", async () => {
    const database = createLoadedDatabase();
    const results = await search(database, {
      term: "一",
      properties: [...searchProperties],
      tolerance: 0,
    });

    assert.ok(results.count > 0);
    assert.ok(results.hits.some((hit) => hit.document.url === "/posts/first-reading/"));
  });
});
