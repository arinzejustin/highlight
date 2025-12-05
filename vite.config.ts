import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 3000, // or any port you prefer
  },
  resolve: {
    alias: {
      $lib: resolve(__dirname, "./src/lib"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        options: resolve(__dirname, "src/options/index.html"),
        "content-script": resolve(__dirname, "src/content/content-script.ts"),
        "service-worker": resolve(
          __dirname,
          "src/background/service-worker.ts",
        ),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "content-script") {
            return "content/content-script.js";
          }
          if (chunkInfo.name === "service-worker") {
            return "background/service-worker.js";
          }
          return "[name].js";
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "content-style.css") {
            return "content/content-style.css";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
