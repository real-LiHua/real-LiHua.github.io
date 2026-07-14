import type { AstroIntegration } from "astro";
import { satteri, satteriHeadingIdsPlugin } from "@astrojs/markdown-satteri";
import {
  defineMdastPlugin,
  defineHastPlugin,
  type MdastVisitorContext,
  type HastVisitorContext,
  type HastNode,
} from "satteri";
import { mermaidHast, mermaidMdast } from "@xingwangzhe/satteri-mermaid";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const getGitDate = (fileUrl: URL | undefined, args: string[]): string | undefined => {
  if (!fileUrl) {
    return undefined;
  }
  try {
    const filepath = fileURLToPath(fileUrl);
    const cmd = ["git", ...args, "--", `${filepath}`].join(" ");
    const result = execSync(cmd).toString().trim();
    return result || undefined;
  } catch {
    return undefined;
  }
};

const satteriPublishDate = (): ReturnType<typeof defineMdastPlugin> =>
  defineMdastPlugin({
    name: "satteri-publish-date",
    yaml(_yamlNode: unknown, ctx: MdastVisitorContext): void {
      const result = getGitDate(ctx.fileURL, [
        "log",
        "--follow",
        "--diff-filter=A",
        "-1",
        '--pretty="format:%cI"',
      ]);
      if (!result) {
        return;
      }
      const data = ctx.data as Record<string, unknown>;
      const astro = (data["astro"] as Record<string, unknown> | undefined) ?? {};
      const frontmatter = (astro["frontmatter"] as Record<string, unknown> | undefined) ?? {};
      astro["frontmatter"] = { ...frontmatter, publishDate: result };
      data["astro"] = astro;
    },
  });

const satteriUpdatedDate = (): ReturnType<typeof defineMdastPlugin> =>
  defineMdastPlugin({
    name: "satteri-updated-date",
    yaml(_yamlNode: unknown, ctx: MdastVisitorContext): void {
      const result = getGitDate(ctx.fileURL, ["log", "-1", '--pretty="format:%cI"']);
      if (!result) {
        return;
      }
      const data = ctx.data as Record<string, unknown>;
      const astro = (data["astro"] as Record<string, unknown> | undefined) ?? {};
      const frontmatter = (astro["frontmatter"] as Record<string, unknown> | undefined) ?? {};
      astro["frontmatter"] = { ...frontmatter, updatedDate: result };
      data["astro"] = astro;
    },
  });

const satteriTableAlign = (): ReturnType<typeof defineHastPlugin> =>
  defineHastPlugin({
    element: {
      filter: ["th", "td"],
      visit(el: unknown, ctx: HastVisitorContext): void {
        const hastNode = el as { properties?: Record<string, unknown> };
        const align = hastNode.properties?.align as string | undefined;
        if (align) {
          const existing = hastNode.properties?.style ?? "";
          const target = hastNode as unknown as HastNode;
          ctx.setProperty(target, "style", `${existing} text-align: ${align}`.trim());
          ctx.setProperty(target, "align", undefined);
        }
      },
    },
    name: "satteri-table-align",
  });

export const satteriConfigIntegration = (): AstroIntegration => ({
  hooks: {
    "astro:config:setup": ({ updateConfig }): void => {
      updateConfig({
        markdown: {
          processor: satteri({
            hastPlugins: [mermaidHast(), satteriTableAlign(), satteriHeadingIdsPlugin],
            mdastPlugins: [mermaidMdast(), satteriPublishDate(), satteriUpdatedDate()],
          }),
        },
      });
    },
  },
  name: "satteri-config",
});
