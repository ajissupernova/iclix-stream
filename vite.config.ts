import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createApiHandler } from "./server/api";
import { createTranslateHandler } from "./server/translate";
import { createSiteContentHandler } from "./server/siteContent";

// Proxy TMDb dan penerjemah yang sama dipakai di dev (middleware Vite) dan
// produksi (server/index.ts), sehingga API key tidak pernah mencapai browser.
function tmdbApi(): Plugin {
  return {
    name: "iclix-tmdb-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) =>
        createTranslateHandler(req, res, () => createSiteContentHandler(req, res, () => createApiHandler(req, res, next))),
      );
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) =>
        createTranslateHandler(req, res, () => createSiteContentHandler(req, res, () => createApiHandler(req, res, next))),
      );
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [react(), tmdbApi()],
});
