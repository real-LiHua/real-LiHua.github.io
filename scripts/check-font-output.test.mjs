import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkFontOutput } from "./check-font-output.mjs";

async function createOutput(css) {
  const directory = await mkdtemp(join(tmpdir(), "font-output-test-"));
  await mkdir(join(directory, "assets"), { recursive: true });
  await writeFile(join(directory, "assets", "font.woff2"), "test font");
  await writeFile(join(directory, "assets", "site.css"), css);
  return directory;
}

test("font output contains local WOFF2 assets referenced by generated CSS", async () => {
  const directory = await createOutput(
    '@font-face{font-family:"Maple";src:url("./font.woff2") format("woff2")}',
  );
  try {
    const result = await checkFontOutput(directory);
    assert.equal(result.fontFiles.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("font output rejects remote font URLs", async () => {
  const directory = await createOutput(
    '@font-face{font-family:"Maple";src:url("https://fonts.example.test/font.woff2")}',
  );
  try {
    await assert.rejects(checkFontOutput(directory), /external font URL/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("font output requires at least one WOFF2 asset", async () => {
  const directory = await createOutput(".site{font-family:sans-serif}");
  try {
    await assert.rejects(checkFontOutput(directory), /No generated local WOFF2 font assets/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
