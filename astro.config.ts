import favicons from "astro-favicons";
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import {
  defineMdastPlugin,
  defineHastPlugin,
  type MdastVisitorContext,
  type HastVisitorContext,
} from "satteri";
// Avoid importing 'mdast' and 'hast' types directly to prevent CI type resolution issues.
// Use generic unknown and narrow where needed. (They are intentionally not imported.)
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Helper: read a git timestamp for a file using given git log args
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

// 为每个文档注入首次提交时间到 frontmatter.publishDate
const remarkPublishDate = () =>
  defineMdastPlugin({
    name: "remark-publish-date",
    // 在存在 frontmatter（yaml）时触发一次
    yaml(_yamlNode: unknown, ctx: MdastVisitorContext) {
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
      // 安全地在 ctx.data 上注入 astro.frontmatter.publishDate
      const data = ctx.data as Record<string, unknown>;
      const astro = (data["astro"] as Record<string, unknown> | undefined) ?? {};
      const frontmatter = (astro["frontmatter"] as Record<string, unknown> | undefined) ?? {};
      astro["frontmatter"] = { ...frontmatter, publishDate: result };
      data["astro"] = astro;
    },
  });

// 注入最近一次提交时间到 frontmatter.updatedDate
const remarkUpdatedDate = () =>
  defineMdastPlugin({
    name: "remark-updated-date",
    yaml(_yamlNode: unknown, ctx: MdastVisitorContext) {
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

// 将 table 单元格的 align 属性迁移为 style.text-align
const rehypeTableAlign = () =>
  defineHastPlugin({
    element: {
      filter: ["th", "td"],
      visit(el: unknown, ctx: HastVisitorContext) {
        const hastNode = el as { properties?: Record<string, unknown> };
        const align = hastNode.properties?.align as string | undefined;
        if (align) {
          const existing = hastNode.properties?.style ?? "";
          const target = hastNode as unknown as Record<string, unknown>;
          ctx.setProperty(target, "style", `${existing} text-align: ${align}`.trim());
          // 删除 align 属性
          ctx.setProperty(target, "align", undefined);
        }
      },
    },
    name: "rehype-table-align",
  });

export default defineConfig({
  adapter: node({
    mode: "standalone",
  }),
  integrations: [mdx(), favicons(), sitemap()],
  markdown: {
    // 使用 Sätteri 作为默认处理器并注入自定义插件
    processor: satteri({
      hastPlugins: [rehypeTableAlign],
      mdastPlugins: [remarkPublishDate, remarkUpdatedDate],
    }),
  },
  security: { checkOrigin: false },
  site: process.env.SITE_URL ?? "http://localhost:4321",
  trailingSlash: "ignore",
  vite: {
    build: { cssMinify: "lightningcss" },
    plugins: [tailwindcss()],
  },
});
