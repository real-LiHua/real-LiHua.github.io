import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertUniqueSeriesPositions } from "../../src/lib/content-validation";

describe("assertUniqueSeriesPositions", () => {
  it("allows entries without a series and distinct positions", () => {
    assert.doesNotThrow(() =>
      assertUniqueSeriesPositions([
        { id: "standalone", data: {} },
        { id: "one", data: { series: { id: "notes", title: "Notes", order: 1 } } },
        { id: "two", data: { series: { id: "notes", title: "Notes", order: 2 } } },
        { id: "other", data: { series: { id: "other", title: "Other", order: 1 } } },
      ]),
    );
  });

  it("rejects duplicate positions in the same series with both entry IDs", () => {
    assert.throws(
      () =>
        assertUniqueSeriesPositions([
          { id: "first-entry", data: { series: { id: "notes", title: "Notes", order: 1 } } },
          { id: "second-entry", data: { series: { id: "notes", title: "Notes", order: 1 } } },
        ]),
      /notes.*1.*first-entry.*second-entry/u,
    );
  });
});
