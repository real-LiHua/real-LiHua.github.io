import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Satteri is the configured renderer without direct remark or rehype dependencies", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const astroConfig = await readFile(new URL("../astro.config.ts", import.meta.url), "utf8");
  const markdownModule = await readFile(new URL("../src/lib/markdown.ts", import.meta.url), "utf8");
  const forbiddenDirectDependencies = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }).filter((name) => /^(?:unified|remark-|rehype-)/u.test(name));

  assert.deepEqual(forbiddenDirectDependencies, []);
  assert.match(astroConfig, /processor:\s*markdownProcessor/u);
  assert.match(markdownModule, /satteri\(\)/u);
  assert.doesNotMatch(astroConfig, /\b(?:unified|remark|rehype)\b/u);

  const dependencyTree = execFileSync("pnpm", ["why", "unified", "remark", "rehype"], {
    encoding: "utf8",
  });
  assert.match(dependencyTree, /unified@/u);
  assert.match(dependencyTree, /remark-/u);
  assert.match(dependencyTree, /rehype-/u);
});
