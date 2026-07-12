import { getPublishedPosts } from "../utils/content";
import rss from "@astrojs/rss";

export const GET = async (context: { site: string }): Promise<Response> => {
  const posts = await getPublishedPosts();
  const sorted = posts.toSorted(
    (prev, next) =>
      new Date(next.data.publishDate ?? 0).getTime() -
      new Date(prev.data.publishDate ?? 0).getTime(),
  );

  return rss({
    customData: `<language>zh-cn</language>\n<atom:link rel="self" href="${context.site}rss.xml"/>`,
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
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
  });
};
