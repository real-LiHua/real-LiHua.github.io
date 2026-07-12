import { type CollectionEntry, getCollection } from "astro:content";

/** 返回已发布的文章集合（排除位于 src/posts/drafts/ 的文章） */
export const getPublishedPosts = (): Promise<CollectionEntry<"blog">[]> =>
  getCollection("blog", ({ id }) => !id.startsWith("drafts/"));

/** 返回草稿文章集合（仅包含位于 src/posts/drafts/ 的文章） */
export const getDraftPosts = (): Promise<CollectionEntry<"blog">[]> =>
  getCollection("blog", ({ id }) => id.startsWith("drafts/"));

/** 返回所有帖子（包含草稿），用于开发环境 */
export const getAllPosts = (): Promise<CollectionEntry<"blog">[]> =>
  getCollection("blog");

/** 方便按需检查条目是否为草稿 */
export const isDraftEntry = (entry: { id: string }): boolean => entry.id.startsWith("drafts/");

