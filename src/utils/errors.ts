import type { ApiLanguage } from "../api/client";

/**
 * Pesan error dari server selalu berbahasa Indonesia. Untuk antarmuka Inggris,
 * kode error dipetakan ke kalimat Inggris; kode yang tidak dikenal tetap
 * menampilkan pesan aslinya agar detailnya tidak hilang.
 */
const EN_MESSAGES: Record<string, string> = {
  NO_KEY: "TMDB_API_KEY is not configured. Copy .env.example to .env and add your API key.",
  NOT_ALLOWED: "This endpoint is not allowed.",
  BAD_PARAM: "The request parameters are not valid.",
  UNAUTHORIZED: "The API credentials were rejected. Check TMDB_API_KEY in .env.",
  NOT_FOUND: "The requested data was not found.",
  RATE_LIMIT: "The API rate limit was reached. Try again shortly.",
  TIMEOUT: "The request failed or timed out.",
  UNREACHABLE: "The service could not be reached.",
  NETWORK: "Connection failed. Check your network.",
  BAD_RESPONSE: "The server returned an invalid response.",
  ABORTED: "The request was cancelled.",
  SERVER: "iClix server error.",
  EMPTY: "No data is available.",
};

export function errorMessage(
  lang: ApiLanguage,
  code: string | null | undefined,
  fallback: string,
): string {
  if (lang !== "en-US") return fallback;
  const key = (code ?? "").toUpperCase();
  if (key.startsWith("UPSTREAM_")) return "The service returned an error.";
  return EN_MESSAGES[key] ?? fallback;
}
