import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { markdownProcessor } from "../../src/lib/markdown";

let renderMarkdown: (source: string) => Promise<string>;

before(async () => {
  const renderer = await markdownProcessor.createRenderer({});
  renderMarkdown = async (source) => (await renderer.render(source)).code;
});

describe("mermaid diagram rendering", () => {
  it("renders mermaid code blocks as static inline SVG", async () => {
    const html = await renderMarkdown("```mermaid\nflowchart LR\n  A[开始] --> B[结束]\n```");

    assert.match(html, /<div class="mermaid" data-mermaid-ssg="true"/u);
    assert.match(html, /<svg\b/u);
    assert.ok(!html.includes("<pre"), "expected no code block fallback for a valid diagram");
  });

  it("styles diagrams with the site theme variables", async () => {
    const html = await renderMarkdown("```mermaid\nflowchart LR\n  A --> B\n```");

    for (const variable of ["--primary", "--background", "--foreground", "--muted"]) {
      assert.ok(
        html.includes(`var(${variable}`),
        `expected diagram to reference ${variable} so it follows light/dark mode`,
      );
    }
  });

  it("keeps diagram geometry intact for CSS-based scaling", async () => {
    const html = await renderMarkdown("```mermaid\nflowchart LR\n  A --> B\n```");

    assert.match(
      html,
      /<rect[^>]*\swidth="/u,
      "node rects must keep their width/height attributes to stay visible",
    );
    assert.match(html, /<svg[^>]*\sviewBox="/u);
  });

  it("falls back to a code block when a diagram cannot be rendered", async () => {
    const html = await renderMarkdown("```mermaid\n不是一张图的乱码 text\n```");

    assert.match(html, /<pre class="mermaid"/u);
    assert.ok(html.includes("不是一张图的乱码"), "expected the raw source to stay readable");
    assert.ok(!html.includes("data-mermaid-ssg"), "expected no SVG for an invalid diagram");
  });

  it("leaves non-mermaid code blocks untouched", async () => {
    const html = await renderMarkdown("```ts\nconst answer = 42;\n```");

    assert.ok(!html.includes("mermaid"));
    assert.match(html, /<pre\b/u);
  });
});
