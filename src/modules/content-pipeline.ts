// Content Pipeline — deep module.
//
// Callers (pages, RSS, sitemap, search index) only interact with the small
// surface below; the Astro Content Collections loader/schema/rendering chain is
// an implementation detail (see docs/adr/0001-functional-architecture.md §3.1).

import type { MarkdownHeading } from "astro";
import { render } from "astro:content";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { BlogCollection, PostFrontmatter } from "./types";
import { getAllPosts, getDraftPosts, getPublishedPosts, isDraftEntry } from "@/utils/content";
import { sortByDate } from "@/utils/date";

export interface RenderedPost {
  Content: AstroComponentFactory;
  headings: MarkdownHeading[];
  frontmatter: PostFrontmatter & { id: string };
}

export interface ContentPipeline {
  /** Published posts, newest first. */
  getPublishedPosts(): Promise<BlogCollection[]>;
  /** Draft posts, newest first. */
  getDraftPosts(): Promise<BlogCollection[]>;
  /** All posts including drafts (development routes only). */
  getAllPosts(): Promise<BlogCollection[]>;
  /** Render one post into `<Content />` + headings + frontmatter. */
  renderPost(id: string): Promise<RenderedPost>;
  /** Whether an entry lives under `posts/drafts/`. */
  isDraft(entry: { id: string }): boolean;
}

export const contentPipeline: ContentPipeline = {
  async getPublishedPosts() {
    return sortByDate(await getPublishedPosts(), "desc");
  },

  async getDraftPosts() {
    return sortByDate(await getDraftPosts(), "desc");
  },

  async getAllPosts() {
    return sortByDate(await getAllPosts(), "desc");
  },

  async renderPost(id) {
    const posts = await getAllPosts();
    const entry = posts.find((post) => post.id === id);
    if (!entry) {
      throw new Error(`Post not found: ${id}`);
    }

    const { Content, headings } = await render(entry);
    return {
      Content,
      headings,
      frontmatter: { ...entry.data, id: entry.id },
    };
  },

  isDraft: isDraftEntry,
};
