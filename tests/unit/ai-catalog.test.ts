import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAiCatalog } from "../../src/lib/ai-catalog";
import type { InstalledSkill } from "../../src/lib/skills";

const UPDATED_AT = "2026-11-12T00:00:00.000Z";
const URN_PATTERN = /^urn:air:[a-zA-Z0-9.-]+(?::[a-zA-Z0-9._:-]+)?:[a-zA-Z0-9._-]+$/u;
const SKILL: InstalledSkill = {
  name: "code-review",
  displayName: "code-review",
  description: "Review the changes since a fixed point.",
  url: "https://raw.githubusercontent.com/mattpocock/skills/HEAD/skills/engineering/code-review/SKILL.md",
  publisher: { identifier: "github.com/mattpocock", displayName: "mattpocock" },
  representativeQueries: ["Review my branch since main", "Review this PR against our standards"],
};

describe("buildAiCatalog", () => {
  it("derives host identity and entry identifiers from the site domain", () => {
    const catalog = buildAiCatalog(new URL("https://example.org/"), UPDATED_AT, []);

    assert.equal(catalog.host.identifier, "example.org");
    assert.deepEqual(
      catalog.entries.map((entry) => entry.identifier),
      [
        "urn:air:example.org:mcp:astro-docs",
        "urn:air:example.org:mcp:mdn-web-docs",
        "urn:air:example.org:mcp:playwright",
        "urn:air:example.org:mcp:shadcn",
      ],
    );
  });

  it("does not leak another domain into a mirror catalog", () => {
    const catalog = buildAiCatalog(new URL("https://mirror.example.net/blog/"), UPDATED_AT, [
      SKILL,
    ]);
    const serialized = JSON.stringify(catalog);

    assert.equal(catalog.host.identifier, "mirror.example.net");
    assert.ok(!serialized.includes("real-lihua.github.io"));
  });

  it("emits ARD-compliant entries", () => {
    const catalog = buildAiCatalog(new URL("https://real-lihua.github.io"), UPDATED_AT, [SKILL]);

    assert.equal(catalog.specVersion, "1.0");
    for (const entry of catalog.entries) {
      assert.match(entry.identifier, URN_PATTERN);
      assert.ok(entry.displayName.length > 0);
      assert.ok(entry.representativeQueries.length >= 2);
      assert.ok(entry.representativeQueries.length <= 5);
      assert.equal(entry.updatedAt, UPDATED_AT);
      if (entry.type === "application/mcp-server-card+json") {
        assert.equal(entry.data.version, entry.data.version.trim());
      }
    }
  });

  it("keeps the upstream publisher separate from the catalog host", () => {
    const catalog = buildAiCatalog(new URL("https://example.org"), UPDATED_AT, [SKILL]);

    assert.deepEqual(
      catalog.entries.map((entry) => entry.publisher.identifier),
      ["astro.build", "mozilla.org", "microsoft.com", "ui.shadcn.com", "github.com/mattpocock"],
    );
  });

  it("lists skills as markdown skill artifacts pointing upstream", () => {
    const catalog = buildAiCatalog(new URL("https://example.org"), UPDATED_AT, [SKILL]);
    const entry = catalog.entries.at(-1);

    assert.deepEqual(entry, {
      identifier: "urn:air:example.org:skill:code-review",
      displayName: "code-review",
      type: "application/agent-skills+md",
      description: SKILL.description,
      representativeQueries: SKILL.representativeQueries,
      tags: ["agent-skill"],
      updatedAt: UPDATED_AT,
      publisher: SKILL.publisher,
      url: SKILL.url,
    });
  });
});
