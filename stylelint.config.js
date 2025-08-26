/** @type {import('stylelint').Config} */
export default {
  extends: [
    "stylelint-config-standard",
    "stylelint-config-html/html",
    "stylelint-config-html/xml",
    "stylelint-config-html/vue",
    "stylelint-config-html/svelte",
    "stylelint-config-html/astro",
    "stylelint-config-html/php",
  ],
  rules: {
    "at-rule-no-unknown": [true, { ignoreAtRules: ["plugin"] }],
  },
};
