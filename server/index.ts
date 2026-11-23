import { createServer } from "node:http";
import { resolve } from "node:path";
import { createApiHandler } from "./api.js";
import { hasTmdbCredentials, serverPort } from "./env.js";
import { createStaticHandler } from "./static.js";
import { createTranslateHandler } from "./translate.js";
import { createSiteContentHandler } from "./siteContent.js";

const staticHandler = createStaticHandler(resolve(process.cwd(), "dist"));

const server = createServer((req, res) => {
  createTranslateHandler(req, res, () => {
    createSiteContentHandler(req, res, () => createApiHandler(req, res, () => {
      staticHandler(req, res, () => {
        res.statusCode = 404;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("Tidak ditemukan");
      });
    }));
  });
});

server.listen(serverPort, () => {
  console.log(`iClix berjalan di http://localhost:${serverPort}`);
  if (!hasTmdbCredentials) {
    console.warn("TMDB_API_KEY / TMDB_READ_ACCESS_TOKEN belum diisi di .env, semua permintaan data akan ditolak.");
  }
});
