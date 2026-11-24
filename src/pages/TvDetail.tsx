import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { backdropUrl, posterUrl, stillUrl } from "../api/images";
import { api } from "../api/endpoints";
import { pageToItems } from "../api/transform";
import { translateTexts } from "../api/translate";
import { useLanguage } from "../context/Language";
import type { SeasonDetail, TvDetail } from "../api/tmdbTypes";
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
  formatSeasonName,
  formatStatus,
  formatVotes,
  formatYear,
} from "../utils/format";
import { localizeTextFields, type TextLocaleInfo } from "../utils/localize";
import { preferredTitle } from "../utils/title";
import { pickTrailerKey } from "../utils/trailer";

type ShowView = TvDetail & { textLocale?: TextLocaleInfo };

type SeasonView = {
  detail: SeasonDetail;
};

export default function TvDetail() {
  const { id } = useParams<{ id: string }>();
  const { lang, isEn, copy } = useLanguage();
  const numericId = Number(id);
  const valid = Number.isInteger(numericId) && numericId > 0;
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [playbackSeason, setPlaybackSeason] = useState<number | null>(null);
  const [playbackEpisode, setPlaybackEpisode] = useState<number>(1);

  const state = useApi<ShowView>(
    async (signal) => {
      if (!valid) {
        return {
          ok: false as const,
          status: 404,
          code: "NOT_FOUND",
          message: copy.tv.notFoundBody,
        };
      }
      const primary = await api.tvDetail(numericId, signal);
      if (!primary.ok || isEn) return primary;
      const localized = await localizeTextFields(
        primary.data,
        () => api.tvDetailEn(numericId, signal),
        signal,
      );
      return { ok: true as const, data: { ...localized.data, textLocale: localized.locale } };
    },
    [numericId, lang, isEn, valid, copy],
  );

  const show = state.data;
  const title = show
    ? preferredTitle(show.name, show.original_name, show.original_language)
    : "";
  useDocumentTitle(title || (state.loading ? copy.tv.loadingTitle : copy.tv.fallbackTitle));

  const defaultSeason =
    show?.seasons.find((s) => s.season_number >= 1)?.season_number ?? show?.seasons[0]?.season_number ?? null;
  const seasonNumber = selectedSeason ?? defaultSeason;
  const seasonState = useApi<SeasonView>(
    async (signal) => {
      if (!show || seasonNumber === null) {
        return {
          ok: false as const,
          status: 404,
          code: "EMPTY",
          message: copy.tv.seasonUnavailable,
        };
      }
      const primary = await api.seasonDetail(show.id, seasonNumber, signal);
      if (!primary.ok) return primary;
      if (isEn) {
        return {
          ok: true as const,
          data: {
            detail: primary.data,
          },
        };
      }

      const genericName = (name: string) => /^Episode \d+$/i.test(name.trim());
      const englishOriginal = show.original_language.toLowerCase().startsWith("en");
      const needsEnglish = primary.data.episodes.some(
        (episode) => englishOriginal || !episode.overview.trim() || genericName(episode.name),
      );
      const english = needsEnglish
        ? await api.seasonDetailEn(show.id, seasonNumber, signal)
        : null;
      const byNumber = new Map(
        english && english.ok
          ? english.data.episodes.map((episode) => [episode.episode_number, episode] as const)
          : [],
      );

      const gaps = primary.data.episodes.map((episode) => {
        const alt = byNumber.get(episode.episode_number);
        return {
          episode,
          englishOverview: englishOriginal
            ? alt?.overview.trim() || episode.overview.trim()
            : !episode.overview.trim() ? alt?.overview.trim() ?? "" : "",
          englishName: genericName(episode.name) ? alt?.name.trim() ?? "" : "",
        };
      });

      const missingOverviews = gaps
        .map((gap) => gap.englishOverview)
        .filter((text) => text.length > 0);
      const translation =
        missingOverviews.length > 0 ? await translateTexts(missingOverviews, signal) : null;
      const translated = new Map<string, string>();
      if (translation?.ok) {
        missingOverviews.forEach((source, index) => {
          translated.set(source, translation.data.texts[index] ?? source);
        });
      }

      const episodes = gaps.map(({ episode, englishOverview, englishName }) => {
        let overview = episode.overview;
        if ((englishOriginal || !overview.trim()) && englishOverview) {
          const result = translated.get(englishOverview);
          if (result) {
            overview = result;
          } else {
            overview = englishOverview;
          }
        }
        return {
          ...episode,
          name: englishName || episode.name,
          overview,
        };
      });

      return {
        ok: true as const,
        data: {
          detail: { ...primary.data, episodes },
        },
      };
    },
    [show?.id, seasonNumber, lang, isEn, copy],
  );

  const similarItems = useMemo(() => pageToItems(show?.similar, "tv", 15), [show?.similar]);
  const recommendedItems = useMemo(
    () => pageToItems(show?.recommendations, "tv", 15),
    [show?.recommendations],
  );

  if (state.loading) return <DetailSkeleton />;

  if (state.error || !show) {
    const notFound = state.code === "NOT_FOUND";
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-extrabold">
          {notFound ? copy.tv.notFoundTitle : copy.tv.errorTitle}
        </h1>
        <p className="mt-3 text-mist">
          {notFound ? copy.tv.notFoundBody : errorMessage(lang, state.code, state.error ?? "")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {notFound ? (
            <Link
              to="/serial"
              className="btn-primary"
            >
              {copy.tv.browseCatalog}
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

  const activePlaybackSeason = playbackSeason ?? defaultSeason;
  const targetId = show.external_ids?.imdb_id || show.id;
  const embedUrl =
    targetId && activePlaybackSeason !== null
      ? `https://embedmaster.link/tv/${targetId}/${activePlaybackSeason}/${playbackEpisode}`
      : null;

  const crew = show.credits?.crew ?? [];
  const cast = show.credits?.cast ?? [];
  const creators = show.created_by.length > 0
    ? show.created_by
    : Array.from(
        new Map(crew.filter((c) => c.job === "Creator").map((c) => [c.id, c])).values(),
      );
  const trailerKey = pickTrailerKey(show.videos?.results);
  const originalDiffers = show.original_name.trim() !== title.trim();
  const rating = show.content_ratings?.results.find((r) => r.iso_3166_1 === "US")?.rating
    ?? show.content_ratings?.results[0]?.rating
    ?? "";
  const runtime = formatDuration(show.episode_run_time[0] ?? null);
  const airRange = [formatYear(show.first_air_date), show.last_air_date ? formatYear(show.last_air_date) : ""]
    .filter(Boolean)
    .join(` ${copy.tv.yearRangeSeparator} `);
  const firstAir = formatDate(show.first_air_date);
  const lastAir = formatDate(show.last_air_date);
  const sectionItems = [
    { id: "musim", label: copy.tv.seasonsHeading },
    ...(cast.length > 0 ? [{ id: "pemeran", label: copy.tv.mainCast }] : []),
    { id: "produksi", label: copy.tv.productionInfo },
    ...((similarItems?.length ?? 0) > 0 || (recommendedItems?.length ?? 0) > 0
      ? [{ id: "serupa", label: copy.tv.similar }]
      : []),
  ];

  return (
    <>
      <MoviePlayer
        title={title}
        embedUrl={embedUrl}
        backdropSrc={show.backdrop_path ? backdropUrl(show.backdrop_path) : null}
      />

      <section
        id="musim"
        aria-label={copy.tv.seasonsSection}
        className="mx-auto mt-8 max-w-7xl scroll-mt-36 px-4 sm:px-6"
      >
        <h2 className="font-display text-2xl font-bold tracking-tight">{copy.tv.seasonsHeading}</h2>

        <div role="group" aria-label={copy.tv.chooseSeason} className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {show.seasons.map((season) => (
            <button
              key={season.id}
              type="button"
              onClick={() => setSelectedSeason(season.season_number)}
              aria-pressed={seasonNumber === season.season_number}
              className={`chip ${seasonNumber === season.season_number ? "chip-active" : "chip-idle"}`}
            >
              {formatSeasonName(season.name)}
              <span className="sr-only">, {copy.tv.episodeCount(season.episode_count)}</span>
            </button>
          ))}
        </div>

        {seasonState.loading && (
          <p className="mt-6 text-sm text-mist" aria-live="polite">
            {copy.tv.loadingEpisodes}
          </p>
        )}

        {!seasonState.loading && seasonState.error && seasonState.code !== "EMPTY" && (
          <div className="mt-6 rounded-card border border-line bg-dusk px-4 py-5 text-center" role="alert">
            <p className="text-sm text-paper">{copy.tv.episodesError}</p>
            <p className="mt-1 text-xs text-mist">
              {errorMessage(lang, seasonState.code, seasonState.error)}
            </p>
            <button
              type="button"
              onClick={seasonState.reload}
              className="btn-primary mt-4"
            >
              {copy.common.retry}
            </button>
          </div>
        )}

        {!seasonState.loading && !seasonState.error && seasonState.data && (
          <>
            <ul className="mt-6 space-y-5">
              {seasonState.data.detail.episodes.map((episode) => (
                <li key={episode.id}>
                  <button
                    type="button"
              aria-pressed={activePlaybackSeason === seasonNumber && playbackEpisode === episode.episode_number}
              onClick={() => {
                if (seasonNumber !== null) setPlaybackSeason(seasonNumber);
                setPlaybackEpisode(episode.episode_number);
                document.getElementById("movie-player")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`grid w-full gap-4 rounded-card border p-4 text-left transition sm:grid-cols-[180px_1fr] ${
                activePlaybackSeason === seasonNumber && playbackEpisode === episode.episode_number
                        ? "border-clix bg-dusk"
                        : "border-line bg-dusk/70 hover:border-haze"
                    }`}
                  >
                    <TmdbImage
                      kind="still"
                      src={stillUrl(episode.still_path)}
                      alt={copy.common.stillAlt(episode.name)}
                      className="rounded-card ring-1 ring-paper/10"
                    />
                    <span>
                      <span className="block text-xs text-mist">
                        Episode {episode.episode_number}
                        {episode.runtime ? ` • ${formatDuration(episode.runtime)}` : ""}
                        {episode.air_date ? ` • ${formatDate(episode.air_date)}` : ""}
                        {episode.vote_average > 0 ? ` • ${episode.vote_average.toFixed(1)}` : ""}
                      </span>
                      <span className="mt-1 block font-display text-lg font-bold text-paper">{episode.name}</span>
                      {episode.overview && (
                        <span className="mt-1.5 block line-clamp-3 text-sm leading-relaxed text-paper/85">
                          {episode.overview}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {show.backdrop_path && (
            <TmdbImage kind="backdrop" fill eager src={backdropUrl(show.backdrop_path)} alt="" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-night via-night/90 to-night/55" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-10 sm:px-6 md:grid-cols-[260px_1fr] md:pt-16">
          <div className="mx-auto w-48 md:mx-0 md:w-full">
            <TmdbImage
              kind="poster"
              src={posterUrl(show.poster_path, true)}
              alt={copy.common.posterAlt(title)}
              className="shadow-raise ring-1 ring-paper/15"
            />
          </div>

          <div className="md:pt-6">
            <Breadcrumbs
              items={[
                { label: copy.common.homeLabel, to: "/" },
                { label: copy.catalog.tvTitle, to: "/serial" },
                { label: title },
              ]}
            />
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl">
              <TitleLogo
                logos={show.images?.logos}
                title={title}
                className="max-h-24 drop-shadow-[0_2px_14px_rgba(9,8,26,0.9)] sm:max-h-32"
              />
            </h1>
            {originalDiffers && (
              <p className="mt-2 text-sm italic text-mist">
                {copy.tv.originalTitle}: {show.original_name}
              </p>
            )}
            {show.tagline && <p className="mt-3 italic text-lg text-paper/90">{show.tagline}</p>}

            <dl className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-mist">
              {show.vote_average > 0 && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">{copy.common.rating}</dt>
                  <dd className="font-semibold text-gold">
                    {show.vote_average.toFixed(1)} / 10
                    <span className="ml-2 font-normal text-mist">({formatVotes(show.vote_count)})</span>
                  </dd>
                </div>
              )}
              {airRange && (
                <div>
                  <dt className="sr-only">{copy.tv.airPeriod}</dt>
                  <dd>{airRange}</dd>
                </div>
              )}
              {runtime && (
                <div>
                  <dt className="sr-only">{copy.tv.episodeRuntime}</dt>
                  <dd>{runtime} {copy.tv.perEpisode}</dd>
                </div>
              )}
              <div>
                <dt className="sr-only">{copy.tv.seasonCount}</dt>
                <dd>
                  {copy.tv.seasonsEpisodes(show.number_of_seasons, show.number_of_episodes)}
                </dd>
              </div>
              {rating && (
                <div>
                  <dt className="sr-only">{copy.tv.ageRating}</dt>
                  <dd className="rounded border border-mist/50 px-1.5 text-xs">{rating}</dd>
                </div>
              )}
            </dl>

            {show.genres.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {show.genres.map((g) => (
                  <li key={g.id}>
                    <Link
                      to={`/serial?genre=${g.id}`}
                      className="inline-flex min-h-11 items-center rounded-full border border-line bg-night/70 px-3 py-1 text-xs font-medium text-paper transition hover:border-clix/50 hover:bg-clix/15"
                    >
                      {g.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-6 max-w-2xl leading-relaxed text-paper/90">
              {show.overview || copy.common.overviewEmpty}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <WatchlistButton item={{ id: show.id, mediaType: "tv" }} title={title} />
              {trailerKey && <TrailerButton trailerKey={trailerKey} title={title} />}
            </div>

            {creators.length > 0 && (
              <dl className="mt-8 max-w-2xl">
                <dt className="text-sm text-mist">{copy.tv.creators}</dt>
                <dd className="mt-1 font-medium">
                  {creators.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && ", "}
                      <Link to={`/orang/${p.id}`} className="transition hover:text-clix">
                        {p.name}
                      </Link>
                    </span>
                  ))}
                </dd>
              </dl>
            )}
          </div>
        </div>
      </section>

      <SectionNav label={copy.tv.sectionNav} items={sectionItems} />

      {cast.length > 0 && (
        <section
          id="pemeran"
          aria-label={copy.tv.castSection}
          className="mx-auto mt-12 max-w-7xl scroll-mt-36 px-4 sm:px-6"
        >
          <h2 className="font-display text-2xl font-bold tracking-tight">{copy.tv.mainCast}</h2>
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {cast.slice(0, 12).map((person, index) => (
              <CastCard key={`${person.id}-${index}`} person={person} />
            ))}
          </ul>
        </section>
      )}

      <section
        id="produksi"
        aria-label={copy.tv.productionInfo}
        className="mx-auto mt-12 max-w-7xl scroll-mt-36 px-4 sm:px-6"
      >
        <h2 className="font-display text-2xl font-bold tracking-tight">{copy.tv.productionInfo}</h2>
        <dl className="mt-5 grid max-w-4xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {show.production_companies.length > 0 && (
            <div>
              <dt className="text-sm text-mist">{copy.tv.productionCompanies}</dt>
              <dd className="mt-1 font-medium">{show.production_companies.map((c) => c.name).join(", ")}</dd>
            </div>
          )}
          {show.production_countries.length > 0 && (
            <div>
              <dt className="text-sm text-mist">{copy.tv.productionCountries}</dt>
              <dd className="mt-1 font-medium">
                {show.production_countries
                  .map((c) => formatCountry(c.iso_3166_1, c.name))
                  .join(", ")}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-mist">{copy.tv.originalLanguage}</dt>
            <dd className="mt-1 font-medium">{formatLanguage(show.original_language)}</dd>
          </div>
          <div>
            <dt className="text-sm text-mist">{copy.tv.status}</dt>
            <dd className="mt-1 font-medium">{formatStatus(show.status)}</dd>
          </div>
          <div>
            <dt className="text-sm text-mist">{copy.tv.firstAir}</dt>
            <dd className="mt-1 font-medium">{firstAir || copy.common.notAvailable}</dd>
          </div>
          {lastAir && (
            <div>
              <dt className="text-sm text-mist">{copy.tv.lastAir}</dt>
              <dd className="mt-1 font-medium">{lastAir}</dd>
            </div>
          )}
        </dl>
      </section>

      <div id="serupa" className="mt-8 scroll-mt-36">
        <MediaRow title={copy.tv.similar} items={similarItems} loading={state.loading} error={null} />
        <MediaRow title={copy.tv.recommended} items={recommendedItems} loading={state.loading} error={null} />
      </div>
    </>
  );
}
