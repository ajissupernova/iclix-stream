import { Link } from "react-router-dom";
import { api } from "../api/endpoints";
import { useLanguage } from "../context/Language";
import { useApi } from "../hooks/useApi";

const MAX_GENRES = 12;

/**
 * Pintasan genre memakai daftar genre resmi TMDb, jadi labelnya ikut bahasa
 * yang sedang aktif dan setiap tautan menuju katalog yang benar-benar ada.
 */
export default function GenreStrip() {
  const { lang, copy } = useLanguage();
  const state = useApi((signal) => api.movieGenres(signal), [lang]);

  if (state.loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6" aria-hidden="true">
        <div className="h-6 w-40 animate-pulse rounded bg-haze/40" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-11 w-24 animate-pulse rounded-full bg-haze/30" />
          ))}
        </div>
      </div>
    );
  }

  const seen = new Set<string>();
  const genres = (state.data?.genres ?? [])
    .filter((genre) => {
      if (seen.has(genre.name)) return false;
      seen.add(genre.name);
      return true;
    })
    .slice(0, MAX_GENRES);

  if (genres.length === 0) return null;

  return (
    <section aria-labelledby="genre-utama" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="genre-utama" className="text-balance font-display text-xl font-bold tracking-tight sm:text-2xl">
          {copy.home.genresHeading}
        </h2>
        <Link
          to="/katalog"
          className="min-h-11 text-sm font-medium text-mist underline-offset-4 transition hover:text-paper hover:underline"
        >
          {copy.common.seeAll}
        </Link>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {genres.map((genre) => (
          <li key={genre.id}>
            <Link to={`/katalog?genre=${genre.id}`} className="chip chip-idle">
              {genre.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
