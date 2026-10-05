// Shared Types — 从 content.config.ts 导出的类型契约
// 供所有模块复用，消除 as unknown as

import type { CollectionEntry } from "astro:content";
import { z } from "astro/zod";

// ===== Frontmatter Schema (与 content.config.ts 保持同步) =====
export const telegramAuthSchema = z.object({
  enabled: z.boolean(),
  groupId: z.string(),
  groupName: z.string().optional(),
  customMessage: z.string().optional(),
}).optional();

export const postFrontmatterSchema = z.object({
  authors: z.array(z.string()).optional(),
  description: z.string().optional().nullable(),
  image: z.string().optional(),
  publishDate: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
  telegramAuth: telegramAuthSchema,
  title: z.coerce.string(),
  updatedDate: z.coerce.date().optional(),
});

// 类型导出
export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;
export type TelegramAuthConfig = z.infer<typeof telegramAuthSchema>;
export type BlogCollection = CollectionEntry<"blog">;

// ===== Rendered Types =====
export interface RenderedPostData {
  Content: any; // Astro Component
  headings: Array<{
    depth: number;
    slug: string;
    text: string;
  }>;
  frontmatter: PostFrontmatter & { id: string };
}

// ===== Build Pipeline Types =====
export interface BuildStageResult {
  name: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
}

export interface BuildReport {
  stages: BuildStageResult[];
  success: boolean;
  duration: number;
}

// ===== Search Types =====
export interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
  meta: Record<string, string[]>;
  score: number;
}

export interface SearchConfig {
  bundlePath?: string;
  placeholder?: string;
  theme?: "auto" | "light" | "dark";
}

// ===== Theme Types =====
export type ThemeMode = "light" | "dark";

export interface ThemeTokens {
  colors: Record<string, string>;
  radii: Record<string, string>;
  sizes: Record<string, string>;
  border: string;
  depth: number;
  noise: number;
  prose: Record<string, string>;
}

// ===== Client Runtime Types =====
export interface ClientContext {
  document: Document;
  window: Window & {
    PagefindComponents?: {
      configureInstance: (name: string, config: any) => void;
    };
  };
  routerEvents: {
    onPageLoad: (fn: () => void) => void;
    onAfterSwap: (fn: () => void) => void;
    onBeforePreparation: (fn: (event: any) => void) => void;
  };
}

export type ClientModuleInit = (ctx: ClientContext) => void | Promise<void>;

export interface ClientModuleRegistration {
  name: string;
  init: ClientModuleInit;
  deps?: string[];
}

// ===== UI Component Props Types =====
export interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

export interface NavbarProps {
  start?: any;
  center?: NavLink[];
  end?: any;
  mobileLinks?: NavLink[];
}

export type PostCardVariant = "grid" | "list";

export interface PostCardBaseProps {
  post: BlogCollection["data"] & { id: string };
}

export interface PostCardGridProps extends PostCardBaseProps {
  variant: "grid";
  revealIndex?: number;
}

export interface PostCardListProps extends PostCardBaseProps {
  variant: "list";
}

export type PostCardProps = PostCardGridProps | PostCardListProps;

export interface TagProps {
  tag: string;
  href?: string;
  size?: "xs" | "sm" | "md";
  variant?: "ghost" | "outline" | "soft" | "solid";
}

export interface PagefindSearchProps {
  bundlePath?: string;
  placeholder?: string;
  theme?: "auto" | "light" | "dark";
}

export interface BaseLayoutProps {
  title?: string;
  description?: string;
  pagefind?: boolean;
  publishDate?: Date | string;
  updatedDate?: Date | string;
  authors?: string[];
  tags?: string[];
  image?: string;
  url?: string;
  canonical?: string;
  search?: any;
  children: any;
}

// ===== Telegram Auth Types =====
export interface TelegramAuthWallProps {
  postId: string;
  groupName: string;
  customMessage: string;
  botUsername: string;
}

export interface TelegramAuthStatus {
  verified: boolean;
  expiresAt?: number;
  groupId: string;
}