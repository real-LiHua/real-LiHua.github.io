import { getCollection } from "astro:content";
import rss from "@astrojs/rss";

export const GET = async (context: { site: string }): Promise<Response> => {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  const sorted = posts.toSorted(
    (prev, next) =>
      new Date(next.data.publishDate ?? 0).getTime() -
      new Date(prev.data.publishDate ?? 0).getTime(),
  );

  return rss({
    customData: "<language>zh-cn</language>",
    description: "Li Hua 的个人博客",
    items: sorted.map((post) => ({
      categories: post.data.tags ?? [],
      description: post.data.description ?? "",
      link: `/posts/${post.id}/`,
      pubDate: post.data.publishDate ?? new Date(),
      title: post.data.title,
    })),
    site: context.site,
    title: "李华的博客",
    trailingSlash: true,
  });
};
