// Satteri HAST plugin: mark external links in rendered Markdown/MDX.
//
// Documented behaviour ("外链标记", see docs/architecture-map.md §数据流 and
// docs/CONTENT_GUIDE.md §5): authors write `[text](https://…)` and the pipeline
// adds the marker for them. We open external links in a new tab and add
// `rel="noopener noreferrer"` (SECURITY_WHITEPAPER §4), plus a stable
// `.external` class for styling and tests.
//
// Runs as a HAST plugin because `target`/`rel`/`class` are HTML attributes,
// which MDAST link nodes cannot carry.

import type { HastPluginDefinition } from "satteri";

const ABSOLUTE_URL = /^https?:\/\//iu;

export interface ExternalLinksOptions {
  /**
   * Absolute origins treated as internal (not marked). Use the site origin so self-referencing
   * absolute links stay plain, e.g. `["https://example.com"]`.
   */
  internalOrigins?: readonly string[];
  /** Where marked links open. Defaults to `_blank`. */
  target?: string;
  /** Value written to `rel`. Defaults to `noopener noreferrer`. */
  rel?: string;
}

export function satteriExternalLinks(options: ExternalLinksOptions = {}): HastPluginDefinition {
  const { internalOrigins = [], target = "_blank", rel = "noopener noreferrer" } = options;

  return {
    name: "satteri-external-links",
    element: {
      filter: ["a"],
      visit(node, ctx) {
        const href = node.properties?.href;
        if (typeof href !== "string" || !ABSOLUTE_URL.test(href)) {
          return;
        }
        if (internalOrigins.some((origin) => href.startsWith(origin))) {
          return;
        }

        ctx.setProperty(node, "target", target);
        ctx.setProperty(node, "rel", rel);
        ctx.setProperty(node, "class", "external");
      },
    },
  };
}
