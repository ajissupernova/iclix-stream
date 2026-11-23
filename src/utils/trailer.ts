import type { Video } from "../api/tmdbTypes";

/** Hanya trailer YouTube resmi; teaser dan video unofficial tidak ditawarkan. */
export function pickTrailerKey(videos: Video[] | undefined): string | null {
  if (!videos) return null;
  const official = videos.find(
    (v) => v.site === "YouTube" && v.type === "Trailer" && v.official,
  );
  return official ? official.key : null;
}

export function trailerUrl(key: string): string {
  return `https://www.youtube.com/watch?v=${key}`;
}
