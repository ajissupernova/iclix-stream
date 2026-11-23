import { randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { get, put } from "@vercel/blob";

interface SiteContent {
  spotlight: { mode: "popular" | "trending" | "random" | "manual"; titleIds: CuratedTitle[] };
  homeSections: Array<{ id: string; kind: "catalog" | "collection" | "collection-group"; key?: string; collectionId?: string; groupId?: string; title?: string; visible: boolean }>;
  collections: Array<{
    id: string; slug: string; title: string; description: string; logoUrl: string; backdropUrl: string;
    homeStyle: "banner" | "tile"; homeCrop: { x: number; y: number }; pageCrop: { x: number; y: number };
    showOnHome: boolean; titleIds: CuratedTitle[];
    sections: Array<{ id: string; title: string; kind: "watch-order" | "titles" | "text"; description?: string; titleIds?: CuratedTitle[] }>;
  }>;
  collectionGroups: Array<{ id: string; title: string; collectionIds: string[] }>;
  announcement: { enabled: boolean; text: string };
  updatedAt: string | null;
}

interface CuratedTitle {
  id: number;
  type: "movie" | "tv";
  watchOrder?: string;
  label?: string;
  posterPath?: string;
}

const DEFAULT_SITE_CONTENT: SiteContent = {
  spotlight: { mode: "trending", titleIds: [] },
  homeSections: [
    { id: "trending", kind: "catalog", key: "trending", visible: true },
    { id: "popular-movies", kind: "catalog", key: "popular-movies", visible: true },
    { id: "top-rated", kind: "catalog", key: "top-rated", visible: true },
    { id: "now-playing", kind: "catalog", key: "now-playing", visible: true },
    { id: "upcoming", kind: "catalog", key: "upcoming", visible: true },
    { id: "popular-tv", kind: "catalog", key: "popular-tv", visible: true },
    { id: "trending-tv", kind: "catalog", key: "trending-tv", visible: true },
    { id: "top-rated-tv", kind: "catalog", key: "top-rated-tv", visible: true },
  ],
  collections: [],
  collectionGroups: [],
  announcement: { enabled: false, text: "" },
  updatedAt: null,
};

const DATA_DIR = resolve(process.cwd(), ".data");
const DATA_FILE = resolve(DATA_DIR, "site-content.json");
const UPLOAD_DIR = resolve(DATA_DIR, "uploads");
const STORE_BLOB_PATH = "iclix/site-content.json";
const SESSION_COOKIE = "iclix_admin";
const SESSION_LIFETIME = 12 * 60 * 60 * 1000;
const MAX_BODY = 4_400_000;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim() || "";
const failedUnlocks = new Map<string, { count: number; resetAt: number }>();

function useBlobStorage(): boolean {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

function requirePersistentStorage(): void {
  if (process.env.VERCEL && !useBlobStorage()) {
    throw new Error("BLOB_STORAGE_NOT_CONFIGURED");
  }
}

interface Store {
  published: SiteContent;
  draft: SiteContent;
  history: Array<{ savedAt: string; label: string; content: SiteContent }>;
}

function initialStore(): Store {
  const content = structuredClone(DEFAULT_SITE_CONTENT);
  return { published: content, draft: structuredClone(content), history: [] };
}

function normalizeContent(content: SiteContent): SiteContent {
  return {
    ...content,
    collectionGroups: (content.collectionGroups ?? []).map((group) => ({
      ...group,
      collectionIds: Array.isArray(group.collectionIds) ? group.collectionIds : [],
    })),
    collections: (content.collections ?? []).map((entry) => {
      const legacy = entry as SiteContent["collections"][number] & {
        homeStyle?: "banner" | "tile";
        homeCrop?: { x?: number; y?: number };
        pageCrop?: { x?: number; y?: number };
      };
      return {
        ...legacy,
        homeStyle: legacy.homeStyle === "tile" ? "tile" : "banner",
        homeCrop: {
          x: Number.isFinite(legacy.homeCrop?.x) ? Number(legacy.homeCrop?.x) : 50,
          y: Number.isFinite(legacy.homeCrop?.y) ? Number(legacy.homeCrop?.y) : 50,
        },
        pageCrop: {
          x: Number.isFinite(legacy.pageCrop?.x) ? Number(legacy.pageCrop?.x) : 50,
          y: Number.isFinite(legacy.pageCrop?.y) ? Number(legacy.pageCrop?.y) : 50,
        },
      };
    }),
  };
}

async function readStore(): Promise<Store> {
  requirePersistentStorage();
  if (useBlobStorage()) {
    const blob = await get(STORE_BLOB_PATH, { access: "private", useCache: false });
    if (!blob?.stream) return initialStore();
    return parseStore(await new Response(blob.stream).text());
  }

  try {
    return parseStore(await readFile(DATA_FILE, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return initialStore();
    }
    throw error;
  }
}

function parseStore(serialized: string): Store {
  const value = JSON.parse(serialized) as Partial<Store>;
  const published = normalizeContent(value.published ?? structuredClone(DEFAULT_SITE_CONTENT));
  return {
    published,
    draft: normalizeContent(value.draft ?? structuredClone(published)),
    history: Array.isArray(value.history)
      ? value.history.slice(0, 20).map((entry) => ({ ...entry, content: normalizeContent(entry.content) }))
      : [],
  };
}

async function writeStore(store: Store): Promise<void> {
  requirePersistentStorage();
  if (useBlobStorage()) {
    await put(STORE_BLOB_PATH, JSON.stringify(store, null, 2), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });
  const tempPath = `${DATA_FILE}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(tempPath, JSON.stringify(store, null, 2), { mode: 0o600 });
  await rename(tempPath, DATA_FILE);
}

function safeEqual(left: string, right: string): boolean {
  const a = createHmac("sha256", "iclix-admin-compare").update(left).digest();
  const b = createHmac("sha256", "iclix-admin-compare").update(right).digest();
  return timingSafeEqual(a, b);
}

function signature(value: string): string {
  return createHmac("sha256", ADMIN_SECRET).update(value).digest("hex");
}

function cookieOptions(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-proto"];
  const secure = Boolean((req.socket as typeof req.socket & { encrypted?: boolean }).encrypted) || forwarded === "https";
  return `Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${SESSION_LIFETIME / 1000}${secure ? "; Secure" : ""}`;
}

function hasSession(req: IncomingMessage): boolean {
  const raw = req.headers.cookie ?? "";
  const value = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!value) return false;
  const [token, rawExpiresAt, supplied] = decodeURIComponent(value.slice(SESSION_COOKIE.length + 1)).split(".");
  const expiresAt = Number(rawExpiresAt);
  if (!token || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || !supplied) return false;
  return safeEqual(supplied, signature(`${token}.${expiresAt}`));
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.end(JSON.stringify(body));
}

function sendStorageError(res: ServerResponse, error: unknown, fallback: string): void {
  if (error instanceof Error && error.message === "BLOB_STORAGE_NOT_CONFIGURED") {
    send(res, 503, { error: "Penyimpanan Vercel Blob belum terhubung ke project." });
    return;
  }
  send(res, 500, { error: fallback });
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const parsedBody = (req as IncomingMessage & { body?: unknown }).body;
  if (parsedBody !== undefined) {
    return typeof parsedBody === "string" ? JSON.parse(parsedBody) : parsedBody;
  }

  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_BODY) throw new Error("BODY_TOO_LARGE");
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object") return false;
  const content = value as SiteContent;
  const validTitle = (item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const title = item as { id?: unknown; type?: unknown; watchOrder?: unknown; label?: unknown; posterPath?: unknown };
    return Number.isSafeInteger(title.id) && Number(title.id) > 0 &&
      (title.type === "movie" || title.type === "tv") &&
      (title.watchOrder === undefined || (typeof title.watchOrder === "string" && title.watchOrder.length <= 160)) &&
      (title.label === undefined || (typeof title.label === "string" && title.label.length <= 160)) &&
      (title.posterPath === undefined || (typeof title.posterPath === "string" && title.posterPath.length <= 200 && title.posterPath.startsWith("/")));
  };
  const validTitleList = (items: unknown, max: number) =>
    Array.isArray(items) && items.length <= max && items.every(validTitle);
  const validUrl = (value: unknown) => {
    if (value === "") return true;
    if (typeof value !== "string" || value.length > 2048) return false;
    if (/^\/media\/[a-f0-9]{32}\.(?:jpg|png|webp)$/.test(value)) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  };
  const sectionKeys = new Set([
    "trending", "popular-movies", "top-rated", "now-playing", "upcoming",
    "popular-tv", "trending-tv", "top-rated-tv",
  ]);
  const collectionIds = new Set<string>();
  const slugs = new Set<string>();
  const validCollections = Array.isArray(content.collections) && content.collections.length <= 50 &&
    content.collections.every((collection) => {
      if (!collection || typeof collection !== "object") return false;
      const item = collection as SiteContent["collections"][number];
      if (
        typeof item.id !== "string" || item.id.length > 100 || collectionIds.has(item.id) ||
        typeof item.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) || slugs.has(item.slug) ||
        typeof item.title !== "string" || !item.title.trim() || item.title.length > 120 ||
        typeof item.description !== "string" || item.description.length > 2000 ||
        (item.homeStyle !== "banner" && item.homeStyle !== "tile") ||
        !item.homeCrop || !Number.isFinite(item.homeCrop.x) || item.homeCrop.x < 0 || item.homeCrop.x > 100 ||
        !Number.isFinite(item.homeCrop.y) || item.homeCrop.y < 0 || item.homeCrop.y > 100 ||
        !item.pageCrop || !Number.isFinite(item.pageCrop.x) || item.pageCrop.x < 0 || item.pageCrop.x > 100 ||
        !Number.isFinite(item.pageCrop.y) || item.pageCrop.y < 0 || item.pageCrop.y > 100 ||
        typeof item.showOnHome !== "boolean" || !validUrl(item.logoUrl) || !validUrl(item.backdropUrl) ||
        !validTitleList(item.titleIds, 500) || !Array.isArray(item.sections) || item.sections.length > 30
      ) return false;
      collectionIds.add(item.id);
      slugs.add(item.slug);
      return item.sections.every((section) =>
        Boolean(
          section && typeof section.id === "string" && section.id.length <= 100 &&
          typeof section.title === "string" && section.title.length <= 120 &&
          (section.kind === "text" || section.kind === "titles" || section.kind === "watch-order") &&
          (section.description === undefined || (typeof section.description === "string" && section.description.length <= 2000)) &&
          (section.titleIds === undefined || validTitleList(section.titleIds, 500))
        ),
      );
    });
  const validCollectionGroups = Array.isArray(content.collectionGroups) && content.collectionGroups.length <= 20 &&
    (() => {
      const groupIds = new Set<string>();
      return content.collectionGroups.every((group) => {
        if (!group || typeof group !== "object") return false;
        const item = group as SiteContent["collectionGroups"][number];
        if (
          typeof item.id !== "string" || item.id.length > 100 || groupIds.has(item.id) ||
          typeof item.title !== "string" || !item.title.trim() || item.title.length > 120 ||
          !Array.isArray(item.collectionIds) || item.collectionIds.length > 50 ||
          !item.collectionIds.every((id) => typeof id === "string" && collectionIds.has(id))
        ) return false;
        groupIds.add(item.id);
        return true;
      });
    })();
  return Boolean(
    content.spotlight &&
      ["popular", "trending", "random", "manual"].includes(content.spotlight.mode) &&
      validTitleList(content.spotlight.titleIds, 10) &&
      Array.isArray(content.homeSections) &&
      content.homeSections.length <= 40 &&
      content.homeSections.every((section) =>
        Boolean(
          section && typeof section.id === "string" && section.id.length <= 100 &&
          (section.kind === "catalog" ? section.key && sectionKeys.has(section.key)
            : section.kind === "collection" ? typeof section.collectionId === "string"
              : section.kind === "collection-group" ? typeof section.groupId === "string"
                : false) &&
          typeof section.visible === "boolean" &&
          (section.title === undefined || (typeof section.title === "string" && section.title.length <= 120))
        ),
      ) &&
      validCollections &&
      validCollectionGroups &&
      content.announcement &&
      typeof content.announcement.enabled === "boolean" &&
      typeof content.announcement.text === "string" &&
      content.announcement.text.length <= 240,
  );
}

function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function createSiteContentHandler(req: IncomingMessage, res: ServerResponse, next?: (err?: unknown) => void): void {
  const url = new URL(req.url || "/", "http://localhost");
  const uploadMatch = url.pathname.match(/^\/media\/([a-f0-9]{32}\.(?:jpg|png|webp))$/);
  if (uploadMatch && (req.method === "GET" || req.method === "HEAD")) {
    if (useBlobStorage()) {
      void get(`iclix/uploads/${uploadMatch[1]}`, { access: "private", useCache: false })
        .then(async (blob) => {
          if (!blob?.stream) {
            res.statusCode = 404;
            res.end("Gambar tidak ditemukan.");
            return;
          }
          const extension = uploadMatch[1].split(".").pop();
          res.statusCode = 200;
          res.setHeader("content-type", blob.blob.contentType || (extension === "jpg" ? "image/jpeg" : `image/${extension}`));
          res.setHeader("cache-control", "public, max-age=31536000, immutable");
          res.setHeader("x-content-type-options", "nosniff");
          if (req.method === "HEAD") {
            res.end();
            return;
          }
          res.end(Buffer.from(await new Response(blob.stream).arrayBuffer()));
        })
        .catch(() => {
          res.statusCode = 500;
          res.end("Gambar gagal dimuat.");
        });
      return;
    }

    if (process.env.VERCEL) {
      res.statusCode = 503;
      res.end("Hubungkan Vercel Blob untuk menyimpan gambar.");
      return;
    }

    const filePath = resolve(UPLOAD_DIR, uploadMatch[1]);
    if (!existsSync(filePath)) {
      res.statusCode = 404;
      res.end("Gambar tidak ditemukan.");
      return;
    }
    const extension = uploadMatch[1].split(".").pop();
    res.statusCode = 200;
    res.setHeader("content-type", extension === "jpg" ? "image/jpeg" : `image/${extension}`);
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    res.setHeader("x-content-type-options", "nosniff");
    if (req.method === "HEAD") res.end();
    else createReadStream(filePath).pipe(res);
    return;
  }

  if (url.pathname === "/api/site-content" && (req.method === "GET" || req.method === "HEAD")) {
    void readStore()
      .then((store) => send(res, 200, { content: store.published }))
      .catch((error: unknown) => sendStorageError(res, error, "Konten situs gagal dimuat."));
    return;
  }
  if (!url.pathname.startsWith("/api/admin")) {
    next?.();
    return;
  }

  if (url.pathname === "/api/admin/status" && req.method === "GET") {
    send(res, 200, { configured: Boolean(ADMIN_SECRET), authenticated: Boolean(ADMIN_SECRET) && hasSession(req) });
    return;
  }

  if (!ADMIN_SECRET) {
    send(res, 503, { error: "Admin belum dikonfigurasi. Atur ADMIN_SECRET di environment server." });
    return;
  }

  if (req.method !== "GET" && !sameOrigin(req)) {
    send(res, 403, { error: "Asal permintaan tidak diizinkan." });
    return;
  }

  if (url.pathname === "/api/admin/unlock" && req.method === "POST") {
    const address = req.socket.remoteAddress || "unknown";
    const attempts = failedUnlocks.get(address);
    if (attempts && attempts.resetAt > Date.now() && attempts.count >= 5) {
      send(res, 429, { error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." });
      return;
    }
    void readBody(req)
      .then((body) => {
        const secret = body && typeof body === "object" ? String((body as { secret?: unknown }).secret ?? "") : "";
        if (!safeEqual(secret, ADMIN_SECRET)) {
          const current = failedUnlocks.get(address);
          if (!current || current.resetAt <= Date.now()) {
            failedUnlocks.set(address, { count: 1, resetAt: Date.now() + 10 * 60_000 });
          } else {
            current.count += 1;
          }
          send(res, 401, { error: "Kunci admin tidak cocok." });
          return;
        }
        failedUnlocks.delete(address);
        const token = randomBytes(32).toString("hex");
        const signedValue = `${token}.${Date.now() + SESSION_LIFETIME}`;
        res.setHeader("set-cookie", `${SESSION_COOKIE}=${encodeURIComponent(`${signedValue}.${signature(signedValue)}`)}; ${cookieOptions(req)}`);
        send(res, 200, { authenticated: true });
      })
      .catch(() => send(res, 400, { error: "Permintaan tidak valid." }));
    return;
  }

  if (url.pathname === "/api/admin/lock" && req.method === "POST") {
    res.setHeader("set-cookie", `${SESSION_COOKIE}=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0`);
    send(res, 200, { locked: true });
    return;
  }

  if (!hasSession(req)) {
    send(res, 401, { error: "Sesi admin tidak aktif." });
    return;
  }

  if (url.pathname === "/api/admin/upload" && req.method === "POST") {
    void readBody(req)
      .then(async (body) => {
        const dataUrl = body && typeof body === "object" ? String((body as { dataUrl?: unknown }).dataUrl ?? "") : "";
        const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
        if (!match) {
          send(res, 400, { error: "Pilih gambar JPG, PNG, atau WebP." });
          return;
        }
        const bytes = Buffer.from(match[2], "base64");
        if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) {
          send(res, 413, { error: "Ukuran gambar maksimal 3 MB." });
          return;
        }
        const mime = match[1];
        const validSignature = mime === "image/jpeg"
          ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
          : mime === "image/png"
            ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
            : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
        if (!validSignature) {
          send(res, 400, { error: "Isi file tidak cocok dengan format gambar." });
          return;
        }
        const extension = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
        const filename = `${randomBytes(16).toString("hex")}.${extension}`;
        requirePersistentStorage();
        if (useBlobStorage()) {
          await put(`iclix/uploads/${filename}`, bytes, {
            access: "private",
            contentType: mime,
            cacheControlMaxAge: 31_536_000,
          });
        } else {
          await mkdir(UPLOAD_DIR, { recursive: true });
          await writeFile(resolve(UPLOAD_DIR, filename), bytes, { flag: "wx", mode: 0o600 });
        }
        send(res, 201, { url: `/media/${filename}` });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === "BODY_TOO_LARGE") {
          send(res, 413, { error: "Ukuran gambar maksimal 3 MB." });
          return;
        }
        sendStorageError(res, error, "Gambar gagal diunggah. Periksa koneksi Vercel Blob.");
      });
    return;
  }

  if (url.pathname === "/api/admin/content" && req.method === "GET") {
    void readStore()
      .then(({ published, draft, history }) =>
        send(res, 200, { published, draft, history: history.map(({ savedAt, label }) => ({ savedAt, label })), configured: true }),
      )
      .catch((error: unknown) => sendStorageError(res, error, "Konten admin gagal dimuat."));
    return;
  }

  if (url.pathname === "/api/admin/content" && req.method === "PUT") {
    void readBody(req)
      .then(async (body) => {
        if (!body || typeof body !== "object" || !validContent((body as { content?: unknown }).content)) {
          send(res, 400, { error: "Struktur konten tidak valid." });
          return;
        }
        const store = await readStore();
        const content = (body as { content: SiteContent }).content;
        content.updatedAt = new Date().toISOString();
        store.draft = content;
        store.history.unshift({ savedAt: content.updatedAt, label: "Draft disimpan", content: structuredClone(content) });
        store.history = store.history.slice(0, 20);
        if ((body as { publish?: boolean }).publish) {
          store.published = structuredClone(content);
          store.history[0].label = "Perubahan diterbitkan";
        }
        await writeStore(store);
        send(res, 200, { published: store.published, draft: store.draft, history: store.history.map(({ savedAt, label }) => ({ savedAt, label })) });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === "BODY_TOO_LARGE") {
          send(res, 413, { error: "Data terlalu besar untuk disimpan." });
          return;
        }
        sendStorageError(res, error, "Perubahan gagal disimpan. Periksa koneksi Vercel Blob.");
      });
    return;
  }

  if (url.pathname === "/api/admin/restore" && req.method === "POST") {
    void readBody(req)
      .then(async (body) => {
        const index = body && typeof body === "object" ? Number((body as { index?: unknown }).index) : -1;
        const store = await readStore();
        const entry = store.history[index];
        if (!entry) {
          send(res, 404, { error: "Versi tersebut tidak ditemukan." });
          return;
        }
        store.draft = structuredClone(entry.content);
        store.draft.updatedAt = new Date().toISOString();
        store.history.unshift({ savedAt: store.draft.updatedAt, label: `Draft dipulihkan: ${entry.label}`, content: structuredClone(store.draft) });
        store.history = store.history.slice(0, 20);
        await writeStore(store);
        send(res, 200, { published: store.published, draft: store.draft, history: store.history.map(({ savedAt, label }) => ({ savedAt, label })) });
      })
      .catch((error: unknown) => sendStorageError(res, error, "Versi tidak dapat dipulihkan."));
    return;
  }

  send(res, 404, { error: "Endpoint admin tidak ditemukan." });
}
