import type { RSSFeedItem } from "@astrojs/rss";
import { getPostDates, type PostDateSource } from "./post-dates";

export interface FeedPost extends PostDateSource {
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
        getPostDates(second).publishedAt.valueOf() - getPostDates(first).publishedAt.valueOf() ||
        first.id.localeCompare(second.id),
    )
    .map((post) => {
      const dates = getPostDates(post);
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: dates.publishedAt,
        link: new URL(`/posts/${post.id}/`, site).href,
      };
    });
}
