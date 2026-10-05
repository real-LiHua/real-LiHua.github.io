// Search Module — Public Interface
// 深度模块：Pagefind 索引生成 + 搜索 UI 组件 + 主题适配

export interface SearchConfig {
  /** 索引文件路径 (相对于站点根目录) */
  bundlePath?: string; // 默认 "/pagefind/"
  /** 搜索框占位符 */
  placeholder?: string; // 默认 "搜索文章..."
  /** 主题适配: 自动跟随 daisyUI data-theme */
  theme?: "auto" | "light" | "dark";
}

export interface SearchModule {
  /** 生成搜索索引 (构建期调用) */
  generateIndex(distDir: URL): Promise<void>;

  /** 搜索 UI 组件 Props (供 Astro 组件使用) */
  SearchComponentProps: SearchConfig;

  /** 手动触发搜索 (客户端高级用法) */
  search(query: string, options?: { filters?: Record<string, string[]> }): Promise<SearchResult[]>;
}

export interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
  meta: Record<string, string[]>;
  score: number;
}

export const searchModule: SearchModule;