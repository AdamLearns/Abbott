import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
