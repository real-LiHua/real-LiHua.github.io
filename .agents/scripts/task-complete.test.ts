import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createTaskLearningTemplate, formatLearningTemplate } from "./task-complete";
import type { RoleId } from "./run-gate";

const role: RoleId = "frontend-architect";

test("formats a structured learning template with UTC completion date", () => {
  const template = formatLearningTemplate(
    "1.2",
    "Task 1.2: Improve navigation",
    role,
    new Date("2026-10-01T00:30:00+08:00"),
  );

  assert.match(template, /^# Session Learning: Task 1\.2: Improve navigation/mu);
  assert.match(template, /- \*\*Date:\*\* 2026-09-30/u);
  assert.match(template, /## 遇到的问题 \(Pitfalls\)/u);
  assert.match(template, /## 决策记录 \(Decisions\)/u);
  assert.match(template, /## 可复用模式 \(Patterns\)/u);
  assert.match(template, /## 标签 \(Tags\)/u);
});

test("creates template under UTC month using task card title", async () => {
  const repoRoot = await mkdtemp(join(os.tmpdir(), "task-learning-template-"));
  try {
    const phaseDirectory = join(repoRoot, ".agents", "tasks", "phase-1");
    await mkdir(phaseDirectory, { recursive: true });
    await writeFile(join(phaseDirectory, "1.2-improve-navigation.md"), "# Task 1.2: Navigation\n");

    const result = createTaskLearningTemplate(
      repoRoot,
      "1.2",
      role,
      new Date("2026-10-01T00:30:00+08:00"),
    );
    const content = await readFile(result.path, "utf8");

    assert.equal(result.created, true);
    assert.equal(
      result.path,
      join(repoRoot, ".agents", "learning", "sessions", "2026-09", "session-1.2.md"),
    );
    assert.match(content, /# Session Learning: Task 1\.2: Navigation/u);
    assert.match(content, /- \*\*Assignee:\*\* frontend-architect/u);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("preserves an existing session file on task completion retry", async () => {
  const repoRoot = await mkdtemp(join(os.tmpdir(), "task-learning-template-"));
  try {
    const first = createTaskLearningTemplate(
      repoRoot,
      "2.1",
      role,
      new Date("2026-10-16T12:00:00Z"),
    );
    await writeFile(first.path, "Human-authored learning notes\n");
    const second = createTaskLearningTemplate(
      repoRoot,
      "2.1",
      role,
      new Date("2026-10-17T12:00:00Z"),
    );

    assert.equal(second.created, false);
    assert.equal(await readFile(second.path, "utf8"), "Human-authored learning notes\n");
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("rejects task IDs that could escape the task and learning directories", async () => {
  const repoRoot = await mkdtemp(join(os.tmpdir(), "task-learning-template-"));
  try {
    assert.throws(
      () => createTaskLearningTemplate(repoRoot, "../secret", role, new Date()),
      /Invalid task ID/u,
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});
