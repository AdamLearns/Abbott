import node from "@astrojs/node"
import tailwind from "@astrojs/tailwind"
import { defineConfig } from "astro/config"

// https://astro.build/config
export default defineConfig({
  server: {
    port: 3000,
  },
  integrations: [tailwind()],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
})
