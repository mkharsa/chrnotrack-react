import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  define: {
    "import.meta.env.VITE_FIREBASE_API_KEY": JSON.stringify(process.env.VITE_FIREBASE_API_KEY ?? ""),
    "import.meta.env.BASE_URL": JSON.stringify("./"),
  },
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/export"),
    emptyOutDir: true,
    target: "esnext",
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
});
