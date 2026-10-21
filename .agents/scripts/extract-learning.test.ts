import assert from "node:assert/strict";
import test from "node:test";
import { extractLearningFromContent, formatLearningReport } from "./extract-learning";

test("extracts supported tags, optional JSON attributes, and source line numbers", () => {
  const entries = extractLearningFromContent(
    [
      "const value = 1;",
      '// @learning:pitfall { "impact": "high", "tags": ["astro"] } retainBody can exhaust memory',
      '/* @learning:decision { "adr": "0005" } Keep tokens in CSS variables */',
      " * @learning:pattern Navbar slots avoid boolean prop growth",
    ].join("\n"),
    "src/example.ts",
  );

  assert.deepEqual(entries, [
    {
      file: "src/example.ts",
      line: 2,
      tag: "pitfall",
      attributes: { impact: "high", tags: ["astro"] },
      text: "retainBody can exhaust memory",
    },
    {
      file: "src/example.ts",
      line: 3,
      tag: "decision",
      attributes: { adr: "0005" },
      text: "Keep tokens in CSS variables",
    },
    {
      file: "src/example.ts",
      line: 4,
      tag: "pattern",
      attributes: {},
      text: "Navbar slots avoid boolean prop growth",
    },
  ]);
});

test("ignores marker-like text outside source comments", () => {
  const entries = extractLearningFromContent(
    [
      'const marker = "// @learning:pitfall this is a string";',
      "const text = `@learning:decision not a comment`;",
      "// regular comment",
    ].join("\n"),
    "src/example.ts",
  );

  assert.deepEqual(entries, []);
});

test("reports malformed JSON and unsupported tags with source locations", () => {
  assert.throws(
    () => extractLearningFromContent("// @learning:pitfall { invalid } note", "src/a.ts"),
    /src\/a\.ts:1: invalid JSON/u,
  );
  assert.throws(
    () => extractLearningFromContent("// @learning:unknown note", "src/a.ts"),
    /src\/a\.ts:1: unsupported @learning tag/u,
  );
});

test("formats extracted entries grouped by tag", () => {
  const report = formatLearningReport([
    {
      file: "src/example.ts",
      line: 3,
      tag: "pattern",
      attributes: {},
      text: "Compose with slots",
    },
  ]);

  assert.match(report, /提取条目：1/u);
  assert.match(report, /## pattern[\s\S]*src\/example\.ts:3/u);
});
