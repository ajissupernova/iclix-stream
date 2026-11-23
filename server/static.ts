import { createReadStream, existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

type Next = ((err?: unknown) => void) | undefined;

export function createStaticHandler(rootDir: string) {
  const root = resolve(rootDir);

  return (req: IncomingMessage, res: ServerResponse, next?: Next): void => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next?.();
      return;
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname);
    } catch {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }

    const filePath = resolve(root, "." + pathname);
    // rootPath dipakai alih-alih root + "/" agar berlaku juga di Windows (backslash).
    const rootPath = root.endsWith(sep) ? root : root + sep;
    if (filePath !== root && !filePath.startsWith(rootPath)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = extname(filePath);
      res.statusCode = 200;
      res.setHeader("content-type", MIME[ext] || "application/octet-stream");
      // File build berganti nama saat build ulang, jadi boleh disimpan lama di browser.
      res.setHeader("cache-control", pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache");
      createReadStream(filePath).pipe(res);
      return;
    }

    // Rute SPA (mis. /film/603) dilayani index.html.
    const indexPath = resolve(root, "index.html");
    if (existsSync(indexPath) && (pathname.includes(".") ? extname(pathname) === "" : true)) {
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.setHeader("cache-control", "no-cache");
      createReadStream(indexPath).pipe(res);
      return;
    }

    next?.();
  };
}
