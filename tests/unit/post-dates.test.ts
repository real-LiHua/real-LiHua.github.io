import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePostDates } from "../../src/lib/post-dates";

const publishedAt = new Date("2026-11-04T00:00:00.000Z");

describe("resolvePostDates", () => {
  it("uses git creation and modification times when available", () => {
    const createdAt = new Date("2026-11-09T14:47:14.000Z");
    const updatedAt = new Date("2026-11-12T02:39:24.000Z");

    assert.deepEqual(resolvePostDates(publishedAt, { createdAt, updatedAt }), {
      publishedAt: createdAt,
      updatedAt,
    });
  });

  it("falls back to the frontmatter date when git has no history", () => {
    assert.deepEqual(resolvePostDates(publishedAt, null), {
      publishedAt,
      updatedAt: publishedAt,
    });
  });
});
