import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

let isDev = process.env.NODE_ENV === "development";

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        // css: isDev ? 'injected' : undefined,
      }
    })
  ],
  resolve: {
    alias: {
      $lib: resolve(__dirname, "./src/lib"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: isDev ? false : "esbuild",
    sourcemap: isDev ? 'inline' : false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        options: resolve(__dirname, "src/options/index.html"),
        "content-script": resolve(__dirname, "src/content/content-script.ts"),
        "service-worker": resolve(__dirname, "src/background/service-worker.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "content-script") {
            return "content/content-script.js";
          }
          if (chunkInfo.name === "service-worker") {
            return "background/service-worker.js";
          }
          return "assets/[name].js";
        },
        chunkFileNames: "assets/chunks/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name.endsWith('.css')) {
            return "assets/[name][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});