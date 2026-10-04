import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  // Relative base so the build works on GitHub Pages project URLs
  // (prit-007.github.io/SwapFOSS/), local previews, and any subpath.
  base: "./",
  build: {
    rollupOptions: {
      input: {
        index: "index.html",
        batch: "batch.html",
        create: "create.html",
        card: "card.html",
        slide: "slide.html",
      },
    },
  },
});
