// Astro integration adapter for the BuildPipeline deep module.
//
// The working-tree `astro.config.ts` imports `buildPipelineIntegration` from
// here; it is deliberately thin — all stage logic lives in
// `src/modules/build-pipeline.ts`.

import type { AstroIntegration } from "astro";
import { buildPipeline } from "@/modules/build-pipeline";

export const buildPipelineIntegration = (): AstroIntegration => ({
  name: "build-pipeline",
  hooks: {
    "astro:build:done": async ({ dir, logger }): Promise<void> => {
      const report = await buildPipeline.execute(dir, logger);
      if (!report.success) {
        const failed = report.stages.filter((stage) => !stage.success).map((stage) => stage.name);
        logger.warn(`Build pipeline finished with failures: ${failed.join(", ")}`);
      }
    },
  },
});
