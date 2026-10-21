import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildLearningIndex, parseLearningSession, rebuildLearningIndex } from "./learning-index";

test("parses session metadata and unique sorted tags while ignoring code examples", () => {
  const entry = parseLearningSession(
    [
      "# Session Learning: Task 3.4",
      "- **Task ID:** 3.4",
      "- **Date:** 2026-10-07",
      "- **Assignee:** frontend-architect",
      "## 标签",
      "```text",
      "#theme #astro #theme",
      "```",
      "```text",
      "#ignored",
      "```",
    ].join("\n"),
    "sessions/2026-10/session-3.4.md",
  );

  assert.deepEqual(entry, {
    id: "sessions/2026-10/session-3.4",
    path: "sessions/2026-10/session-3.4.md",
    title: "Session Learning: Task 3.4",
    task: "3.4",
    date: "2026-10-07",
    tags: ["astro", "theme"],
    assignee: "frontend-architect",
  });
});

test("rebuilds a deterministic index of recursive Markdown sessions", async () => {
  const learningRoot = await mkdtemp(join(os.tmpdir(), "learning-index-"));
  try {
    const sessions = join(learningRoot, "sessions");
    await mkdir(join(sessions, "2026-10"), { recursive: true });
    await mkdir(join(sessions, "2026-09"), { recursive: true });
    await writeFile(join(sessions, "2026-10", "b.md"), "# Second\nTags: #zeta\n");
    await writeFile(join(sessions, "2026-09", "a.md"), "# First\nTags: #alpha\n");
    await writeFile(join(sessions, "2026-10", "ignored.txt"), "# ignored");

    const built = buildLearningIndex(learningRoot);
    assert.deepEqual(
      built.entries.map(({ id }) => id),
      ["sessions/2026-09/a", "sessions/2026-10/b"],
    );
    assert.deepEqual(rebuildLearningIndex(learningRoot).index, built);
    const serialized = await readFile(join(learningRoot, "index.json"), "utf8");
    assert.deepEqual(JSON.parse(serialized), built);
  } finally {
    await rm(learningRoot, { recursive: true, force: true });
  }
});

test("does not rewrite an unchanged index", async () => {
  const learningRoot = await mkdtemp(join(os.tmpdir(), "learning-index-"));
  try {
    await mkdir(join(learningRoot, "sessions"));
    await writeFile(join(learningRoot, "sessions", "session.md"), "# Session\n");

    const first = rebuildLearningIndex(learningRoot);
    const before = await stat(first.path);
    const second = rebuildLearningIndex(learningRoot);
    const after = await stat(second.path);

    assert.equal(first.changed, true);
    assert.equal(second.changed, false);
    assert.equal(after.mtimeMs, before.mtimeMs);
  } finally {
    await rm(learningRoot, { recursive: true, force: true });
  }
});

test("creates an empty index when no session directory exists", async () => {
  const learningRoot = await mkdtemp(join(os.tmpdir(), "learning-index-"));
  try {
    const result = rebuildLearningIndex(learningRoot);
    assert.deepEqual(result.index, { schemaVersion: 1, entries: [] });
    assert.equal(result.changed, true);
  } finally {
    await rm(learningRoot, { recursive: true, force: true });
  }
});
