import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { cacheGet, cacheSet } from "./cache.js";

const PATH = "/api/translate";
const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const TTL_MS = 30 * 24 * 60 * 60_000;
const TIMEOUT_MS = 8000;
const MAX_ITEMS = 20;
const MAX_TEXT = 4000;
const MAX_TOTAL = 60_000;
const MAX_BODY = 64 * 1024;
const CONCURRENCY = 3;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 60;

interface TranslationBatch {
  texts: string[];
  translated: boolean[];
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

function cacheKey(text: string): string {
  return "translate:id:" + createHash("sha1").update(text).digest("hex");
}

function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

function rateLimited(req: IncomingMessage): boolean {
  const now = Date.now();
  const ip = clientIp(req);
  const bucket = buckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("TOO_LARGE"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function requestTranslation(text: string): Promise<string | null> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", "id");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (compatible; iClix/1.0; +https://iclix-vert.vercel.app)",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    const translated = (data[0] as unknown[])
      .map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
      .join("")
      .trim();
    return translated || null;
  } catch {
    return null;
  }
}

async function translateOne(text: string): Promise<{ text: string; translated: boolean }> {
  const key = cacheKey(text);
  const hit = cacheGet(key);
  if (hit && !hit.stale && typeof hit.data === "string") {
    return { text: hit.data, translated: true };
  }

  const fresh = await requestTranslation(text);
  if (fresh) {
    cacheSet(key, fresh, TTL_MS);
    return { text: fresh, translated: true };
  }
  // Teks lama masih lebih berguna daripada kembali ke bahasa Inggris.
  if (hit && typeof hit.data === "string") return { text: hit.data, translated: true };
  return { text, translated: false };
}

async function translateAll(texts: string[]): Promise<TranslationBatch> {
  const unique = Array.from(new Set(texts));
  const results = new Map<string, { text: string; translated: boolean }>();
  let cursor = 0;

  const worker = async () => {
    while (cursor < unique.length) {
      const index = cursor;
      cursor += 1;
      const source = unique[index];
      results.set(source, await translateOne(source));
    }
  };

  const workers = Array.from({ length: Math.min(CONCURRENCY, unique.length) }, () => worker());
  await Promise.all(workers);

  return {
    texts: texts.map((text) => results.get(text)?.text ?? text),
    translated: texts.map((text) => results.get(text)?.translated ?? false),
  };
}

function send(res: ServerResponse, status: number, body: unknown, cacheSeconds = 0): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader(
    "cache-control",
    cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : "no-store",
  );
  res.setHeader("x-content-type-options", "nosniff");
  res.end(JSON.stringify(body));
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    send(res, 405, { ok: false, code: "METHOD", message: "Gunakan POST." });
    return;
  }
  if (rateLimited(req)) {
    send(res, 429, { ok: false, code: "RATE_LIMIT", message: "Terlalu banyak permintaan terjemahan." });
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    send(res, 400, { ok: false, code: "BAD_BODY", message: "Isi permintaan tidak valid." });
    return;
  }

  const raw = (payload as { texts?: unknown } | null)?.texts;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ITEMS) {
    send(res, 400, { ok: false, code: "BAD_BODY", message: "Daftar teks tidak valid." });
    return;
  }

  const texts: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") {
      send(res, 400, { ok: false, code: "BAD_BODY", message: "Setiap teks harus berupa string." });
      return;
    }
    const text = item.trim();
    if (!text || text.length > MAX_TEXT) {
      send(res, 400, { ok: false, code: "BAD_BODY", message: "Panjang teks tidak valid." });
      return;
    }
    texts.push(text);
  }
  if (texts.reduce((total, text) => total + text.length, 0) > MAX_TOTAL) {
    send(res, 400, { ok: false, code: "BAD_BODY", message: "Total teks terlalu panjang." });
    return;
  }

  const data = await translateAll(texts);
  send(res, 200, { ok: true, data }, 86_400);
}

type Next = ((err?: unknown) => void) | undefined;

export function createTranslateHandler(
  req: IncomingMessage,
  res: ServerResponse,
  next?: Next,
): void {
  const url = req.url || "/";
  if (url !== PATH && !url.startsWith(PATH + "?")) {
    next?.();
    return;
  }

  const parsed = new URL(url, "http://localhost");
  if (parsed.pathname !== PATH) {
    next?.();
    return;
  }

  void handle(req, res).catch(() => {
    send(res, 500, { ok: false, code: "SERVER", message: "Terjemahan gagal diproses." });
  });
}
