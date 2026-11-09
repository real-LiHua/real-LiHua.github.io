import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { assertUniqueSeriesPositions } from "../lib/content-validation";
import { createRssItems } from "../lib/rss-items";

export const GET: APIRoute = async (context) => {
  if (!context.site) {
    throw new Error("The Astro site URL must be configured to generate RSS.");
  }

  const posts = await getCollection("posts");
  assertUniqueSeriesPositions(posts);

  return rss({
    title: "文章订阅",
    description: "博客新文章 RSS 订阅",
    site: context.site,
    items: createRssItems(posts, context.site),
  });
};
