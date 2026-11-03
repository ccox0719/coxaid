import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is served straight from the repository root (Netlify, no build
// command), so the production build is written one level up, into the root.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "..", emptyOutDir: false },
});
