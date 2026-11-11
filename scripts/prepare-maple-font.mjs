import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

const execFile = promisify(execFileCallback);
const releaseBaseUrl = "https://api.github.com/repos/subframe7536/maple-font/releases";
const archiveName = "MapleMonoNormal-NF-CN.zip";
const checksumName = "MapleMonoNormal-NF-CN.sha256";

async function hashFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

function parseChecksum(text) {
  const line = text.trim().split(/\r?\n/u).find(Boolean);
  const match = line?.match(/^([a-f\d]{64})(?:\s+\*?(.+))?$/iu);
  if (!match) {
    throw new Error(`Invalid SHA-256 checksum file for ${archiveName}`);
  }
  if (match[2] && basename(match[2].trim()) !== archiveName) {
    throw new Error(`Checksum file does not name ${archiveName}`);
  }
  return match[1].toLowerCase();
}

async function request(fetchImpl, url, accept) {
  const response = await fetchImpl(url, {
    headers: {
      accept,
      "user-agent": "Mozilla/5.0",
    },
  });
  if (!response.ok) {
    throw new Error(`Font release request failed (${response.status}): ${url}`);
  }
  return response;
}

export function selectFontEntry(files) {
  const matches = files.filter((path) =>
    /(?:^|\/)MapleMonoNormal-NF-CN[^/]*\.(?:ttf|otf)$/iu.test(path),
  );
  return (
    matches.find((path) => /-Regular\.ttf$/iu.test(path)) ??
    matches.find((path) => /-Regular\.otf$/iu.test(path)) ??
    matches[0]
  );
}

async function extractMapleFont(archivePath, outputDir) {
  const { stdout } = await execFile("unzip", ["-Z1", archivePath]);
  const files = stdout.split(/\r?\n/u).filter(Boolean);
  const fontPath = selectFontEntry(files);
  if (!fontPath) {
    throw new Error("The verified font archive contains no MapleMonoNormal-NF-CN TTF or OTF");
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await execFile("unzip", ["-j", "-o", "-qq", archivePath, fontPath, "-d", outputDir]);
}

export async function prepareMapleFont({
  isGitHubActions = process.env.GITHUB_ACTIONS === "true",
  cacheDir = ".cache/maple-font",
  outputDir = join(cacheDir, "input"),
  releaseTag = process.env.MAPLE_FONT_RELEASE_TAG,
  fetchImpl = globalThis.fetch,
  extractArchive = extractMapleFont,
} = {}) {
  if (!isGitHubActions) {
    return { status: "skipped" };
  }

  const releaseUrl = releaseTag
    ? `${releaseBaseUrl}/tags/${encodeURIComponent(releaseTag)}`
    : `${releaseBaseUrl}/latest`;
  const releaseResponse = await request(fetchImpl, releaseUrl, "application/vnd.github+json");
  const release = await releaseResponse.json();
  if (!release.tag_name || release.prerelease || (releaseTag && release.tag_name !== releaseTag)) {
    throw new Error("Could not resolve a stable Maple Font release");
  }
  if (!/^[\w.-]+$/u.test(release.tag_name)) {
    throw new Error(`Unexpected Maple Font release tag: ${release.tag_name}`);
  }

  const assets = release.assets ?? [];
  const archiveAsset = assets.find(({ name }) => name === archiveName);
  const checksumAsset = assets.find(({ name }) => name === checksumName);
  if (!archiveAsset?.browser_download_url || !checksumAsset?.browser_download_url) {
    throw new Error(`Release ${release.tag_name} is missing ${archiveName} or ${checksumName}`);
  }

  const checksumResponse = await request(
    fetchImpl,
    checksumAsset.browser_download_url,
    "text/plain",
  );
  const expectedHash = parseChecksum(await checksumResponse.text());
  const releaseCacheDir = join(cacheDir, release.tag_name);
  const cachedArchive = join(releaseCacheDir, archiveName);
  await mkdir(releaseCacheDir, { recursive: true });

  let cached = false;
  try {
    await stat(cachedArchive);
    cached = true;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (!cached) {
    const archiveResponse = await request(
      fetchImpl,
      archiveAsset.browser_download_url,
      "application/octet-stream",
    );
    const temporaryArchive = `${cachedArchive}.tmp-${process.pid}`;
    try {
      if (!archiveResponse.body) {
        throw new Error(`Font archive response was empty for release ${release.tag_name}`);
      }
      await pipeline(archiveResponse.body, createWriteStream(temporaryArchive, { flags: "wx" }));
      await rename(temporaryArchive, cachedArchive);
    } catch (error) {
      await rm(temporaryArchive, { force: true });
      throw error;
    }
  }

  const actualHash = await hashFile(cachedArchive);
  if (actualHash !== expectedHash) {
    throw new Error(`SHA-256 checksum mismatch for ${archiveName} in release ${release.tag_name}`);
  }

  await extractArchive(cachedArchive, outputDir);
  return {
    status: "prepared",
    tag: release.tag_name,
    archivePath: cachedArchive,
    outputDir,
    cached,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await prepareMapleFont();
  console.log(
    result.status === "skipped"
      ? "Maple font download skipped outside GitHub Actions."
      : `Prepared verified Maple Font ${result.tag}.`,
  );
}
