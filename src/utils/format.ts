import { getLanguage } from "../api/client";

export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (getLanguage() === "en-US") return h > 0 ? `${h}h ${m}m` : `${m}m`;
  return h > 0 ? `${h} j ${m} m` : `${m} m`;
}

export function formatYear(date: string | null | undefined): string {
  if (!date) return "";
  return date.slice(0, 4);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  const locale = getLanguage() === "en-US" ? "en-US" : "id-ID";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

export function formatVotes(count: number): string {
  return `${formatNumber(count)} ${getLanguage() === "en-US" ? "votes" : "suara"}`;
}

export function formatNumber(value: number): string {
  const locale = getLanguage() === "en-US" ? "en-US" : "id-ID";
  return new Intl.NumberFormat(locale).format(value);
}

export function formatMoney(value: number): string | null {
  if (!value || value <= 0) return null;
  const locale = getLanguage() === "en-US" ? "en-US" : "id-ID";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Departemen kredit TMDb (Acting, Directing, ...) dalam label Indonesia. */
const DEPARTMENTS_ID: Record<string, string> = {
  Acting: "Akting",
  Art: "Seni",
  Camera: "Kamera",
  "Costume & Make-Up": "Kostum & Tata Rias",
  Crew: "Kru",
  Directing: "Sutradara",
  Editing: "Penyuntingan",
  Lighting: "Pencahayaan",
  Production: "Produksi",
  Sound: "Suara",
  "Visual Effects": "Efek Visual",
  Writing: "Penulis",
};

export function formatDepartment(value: string): string {
  if (getLanguage() === "en-US") return value;
  return DEPARTMENTS_ID[value] ?? value;
}

/** Jabatan kru TMDb (Director, Writer, ...) dalam label Indonesia. */
const JOBS_ID: Record<string, string> = {
  Creator: "Kreator",
  Director: "Sutradara",
  Writer: "Penulis",
  Screenplay: "Skenario",
  Story: "Cerita",
  Characters: "Karakter",
  Teleplay: "Skenario TV",
  Novel: "Novel",
  Producer: "Produser",
  "Executive Producer": "Produser eksekutif",
  "Co-Producer": "Produser pendamping",
  "Associate Producer": "Produser asosiasi",
  "Casting Director": "Direktur casting",
};

export function formatJob(value: string): string {
  if (getLanguage() === "en-US") return value;
  return JOBS_ID[value] ?? value;
}

/** Status produksi TMDb tetap berbahasa Inggris walau data diminta dalam id-ID. */
const STATUS_ID: Record<string, string> = {
  Rumored: "Dirumorkan",
  Planned: "Direncanakan",
  "In Production": "Dalam produksi",
  "Post Production": "Pasca produksi",
  Released: "Sudah rilis",
  "Returning Series": "Sedang tayang",
  Ended: "Telah berakhir",
  Canceled: "Dibatalkan",
  Cancelled: "Dibatalkan",
  Pilot: "Pilot",
};

export function formatStatus(value: string): string {
  if (getLanguage() === "en-US") return value;
  return STATUS_ID[value] ?? value;
}

function displayNames(locale: string, type: "region" | "language"): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([locale], { type });
  } catch {
    return null;
  }
}

const REGIONS_ID = displayNames("id", "region");
const REGIONS_EN = displayNames("en", "region");
const LANGUAGES_ID = displayNames("id", "language");
const LANGUAGES_EN = displayNames("en", "language");

/** Nama negara dari kode ISO supaya tidak tertinggal dalam bahasa Inggris. */
export function formatCountry(isoCode: string, fallback: string): string {
  const names = getLanguage() === "en-US" ? REGIONS_EN : REGIONS_ID;
  try {
    return names?.of(isoCode) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Nama bahasa dari kode ISO, misalnya en menjadi Inggris. */
export function formatLanguage(isoCode: string): string {
  const code = isoCode.trim();
  if (!code) return "";
  const names = getLanguage() === "en-US" ? LANGUAGES_EN : LANGUAGES_ID;
  try {
    return names?.of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** TMDb id-ID masih memakai "Specials" untuk nama musim khusus. */
export function formatSeasonName(name: string): string {
  if (getLanguage() === "en-US") return name;
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === "specials") return "Spesial";
  const generic = /^season\s+(\d+)$/i.exec(trimmed);
  if (generic) return `Musim ${generic[1]}`;
  return name;
}
