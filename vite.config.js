import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend build. In dev, /api/* is proxied to `wrangler dev` (see package.json's
// `dev` script, which runs vite and wrangler side by side) so the browser never
// deals with cross-origin requests — same as in production, where the Worker
// serves both the built assets and the API from one origin.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
