import type { ApiResult } from "../api/client";
import { translateToIndonesian } from "../api/translate";

export type TextLocale = "original" | "translated" | "english" | "empty";

export interface TextLocaleInfo {
  overview: TextLocale;
}

interface TextFields {
  overview: string;
  tagline: string;
  original_language?: string;
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
  const englishOriginal = primary.original_language?.toLowerCase().startsWith("en") ?? false;
  if (overview && tagline && !englishOriginal) {
    return { data: primary, locale: { overview: "original" } };
  }

  const fallback = englishOriginal || !overview || !tagline ? await english() : null;
  const fallbackData = fallback?.ok ? fallback.data : null;
  const overviewSource = englishOriginal
    ? fallbackData?.overview.trim() || overview
    : overview || fallbackData?.overview.trim() || "";
  const shouldTranslate = englishOriginal || !overview;
  const overviewResult = shouldTranslate
    ? await translateOrEnglish(overviewSource, signal)
    : { text: overviewSource, locale: "original" as TextLocale };

  return {
    data: {
      ...primary,
      overview: overviewResult.text,
      tagline: tagline || fallbackData?.tagline.trim() || "",
    },
    locale: { overview: overviewResult.locale },
  };
}
