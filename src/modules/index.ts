// Module index — the only barrel consumers should import from.
// Pages/endpoints import named deep modules from here; client components import
// from `@/modules/<name>` directly to avoid pulling Node-only code into the bundle.

export * from "./types";
export { contentPipeline } from "./content-pipeline";
export { buildPipeline } from "./build-pipeline";
export { themeSystem } from "./theme-system";
export { searchModule } from "./search";
export { clientRuntime } from "./client-runtime";
export { telegramAuth } from "./telegram-auth";
export { uiComponents } from "./ui-components";
