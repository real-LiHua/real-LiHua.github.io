import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveMapleFontPath } from "../../src/lib/og-font";

const noopListDirectory = () => [];

describe("resolveMapleFontPath", () => {
  it("uses MAPLE_FONT_PATH when it points to a file", () => {
    assert.equal(
      resolveMapleFontPath({
        env: { MAPLE_FONT_PATH: "/fonts/custom/Maple.ttf" },
        exists: (path) => path === "/fonts/custom/Maple.ttf",
        root: "/project",
        home: "/home/reader",
      }),
      "/fonts/custom/Maple.ttf",
    );
  });

  it("reports a missing MAPLE_FONT_PATH instead of silently ignoring it", () => {
    assert.throws(
      () =>
        resolveMapleFontPath({
          env: { MAPLE_FONT_PATH: "/fonts/missing.ttf" },
          exists: () => false,
          root: "/project",
          home: "/home/reader",
        }),
      /MAPLE_FONT_PATH.*\/fonts\/missing\.ttf/u,
    );
  });

  it("prefers the verified CI font cached in .cache/maple-font/input", () => {
    assert.equal(
      resolveMapleFontPath({
        env: {},
        root: "/project",
        home: "/home/reader",
        listDirectory: (directory) =>
          directory === "/project/.cache/maple-font/input"
            ? ["MapleMonoNormal-NF-CN-Bold.ttf", "MapleMonoNormal-NF-CN-Regular.ttf"]
            : [],
      }),
      "/project/.cache/maple-font/input/MapleMonoNormal-NF-CN-Regular.ttf",
    );
  });

  it("falls back to the installed system font", () => {
    assert.equal(
      resolveMapleFontPath({
        env: {},
        root: "/project",
        home: "/home/reader",
        listDirectory: (directory) =>
          directory === "/usr/share/fonts/maple" ? ["MapleMonoNormal-NF-CN-Regular.ttf"] : [],
      }),
      "/usr/share/fonts/maple/MapleMonoNormal-NF-CN-Regular.ttf",
    );
  });

  it("explains how to provide the font when none is installed", () => {
    assert.throws(
      () =>
        resolveMapleFontPath({
          env: {},
          root: "/project",
          home: "/home/reader",
          listDirectory: noopListDirectory,
        }),
      /MAPLE_FONT_PATH/u,
    );
  });
});
