/* eslint-env node */
module.exports = {
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
}
