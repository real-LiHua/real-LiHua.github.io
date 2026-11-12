import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { prepareMapleFont, selectFontEntry } from "./prepare-maple-font.mjs";

const archive = Buffer.from("verified font archive");
const checksum = "MapleMonoNormal-NF-CN.zip";
const archiveHash = createHash("sha256").update(archive).digest("hex");
const release = {
  tag_name: "v7.9",
  prerelease: false,
  assets: [
    { name: `${checksum}`, browser_download_url: "https://example.test/font.zip" },
    {
      name: "MapleMonoNormal-NF-CN.sha256",
      browser_download_url: "https://example.test/font.sha256",
    },
  ],
};

function createFetch({ checksumValue = "valid", onArchive } = {}) {
  const hash = checksumValue === "valid" ? archiveHash : checksumValue;
  return (url) => {
    if (url.endsWith("/releases/latest")) {
      return Response.json(release);
    }
    if (url.endsWith("font.sha256")) {
      return new Response(`${hash}  ${checksum}\n`);
    }
    if (url.endsWith("font.zip")) {
      onArchive?.();
      return new Response(archive);
    }
    throw new Error(`Unexpected request: ${url}`);
  };
}

test("local builds do not resolve or download the font release", async () => {
  let requests = 0;
  const result = await prepareMapleFont({
    isGitHubActions: false,
    fetchImpl: () => {
      requests += 1;
      throw new Error("local font setup must not make network requests");
    },
  });

  assert.equal(result.status, "skipped");
  assert.equal(requests, 0);
});

test("a font archive with a mismatched release checksum is rejected", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maple-font-test-"));
  const mismatchedHash = "0".repeat(64);
  let extracted = false;
  try {
    await assert.rejects(
      prepareMapleFont({
        isGitHubActions: true,
        cacheDir: join(directory, "cache"),
        outputDir: join(directory, "fonts"),
        fetchImpl: createFetch({ checksumValue: mismatchedHash }),
        extractArchive: () => {
          extracted = true;
        },
      }),
      /SHA-256 checksum mismatch/u,
    );
    assert.equal(extracted, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a verified archive is reused for repeated builds of the same release tag", async () => {
  const directory = await mkdtemp(join(tmpdir(), "maple-font-test-"));
  let archiveDownloads = 0;
  let extractions = 0;
  const options = {
    isGitHubActions: true,
    cacheDir: join(directory, "cache"),
    outputDir: join(directory, "fonts"),
    fetchImpl: createFetch({ onArchive: () => (archiveDownloads += 1) }),
    extractArchive: () => {
      extractions += 1;
    },
  };

  try {
    await prepareMapleFont(options);
    await prepareMapleFont(options);
    assert.equal(archiveDownloads, 1);
    assert.equal(extractions, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("extraction prefers the Regular weight of the font family", () => {
  const files = [
    "MapleMonoNormal-NF-CN-Bold.ttf",
    "MapleMonoNormal-NF-CN-Italic.ttf",
    "MapleMonoNormal-NF-CN-Regular.ttf",
  ];
  assert.equal(selectFontEntry(files), "MapleMonoNormal-NF-CN-Regular.ttf");
});

test("extraction falls back to the first matching font entry", () => {
  const files = ["docs/readme.txt", "MapleMonoNormal-NF-CN-Medium.otf"];
  assert.equal(selectFontEntry(files), "MapleMonoNormal-NF-CN-Medium.otf");
});

test("extraction returns undefined when the archive has no usable font", () => {
  assert.equal(selectFontEntry(["readme.md"]), undefined);
});
