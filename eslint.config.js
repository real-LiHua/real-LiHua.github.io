import eslintPluginAstro from "eslint-plugin-astro";
export default [
  ...eslintPluginAstro.configs.recommended,
  {
    rules: {
      "astro/no-set-html-directive": "error",
      "astro/no-set-text-directive": "error",
      "astro/no-unused-css-selector": "error",
      "astro/sort-attributes": "error",
      "astro/jsx-a11y/aria-proptypes": "error",
      "astro/jsx-a11y/aria-role": "error",
    },
  },
];
