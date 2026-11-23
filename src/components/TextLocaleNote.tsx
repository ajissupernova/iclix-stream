import { useLanguage } from "../context/Language";
import type { TextLocaleInfo } from "../utils/localize";

/** Keterangan kecil saat teks di atasnya hanya tersedia dalam bahasa Inggris. */
export default function TextLocaleNote({
  locale,
  className = "",
}: {
  locale?: TextLocaleInfo;
  className?: string;
}) {
  const { copy } = useLanguage();
  if (!locale) return null;

  const english = locale.overview === "english";
  if (!english) return null;

  return <p className={`text-xs text-mist ${className}`}>{copy.common.englishTextNote}</p>;
}
