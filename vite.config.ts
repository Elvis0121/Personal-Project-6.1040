import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  plugins: [vue()],
  server: {
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
    fs: { allow: [".."] },
    proxy: { "/api": process.env.BACKEND_URL ?? "http://127.0.0.1:3000" },
  },
});
