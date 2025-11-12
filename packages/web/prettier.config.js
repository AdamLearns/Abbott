/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import baseConfig from "../../../prettier.config.js"

/** @type {import("prettier").Config} */
const config = {
  ...baseConfig,
  plugins: [
    "prettier-plugin-astro",
    "prettier-plugin-tailwindcss", // must be loaded last: https://github.com/tailwindlabs/prettier-plugin-tailwindcss#compatibility-with-other-prettier-plugins
  ],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
}

export default config
