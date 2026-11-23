import { useMemo } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { api, type SortOption } from "../api/endpoints";
import { pageToItems } from "../api/transform";
import type { MovieListItem, TmdbPage, TvListItem } from "../api/tmdbTypes";
import { useLanguage } from "../context/Language";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import MediaCard from "./MediaCard";
import { GridSkeleton } from "./Skeleton";

interface Props {
  mediaType: "movie" | "tv";
}

const VALID_SORTS = new Set<SortOption>([
  "popularity.desc",
  "vote_average.desc",
  "release.desc",
  "title.asc",
]);

const MAX_PAGES = 500;

export default function CatalogView({ mediaType }: Props) {
  const [params, setParams] = useSearchParams();
  const { lang, copy } = useLanguage();
  const isMovie = mediaType === "movie";
  const title = isMovie ? copy.catalog.movieTitle : copy.catalog.tvTitle;
  const intro = isMovie ? copy.catalog.movieIntro : copy.catalog.tvIntro;
  const singular = isMovie ? copy.catalog.movieSingular : copy.catalog.tvSingular;
  const plural = isMovie ? copy.catalog.moviePlural : copy.catalog.tvPlural;
  useDocumentTitle(title);

  const legacyQuery = params.get("q");
  const genreId = Number(params.get("genre")) || null;
  const sortRaw = params.get("urut") as SortOption | null;
  const sort: SortOption = sortRaw && VALID_SORTS.has(sortRaw) ? sortRaw : "popularity.desc";
  const page = Math.min(MAX_PAGES, Math.max(1, Number(params.get("page")) || 1));

  const genresState = useApi(
    (s) => (isMovie ? api.movieGenres(s) : api.tvGenres(s)),
    [lang, isMovie],
  );
  const results = useApi<TmdbPage<MovieListItem | TvListItem>>(
    (s) =>
      isMovie
        ? api.discoverMovies({ page, genreId, sort }, s)
        : api.discoverTv({ page, genreId, sort }, s),
    [lang, page, genreId, sort, isMovie],
  );

  const items = useMemo(
    () => pageToItems(results.data, mediaType, 60),
    [results.data, mediaType],
  );
  const totalPages = Math.min(MAX_PAGES, results.data?.total_pages ?? 0);
  // TMDb id-ID menerjemahkan Crime (80) dan War (10752) sama-sama menjadi
  // "Kejahatan", jadi label ganda disembunyikan agar filter tidak membingungkan.
  const genres = useMemo(() => {
    const seen = new Set<string>();
    return (genresState.data?.genres ?? []).filter((genre) => {
      if (seen.has(genre.name)) return false;
      seen.add(genre.name);
      return true;
    });
  }, [genresState.data]);

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // Filter atau urutan baru berarti kembali ke halaman pertama.
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  if (legacyQuery) {
    return <Navigate to={`/cari?q=${encodeURIComponent(legacyQuery)}`} replace />;
  }

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "popularity.desc", label: copy.catalog.sortPopular },
    { value: "vote_average.desc", label: copy.catalog.sortRating },
    {
      value: "release.desc",
      label: isMovie ? copy.catalog.sortNewestMovie : copy.catalog.sortNewestTv,
    },
    {
      value: "title.asc",
      label: isMovie ? copy.catalog.sortTitleMovie : copy.catalog.sortTitleTv,
    },
  ];
  const filterActive = genreId !== null || sort !== "popularity.desc";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist">{intro}</p>

      <div className="sticky top-[4.25rem] z-20 -mx-4 mt-6 border-y border-line bg-night/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label htmlFor="urut" className="text-sm text-mist">
              {copy.catalog.sortLabel}
            </label>
            <select
              id="urut"
              value={sort}
              onChange={(e) => update("urut", e.target.value === "popularity.desc" ? null : e.target.value)}
              className="min-h-11 rounded-full border border-line bg-dusk px-4 py-2.5 text-sm text-paper transition hover:border-lineStrong focus:border-clix"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm tabular-nums text-mist" aria-live="polite">
              {results.error ? (
                ""
              ) : results.loading ? (
                copy.catalog.loading(plural)
              ) : (
                <>
                  {copy.common.page} {page} {copy.common.of} {totalPages || 1}
                </>
              )}
            </p>
            {filterActive && (
              <button
                type="button"
                onClick={() => setParams({}, { replace: true })}
                className="text-sm font-semibold text-clix transition hover:text-paper"
              >
                {copy.common.resetFilters}
              </button>
            )}
          </div>
        </div>

        <div role="group" aria-label={copy.catalog.genreFilter} className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => update("genre", null)}
            aria-pressed={genreId === null}
            className={`chip ${genreId === null ? "chip-active" : "chip-idle"}`}
          >
            {copy.catalog.all}
          </button>
          {genresState.loading && genreId !== null && (
            <div className="h-11 w-40 shrink-0 animate-pulse rounded-full bg-haze/40" aria-hidden="true" />
          )}
          {genres.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => update("genre", genreId === g.id ? null : String(g.id))}
              aria-pressed={genreId === g.id}
              className={`chip ${genreId === g.id ? "chip-active" : "chip-idle"}`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {results.loading && <GridSkeleton />}

      {!results.loading && results.error && (
        <div className="mt-6">
          <ErrorState message={results.error} code={results.code} onRetry={results.reload} />
        </div>
      )}

      {!results.loading && !results.error && items && items.length === 0 && (
        <EmptyState
          title={copy.catalog.emptyTitle(singular)}
          description={copy.catalog.emptyDescription}
          action={
            <button
              type="button"
              onClick={() => setParams({}, { replace: true })}
              className="btn-primary"
            >
              {copy.catalog.showAll(plural)}
            </button>
          }
        />
      )}

      {!results.loading && !results.error && items && items.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <li key={item.id}>
              <MediaCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {!results.loading && !results.error && totalPages > 1 && (
        <nav aria-label={copy.catalog.pagination} className="mt-10 flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => update("page", String(page - 1))}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.common.previous}
          </button>
          <p className="text-sm tabular-nums text-mist">
            {copy.common.page} <span className="font-semibold text-paper">{page}</span>{" "}
            {copy.common.of} {totalPages}
          </p>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => update("page", String(page + 1))}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.common.next}
          </button>
        </nav>
      )}
    </div>
  );
}
