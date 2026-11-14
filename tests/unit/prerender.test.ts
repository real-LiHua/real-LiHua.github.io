import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const pagesDirectory = fileURLToPath(new URL("../../src/pages", import.meta.url));
const pageExtension = /\.(?:astro|mdx|ts)$/u;

const listPageFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return listPageFiles(path);
      }
      return entry.isFile() && pageExtension.test(entry.name) ? [path] : [];
    }),
  );
  return nested.flat();
};

describe("static deployment pages", () => {
  // Both deploy jobs upload `dist/client` only. A page without `prerender` is
  // served by the Node adapter during tests, so the missing static HTML goes
  // unnoticed until the deployed URL 404s.
  it("prerenders every page route", async () => {
    const missing = [];
    for (const path of await listPageFiles(pagesDirectory)) {
      const source = await readFile(path, "utf8");
      if (!/export const prerender = true;/u.test(source)) {
        missing.push(relative(pagesDirectory, path));
      }
    }
    assert.deepEqual(missing, []);
  });
});
