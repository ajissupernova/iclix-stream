import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { profileUrl } from "../api/images";
import { api } from "../api/endpoints";
import { isExcludedTitle, toMediaItem } from "../api/transform";
import { useLanguage } from "../context/Language";
import { useApi } from "../hooks/useApi";
import { useDebounced } from "../hooks/useDebounced";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { formatDepartment, formatNumber } from "../utils/format";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import MediaCard from "../components/MediaCard";
import { GridSkeleton } from "../components/Skeleton";
import TmdbImage from "../components/TmdbImage";

type SearchType = "multi" | "movie" | "tv";

const TYPES: SearchType[] = ["multi", "movie", "tv"];

const RECENT_KEY = "iclix:pencarian-terakhir";
const RECENT_MAX = 5;

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string").slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function saveRecent(query: string): string[] {
  const next = [query, ...readRecent().filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(
    0,
    RECENT_MAX,
  );
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Penyimpanan diblokir: riwayat tetap tampil selama sesi berjalan.
  }
  return next;
}

function isSearchType(value: string | null): value is SearchType {
  return value === "multi" || value === "movie" || value === "tv";
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const { lang, copy } = useLanguage();
  useDocumentTitle(copy.search.docTitle);

  const queryParam = params.get("q") ?? "";
  const type: SearchType = isSearchType(params.get("t")) ? (params.get("t") as SearchType) : "multi";
  const page = Math.max(1, Math.min(500, Number(params.get("page")) || 1));

  const [input, setInput] = useState(queryParam);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedInput = useDebounced(input, 400);

  // Hasil debounce ditulis ke URL supaya bisa dibagikan dan dimuat ulang.
  useEffect(() => {
    if (debouncedInput === queryParam) return;
    const next = new URLSearchParams(params);
    if (debouncedInput) next.set("q", debouncedInput);
    else next.delete("q");
    next.delete("page");
    setParams(next, { replace: true });
  }, [debouncedInput]);

  // Tombol back/forward atau URL eksternal membawa q baru: samakan isi kolom.
  useEffect(() => {
    if (queryParam !== input && queryParam !== debouncedInput) setInput(queryParam);
  }, [queryParam]);

  // Garis miring membuka kolom cari, kecuali saat pengguna sedang mengetik di kolom lain.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useApi(
    (signal) =>
      queryParam.trim()
        ? api.search(queryParam.trim(), type, page, signal)
        : Promise.resolve({
            ok: true as const,
            data: { page: 1, results: [], total_pages: 0, total_results: 0 },
          }),
    [queryParam, type, page, lang],
  );

  const movies = useMemo(() => {
    const data = results.data;
    if (!data) return null;
    if (type === "tv") return [];
    return data.results
      .filter((r) => r.media_type !== "tv" && !isExcludedTitle(r, "movie"))
      .map((r) => toMediaItem(r, "movie"));
  }, [results.data, type]);

  const shows = useMemo(() => {
    const data = results.data;
    if (!data) return null;
    if (type === "movie") return [];
    return data.results
      .filter((r) => r.media_type !== "movie" && !isExcludedTitle(r, "tv"))
      .map((r) => toMediaItem(r, "tv"));
  }, [results.data, type]);

  const people = useMemo(() => {
    const data = results.data;
    if (!data || type !== "multi") return [];
    return data.results.filter((r) => r.media_type === "person");
  }, [results.data, type]);

  const totalResults = results.data?.total_results ?? 0;
  const totalPages = Math.min(500, results.data?.total_pages ?? 0);
  const hasQuery = queryParam.trim() !== "";

  const updateType = (nextType: SearchType) => {
    const next = new URLSearchParams(params);
    if (nextType === "multi") next.delete("t");
    else next.set("t", nextType);
    next.delete("page");
    setParams(next, { replace: true });
  };

  const updatePage = (nextPage: number) => {
    const next = new URLSearchParams(params);
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    setParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyQuery = (value: string) => {
    setInput(value);
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    next.delete("page");
    setParams(next, { replace: true });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const query = input.trim();
    if (query.length >= 2) setRecent(saveRecent(query));
  };

  const clearRecent = () => {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // Penyimpanan diblokir: cukup kosongkan tampilan.
    }
    setRecent([]);
  };

  const typeLabel: Record<SearchType, string> = {
    multi: copy.search.all,
    movie: copy.search.movies,
    tv: copy.search.tv,
  };

  const emptyMovies = movies !== null && movies.length === 0;
  const emptyShows = shows !== null && shows.length === 0;
  const noResults =
    !results.loading && !results.error && hasQuery && emptyMovies && emptyShows && people.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {copy.search.heading}
      </h1>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={onSubmit} className="relative flex-1">
          <label htmlFor="cari" className="sr-only">
            {copy.search.inputLabel}
          </label>
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            id="cari"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={copy.search.placeholder}
            autoComplete="off"
            className="w-full rounded-full border border-line bg-dusk py-3 pl-10 pr-11 text-sm text-paper placeholder:text-mist/80 transition hover:border-lineStrong focus:border-clix"
          />
          {input ? (
            <button
              type="button"
              onClick={() => applyQuery("")}
              aria-label={copy.search.clear}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-mist transition hover:bg-panel hover:text-paper"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ) : (
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-mist sm:block"
            >
              /
            </kbd>
          )}
        </form>
        <div role="group" aria-label={copy.search.typeGroup} className="flex gap-2">
          {TYPES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => updateType(value)}
              aria-pressed={type === value}
              className={`chip flex-1 justify-center sm:flex-none ${type === value ? "chip-active" : "chip-idle"}`}
            >
              {typeLabel[value]}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-sm tabular-nums text-mist" aria-live="polite">
        {!hasQuery
          ? copy.search.prompt
          : results.error
            ? ""
            : results.loading
              ? copy.search.searching
              : `${formatNumber(totalResults)} ${copy.search.resultsFor} “${queryParam}”`}
      </p>

      {!hasQuery && recent.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-paper">{copy.search.recent}</h2>
            <button
              type="button"
              onClick={clearRecent}
              className="min-h-11 text-sm font-medium text-mist transition hover:text-paper"
            >
              {copy.search.clearRecent}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {recent.map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => applyQuery(query)}
                className="chip chip-idle"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {results.loading && <GridSkeleton />}

      {!results.loading && results.error && (
        <div className="mt-6">
          <ErrorState message={results.error} code={results.code} onRetry={results.reload} />
        </div>
      )}

      {!results.loading && !results.error && noResults && (
        <EmptyState
          title={copy.search.noResults}
          description={copy.search.noResultsHint}
        />
      )}

      {!results.loading && !results.error && !hasQuery && (
        <EmptyState
          title={copy.search.startTitle}
          description={copy.search.startHint}
        />
      )}

      {!results.loading && !results.error && movies && movies.length > 0 && (
        <section aria-label={copy.search.moviesSection} className="mt-8">
          <h2 className="font-display text-xl font-bold sm:text-2xl">{copy.search.movies}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {movies.map((item) => (
              <li key={item.id}>
                <MediaCard item={item} showType={type === "multi"} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!results.loading && !results.error && shows && shows.length > 0 && (
        <section aria-label={copy.search.tvSection} className="mt-10">
          <h2 className="font-display text-xl font-bold sm:text-2xl">{copy.search.tv}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {shows.map((item) => (
              <li key={item.id}>
                <MediaCard item={item} showType={type === "multi"} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!results.loading && !results.error && people.length > 0 && (
        <section aria-label={copy.search.peopleSection} className="mt-10">
          <h2 className="font-display text-xl font-bold sm:text-2xl">{copy.search.peopleHeading}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {people.map((person) => (
              <li key={person.id}>
                <Link to={`/orang/${person.id}`} className="group block rounded-card">
                  <TmdbImage
                    kind="profile"
                    src={profileUrl(person.profile_path ?? null)}
                    alt={copy.common.photoAlt(person.name ?? "")}
                    className="rounded-card ring-1 ring-paper/10 transition-transform duration-200 focus-visible:-translate-y-1 group-hover:-translate-y-1 group-hover:ring-paper/30"
                  />
                  <p className="mt-2 text-sm font-semibold text-paper">{person.name}</p>
                  {person.known_for_department && (
                    <p className="mt-0.5 text-xs text-mist">
                      {formatDepartment(person.known_for_department)}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!results.loading && !results.error && hasQuery && totalPages > 1 && (
        <nav aria-label={copy.search.pagination} className="mt-10 flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updatePage(page - 1)}
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
            onClick={() => updatePage(page + 1)}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.common.next}
          </button>
        </nav>
      )}
    </div>
  );
}
