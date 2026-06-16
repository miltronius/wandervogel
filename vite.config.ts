import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { proxyOrsRequest } from "./api/_lib/orsProxy";

/**
 * Mirrors api/route.ts locally so `npm run dev` works without the Vercel CLI.
 * Keeps ORS_API_KEY server-side only — never exposed to the client bundle.
 */
function orsDevProxyPlugin(orsApiKey: string | undefined): Plugin {
  return {
    name: "ors-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/api/route", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: { message: "Method not allowed" } }));
          return;
        }
        let raw = "";
        req.on("data", (chunk) => (raw += chunk));
        req.on("end", async () => {
          try {
            const body = raw ? JSON.parse(raw) : {};
            const result = await proxyOrsRequest(orsApiKey, body);
            res.statusCode = result.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result.body));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: { message: "Invalid request body" } }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss(), orsDevProxyPlugin(env.ORS_API_KEY)],
  };
});
