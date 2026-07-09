import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Build straight into the Python package so the wheel ships the app.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../src/rxsweep/webapp/static",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8555",
    },
  },
});
