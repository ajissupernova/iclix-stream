import type { IncomingMessage, ServerResponse } from "node:http";
import { cacheGet, cacheSet } from "./cache.js";
import { hasTmdbCredentials, tmdbCredentials } from "./env.js";

const API_PREFIX = "/api/tmdb";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TIMEOUT_MS = 8000;

const TTL_LIST = 5 * 60_000;
const TTL_DETAIL = 6 * 60 * 60_000;
const TTL_STATIC = 24 * 60 * 60_000;
const upstreamRequests = new Map<string, Promise<UpstreamResult>>();

const ALLOWED_PATHS: RegExp[] = [
  /^\/configuration$/,
  /^\/genre\/(movie|tv)\/list$/,
  /^\/trending\/(movie|tv|person|multi)\/(day|week)$/,
  /^\/(movie|tv)\/(popular|top_rated|upcoming|now_playing|airing_today|on_the_air)$/,
  /^\/(movie|tv)\/\d{1,10}$/,
  /^\/(movie|tv)\/\d{1,10}\/(credits|videos|similar|recommendations|keywords|release_dates|content_ratings)$/,
  /^\/tv\/\d{1,10}\/season\/\d{1,3}$/,
  /^\/person\/\d{1,10}$/,
  /^\/person\/\d{1,10}\/(movie_credits|tv_credits|combined_credits)$/,
  /^\/discover\/(movie|tv)$/,
  /^\/search\/(multi|movie|tv|person)$/,
];

const ALLOWED_PARAMS = new Set([
  "page",
  "query",
  "sort_by",
  "with_genres",
  "with_keywords",
  "without_original_language",
  "language",
  "append_to_response",
  "include_video",
  "vote_count.gte",
  "time_window",
  "year",
  "first_air_date_year",
  "include_video_language",
  "include_image_language",
]);

const ALLOWED_APPEND = new Set([
  "credits",
  "videos",
  "similar",
  "recommendations",
  "keywords",
  "release_dates",
  "content_ratings",
  "images",
  "movie_credits",
  "tv_credits",
  "external_ids",
]);

const ALLOWED_LANGUAGES = new Set(["id-ID", "en-US"]);
const PARAM_VALUE = /^[a-zA-Z0-9_,.\-|]*$/;

interface UpstreamResult {
  status: number;
  data?: unknown;
  code?: string;
  message?: string;
}

interface ErrorBody {
  ok: false;
  status: number;
  code: string;
  message: string;
}

function errorBody(status: number, code: string, message: string): ErrorBody {
  return { ok: false, status, code, message };
}

function isIndonesianTitle(value: Record<string, unknown>): boolean {
  if (value.original_language === "id") return true;
  const countries = value.production_countries;
  return Array.isArray(countries) && countries.some(
    (country) =>
      country &&
      typeof country === "object" &&
      "iso_3166_1" in country &&
      country.iso_3166_1 === "ID",
  );
}

function isIndonesianPerson(value: Record<string, unknown>): boolean {
  return typeof value.place_of_birth === "string" && /\bIndonesia\b/i.test(value.place_of_birth);
}

function isTitle(value: Record<string, unknown>): boolean {
  return value.media_type === "movie" ||
    value.media_type === "tv" ||
    ("title" in value && "original_title" in value) ||
    ("name" in value && "original_name" in value);
}

function hasForeignContribution(value: Record<string, unknown>): boolean {
  const groups = [value.known_for];
  for (const key of ["movie_credits", "tv_credits"]) {
    const credit = value[key];
    if (!credit || typeof credit !== "object") continue;
    const { cast, crew } = credit as Record<string, unknown>;
    groups.push(
      ...(Array.isArray(cast) ? [cast] : []),
      ...(Array.isArray(crew) ? [crew] : []),
    );
  }
  return groups.some((group) =>
    Array.isArray(group) && group.some((item) =>
      item && typeof item === "object" && isTitle(item as Record<string, unknown>) &&
      !isIndonesianTitle(item as Record<string, unknown>),
    ),
  );
}

