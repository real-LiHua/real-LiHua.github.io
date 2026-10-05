// Content Pipeline Module — Public Interface
// 深度模块：封装 Content Collections + Schema + Rendering + RSS/Sitemap

import type { CollectionEntry } from "astro:content";
import type { PostFrontmatter, TelegramAuthConfig, BlogCollection } from "./types";

export interface RenderedPost {
  Content: any; // Astro Component
  headings: Array<{ depth: number; slug: string; text: string }>;
  frontmatter: PostFrontmatter & { id: string };
}

export interface ContentPipeline {
  /** 获取已发布文章（按日期倒序） */
  getPublishedPosts(): Promise<BlogCollection[]>;

  /** 获取草稿文章 */
  getDraftPosts(): Promise<BlogCollection[]>;

  /** 获取所有文章（开发环境用） */
  getAllPosts(): Promise<BlogCollection[]>;

  /** 渲染单篇文章，返回组件 + 目录 + 前置数据 */
  renderPost(id: string): Promise<RenderedPost>;

  /** 判断是否为草稿 */
  isDraft(entry: { id: string }): boolean;
}

// 单例导出（实现见 src/utils/content.ts）
export const contentPipeline: ContentPipeline;