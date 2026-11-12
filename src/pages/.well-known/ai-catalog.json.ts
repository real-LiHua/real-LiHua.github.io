import type { APIRoute } from "astro";
import { buildAiCatalog } from "../../lib/ai-catalog";
import { loadInstalledSkills } from "../../lib/skills";

export const prerender = true;

// The catalog is a build-time snapshot of the bundled MCP server cards and the
// vendored skills, so the build timestamp is the honest "updatedAt" for every
// entry.
const updatedAt = new Date().toISOString();
const skills = loadInstalledSkills();

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error("The Astro site URL must be configured to generate ai-catalog.json.");
  }

  return Response.json(buildAiCatalog(site, updatedAt, skills), {
    headers: { "Content-Type": "application/ai-catalog+json; charset=utf-8" },
  });
};
