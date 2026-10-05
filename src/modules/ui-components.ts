// UI Components Module — Public Interface
// 深度模块：复合组件模式 + daisyUI 语义类 + TypeScript Props

import type { BlogCollection } from "./types";

// ===== Navbar 复合组件 =====
export interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

export interface NavbarProps {
  /** 品牌区 (左侧) */
  start?: any; // Astro Component
  /** 桌面端导航链接 (中间) */
  center?: NavLink[];
  /** 右侧动作区 (主题切换、搜索等) */
  end?: any; // Astro Component
  /** 移动端抽屉菜单链接 */
  mobileLinks?: NavLink[];
}

// ===== PostCard 变体 =====
export type PostCardVariant = "grid" | "list";

export interface PostCardBaseProps {
  post: BlogCollection["data"] & { id: string };
}

export interface PostCardGridProps extends PostCardBaseProps {
  variant: "grid";
  revealIndex?: number; // 用于 stagger 动画
}

export interface PostCardListProps extends PostCardBaseProps {
  variant: "list";
}

export type PostCardProps = PostCardGridProps | PostCardListProps;

// ===== Tag 组件 =====
export interface TagProps {
  tag: string;
  href?: string; // 默认 `/tags/{tag}/`
  size?: "xs" | "sm" | "md";
  variant?: "ghost" | "outline" | "soft" | "solid";
}

// ===== PagefindSearch 组件 =====
export interface PagefindSearchProps {
  bundlePath?: string;
  placeholder?: string;
  theme?: "auto" | "light" | "dark";
}

// ===== BaseLayout =====
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
  /** 搜索槽位 */
  search?: any; // Astro Component
  /** 主内容槽位 */
  children: any; // slot
}

// 组件工厂函数类型 (供测试/Storybook)
export type ComponentFactory<T extends Record<string, any>> = (props: T) => any;

export const uiComponents: {
  Navbar: ComponentFactory<NavbarProps>;
  PostCardGrid: ComponentFactory<PostCardGridProps>;
  PostCardList: ComponentFactory<PostCardListProps>;
  Tag: ComponentFactory<TagProps>;
  PagefindSearch: ComponentFactory<PagefindSearchProps>;
  BaseLayout: ComponentFactory<BaseLayoutProps>;
};