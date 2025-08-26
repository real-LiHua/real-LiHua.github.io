/** @type {import('stylelint').Config} */
export default {
  extends: [
    "stylelint-config-standard",
    "stylelint-config-html/html",
    "stylelint-config-html/xml",
    "stylelint-config-html/astro",
  ],
  rules: {
    "at-rule-no-unknown": [true, { ignoreAtRules: ["plugin"] }],
    "import-notation": "string",
  },
};
