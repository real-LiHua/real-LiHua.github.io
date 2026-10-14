// Shared type contracts for the blog.
//
// Single source of truth for cross-module types. Every deep module imports its
// public shapes from here so pages, integrations and client scripts agree on
// the same contracts (see docs/architecture-map.md — "Interface Contract Matrix").
//
// The Zod schemas intentionally mirror `src/content.config.ts`; both must stay
// in sync. `content.config.ts` is the runtime validator, this file is the type
// contract other modules compile against.

import type { CollectionEntry } from "astro:content";
import { z } from "astro/zod";

// ===== Frontmatter schema (keep in sync with src/content.config.ts) =====

export const telegramAuthSchema = z
  .object({
    enabled: z.boolean(),
    groupId: z.string(),
    groupName: z.string().optional(),
    customMessage: z.string().optional(),
  })
  .optional();

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

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;
export type TelegramAuthConfig = z.infer<typeof telegramAuthSchema>;
export type BlogCollection = CollectionEntry<"blog">;

// ===== Rendered content =====

export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export interface RenderedPost {
  Content: unknown; // Astro component
  headings: Heading[];
  frontmatter: PostFrontmatter & { id: string };
}

// ===== Build pipeline =====

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

export interface BuildStage {
  name: string;
  run: (distDir: URL, logger: BuildLogger) => Promise<void>;
  timeout?: number;
}

export interface BuildLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

// ===== Search =====

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

// ===== Theme =====

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

// ===== Client runtime (see docs/adr/0007-client-module-registry.md) =====

export interface ClientUtils {
  query: <T extends Element>(selector: string) => T | null;
  queryAll: <T extends Element>(selector: string) => NodeListOf<T>;
  on: (element: Element, event: string, listener: EventListener) => () => void;
}

export interface ClientContext {
  document: Document;
  window: Window & {
    PagefindComponents?: {
      configureInstance: (name: string, config: unknown) => void;
    };
  };
  routerEvents: {
    onPageLoad: (fn: () => void) => void;
    onAfterSwap: (fn: () => void) => void;
    onBeforePreparation?: (fn: (event: unknown) => void) => void;
  };
  utils: ClientUtils;
}

export type ClientModuleInit = (ctx: ClientContext) => void | Promise<void>;

export type ClientLifecycleHook = "pageLoad" | "afterSwap";

export interface ClientModuleRegistration {
  name: string;
  init: ClientModuleInit;
  /** Module names that must initialise before this one. */
  dependsOn?: string[];
  /** Lifecycle hooks to run on (default: both). */
  runOn?: ClientLifecycleHook[];
  /** Initialise at most once per document. */
  once?: boolean;
  /** Skip initialisation unless the predicate passes. */
  condition?: (ctx: ClientContext) => boolean;
}

export interface ClientRuntime {
  registerModule(registration: ClientModuleRegistration): void;
  unregisterModule(name: string): void;
  getModule(name: string): ClientModuleRegistration | undefined;
  start(): void;
  stop(): void;
}

// ===== UI component props =====

export interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

export type PostCardVariant = "grid" | "list";

export interface PostCardBaseProps {
  post: BlogCollection;
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
  children: unknown;
}

// ===== Telegram auth =====

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
