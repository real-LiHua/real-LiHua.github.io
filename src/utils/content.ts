// Content helpers — draft detection is path-based (no frontmatter flag).

import { type CollectionEntry, getCollection } from "astro:content";

/** Published posts (everything not under `src/posts/drafts/`). */
export const getPublishedPosts = (): Promise<CollectionEntry<"blog">[]> =>
  getCollection("blog", (entry: { id: string }) => !entry.id.startsWith("drafts/"));

/** Draft posts (everything under `src/posts/drafts/`). */
export const getDraftPosts = (): Promise<CollectionEntry<"blog">[]> =>
  getCollection("blog", (entry: { id: string }) => entry.id.startsWith("drafts/"));

/** All posts including drafts — intended for development routes only. */
export const getAllPosts = (): Promise<CollectionEntry<"blog">[]> => getCollection("blog");

/** Convenience predicate for a single entry. */
export const isDraftEntry = (entry: { id: string }): boolean => entry.id.startsWith("drafts/");
