#!/usr/bin/env node
/**
 * Audit the production build with Lighthouse.
 *
 * Builds the site (unless --skip-build), serves the standalone Node output, runs the four
 * Lighthouse categories (performance, accessibility, best-practices, seo) against representative
 * routes, writes reports under .cache/lighthouse/, and prints a per-route score summary.
 *
 * The script exits non-zero only when an audit itself fails; low category scores are reported, not
 * enforced (no budgets yet).
 *
 * Usage: node scripts/lighthouse-audit.mjs [--skip-build] [route ...]
 *
 * Examples: pnpm run lighthouse # audit /, /posts/first-reading/, /search/ node
 * scripts/lighthouse-audit.mjs / # audit exactly /
 *
 * Chrome resolution order: $CHROME_PATH, then google-chrome/chromium/chromium-browser on PATH. Set
 * CHROME_PATH to a non-standard binary.
 */
import { spawn, spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { delimiter, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";

const log = (message) => process.stdout.write(`${message}\n`);
const logError = (message) => process.stderr.write(`${message}\n`);

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const routes = args.filter((arg) => arg.startsWith("/"));
const auditRoutes = routes.length > 0 ? routes : ["/", "/posts/first-reading/", "/search/"];
const port = Number(process.env.LIGHTHOUSE_PORT ?? 4399);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  logError(`LIGHTHOUSE_PORT must be an integer in 1-65535, got: ${process.env.LIGHTHOUSE_PORT}`);
  process.exit(1);
}
const baseURL = `http://127.0.0.1:${port}`;
const reportDir = join(repoRoot, ".cache/lighthouse");
const entryPoint = join(repoRoot, "dist/server/entry.mjs");

const findOnPath = (names) =>
  names
    .flatMap((name) => (process.env.PATH ?? "").split(delimiter).map((dir) => join(dir, name)))
    .find((candidate) => {
      try {
        accessSync(candidate, constants.X_OK);
        return true;
      } catch {
        return false;
      }
    });

const resolveChrome = () => {
  if (process.env.CHROME_PATH) {
    if (!existsSync(process.env.CHROME_PATH)) {
      throw new Error(
        `CHROME_PATH is set to "${process.env.CHROME_PATH}" but no file exists there.`,
      );
    }
    return process.env.CHROME_PATH;
  }
  const found = findOnPath(["google-chrome", "chromium", "chromium-browser"]);
  if (found) {
    return found;
  }
  throw new Error(
    "No Chrome/Chromium binary found. Searched PATH for google-chrome, chromium, chromium-browser.\n" +
      "Set CHROME_PATH=/path/to/chrome (e.g. /usr/bin/chromium) and re-run.",
  );
};

const build = () => {
  log("[lighthouse-audit] Building site…");
  const result = spawnSync("pnpm", ["run", "build"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`astro build exited with code ${result.status ?? "unknown"}; aborting.`);
  }
};

const waitForServer = async (url, timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) {
        return;
      }
    } catch {
      // server not up yet
    }
    if (Date.now() > deadline) {
      throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms.`);
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }
};

const slugFor = (route) =>
  route === "/" ? "index" : route.replaceAll(/[^a-z0-9]+/giu, "-").replaceAll(/^-|-$/gu, "");

const audit = async (chromePort, route) => {
  const url = `${baseURL}${route}`;
  const result = await lighthouse(url, {
    port: chromePort,
    output: ["json", "html"],
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    logLevel: "error",
    chromeFlags: [],
  });
  if (!result) {
    throw new Error(`Lighthouse returned no result for ${url}`);
  }
  const { lhr, report } = result;
  mkdirSync(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
  const slug = slugFor(route);
  writeFileSync(join(reportDir, `${slug}-${stamp}.report.json`), report[0]);
  writeFileSync(join(reportDir, `${slug}-${stamp}.report.html`), report[1]);
  const scores = Object.fromEntries(
    Object.entries(lhr.categories).map(([id, category]) => [
      id,
      category.score === null || category.score === undefined
        ? null
        : Math.round(category.score * 100),
    ]),
  );
  return { url, scores };
};

let server;
let chrome;
let exitCode = 0;
try {
  if (!skipBuild) {
    build();
  }
  if (!existsSync(entryPoint)) {
    throw new Error(
      `Built server entry not found at ${relative(repoRoot, entryPoint)}; run without --skip-build.`,
    );
  }
  const chromePath = resolveChrome();
  log(`[lighthouse-audit] Serving build at ${baseURL}…`);
  server = spawn("node", [entryPoint], {
    cwd: repoRoot,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  await waitForServer(`${baseURL}/`);

  log(`[lighthouse-audit] Using Chrome at ${chromePath}`);
  chrome = await launch({
    chromePath,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
    logLevel: "error",
  });

  const summaries = [];
  for (const route of auditRoutes) {
    log(`[lighthouse-audit] Auditing ${baseURL}${route}…`);
    summaries.push(await audit(chrome.port, route));
  }

  const header = ["route", "performance", "accessibility", "best-practices", "seo"];
  const widths = [32, 12, 14, 15, 6];
  const row = (cells) =>
    cells
      .map((cell, index) => String(cell).padEnd(widths[index]))
      .join(" ")
      .trimEnd();
  log(`\n${row(header)}`);
  log(row(header.map((_, index) => "-".repeat(widths[index] - 1))));
  for (const summary of summaries) {
    log(
      row([
        summary.url.replace(baseURL, ""),
        summary.scores.performance ?? "n/a",
        summary.scores.accessibility ?? "n/a",
        summary.scores["best-practices"] ?? "n/a",
        summary.scores.seo ?? "n/a",
      ]),
    );
  }
  log(`\n[lighthouse-audit] Reports written to ${relative(repoRoot, reportDir)}/`);
} catch (error) {
  exitCode = 1;
  logError(
    `[lighthouse-audit] Audit failed: ${error instanceof Error ? error.message : String(error)}`,
  );
} finally {
  chrome?.kill();
  if (server && !server.killed) {
    server.kill("SIGTERM");
  }
}
process.exit(exitCode);
