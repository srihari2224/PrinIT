import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    chunkSizeWarningLimit: 1500, // increases the warning threshold
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // All node_modules go into vendor.js
            return "vendor";
          }
          if (id.includes("pdfjs-dist")) {
            return "pdfjs"; // separate heavy lib
          }
          if (id.includes("sharp")) {
            return "sharp"; // separate native module
          }
        }
      }
    }
  },
  server: {
    port: 5173,
  },
});
