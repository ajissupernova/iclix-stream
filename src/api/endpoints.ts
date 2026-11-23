import { tmdbFetch, type ApiResult } from "./client";
import type {
  GenreList,
  MovieDetail,
  MovieListItem,
  MultiSearchItem,
  PersonDetailWithCredits,
  SeasonDetail,
  TmdbConfiguration,
  TmdbPage,
  TvDetail,
  TvListItem,
} from "./tmdbTypes";

export type SortOption =
  | "popularity.desc"
  | "vote_average.desc"
  | "release.desc"
  | "title.asc";

export interface DiscoverParams {
  page?: number;
  genreId?: number | null;
  sort?: SortOption;
}

const MOVIE_SORTS: Record<SortOption, string> = {
  "popularity.desc": "popularity.desc",
  "vote_average.desc": "vote_average.desc",
  "release.desc": "primary_release_date.desc",
  "title.asc": "title.asc",
};

const TV_SORTS: Record<SortOption, string> = {
  "popularity.desc": "popularity.desc",
  "vote_average.desc": "vote_average.desc",
  "release.desc": "first_air_date.desc",
  "title.asc": "name.asc",
};

function discoverQuery(params: DiscoverParams, sorts: Record<SortOption, string>) {
  return {
    page: params.page,
    with_genres: params.genreId ? String(params.genreId) : undefined,
    sort_by: sorts[params.sort ?? "popularity.desc"],
    without_original_language: "id",
    // Tanpa batas ini, urutan rating dipenuhi judul dengan segelintir suara.
    "vote_count.gte": params.sort === "vote_average.desc" ? 2000 : undefined,
  };
}

