/** Tipe dari format resmi TMDb yang memang kami pakai di UI. */

export interface TmdbPage<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface Genre {
  id: number;
  name: string;
}

/** /genre/{movie,tv}/list tidak memakai bentuk halaman; daftarnya ada di `genres`. */
export interface GenreList {
  genres: Genre[];
}

export interface MovieListItem {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
}

export interface TvListItem {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  profile_path: string | null;
  character: string;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

export interface Keyword {
  id: number;
  name: string;
}

/** Entri /movie/{id}/images; logo judul memakai bentuk yang sama tanpa judul. */
export interface ImageAsset {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
}

export interface ReleaseDateItem {
  certification: string;
  release_date: string;
}

export interface ReleaseDate {
  iso_3166_1: string;
  release_dates: ReleaseDateItem[];
}

export interface MovieDetail {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: Genre[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  status: string;
  budget: number;
  revenue: number;
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  imdb_id: string | null;
  credits?: Credits;
  videos?: { results: Video[] };
  similar?: TmdbPage<MovieListItem>;
  recommendations?: TmdbPage<MovieListItem>;
  keywords?: { keywords: Keyword[] };
  release_dates?: { results: ReleaseDate[] };
  images?: { logos: ImageAsset[] };
}

export interface SeasonSummary {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

export interface Episode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
  overview: string;
  vote_average: number;
}

export interface SeasonDetail {
  id: number;
  name: string;
  season_number: number;
  air_date: string | null;
  overview: string;
  episodes: Episode[];
}

export interface TvDetail {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string | null;
  genres: Genre[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  status: string;
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: SeasonSummary[];
  created_by: Array<{ id: number; name: string; profile_path: string | null }>;
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  episode_run_time: number[];
  credits?: Credits;
  videos?: { results: Video[] };
  similar?: TmdbPage<TvListItem>;
  recommendations?: TmdbPage<TvListItem>;
  content_ratings?: { results: Array<{ iso_3166_1: string; rating: string }> };
  images?: { logos: ImageAsset[] };
}

export interface PersonDetail {
  id: number;
  name: string;
  profile_path: string | null;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  known_for_department: string;
  popularity: number;
  gender: number;
}

export interface PersonCreditItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  character?: string;
  job?: string;
  original_language?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  popularity: number;
  poster_path: string | null;
  genre_ids?: number[];
}

export interface PersonCredits {
  cast: PersonCreditItem[];
  crew: PersonCreditItem[];
}

export interface PersonDetailWithCredits extends PersonDetail {
  movie_credits?: PersonCredits;
  tv_credits?: PersonCredits;
}

export interface MultiSearchItem extends Partial<MovieListItem>, Partial<TvListItem> {
  id: number;
  media_type: "movie" | "tv" | "person";
  profile_path?: string | null;
  name?: string;
  known_for_department?: string;
}

export interface TmdbConfiguration {
  images: {
    base_url: string;
    secure_base_url: string;
    poster_sizes: string[];
    backdrop_sizes: string[];
    logo_sizes: string[];
    profile_sizes: string[];
    still_sizes: string[];
  };
}
