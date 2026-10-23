import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

/** localhost and 127.0.0.1 are different origins; the session cookie only sticks on 127.0.0.1. */
function bounceLocalhost() {
  return {
    name: "bounce-localhost",
    configureServer(server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        const host = String(req.headers.host ?? "");
        if (host.startsWith("localhost")) {
          res.statusCode = 302;
          res.setHeader("Location", `http://127.0.0.1:8080${req.url ?? "/"}`);
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: "web",
  plugins: [vue(), bounceLocalhost()],
  server: {
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
    fs: { allow: [".."] },
    proxy: { "/api": process.env.BACKEND_URL ?? "http://127.0.0.1:3000" },
  },
});
