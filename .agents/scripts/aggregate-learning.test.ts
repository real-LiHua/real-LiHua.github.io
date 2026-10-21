import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import test from "node:test";
import { aggregateLearning, formatAggregateReport } from "./aggregate-learning";

test("aggregates month sessions in path order, counting section entries and tags per session", async () => {
  const temporaryDirectory = await mkdtemp(join(os.tmpdir(), "learning-aggregate-"));
  try {
    await mkdir(join(temporaryDirectory, "nested"));
    await writeFile(
      join(temporaryDirectory, "z-session.md"),
      [
        "# Session Z",
        "",
        "## Pitfalls",
        "",
        "| Problem | Fix |",
        "| --- | --- |",
        "| Cache stale | Clear cache |",
        "```md",
        "- Example only",
        "```",
        "",
        "## Decisions",
        "",
        "- Keep the cache local",
        "- Use Markdown",
        "",
        "## Patterns",
        "",
        "- Test pure functions",
        "",
        "## Tags",
        "```text",
        "#astro #build",
        "```",
        "```md",
        "#ignored",
        "```",
      ].join("\n"),
    );
    await writeFile(
      join(temporaryDirectory, "nested", "a-session.md"),
      "# Session A\n\nReusable pattern #astro\n",
    );
    await writeFile(join(temporaryDirectory, "ignored.txt"), "# Not a session #noise");

    const aggregate = aggregateLearning("2026-10", temporaryDirectory);

    assert.deepEqual(
      aggregate.sessions.map(({ title }) => title),
      ["Session A", "Session Z"],
    );
    assert.deepEqual(Object.fromEntries(aggregate.tagCounts), { astro: 2, build: 1 });
    assert.deepEqual(aggregate.sectionCounts, { pitfalls: 1, decisions: 2, patterns: 1 });
    assert.equal(aggregate.sessions.length, 2);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("returns a valid empty aggregate when the month has no session directory", () => {
  const aggregate = aggregateLearning("2026-09", "/path/that/does/not/exist");

  assert.equal(aggregate.sessions.length, 0);
  assert.deepEqual(aggregate.sectionCounts, { pitfalls: 0, decisions: 0, patterns: 0 });
  assert.match(formatAggregateReport(aggregate), /No session records found/u);
});

test("rejects invalid calendar months", () => {
  assert.throws(() => aggregateLearning("2026-13", "/unused"), /Expected YYYY-MM/u);
  assert.throws(() => aggregateLearning("2026-00", "/unused"), /Expected YYYY-MM/u);
  assert.throws(() => aggregateLearning("October 2026", "/unused"), /Expected YYYY-MM/u);
});

test("report ranks tags by frequency then name and includes manual review guidance", () => {
  const aggregate = aggregateLearning("2026-10", "/path/that/does/not/exist");
  aggregate.tagCounts.set("zeta", 1);
  aggregate.tagCounts.set("alpha", 2);

  const report = formatAggregateReport(aggregate);

  assert.ok(report.indexOf("`#alpha`: 2") < report.indexOf("`#zeta`: 1"));
  assert.match(report, /Review this report before promoting/u);
});
