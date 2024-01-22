/* eslint-env node */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "@hideoo", // this includes Astro
    "prettier",
  ],
  rules: {
    "no-console": "off",
    "@typescript-eslint/no-unsafe-call": "off",
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
}
