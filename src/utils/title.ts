/**
 * TMDb versi id-ID menerjemahkan judul berbahasa Inggris, dan hasilnya sering
 * bukan judul yang dipakai orang. Untuk film atau serial berbahasa Inggris,
 * judul asli dipertahankan; bahasa lain tetap memakai judul versi Indonesia.
 */
export function preferredTitle(
  display: string | null | undefined,
  original: string | null | undefined,
  originalLanguage: string | null | undefined,
): string {
  const current = (display ?? "").trim();
  const source = (original ?? "").trim();
  if (!current) return source;
  if (!source || source === current) return current;
  if ((originalLanguage ?? "").toLowerCase().startsWith("en")) return source;
  return current;
}
