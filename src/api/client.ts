export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string };

export type ApiLanguage = "id-ID" | "en-US";

const LANGUAGE_KEY = "iclix:bahasa";
const CLIENT_TTL = 60_000;
const CLIENT_CACHE_LIMIT = 300;

let language: ApiLanguage = readStoredLanguage();
const memoryCache = new Map<string, { at: number; result: ApiResult<unknown> }>();
const listeners = new Set<() => void>();

function readStoredLanguage(): ApiLanguage {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === "en-US" ? "en-US" : "id-ID";
  } catch {
    return "id-ID";
  }
}

export function getLanguage(): ApiLanguage {
  return language;
}

export function setLanguage(next: ApiLanguage): void {
  language = next;
  try {
    localStorage.setItem(LANGUAGE_KEY, next);
  } catch {
    // Penyimpanan diblokir: pilihan bahasa tetap berlaku selama sesi berjalan.
  }
  listeners.forEach((fn) => fn());
}

export function subscribeLanguage(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function buildUrl(
  path: string,
  params: Record<string, string | number | undefined>,
  languageOverride?: ApiLanguage,
): string {
  const search = new URLSearchParams();
  search.set("language", languageOverride ?? language);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return `/api/tmdb${path}?${search.toString()}`;
}

function failure(status: number, code: string, message: string): ApiResult<never> {
  return { ok: false, status, code, message };
}

export async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
  languageOverride?: ApiLanguage,
): Promise<ApiResult<T>> {
  const url = buildUrl(path, params, languageOverride);
  const cached = memoryCache.get(url);
  if (cached && Date.now() - cached.at < CLIENT_TTL) {
    return cached.result as ApiResult<T>;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    const body = (await res.json().catch(() => null)) as
      | { ok: true; data: T }
      | { ok: false; code?: string; message?: string }
      | null;

    if (!body) {
      return failure(res.status, "BAD_RESPONSE", "Respons server tidak valid.");
    }
    if (!body.ok) {
      return failure(res.status, body.code || "ERROR", body.message || "Gagal mengambil data.");
    }
    const result: ApiResult<T> = { ok: true, data: body.data };
    memoryCache.set(url, { at: Date.now(), result });
    if (memoryCache.size > CLIENT_CACHE_LIMIT) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey !== undefined) memoryCache.delete(oldestKey);
    }
    return result;
  } catch (err) {
    if (signal?.aborted) {
      return failure(0, "ABORTED", "Permintaan dibatalkan.");
    }
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return failure(
      0,
      timedOut ? "TIMEOUT" : "NETWORK",
      timedOut ? "Server terlalu lama merespons." : "Koneksi gagal. Periksa jaringan Anda.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
