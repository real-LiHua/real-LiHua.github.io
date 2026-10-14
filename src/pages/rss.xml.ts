import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { contentPipeline } from "@/modules/content-pipeline";

export const GET: APIRoute = async (context) => {
  const posts = await contentPipeline.getPublishedPosts();

  return rss({
    title: "LiHua.dev",
    description: "个人博客：记录文章、笔记与技术实验。",
    site: context.site ?? "https://real-lihua.github.io",
    customData: "<language>zh-cn</language>",
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishDate ?? new Date(),
      description: post.data.description ?? "",
      link: `/posts/${post.id}/`,
      categories: post.data.tags ?? [],
    })),
  });
};
