import type { IncomingMessage, ServerResponse } from "node:http";
import { createApiHandler } from "../server/api.js";
import { createSiteContentHandler } from "../server/siteContent.js";
import { createTranslateHandler } from "../server/translate.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  const originalPath = requestUrl.searchParams.get("__vercel_route_path");
  if (originalPath) {
    requestUrl.searchParams.delete("__vercel_route_path");
    const query = requestUrl.searchParams.toString();
    req.url = `/api${originalPath}${query ? `?${query}` : ""}`;
  }

  createTranslateHandler(req, res, () =>
    createSiteContentHandler(req, res, () =>
      createApiHandler(req, res, () => {
        res.statusCode = 404;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Endpoint tidak ditemukan." }));
      }),
    ),
  );
}
