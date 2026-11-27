import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { backdropUrl, posterUrl } from "../api/images";
import { api } from "../api/endpoints";
import { pageToItems } from "../api/transform";
import type { CrewMember, MovieDetail } from "../api/tmdbTypes";
import { useLanguage } from "../context/Language";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import CastCard from "../components/CastCard";
import Breadcrumbs from "../components/Breadcrumbs";
import MediaRow from "../components/MediaRow";
import MoviePlayer from "../components/MoviePlayer";
import SectionNav from "../components/SectionNav";
import TitleLogo from "../components/TitleLogo";
import TrailerButton from "../components/TrailerButton";
import TmdbImage from "../components/TmdbImage";
import { DetailSkeleton } from "../components/Skeleton";
import WatchlistButton from "../components/WatchlistButton";
import { errorMessage } from "../utils/errors";
import {
  formatCountry,
  formatDate,
  formatDuration,
  formatLanguage,
  formatMoney,
  formatStatus,
  formatVotes,
  formatYear,
} from "../utils/format";
import { localizeTextFields, type TextLocaleInfo } from "../utils/localize";
import { preferredTitle } from "../utils/title";
import { pickTrailerKey } from "../utils/trailer";

type MovieView = MovieDetail & { textLocale?: TextLocaleInfo };

