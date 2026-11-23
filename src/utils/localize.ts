import type { ApiResult } from "../api/client";
import { translateToIndonesian } from "../api/translate";

export type TextLocale = "original" | "translated" | "english" | "empty";

export interface TextLocaleInfo {
  overview: TextLocale;
}

interface TextFields {
  overview: string;
  tagline: string;
}

export interface LocalizedTextFields<T extends TextFields> {
  data: T;
  locale: TextLocaleInfo;
}

async function translateOrEnglish(
  text: string,
  signal: AbortSignal,
): Promise<{ text: string; locale: TextLocale }> {
  if (!text) return { text: "", locale: "empty" };
  const result = await translateToIndonesian(text, signal);
  if (result.ok && result.data) return { text: result.data, locale: "translated" };
  return { text, locale: "english" };
}

/**
 * Sinopsis dari TMDb sering kosong di id-ID. Isi yang kosong diambil dari versi
 * Inggris lalu diterjemahkan. Tagline tidak diterjemahkan karena kalimat pendek
 * hasil terjemahan mesin sering kehilangan nada aslinya; bila kosong, tagline
 * Inggris dipakai apa adanya.
 */
export async function localizeTextFields<T extends TextFields>(
  primary: T,
  english: () => Promise<ApiResult<T>>,
  signal: AbortSignal,
): Promise<LocalizedTextFields<T>> {
  const overview = primary.overview.trim();
  const tagline = primary.tagline.trim();
  if (overview && tagline) {
    return { data: primary, locale: { overview: "original" } };
  }

  const fallback = await english();
  if (!fallback.ok) {
    return {
      data: primary,
      locale: { overview: overview ? "original" : "empty" },
    };
  }

  const overviewResult = overview
    ? { text: overview, locale: "original" as TextLocale }
    : await translateOrEnglish(fallback.data.overview.trim(), signal);

  return {
    data: {
      ...primary,
      overview: overviewResult.text,
      tagline: tagline || fallback.data.tagline.trim(),
    },
    locale: { overview: overviewResult.locale },
  };
}
