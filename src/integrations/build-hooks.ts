import type { AstroIntegration } from "astro";
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const pagefindPublic = path.resolve(root, "public/pagefind");

const run = (cmd: string, cwd = root): void => {
  execSync(cmd, { cwd, stdio: "inherit" });
};

export const buildHooksIntegration = (): AstroIntegration => ({
  hooks: {
    "astro:build:done": ({ logger }): void => {
      // Run pagefind indexing
      logger.info("Running Pagefind indexing...");
      run("pagefind --site dist/client", root);
      run("ln -sf ../dist/client/pagefind public/pagefind", root);
      logger.info("Pagefind indexing complete");

      // Run link checker
      logger.info("Running link checker...");
      run("lychee dist/client", root);
      logger.info("Link checker complete");

      // Run HTML validator
      logger.info("Running HTML validator...");
      run("vnu --skip-non-html dist/client", root);
      logger.info("HTML validator complete");
    },
    "astro:build:start": ({ logger }): void => {
      // Clean pagefind public symlink before build
      if (existsSync(pagefindPublic)) {
        rmSync(pagefindPublic);
        logger.info("Cleaned public/pagefind");
      }
    },
  },
  name: "build-hooks",
});