const WRITER_JOBS = new Set(["Screenplay", "Writer", "Story", "Characters", "Teleplay"]);
function uniquePeople(people: CrewMember[]): CrewMember[] {
  const seen = new Set<number>();
  return people.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function PersonLink({ person, children }: { person: { id: number; name: string }; children?: ReactNode }) {
  return (
    <Link to={`/orang/${person.id}`} className="text-clixText transition hover:text-paper">
      {children ?? person.name}
    </Link>
  );
}

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const { lang, isEn, copy } = useLanguage();
  const numericId = Number(id);
  const valid = Number.isInteger(numericId) && numericId > 0;
  const [showAllCast, setShowAllCast] = useState(false);

  const state = useApi<MovieView>(
    async (signal) => {
      if (!valid) {
        return {
          ok: false as const,
          status: 404,
          code: "NOT_FOUND",
          message: "Film tidak ditemukan.",
        };
      }
      const primary = await api.movieDetail(numericId, signal);
      if (!primary.ok || isEn) return primary;
      const localized = await localizeTextFields(
        primary.data,
        () => api.movieDetailEn(numericId, signal),
        signal,
      );
      return { ok: true as const, data: { ...localized.data, textLocale: localized.locale } };
    },
    [numericId, lang, isEn, valid],
  );

  const movie = state.data;
  const title = movie
    ? preferredTitle(movie.title, movie.original_title, movie.original_language)
    : "";
  useDocumentTitle(
    title || (state.loading ? copy.movie.loadingTitle : copy.movie.fallbackTitle),
  );

  const similarItems = useMemo(
    () => pageToItems(movie?.similar, "movie", 15),
    [movie?.similar],
  );
  const recommendedItems = useMemo(
    () => pageToItems(movie?.recommendations, "movie", 15),
    [movie?.recommendations],
  );

  if (state.loading) return <DetailSkeleton />;

  if (state.error || !movie) {
    const notFound = state.code === "NOT_FOUND";
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-extrabold">
          {notFound ? copy.movie.notFoundTitle : copy.movie.errorTitle}
        </h1>
        <p className="mt-3 text-mist">
          {notFound
            ? copy.movie.notFoundBody
            : errorMessage(lang, state.code, state.error ?? "")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {notFound ? (
            <Link
              to="/katalog"
              className="btn-primary"
            >
              {copy.movie.browseCatalog}
            </Link>
          ) : (
            <button
              type="button"
              onClick={state.reload}
              className="btn-primary"
            >
              {copy.common.retry}
            </button>
          )}
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-full border border-haze px-6 text-sm font-semibold text-paper transition hover:border-mist"
          >
            {copy.common.home}
          </Link>
        </div>
      </div>
    );
  }

  const targetId = movie.imdb_id || movie.id;
  const embedUrl = targetId ? `https://embedmaster.link/movie/${targetId}` : null;
  const crew = movie.credits?.crew ?? [];
  const cast = movie.credits?.cast ?? [];
  const directors = uniquePeople(crew.filter((c) => c.job === "Director"));
  const writers = uniquePeople(crew.filter((c) => WRITER_JOBS.has(c.job)));
  const producers = uniquePeople(crew.filter((c) => c.job.includes("Producer"))).slice(0, 4);
  const trailerKey = pickTrailerKey(movie.videos?.results);
  const releaseYear = formatYear(movie.release_date);
  const runtime = formatDuration(movie.runtime);
  const certification =
    movie.release_dates?.results
      .flatMap((r) => (r.iso_3166_1 === "US" ? r.release_dates : []))
      .map((d) => d.certification)
      .find(Boolean) ?? "";
  const visibleCast = showAllCast ? cast : cast.slice(0, 10);
  const originalDiffers = movie.original_title.trim() !== title.trim();
  const visibleCastCount = cast.length;
  const sectionItems = [
    ...(visibleCastCount > 0
      ? [{ id: "pemeran", label: copy.movie.mainCast }]
      : []),
    { id: "produksi", label: copy.movie.productionInfo },
    ...((similarItems?.length ?? 0) > 0 || (recommendedItems?.length ?? 0) > 0
      ? [{ id: "serupa", label: copy.movie.similar }]
      : []),
  ];

  return (
    <>
      <MoviePlayer
        title={title}
        embedUrl={embedUrl}
      />

      <section className="relative isolate overflow-hidden">
        {movie.backdrop_path && (
          <div className="pointer-events-none absolute inset-0 -z-10">
            <TmdbImage
              kind="backdrop"
              fill
              eager
              src={backdropUrl(movie.backdrop_path)}
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-b from-night/55 via-night/80 to-night" />
          </div>
        )}
        <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-10 sm:px-6 md:grid-cols-[260px_1fr] md:pt-16">
          <div className="mx-auto w-48 md:mx-0 md:w-full">
            <TmdbImage
              kind="poster"
              src={posterUrl(movie.poster_path, true)}
              alt={copy.common.posterAlt(title)}
              className="shadow-raise ring-1 ring-paper/15"
            />
          </div>

          <div className="md:pt-6">
            <Breadcrumbs
              items={[
                { label: copy.common.homeLabel, to: "/" },
                { label: copy.catalog.movieTitle, to: "/katalog" },
                { label: title },
              ]}
            />
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl">
              <TitleLogo
                logos={movie.images?.logos}
                title={title}
                className="max-h-24 drop-shadow-[0_2px_14px_rgba(9,8,26,0.9)] sm:max-h-32"
              />
            </h1>
            {originalDiffers && (
              <p className="mt-2 text-sm italic text-mist">
                {copy.movie.originalTitle}: {movie.original_title}
              </p>
            )}
            {movie.tagline && <p className="mt-3 italic text-lg text-paper/90">{movie.tagline}</p>}

            <dl className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-mist">
              {movie.vote_average > 0 && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">{copy.common.rating}</dt>
                  <dd className="font-semibold text-gold">
                    {movie.vote_average.toFixed(1)} / 10
                    <span className="ml-2 font-normal text-mist">({formatVotes(movie.vote_count)})</span>
                  </dd>
                </div>
              )}
              {releaseYear && (
                <div>
                  <dt className="sr-only">{copy.movie.releaseYear}</dt>
                  <dd>{releaseYear}</dd>
                </div>
              )}
              {runtime && (
                <div>
                  <dt className="sr-only">{copy.movie.runtime}</dt>
                  <dd>{runtime}</dd>
                </div>
              )}
              {certification && (
                <div>
                  <dt className="sr-only">{copy.movie.ageRating}</dt>
                  <dd className="rounded border border-mist/50 px-1.5 text-xs">{certification}</dd>
                </div>
              )}
            </dl>

            {movie.genres.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {movie.genres.map((g) => (
                  <li key={g.id}>
                    <Link
                      to={`/katalog?genre=${g.id}`}
                      className="inline-flex min-h-11 items-center rounded-full border border-line bg-night/70 px-3 py-1 text-xs font-medium text-paper transition hover:border-clix/50 hover:bg-clix/15"
                    >
                      {g.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-6 max-w-2xl leading-relaxed text-paper/90">
              {movie.overview || copy.common.overviewEmpty}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <WatchlistButton item={{ id: movie.id, mediaType: "movie" }} title={title} />
              {trailerKey && <TrailerButton trailerKey={trailerKey} title={title} />}
            </div>

            {(directors.length > 0 || writers.length > 0 || producers.length > 0) && (
              <dl className="mt-8 grid max-w-2xl gap-5 sm:grid-cols-3">
                {directors.length > 0 && (
                  <div>
                    <dt className="text-sm text-mist">{copy.movie.director}</dt>
                    <dd className="mt-1 font-medium">
                      {directors.map((p, i) => (
                        <span key={p.id}>
                          {i > 0 && ", "}
                          <PersonLink person={p} />
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {writers.length > 0 && (
                  <div>
                    <dt className="text-sm text-mist">{copy.movie.writers}</dt>
                    <dd className="mt-1 font-medium">
                      {writers.slice(0, 3).map((p, i) => (
                        <span key={p.id}>
                          {i > 0 && ", "}
                          <PersonLink person={p} />
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {producers.length > 0 && (
                  <div>
                    <dt className="text-sm text-mist">{copy.movie.producers}</dt>
                    <dd className="mt-1 font-medium">
                      {producers.map((p, i) => (
                        <span key={p.id}>
                          {i > 0 && ", "}
                          <PersonLink person={p} />
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
      </section>

      <SectionNav label={copy.movie.sectionNav} items={sectionItems} />

      {visibleCastCount > 0 && (
        <section
          id="pemeran"
          aria-label={copy.movie.castSection}
          className="mx-auto mt-10 max-w-7xl scroll-mt-36 px-4 sm:px-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl font-bold tracking-tight">{copy.movie.mainCast}</h2>
            {visibleCastCount > 10 && (
              <button
                type="button"
                onClick={() => setShowAllCast((v) => !v)}
                aria-expanded={showAllCast}
                className="min-h-11 text-sm font-semibold text-clixText transition hover:text-paper"
              >
                {showAllCast
                  ? copy.movie.showMainCastOnly
                  : copy.movie.allCast(visibleCastCount)}
              </button>
            )}
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {visibleCast.map((person, index) => (
              <CastCard key={`${person.id}-${index}`} person={person} />
            ))}
          </ul>
        </section>
      )}

      <section
        id="produksi"
        aria-label={copy.movie.productionInfo}
        className="mx-auto mt-12 max-w-7xl scroll-mt-36 px-4 sm:px-6"
      >
        <h2 className="font-display text-2xl font-bold tracking-tight">{copy.movie.productionInfo}</h2>
        <dl className="mt-5 grid max-w-4xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {movie.production_companies.length > 0 && (
            <div>
              <dt className="text-sm text-mist">{copy.movie.productionCompanies}</dt>
              <dd className="mt-1 font-medium">{movie.production_companies.map((c) => c.name).join(", ")}</dd>
            </div>
          )}
          {movie.production_countries.length > 0 && (
            <div>
              <dt className="text-sm text-mist">{copy.movie.productionCountries}</dt>
              <dd className="mt-1 font-medium">
                {movie.production_countries
                  .map((c) => formatCountry(c.iso_3166_1, c.name))
                  .join(", ")}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-mist">{copy.movie.originalLanguage}</dt>
            <dd className="mt-1 font-medium">{formatLanguage(movie.original_language)}</dd>
          </div>
          <div>
            <dt className="text-sm text-mist">{copy.movie.productionStatus}</dt>
            <dd className="mt-1 font-medium">{formatStatus(movie.status)}</dd>
          </div>
          {formatMoney(movie.budget) && (
            <div>
              <dt className="text-sm text-mist">{copy.movie.budget}</dt>
              <dd className="mt-1 font-medium">{formatMoney(movie.budget)}</dd>
            </div>
          )}
          {formatMoney(movie.revenue) && (
            <div>
              <dt className="text-sm text-mist">{copy.movie.revenue}</dt>
              <dd className="mt-1 font-medium">{formatMoney(movie.revenue)}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-mist">{copy.movie.releaseDate}</dt>
            <dd className="mt-1 font-medium">
              {formatDate(movie.release_date) || copy.common.notAvailable}
            </dd>
          </div>
        </dl>

        {movie.keywords && movie.keywords.keywords.length > 0 && (
          <div className="mt-8 max-w-4xl">
            <h3 className="text-sm font-semibold text-mist">{copy.movie.keywords}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {movie.keywords.keywords.slice(0, 14).map((k) => (
                <li
                  key={k.id}
                  className="rounded-full border border-haze/70 px-3 py-1 text-xs text-mist"
                >
                  {k.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div id="serupa" className="mt-8 scroll-mt-36">
        <MediaRow
          title={copy.movie.similar}
          items={similarItems}
          loading={state.loading}
          error={null}
        />
        <MediaRow
          title={copy.movie.recommended}
          items={recommendedItems}
          loading={state.loading}
          error={null}
        />
      </div>
    </>
  );
}
