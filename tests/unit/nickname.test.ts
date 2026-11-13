import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nicknameOf, parseLaunchUser } from "../../src/lib/nickname";

describe("nicknameOf", () => {
  it("joins first and last name with a single space", () => {
    assert.equal(nicknameOf({ first_name: "Ada", last_name: "Lovelace" }), "Ada Lovelace");
  });

  it("trims stray whitespace and collapses nothing else", () => {
    assert.equal(nicknameOf({ first_name: "  张  ", last_name: "  三  " }), "张 三");
  });

  it("uses just the first or just the last name when only one exists", () => {
    assert.equal(nicknameOf({ first_name: "Ada" }), "Ada");
    assert.equal(nicknameOf({ last_name: "Lovelace" }), "Lovelace");
  });

  it("falls back to @username when both name parts are missing", () => {
    assert.equal(nicknameOf({ username: "ada" }), "@ada");
    assert.equal(nicknameOf({ first_name: "  ", last_name: " ", username: "ada" }), "@ada");
  });

  it("returns the unknown-user placeholder when nothing is available", () => {
    assert.equal(nicknameOf(undefined), "未知用户");
    assert.equal(nicknameOf(null), "未知用户");
    assert.equal(nicknameOf({}), "未知用户");
    assert.equal(nicknameOf({ first_name: "", last_name: "", username: "" }), "未知用户");
  });

  it("keeps markup in the nickname verbatim (escapes nothing, interprets nothing)", () => {
    const payload = "<img src=x onerror=alert(1)>";
    assert.equal(nicknameOf({ first_name: payload }), payload);
  });
});

describe("parseLaunchUser", () => {
  it("parses the percent-encoded user object from the launch payload", () => {
    const initData = new URLSearchParams({
      user: JSON.stringify({ id: 123, first_name: "Ada", last_name: "Lovelace" }),
      auth_date: "1700000000",
      hash: "abc",
    }).toString();
    assert.deepEqual(parseLaunchUser(initData), {
      id: 123,
      first_name: "Ada",
      last_name: "Lovelace",
    });
  });

  it("returns null when the payload is missing, empty, or has no user key", () => {
    assert.equal(parseLaunchUser(""), null);
    assert.equal(parseLaunchUser("auth_date=1700000000&hash=abc"), null);
  });

  it("returns null for malformed user JSON instead of throwing", () => {
    assert.equal(parseLaunchUser("user=%7Bnot-json&hash=abc"), null);
    assert.equal(parseLaunchUser("user=null&hash=abc"), null);
    assert.equal(parseLaunchUser("user=42&hash=abc"), null);
  });

  it("preserves markup inside names verbatim", () => {
    const initData = new URLSearchParams({
      user: JSON.stringify({ id: 1, first_name: "<b>bold</b>" }),
    }).toString();
    assert.deepEqual(parseLaunchUser(initData), { id: 1, first_name: "<b>bold</b>" });
  });
});
