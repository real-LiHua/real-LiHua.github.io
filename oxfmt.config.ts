import { defineConfig } from "oxfmt";

export default defineConfig({
  jsdoc: true,
  sortTailwindcss: true,
  // Vendored agent-tool mirrors (skills CLI / impeccable installer) are verbatim
  // upstream copies hashed in skills-lock.json — reformatting them forks them
  // and invalidates the lock. markdownlint and oxlint exempt the same paths.
  ignorePatterns: [
    ".*/skills/**",
    ".*/agents/impeccable-*.md",
    ".*/commands/impeccable.md",
    ".impeccable/**",
    // pnpm-generated Python lockfile; formatting it only creates churn
    "pylock.toml",
  ],
});
