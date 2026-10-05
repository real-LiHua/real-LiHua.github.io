// Build Pipeline Module — Public Interface
// 深度模块：统一构建后处理管线 (Pagefind → Link Check → HTML Validate → Mermaid → Watermark)

import type { AstroIntegrationLogger } from "astro";

export interface BuildReport {
  stages: BuildStageResult[];
  success: boolean;
  duration: number;
}

export interface BuildStageResult {
  name: string;
  success: boolean;
  duration: number;
  output?: string;
  error?: string;
}

export interface BuildStage {
  name: string;
  run: (distDir: URL, logger: AstroIntegrationLogger) => Promise<void>;
  timeout?: number; // ms, 默认 60000
}

export interface BuildPipeline {
  /** 执行完整管线 */
  execute(distDir: URL, logger: AstroIntegrationLogger): Promise<BuildReport>;

  /** 注册自定义阶段 (供测试/扩展) */
  registerStage(stage: BuildStage): void;
}

// 内部工具接口 (供阶段复用)
export interface FileWalker {
  findHtmlFiles(dir: URL): Promise<URL[]>;
}

export const buildPipeline: BuildPipeline;