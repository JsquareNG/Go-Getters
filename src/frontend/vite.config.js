import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  server: {
    proxy: {
      '/bell': {
        target: 'https://go-getters-onboarding.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./setUpTests.js",
  },
});
