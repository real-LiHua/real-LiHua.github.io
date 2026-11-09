import type { RSSFeedItem } from "@astrojs/rss";

interface FeedPost {
  id: string;
  data: {
    title: string;
    description: string;
    publishedAt: Date;
    isPreview: boolean;
  };
}

export function createRssItems(posts: FeedPost[], site: URL): RSSFeedItem[] {
  return posts
    .filter((post) => !post.data.isPreview)
    .sort(
      (first, second) =>
        second.data.publishedAt.valueOf() - first.data.publishedAt.valueOf() ||
        first.id.localeCompare(second.id),
    )
    .map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: new URL(`/posts/${post.id}/`, site).href,
    }));
}