export const api = {
  configuration: (): Promise<ApiResult<TmdbConfiguration>> =>
    tmdbFetch<TmdbConfiguration>("/configuration"),

  movieGenres: (signal?: AbortSignal): Promise<ApiResult<GenreList>> =>
    tmdbFetch<GenreList>("/genre/movie/list", {}, signal),
  tvGenres: (signal?: AbortSignal): Promise<ApiResult<GenreList>> =>
    tmdbFetch<GenreList>("/genre/tv/list", {}, signal),

  trendingMovies: (signal?: AbortSignal): Promise<ApiResult<TmdbPage<MovieListItem>>> =>
    tmdbFetch("/trending/movie/week", {}, signal),
  popularMovies: (signal?: AbortSignal): Promise<ApiResult<TmdbPage<MovieListItem>>> =>
    tmdbFetch("/movie/popular", {}, signal),
  topRatedMovies: (signal?: AbortSignal): Promise<ApiResult<TmdbPage<MovieListItem>>> =>
    tmdbFetch("/movie/top_rated", {}, signal),
  nowPlayingMovies: (signal?: AbortSignal): Promise<ApiResult<TmdbPage<MovieListItem>>> =>
    tmdbFetch("/movie/now_playing", {}, signal),
  upcomingMovies: (signal?: AbortSignal): Promise<ApiResult<TmdbPage<MovieListItem>>> =>
    tmdbFetch("/movie/upcoming", {}, signal),

  discoverMovies: (params: DiscoverParams, signal?: AbortSignal): Promise<ApiResult<TmdbPage<MovieListItem>>> =>
    tmdbFetch("/discover/movie", discoverQuery(params, MOVIE_SORTS), signal),

  popularTv: (signal?: AbortSignal): Promise<ApiResult<TmdbPage<TvListItem>>> =>
    tmdbFetch("/tv/popular", {}, signal),
  trendingTv: (signal?: AbortSignal): Promise<ApiResult<TmdbPage<TvListItem>>> =>
    tmdbFetch("/trending/tv/week", {}, signal),
  topRatedTv: (signal?: AbortSignal): Promise<ApiResult<TmdbPage<TvListItem>>> =>
    tmdbFetch("/tv/top_rated", {}, signal),

  discoverTv: (params: DiscoverParams, signal?: AbortSignal): Promise<ApiResult<TmdbPage<TvListItem>>> =>
    tmdbFetch("/discover/tv", discoverQuery(params, TV_SORTS), signal),

  movieDetail: (id: number, signal?: AbortSignal): Promise<ApiResult<MovieDetail>> =>
    tmdbFetch<MovieDetail>(
      `/movie/${id}`,
      {
        append_to_response: "credits,videos,similar,recommendations,keywords,release_dates,images",
        // TMDb menyaring video berdasarkan language, dan id-ID hampir selalu kosong.
        include_video_language: "en,null",
        // Logo judul jarang ada versi Indonesia, jadi ambil Inggris dan yang netral bahasa.
        include_image_language: "en,null,id",
      },
      signal,
    ),

  /** Detail ringkas untuk hero: hanya video dan logo judul, tanpa kredit atau rekomendasi. */
  movieHero: (id: number, signal?: AbortSignal): Promise<ApiResult<MovieDetail>> =>
    tmdbFetch<MovieDetail>(
      `/movie/${id}`,
      {
        append_to_response: "videos,images",
        include_video_language: "en,null",
        // Logo judul jarang ada versi Indonesia, jadi ambil Inggris dan yang netral bahasa.
        include_image_language: "en,null,id",
      },
      signal,
    ),

  /** Sinopsis cadangan untuk diterjemahkan; tagline Inggris dipakai apa adanya bila versi Indonesia kosong. */
  movieDetailEn: (id: number, signal?: AbortSignal): Promise<ApiResult<MovieDetail>> =>
    tmdbFetch<MovieDetail>(`/movie/${id}`, {}, signal, "en-US"),

  tvDetail: (id: number, signal?: AbortSignal): Promise<ApiResult<TvDetail>> =>
    tmdbFetch<TvDetail>(
      `/tv/${id}`,
      {
        append_to_response: "credits,videos,similar,recommendations,content_ratings,images",
        include_video_language: "en,null",
        // Logo judul jarang ada versi Indonesia, jadi ambil Inggris dan yang netral bahasa.
        include_image_language: "en,null,id",
      },
      signal,
    ),

  tvHero: (id: number, signal?: AbortSignal): Promise<ApiResult<TvDetail>> =>
    tmdbFetch<TvDetail>(
      `/tv/${id}`,
      {
        append_to_response: "videos,images",
        include_video_language: "en,null",
        include_image_language: "en,null,id",
      },
      signal,
    ),

  /** Sinopsis cadangan untuk diterjemahkan; tagline Inggris dipakai apa adanya bila versi Indonesia kosong. */
  tvDetailEn: (id: number, signal?: AbortSignal): Promise<ApiResult<TvDetail>> =>
    tmdbFetch<TvDetail>(`/tv/${id}`, {}, signal, "en-US"),

  seasonDetail: (tvId: number, season: number, signal?: AbortSignal): Promise<ApiResult<SeasonDetail>> =>
    tmdbFetch<SeasonDetail>(`/tv/${tvId}/season/${season}`, {}, signal),

  /** Nama dan sinopsis episode cadangan ketika versi Indonesia kosong di TMDb. */
  seasonDetailEn: (tvId: number, season: number, signal?: AbortSignal): Promise<ApiResult<SeasonDetail>> =>
    tmdbFetch<SeasonDetail>(`/tv/${tvId}/season/${season}`, {}, signal, "en-US"),

  personDetail: (id: number, signal?: AbortSignal): Promise<ApiResult<PersonDetailWithCredits>> =>
    tmdbFetch<PersonDetailWithCredits>(
      `/person/${id}`,
      { append_to_response: "movie_credits,tv_credits" },
      signal,
    ),

  /** Biografi cadangan ketika versi bahasa Indonesia kosong di TMDb. */
  personBioEn: (id: number, signal?: AbortSignal): Promise<ApiResult<PersonDetailWithCredits>> =>
    tmdbFetch<PersonDetailWithCredits>(`/person/${id}`, {}, signal, "en-US"),

  search: (
    query: string,
    type: "multi" | "movie" | "tv",
    page: number,
    signal?: AbortSignal,
  ): Promise<ApiResult<TmdbPage<MultiSearchItem>>> =>
    tmdbFetch(`/search/${type}`, { query, page }, signal),
};
