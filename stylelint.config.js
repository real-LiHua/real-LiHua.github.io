/** @type {import('stylelint').Config} */
export default {
  customSyntax: "postcss-html",
  extends: [
    "stylelint-config-standard",
    "stylelint-config-html/html",
    "stylelint-config-html/xml",
    "stylelint-config-html/astro",
  ],
  ignoreFiles: [
    "dist/**",
    "node_modules/**",
    "**/*.svg",
    "**/*.png",
    "**/*.jpg",
    "**/*.webp",
    "**/*.ico",
    "**/*.txt",
    "**/*.mjs",
    "**/*.js",
    "**/*.ts",
    "**/*.json",
    "**/*.jsonc",
    "**/*.md",
    "**/*.mdx",
    "**/*.d.ts",
    "**/*.astro~",
    "AGENTS.md",
  ],
  rules: {
    "at-rule-no-unknown": [true, { ignoreAtRules: ["plugin"] }],
    "import-notation": "string",
  },
};
