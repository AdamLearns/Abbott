/* eslint-env node */
module.exports = {
  // This only stops VSCode from giving me lint errors on the file. To stop
  // lint-staged from giving me errors, we just have to change the glob that
  // lint-staged tries matching.
  ignorePatterns: ["vitest.config.ts"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
}