function withoutIndonesianMovies(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => {
        if (!item || typeof item !== "object") return true;
        const entry = item as Record<string, unknown>;
        if (isTitle(entry)) return !isIndonesianTitle(entry);
        if (entry.media_type === "person" && Array.isArray(entry.known_for) &&
          entry.known_for.length > 0 &&
          entry.known_for.every((credit) =>
            credit && typeof credit === "object" && isTitle(credit as Record<string, unknown>) &&
            isIndonesianTitle(credit as Record<string, unknown>),
          )) return false;
        return !isIndonesianPerson(entry) || hasForeignContribution(entry);
      })
      .map(withoutIndonesianMovies);
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, withoutIndonesianMovies(entry)]),
  );
}

function hasNotPremiered(value: Record<string, unknown>, today = new Date().toISOString().slice(0, 10)): boolean {
  if (typeof value.title !== "string" && typeof value.name !== "string") return false;
  const status = typeof value.status === "string" ? value.status.toLowerCase() : "";
  if (["coming soon", "upcoming", "planned"].includes(status)) return true;

  const releaseDate = typeof value.release_date === "string" ? value.release_date : "";
  const firstAirDate = typeof value.first_air_date === "string" ? value.first_air_date : "";
  return [releaseDate, firstAirDate].some((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date > today);
}

function withoutUnreleasedTitles(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => {
        if (!item || typeof item !== "object") return true;
        const title = item as Record<string, unknown>;
        return !hasNotPremiered(title);
      })
      .map(withoutUnreleasedTitles);
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, withoutUnreleasedTitles(entry)]),
  );
}

function isUnreleasedDetail(value: unknown): boolean {
  return !!value && typeof value === "object" && hasNotPremiered(value as Record<string, unknown>);
}

function isExcludedPersonDetail(value: unknown): boolean {
  return !!value && typeof value === "object" &&
    isIndonesianPerson(value as Record<string, unknown>) &&
    !hasForeignContribution(value as Record<string, unknown>);
}

function ttlFor(path: string): number {
  if (path === "/configuration" || path.startsWith("/genre/")) return TTL_STATIC;
  if (path.startsWith("/search/")) return TTL_LIST;
  if (path.startsWith("/discover/") || path.startsWith("/trending/")) return TTL_LIST;
  if (/^\/(movie|tv)\/(popular|top_rated|upcoming|now_playing|airing_today|on_the_air)$/.test(path)) {
    return TTL_LIST;
  }
  return TTL_DETAIL;
}

function upstreamMessage(status: number, data: unknown): { code: string; message: string } {
  const fallback =
    data && typeof data === "object" && "status_message" in data
      ? String((data as { status_message: unknown }).status_message)
      : "";
  if (status === 401) return { code: "UNAUTHORIZED", message: "Kredensial API ditolak. Periksa TMDB_API_KEY di .env." };
  if (status === 404) return { code: "NOT_FOUND", message: "Data tidak ditemukan." };
  if (status === 429) return { code: "RATE_LIMIT", message: "Batas permintaan API tercapai. Coba lagi sebentar lagi." };
  return { code: `UPSTREAM_${status}`, message: fallback || `Layanan mengembalikan error ${status}.` };
}

async function callTmdb(path: string, params: Record<string, string>): Promise<UpstreamResult> {
  const target = new URL(TMDB_BASE + path);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  target.searchParams.set("include_adult", "false");
  if (!target.searchParams.has("language")) target.searchParams.set("language", "id-ID");

  const headers: Record<string, string> = { accept: "application/json" };
  if (tmdbCredentials.accessToken) {
    headers.authorization = `Bearer ${tmdbCredentials.accessToken}`;
  } else if (tmdbCredentials.apiKey) {
    target.searchParams.set("api_key", tmdbCredentials.apiKey);
  }

  let last: UpstreamResult = { status: 503, code: "UNREACHABLE", message: "Layanan tidak terjangkau." };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(target, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
      const data: unknown = await res.json().catch(() => null);
      if (res.ok) return { status: 200, data };
      const mapped = upstreamMessage(res.status, data);
      last = { status: res.status, code: mapped.code, message: mapped.message };
      // 4xx selain 429 tidak akan berubah dengan percobaan ulang.
      if (res.status < 500 && res.status !== 429) return last;
      if (res.status === 429 && attempt === 0) {
        const retryAfter = Number(res.headers.get("retry-after")) || 1;
        await new Promise((r) => setTimeout(r, Math.min(retryAfter, 2) * 1000));
      }
    } catch {
      last = { status: 503, code: "TIMEOUT", message: "Permintaan gagal atau melewati batas waktu." };
    }
  }
  return last;
}

