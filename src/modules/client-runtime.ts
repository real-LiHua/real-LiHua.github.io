// Client Runtime Module — Public Interface
// 深度模块：统一客户端入口 + 模块注册表 + 生命周期分发

export interface ClientContext {
  document: Document;
  window: Window & {
    PagefindComponents?: {
      configureInstance: (name: string, config: any) => void;
    };
  };
  routerEvents: {
    /** 页面加载完成 (含 View Transitions 后) */
    onPageLoad: (fn: () => void) => void;
    /** DOM 交换后、动画前 */
    onAfterSwap: (fn: () => void) => void;
    /** 准备阶段开始 */
    onBeforePreparation: (fn: (event: any) => void) => void;
  };
}

export type ClientModuleInit = (ctx: ClientContext) => void | Promise<void>;

export interface ClientModuleRegistration {
  name: string;
  init: ClientModuleInit;
  /** 依赖的模块名 (先初始化) */
  deps?: string[];
}

export interface ClientRuntime {
  /** 注册客户端模块 */
  registerModule(reg: ClientModuleRegistration): void;

  /** 启动运行时 (在 BaseLayout 中调用一次) */
  start(): void;

  /** 获取已注册模块列表 (调试用) */
  getRegisteredModules(): string[];
}

// 预定义模块名常量
export const ClientModuleNames = {
  THEME_TOGGLE: "theme-toggle",
  TOC: "toc",
  READING_PROGRESS: "reading-progress",
  SCROLL_REVEAL: "scroll-reveal",
  TILT_CARD: "tilt-card",
  CODE_COPY: "code-copy",
  TELEGRAM_AUTH: "telegram-auth",
  GRAVATAR_FALLBACK: "gravatar-fallback",
} as const;

export const clientRuntime: ClientRuntime;