import type { InstalledSkill } from "./skills";

interface Publisher {
  identifier: string;
  displayName: string;
}

interface McpServerCard {
  $schema: string;
  name: string;
  title: string;
  description: string;
  version: string;
  websiteUrl: string;
  remotes?: { type: string; url: string }[];
  packages?: Record<string, unknown>[];
  _meta: Record<string, unknown>;
}

interface McpServerDefinition {
  /** Last URN segment; catalog entry IDs are `urn:air:<site host>:mcp:<slug>`. */
  slug: string;
  displayName: string;
  description: string;
  representativeQueries: string[];
  tags: string[];
  publisher: Publisher;
  card: Omit<McpServerCard, "$schema" | "_meta">;
}

interface CatalogEntryBase {
  identifier: string;
  displayName: string;
  description: string;
  representativeQueries: readonly string[];
  tags: string[];
  updatedAt: string;
  publisher: Publisher;
}

interface McpCatalogEntry extends CatalogEntryBase {
  type: "application/mcp-server-card+json";
  data: McpServerCard;
}

interface SkillCatalogEntry extends CatalogEntryBase {
  type: "application/agent-skills+md";
  url: string;
}

export type AiCatalogEntry = McpCatalogEntry | SkillCatalogEntry;

export interface AiCatalog {
  specVersion: string;
  host: Publisher & { documentationUrl: string };
  entries: AiCatalogEntry[];
}

const DOCUMENTATION_URL = "https://github.com/real-LiHua/real-LiHua.github.io";
const HOST_DISPLAY_NAME = "李华的博客";
const MCP_SERVER_CARD_SCHEMA =
  "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";
const MCP_SERVER_CARD_TYPE = "application/mcp-server-card+json";
const SKILL_TYPE = "application/agent-skills+md";
const SKILL_TAGS = ["agent-skill"];
// These cards are operator-written snapshots: the upstream projects publish no
// server card, so `_meta` records where the metadata came from.
const ORIGIN_META = {
  "io.github.real-lihua.catalog/origin": {
    note: "Server card assembled by the catalog operator from this repository's .mcp.json; the upstream project publishes no card.",
    source: ".mcp.json",
  },
};

const MCP_SERVERS: McpServerDefinition[] = [
  {
    slug: "astro-docs",
    displayName: "Astro Docs Server",
    description: "Search and read the official Astro documentation over MCP.",
    representativeQueries: [
      "How do I configure content collections in Astro?",
      "What is the Astro view transitions API?",
      "How do I add an integration in astro.config?",
    ],
    tags: ["mcp", "astro", "docs", "search"],
    publisher: { identifier: "astro.build", displayName: "Astro" },
    card: {
      name: "io.github.real-lihua/astro-docs-mcp",
      title: "Astro Docs server",
      description: "Search and read the official Astro documentation over MCP.",
      version: "1.0.0",
      websiteUrl: "https://docs.astro.build/",
      remotes: [{ type: "streamable-http", url: "https://mcp.docs.astro.build/mcp" }],
    },
  },
  {
    slug: "mdn-web-docs",
    displayName: "MDN Web Docs",
    description:
      "Search and fetch authoritative MDN documentation for web platform features over MCP.",
    representativeQueries: [
      "What are the CSS container query units?",
      "How does Array.prototype.toSorted work?",
      "Which browsers support the Web Share API?",
    ],
    tags: ["mcp", "mdn", "web", "docs", "search"],
    publisher: { identifier: "mozilla.org", displayName: "MDN Web Docs" },
    card: {
      name: "io.github.real-lihua/mdn-web-docs-mcp",
      title: "MDN Web Docs",
      description:
        "Search and fetch authoritative MDN documentation for web platform features over MCP.",
      version: "0.0.1",
      websiteUrl: "https://developer.mozilla.org/",
      remotes: [{ type: "streamable-http", url: "https://mcp.mdn.mozilla.net/" }],
    },
  },
  {
    slug: "playwright",
    displayName: "Playwright Tools for MCP",
    description: "Browser automation and page inspection tools from Playwright, exposed over MCP.",
    representativeQueries: [
      "Open example.com and take a screenshot",
      "How do I test a login form with Playwright MCP?",
      "Emulate a mobile viewport in the browser",
    ],
    tags: ["mcp", "playwright", "browser", "automation"],
    publisher: { identifier: "microsoft.com", displayName: "Microsoft" },
    card: {
      name: "io.github.real-lihua/playwright-mcp",
      title: "Playwright Tools for MCP",
      description:
        "Browser automation and page inspection tools from Playwright, exposed over MCP.",
      version: "0.0.85",
      websiteUrl: "https://playwright.dev/",
      packages: [
        {
          registryType: "npm",
          identifier: "@playwright/mcp",
          version: "0.0.85",
          transport: { type: "stdio" },
        },
      ],
    },
  },
  {
    slug: "shadcn",
    displayName: "shadcn",
    description: "Browse registries, search components, and add shadcn/ui components over MCP.",
    representativeQueries: [
      "Add a dialog component to my project",
      "Search the shadcn registry for a data table",
      "How do I install a shadcn block?",
    ],
    tags: ["mcp", "shadcn", "ui", "components", "registry"],
    publisher: { identifier: "ui.shadcn.com", displayName: "shadcn" },
    card: {
      name: "io.github.real-lihua/shadcn-mcp",
      title: "shadcn",
      description: "Browse registries, search components, and add shadcn/ui components over MCP.",
      version: "4.23.0",
      websiteUrl: "https://ui.shadcn.com/",
      packages: [
        {
          registryType: "npm",
          identifier: "shadcn",
          version: "4.23.0",
          transport: { type: "stdio" },
          packageArguments: [{ type: "positional", value: "mcp" }],
        },
      ],
    },
  },
];

/**
 * Build the ARD catalog for the domain the site is served from.
 *
 * Identifiers, host identity, and the catalog URL all derive from `site`, so a mirror deployed
 * under another domain (e.g. `SITE_URL`) publishes its own catalog instead of claiming the GitHub
 * Pages namespace.
 */
export function buildAiCatalog(
  site: URL,
  updatedAt: string,
  skills: readonly InstalledSkill[],
): AiCatalog {
  const host = site.hostname;

  return {
    specVersion: "1.0",
    host: {
      displayName: HOST_DISPLAY_NAME,
      identifier: host,
      documentationUrl: DOCUMENTATION_URL,
    },
    entries: [
      ...MCP_SERVERS.map(
        (server): AiCatalogEntry => ({
          identifier: `urn:air:${host}:mcp:${server.slug}`,
          displayName: server.displayName,
          type: MCP_SERVER_CARD_TYPE,
          description: server.description,
          representativeQueries: server.representativeQueries,
          tags: server.tags,
          updatedAt,
          publisher: server.publisher,
          data: {
            $schema: MCP_SERVER_CARD_SCHEMA,
            ...server.card,
            _meta: ORIGIN_META,
          },
        }),
      ),
      ...skills.map(
        (skill): AiCatalogEntry => ({
          identifier: `urn:air:${host}:skill:${skill.name}`,
          displayName: skill.displayName,
          type: SKILL_TYPE,
          description: skill.description,
          representativeQueries: skill.representativeQueries,
          tags: SKILL_TAGS,
          updatedAt,
          publisher: skill.publisher,
          url: skill.url,
        }),
      ),
    ],
  };
}
