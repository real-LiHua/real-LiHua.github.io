// Module Index — 统一导出所有深度模块接口
// 调用者仅需：import { contentPipeline, buildPipeline, ... } from "@/modules"

export * from "./types";

// 核心业务模块
export { contentPipeline } from "./content-pipeline";
export { buildPipeline } from "./build-pipeline";
export { themeSystem } from "./theme-system";
export { searchModule } from "./search";
export { clientRuntime, ClientModuleNames } from "./client-runtime";
export { telegramAuthModule } from "./telegram-auth";

// UI 组件库 (复合组件模式)
export { uiComponents } from "./ui-components";

// 便捷类型别名
export type {
  ContentPipeline,
  BuildPipeline,
  ThemeSystem,
  SearchModule,
  ClientRuntime,
  TelegramAuthModule,
  UIComponents,
} from "./types";
