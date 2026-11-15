import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGitLogDates } from "../../src/lib/git-times";

describe("parseGitLogDates", () => {
  it("treats the newest commit as modified and the oldest as created", () => {
    const times = parseGitLogDates("2026-11-12T10:39:24+08:00\n2026-11-09T22:47:14+08:00\n");

    assert.equal(times?.updatedAt.toISOString(), "2026-11-12T02:39:24.000Z");
    assert.equal(times?.createdAt.toISOString(), "2026-11-09T14:47:14.000Z");
  });

  it("ignores blank lines and invalid dates", () => {
    const times = parseGitLogDates("\nnot-a-date\n2026-11-12T10:39:24+08:00\n\n");

    assert.equal(times?.createdAt.toISOString(), "2026-11-12T02:39:24.000Z");
    assert.equal(times?.updatedAt.toISOString(), "2026-11-12T02:39:24.000Z");
  });

  it("returns null when the log has no usable dates", () => {
    assert.equal(parseGitLogDates(""), null);
    assert.equal(parseGitLogDates("not-a-date\n"), null);
  });
});
