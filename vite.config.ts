import { crx } from "@crxjs/vite-plugin"
import preact from "@preact/preset-vite"
import { defineConfig } from "vite"
import manifest from "./public/manifest.json"

export default defineConfig({
  plugins: [preact(), crx({ manifest })],
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
