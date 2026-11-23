import { preferredTitle } from "../utils/title";

export interface MediaItem {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  date: string;
  voteAverage: number;
  voteCount: number;
  posterPath: string | null;
}

interface MovieLike {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  poster_path?: string | null;
}

export function toMediaItem(item: MovieLike, mediaType: "movie" | "tv"): MediaItem {
  return {
    id: item.id,
    mediaType,
    title: preferredTitle(
      item.title || item.name || "",
      item.original_title || item.original_name || "",
      item.original_language,
    ),
    date: item.release_date || item.first_air_date || "",
    voteAverage: item.vote_average ?? 0,
    voteCount: item.vote_count ?? 0,
    posterPath: item.poster_path ?? null,
  };
}

export function pageToItems<T extends MovieLike>(
  page: { results: T[] } | null | undefined,
  mediaType: "movie" | "tv",
  limit = 15,
): MediaItem[] | null {
  if (!page) return null;
  return page.results.slice(0, limit).map((item) => toMediaItem(item, mediaType));
}
