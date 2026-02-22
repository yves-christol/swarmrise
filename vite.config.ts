import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  // tailwindcss() can return a plugin shape that's not strongly typed as a Vite Plugin
  // in some versions; cast to `any` here to avoid the TS overload error (TS2769).
  plugins: [react(), tailwindcss() as unknown as any],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router"],
          "vendor-clerk": ["@clerk/clerk-react", "@clerk/themes"],
          "vendor-convex": ["convex", "convex/react", "convex/react-clerk"],
          "vendor-i18n": ["i18next", "react-i18next", "i18next-browser-languagedetector", "i18next-http-backend"],
          "vendor-d3": ["d3-force"],
          "vendor-markdown": ["react-markdown", "remark-gfm", "remark-breaks"],
        },
      },
    },
  },
});