function refreshCache(cacheKey: string, path: string, params: Record<string, string>, ttl: number): Promise<UpstreamResult> {
  const existing = upstreamRequests.get(cacheKey);
  if (existing) return existing;

  const request = callTmdb(path, params)
    .then((result) => {
      const isDetail = /^\/(movie|tv)\/\d{1,10}$/.test(path);
      const detail = result.data && typeof result.data === "object"
        ? result.data as Record<string, unknown>
        : null;
      const isPersonDetail = /^\/person\/\d{1,10}$/.test(path);
      if (
        result.status === 200 &&
        (!isDetail || (detail !== null && !isUnreleasedDetail(detail) && !isIndonesianTitle(detail))) &&
        (!isPersonDetail || (detail !== null && !isExcludedPersonDetail(detail)))
      ) {
        cacheSet(cacheKey, withoutUnreleasedTitles(withoutIndonesianMovies(result.data)), ttl);
      }
      return result;
    })
    .finally(() => {
      upstreamRequests.delete(cacheKey);
    });
  upstreamRequests.set(cacheKey, request);
  return request;
}

async function handleApi(pathname: string, search: string): Promise<{ status: number; body: unknown; cacheSeconds: number }> {
  const path = pathname.slice(API_PREFIX.length) || "/";

  if (!ALLOWED_PATHS.some((re) => re.test(path))) {
    return { status: 404, body: errorBody(404, "NOT_ALLOWED", "Endpoint tidak diizinkan."), cacheSeconds: 0 };
  }

  const incoming = new URLSearchParams(search);
  const params: Record<string, string> = {};
  for (const [key, raw] of incoming) {
    if (!ALLOWED_PARAMS.has(key) || raw.length > 120) {
      return { status: 400, body: errorBody(400, "BAD_PARAM", `Parameter ${key} tidak valid.`), cacheSeconds: 0 };
    }
    // Judul film mengandung spasi, tanda baca, dan huruf beraksen, jadi query
    // hanya dibatasi panjang dan karakter kontrol.
    const isFreeText = key === "query";
    if (isFreeText ? /[\u0000-\u001f\u007f]/.test(raw) : !PARAM_VALUE.test(raw)) {
      return { status: 400, body: errorBody(400, "BAD_PARAM", `Parameter ${key} tidak valid.`), cacheSeconds: 0 };
    }
    params[key] = raw;
  }
  if (params.language && !ALLOWED_LANGUAGES.has(params.language)) {
    return { status: 400, body: errorBody(400, "BAD_PARAM", "Bahasa hanya id-ID atau en-US."), cacheSeconds: 0 };
  }
  if (params.append_to_response) {
    const parts = params.append_to_response.split(",").filter((p) => ALLOWED_APPEND.has(p));
    if (parts.length === 0) delete params.append_to_response;
    else params.append_to_response = parts.join(",");
  }
  if (params.page && (!/^\d{1,3}$/.test(params.page) || Number(params.page) < 1 || Number(params.page) > 500)) {
    return { status: 400, body: errorBody(400, "BAD_PARAM", "Halaman tidak valid."), cacheSeconds: 0 };
  }
  if (!hasTmdbCredentials) {
    return {
      status: 503,
      body: errorBody(503, "NO_KEY", "TMDB_API_KEY belum dikonfigurasi. Salin .env.example menjadi .env lalu isi key API."),
      cacheSeconds: 0,
    };
  }

  const cacheKey = path + "?" + new URLSearchParams(params).toString();
  const ttl = ttlFor(path);
  const hit = cacheGet(cacheKey);
  if (hit && !hit.stale) {
    if (/^\/(movie|tv)\/\d{1,10}$/.test(path) && isUnreleasedDetail(hit.data)) {
      return { status: 404, body: errorBody(404, "NOT_FOUND", "Judul belum tayang."), cacheSeconds: 0 };
    }
    if (/^\/(movie|tv)\/\d{1,10}$/.test(path) && hit.data && typeof hit.data === "object" &&
      isIndonesianTitle(hit.data as Record<string, unknown>)) {
      return {
        status: 404,
        body: errorBody(404, "NOT_FOUND", "Film tidak ditemukan."),
        cacheSeconds: 0,
      };
    }
    if (/^\/person\/\d{1,10}$/.test(path) && isExcludedPersonDetail(hit.data)) {
      return { status: 404, body: errorBody(404, "NOT_FOUND", "Orang tidak ditemukan."), cacheSeconds: 0 };
    }
    return {
      status: 200,
      body: { ok: true, data: withoutUnreleasedTitles(withoutIndonesianMovies(hit.data)) },
      cacheSeconds: Math.ceil(ttl / 1000),
    };
  }

  if (hit?.stale) {
    void refreshCache(cacheKey, path, params, ttl);
    if (/^\/(movie|tv)\/\d{1,10}$/.test(path) && isUnreleasedDetail(hit.data)) {
      return { status: 404, body: errorBody(404, "NOT_FOUND", "Judul belum tayang."), cacheSeconds: 0 };
    }
    if (/^\/(movie|tv)\/\d{1,10}$/.test(path) && hit.data && typeof hit.data === "object" &&
      isIndonesianTitle(hit.data as Record<string, unknown>)) {
      return { status: 404, body: errorBody(404, "NOT_FOUND", "Film tidak ditemukan."), cacheSeconds: 0 };
    }
    if (/^\/person\/\d{1,10}$/.test(path) && isExcludedPersonDetail(hit.data)) {
      return { status: 404, body: errorBody(404, "NOT_FOUND", "Orang tidak ditemukan."), cacheSeconds: 0 };
    }
    return {
      status: 200,
      body: { ok: true, data: withoutUnreleasedTitles(withoutIndonesianMovies(hit.data)) },
      cacheSeconds: 60,
    };
  }

  const result = await refreshCache(cacheKey, path, params, ttl);
  if (result.status === 200) {
    if (/^\/(movie|tv)\/\d{1,10}$/.test(path) && isUnreleasedDetail(result.data)) {
      return { status: 404, body: errorBody(404, "NOT_FOUND", "Judul belum tayang."), cacheSeconds: 0 };
    }
    if (/^\/(movie|tv)\/\d{1,10}$/.test(path) && result.data && typeof result.data === "object" &&
      isIndonesianTitle(result.data as Record<string, unknown>)) {
      return {
        status: 404,
        body: errorBody(404, "NOT_FOUND", "Film tidak ditemukan."),
        cacheSeconds: 0,
      };
    }
    if (/^\/person\/\d{1,10}$/.test(path) && isExcludedPersonDetail(result.data)) {
      return { status: 404, body: errorBody(404, "NOT_FOUND", "Orang tidak ditemukan."), cacheSeconds: 0 };
    }
    const data = withoutUnreleasedTitles(withoutIndonesianMovies(result.data));
    return { status: 200, body: { ok: true, data }, cacheSeconds: Math.ceil(ttl / 1000) };
  }

  return {
    status: result.status === 401 ? 502 : result.status,
    body: errorBody(result.status, result.code || "UPSTREAM", result.message || "Gagal mengambil data."),
    cacheSeconds: 0,
  };
}

type Next = ((err?: unknown) => void) | undefined;

export function createApiHandler(req: IncomingMessage, res: ServerResponse, next?: Next): void {
  const url = req.url || "/";
  if (url !== API_PREFIX && !url.startsWith(API_PREFIX + "/") && !url.startsWith(API_PREFIX + "?")) {
    next?.();
    return;
  }

  const parsed = new URL(url, "http://localhost");
  void handleApi(parsed.pathname, parsed.search)
    .then(({ status, body, cacheSeconds }) => {
      res.statusCode = status;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader(
        "cache-control",
        cacheSeconds > 0 ? `public, max-age=${Math.min(cacheSeconds, 300)}, stale-while-revalidate=600` : "no-store",
      );
      res.setHeader("x-content-type-options", "nosniff");
      res.end(JSON.stringify(body));
    })
    .catch(() => {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify(errorBody(500, "SERVER", "Kesalahan server iClix.")));
    });
}
