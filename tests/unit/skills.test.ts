import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadInstalledSkills, summarizeDescription } from "../../src/lib/skills";

describe("summarizeDescription", () => {
  it("keeps a single-sentence description as-is", () => {
    assert.equal(
      summarizeDescription("Review the changes since a fixed point."),
      "Review the changes since a fixed point.",
    );
  });

  it("drops sentences after the first", () => {
    assert.equal(
      summarizeDescription("Build a prototype. Use when the user wants to explore a UI."),
      "Build a prototype.",
    );
  });

  it("collapses whitespace from folded YAML scalars", () => {
    assert.equal(
      summarizeDescription("React composition patterns\n  that scale."),
      "React composition patterns that scale.",
    );
  });

  it("clips long sentences at a word boundary", () => {
    const summary = summarizeDescription(`${"word ".repeat(100)}end.`);

    assert.ok(summary.length <= 201);
    assert.ok(summary.endsWith("…"));
    assert.ok(!summary.includes("  "));
  });
});

describe("loadInstalledSkills", () => {
  const skills = loadInstalledSkills();

  it("includes only skills that are installed locally", () => {
    assert.ok(skills.length > 0);
    for (const skill of skills) {
      assert.ok(skill.name.length > 0);
      assert.ok(skill.displayName.length > 0);
    }
  });

  it("gives every skill 2 to 5 representative queries", () => {
    for (const skill of skills) {
      assert.ok(
        skill.representativeQueries.length >= 2 && skill.representativeQueries.length <= 5,
        `${skill.name} has ${skill.representativeQueries.length} queries`,
      );
      for (const query of skill.representativeQueries) {
        assert.ok(query.trim().length > 0);
      }
    }
  });

  it("points each skill at its upstream SKILL.md with an attributed publisher", () => {
    for (const skill of skills) {
      assert.match(skill.url, /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/HEAD\/.+$/u);
      assert.ok(skill.url.endsWith("/SKILL.md"));
      assert.match(skill.publisher.identifier, /^github\.com\/[^/]+$/u);
      assert.ok(skill.description.length > 0);
    }
  });

  it("produces unique skill names", () => {
    const names = skills.map((skill) => skill.name);

    assert.equal(new Set(names).size, names.length);
  });
});
