/* eslint-env node */
module.exports = {
  overrides: [
    {
      extends: [
        "plugin:astro/recommended",
        "plugin:astro/jsx-a11y-recommended",
      ],
      files: ["*.astro"],
      // Allows Astro components to be parsed.
      parser: "astro-eslint-parser",
      // Parse the script in `.astro` as TypeScript by adding the following configuration.
      // It's the setting you need when using TypeScript.
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.json"],
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
      rules: {},
    },
    {
      // When you use <script> tags in Astro, eslint will see them as .astro/.js
      // files.
      files: ["**/*.astro/*.js", "*.astro/*.js"],
      rules: {
        "no-undef": "off",
      },
    },
  ],
}
