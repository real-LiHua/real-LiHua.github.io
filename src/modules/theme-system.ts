// Theme System Module — Public Interface
// 深度模块：CSS 变量 Token + daisyUI 主题 + prose 适配 + 运行时切换

export type ThemeMode = "light" | "dark";

export interface ThemeTokens {
  // 由 theme-tokens.css 定义，这里仅作类型记录
  colors: {
    base100: string;
    base200: string;
    base300: string;
    baseContent: string;
    primary: string;
    primaryContent: string;
    secondary: string;
    secondaryContent: string;
    accent: string;
    accentContent: string;
    neutral: string;
    neutralContent: string;
    info: string;
    infoContent: string;
    success: string;
    successContent: string;
    warning: string;
    warningContent: string;
    error: string;
    errorContent: string;
  };
  radii: {
    selector: string;
    field: string;
    box: string;
  };
  sizes: {
    selector: string;
    field: string;
  };
  border: string;
  depth: number;
  noise: number;
  // @tailwindcss/typography prose 变量
  prose: {
    body: string;
    headings: string;
    lead: string;
    links: string;
    bold: string;
    counters: string;
    bullets: string;
    hr: string;
    quotes: string;
    quoteBorders: string;
    captions: string;
    code: string;
    preCode: string;
    preBg: string;
    thBorders: string;
    tdBorders: string;
  };
}

export interface ThemeSystem {
  /** 初始化：读取 localStorage + 系统偏好，应用到 document.documentElement */
  init(): void;

  /** 切换主题并持久化 */
  toggleTheme(mode: ThemeMode): void;

  /** 获取当前主题 */
  getCurrentTheme(): ThemeMode;

  /** 监听主题变化 */
  onThemeChange(callback: (mode: ThemeMode) => void): () => void;
}

// CSS 变量契约：在 theme-tokens.css 中定义
// :root / [data-theme="light"] / [data-theme="dark"]
// 所有 --color-*、--radius-*、--size-*、--border、--depth、--noise、--tw-prose-*
export const themeSystem: ThemeSystem;