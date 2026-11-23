import { api } from "./endpoints";
import type { TmdbConfiguration } from "./tmdbTypes";

/** Nilai cadangan sesuai daftar ukuran resmi TMDb, dipakai sebelum /configuration dimuat. */
const DEFAULTS = {
  base: "https://image.tmdb.org/t/p/",
  poster: "w342",
  posterLarge: "w500",
  backdrop: "w1280",
  backdropFull: "original",
  backdropSmall: "w780",
  logo: "w500",
  profile: "w185",
  still: "w300",
};

let base = DEFAULTS.base;
let sizes = DEFAULTS;

function applyConfiguration(config: TmdbConfiguration): void {
  const { images } = config;
  if (!images?.base_url) return;
  base = images.secure_base_url || images.base_url;
  const pick = (list: string[], preferred: string, fallback: string) =>
    list.includes(preferred) ? preferred : (list[list.length - 1] || fallback);
  sizes = {
    ...DEFAULTS,
    poster: pick(images.poster_sizes, "w342", DEFAULTS.poster),
    posterLarge: pick(images.poster_sizes, "w500", DEFAULTS.posterLarge),
    backdrop: pick(images.backdrop_sizes, "w1280", DEFAULTS.backdrop),
    backdropFull: pick(images.backdrop_sizes, "original", DEFAULTS.backdropFull),
    backdropSmall: pick(images.backdrop_sizes, "w780", DEFAULTS.backdropSmall),
    logo: pick(images.logo_sizes ?? [], "w500", DEFAULTS.logo),
    profile: pick(images.profile_sizes, "w185", DEFAULTS.profile),
    still: pick(images.still_sizes, "w300", DEFAULTS.still),
  };
}

let configRequest: Promise<void> | null = null;

/** Dipanggil sekali saat aplikasi dimuat; URL gambar tetap valid memakai ukuran cadangan. */
export function preloadConfiguration(): void {
  if (configRequest) return;
  configRequest = api.configuration().then((result) => {
    if (result.ok) applyConfiguration(result.data);
  });
}

function url(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `${base}${size}${path}`;
}

export const posterUrl = (path: string | null | undefined, large = false): string | null =>
  url(path, large ? sizes.posterLarge : sizes.poster);

/**
 * TMDb menyediakan beberapa lebar poster. Browser memilih yang paling pas,
 * jadi kartu 144px di ponsel tidak perlu mengunduh berkas 500px.
 */
export const posterSrcSet = (path: string | null | undefined): string | null => {
  if (!path) return null;
  return ["w185", "w342", "w500"]
    .map((size) => `${base}${size}${path} ${size.slice(1)}w`)
    .join(", ");
};

export const backdropUrl = (path: string | null | undefined, large = true): string | null =>
  url(path, large ? sizes.backdrop : sizes.backdropSmall);

/** Backdrop layar penuh (hero) memakai ukuran original agar tidak pecah saat diperbesar. */
export const heroBackdropUrl = (path: string | null | undefined): string | null =>
  url(path, sizes.backdropFull);

/** Logo judul resmi dari TMDb, sudah transparan jadi bisa langsung menempel di backdrop. */
export const logoUrl = (path: string | null | undefined): string | null => url(path, sizes.logo);

export const profileUrl = (path: string | null | undefined): string | null => url(path, sizes.profile);

export const stillUrl = (path: string | null | undefined): string | null => url(path, sizes.still);
