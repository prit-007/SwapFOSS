/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // Deployed at the GitHub Pages project subpath (prit-007.github.io/SwapFOSS/),
  // so the base is the repo-name path. Override with VITE_BASE=/ for a root
  // deployment or local serving of dist/ at the origin.
  base: process.env.VITE_BASE || "/SwapFOSS/",
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.spec.ts", "tests/unit/**/*.spec.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});
