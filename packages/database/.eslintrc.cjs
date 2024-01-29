/* eslint-env node */
module.exports = {
  overrides: [
    // Disable the linting rule on file names in the migrations folder because
    // the migration names contain the letter "T" for the timestamp
    {
      files: ["src/migrations/*T*.ts"],
      rules: {
        "unicorn/filename-case": "off",
      },
    },
  ],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
}
