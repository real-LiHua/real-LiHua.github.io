import { defineHastPlugin, type HastVisitorContext } from "satteri";

const isExternalLink = (href: string, siteUrl: string): boolean => {
  try {
    const url = new URL(href);
    const site = new URL(siteUrl);
    return url.origin !== site.origin;
  } catch {
    return false;
  }
};

export const satteriExternalLinks = (siteUrl: string) =>
  defineHastPlugin({
    name: "satteri-external-links",
    element: {
      filter: ["a"],
      visit(node, ctx: HastVisitorContext): void {
        const href = node.properties?.href;
        if (typeof href !== "string") {
          return;
        }
        if (!isExternalLink(href, siteUrl)) {
          return;
        }
        ctx.setProperty(node, "rel", "noopener noreferrer");
        ctx.setProperty(node, "target", "_blank");
        ctx.setProperty(node, "data-external", "true");
        ctx.setProperty(node, "aria-label", `${node.properties?.ariaLabel ?? ""} (opens in new tab)`.trim());
      },
    },
  });