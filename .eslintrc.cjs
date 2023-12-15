/* eslint-env node */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "@hideoo",
    "prettier",
  ],
  rules: {
    "no-console": "off",
    "@typescript-eslint/no-unsafe-call": "off",
  },
  overrides: [
    // Disable the linting rule on file names in the migrations folder because
    // the migration names contain the letter "T" for the timestamp
    {
      files: ["src/database/migrations/*T*.ts"],
      rules: {
        "unicorn/filename-case": "off",
      },
    },
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
}
