/* eslint-env node */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:unicorn/recommended",
    "plugin:import/recommended",

    // This contains everything from "plugin:@typescript-eslint/recommended",
    // "[...]/recommended-type-checked", and "[...]/strict"
    "plugin:@typescript-eslint/strict-type-checked",
    "prettier",
  ],
  ignorePatterns: [".eslintrc.cjs", "**/dist"],
  rules: {
    "no-console": "off",
    "@typescript-eslint/no-unsafe-call": "off",

    "import/first": "error",
    "import/no-anonymous-default-export": "error",
    "import/no-mutable-exports": "error",
    "import/no-unresolved": "off",
    "import/order": [
      "warn",
      {
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],

    "no-only-tests/no-only-tests": "warn",

    "unicorn/filename-case": [
      "error",
      { cases: { camelCase: true, kebabCase: true, pascalCase: true } },
    ],
    "unicorn/no-null": "off",
    "unicorn/no-process-exit": "off",
    "unicorn/no-useless-undefined": "off",
    "unicorn/prefer-export-from": ["error", { ignoreUsedVariables: true }],
    "unicorn/prefer-module": "off",
    "unicorn/prefer-top-level-await": "off",
    "unicorn/prevent-abbreviations": "off",

    // This is when you specify a "() => Promise<void>" when "() => void" is
    // expected.
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: false,
      },
    ],
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint", "no-only-tests"],
  root: true,
}
