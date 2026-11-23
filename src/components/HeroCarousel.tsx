import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { backdropUrl, heroBackdropUrl, logoUrl } from "../api/images";
import { useLanguage } from "../context/Language";
import type { HeroTitle } from "../hooks/useHeroDetails";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { pickTitleLogo } from "../utils/artwork";
import { formatDuration, formatLanguage, formatYear } from "../utils/format";
import { preferredTitle } from "../utils/title";
import { pickTrailerKey } from "../utils/trailer";
import TextLocaleNote from "./TextLocaleNote";
import TmdbImage from "./TmdbImage";
import TrailerButton from "./TrailerButton";
import WatchlistButton from "./WatchlistButton";

const ROTATE_MS = 7000;

function titleFor(item: HeroTitle) {
  return item.mediaType === "movie"
    ? preferredTitle(item.title, item.original_title, item.original_language)
    : preferredTitle(item.name, item.original_name, item.original_language);
}

export default function HeroCarousel({ items }: { items: HeroTitle[] }) {
  const { copy } = useLanguage();
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const active = items[Math.min(index, items.length - 1)];
  const title = titleFor(active);

  useEffect(() => {
    setIndex((current) => Math.min(current, items.length - 1));
  }, [items.length]);

  useEffect(() => {
    if (!autoPlay || paused || reducedMotion || items.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [autoPlay, paused, reducedMotion, items.length]);

  const trailerKey = useMemo(() => pickTrailerKey(active.videos?.results), [active]);
  const logo = useMemo(() => pickTitleLogo(active.images?.logos), [active]);
  const year = formatYear(active.mediaType === "movie" ? active.release_date : active.first_air_date);
  const runtime = formatDuration(active.mediaType === "movie" ? active.runtime : active.episode_run_time[0] ?? null);
  const genres = active.genres.map((g) => g.name).join(", ");

  return (
    <section
      aria-label={copy.hero.label}
      aria-roledescription="carousel"
      className="relative isolate flex min-h-[420px] items-end overflow-hidden sm:min-h-[590px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="absolute inset-0 -z-10">
        {items.map((movie, i) => (
          <div
              key={`${movie.mediaType}-${movie.id}`}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
          >
            <TmdbImage
              kind="backdrop"
              fill
              eager={i === 0}
              src={backdropUrl(movie.backdrop_path)}
              highResSrc={heroBackdropUrl(movie.backdrop_path)}
              alt={i === index ? copy.common.backdropAlt(title) : ""}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-night/85 via-night/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-night via-night/70 to-transparent" />
      </div>

      <div className="hero-copy mx-auto w-full max-w-7xl px-4 pb-8 pt-24 sm:px-6 sm:pb-16 sm:pt-20">
        {active.tagline && (
          <p className="max-w-xl text-sm italic text-paper/85 sm:text-base">{active.tagline}</p>
        )}

        <h1 className="mt-4">
          {logo ? (
            <img
              src={logoUrl(logo.file_path) ?? undefined}
              alt={title}
              width={logo.width}
              height={logo.height}
              decoding="async"
              className="h-auto max-h-[4.5rem] w-auto max-w-full object-contain object-left drop-shadow-[0_2px_14px_rgba(9,8,26,0.9)] sm:max-h-28 lg:max-h-32"
            />
          ) : (
            <span className="block max-w-3xl font-display text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              {title}
            </span>
          )}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm sm:mt-4 sm:gap-x-4">
          {active.vote_average > 0 && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-gold">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.6l-5.1 2.9L6 11.8 1.7 7.8l5.8-.7L10 1.8z" />
              </svg>
              {active.vote_average.toFixed(1)}
            </span>
          )}
          <p className="max-w-full text-paper/90">{[year, runtime, genres].filter(Boolean).join(" • ")}</p>
          <span className="text-paper/85">
            {copy.hero.originalLanguage}: {formatLanguage(active.original_language)}
          </span>
        </div>

        {active.overview && (
          <p className="mt-3 line-clamp-2 max-w-xl leading-relaxed text-paper/95 sm:mt-4 sm:line-clamp-3">{active.overview}</p>
        )}
        <TextLocaleNote locale={active.textLocale} className="mt-2 max-w-xl" />

        <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-7 sm:gap-3">
          <Link
            to={active.mediaType === "movie" ? `/film/${active.id}` : `/serial/${active.id}`}
            className="btn-primary"
          >
            {copy.hero.details}
          </Link>
          {trailerKey && <TrailerButton trailerKey={trailerKey} title={title} />}
          <WatchlistButton item={{ id: active.id, mediaType: active.mediaType }} title={title} />
        </div>

        <div className="mt-5 flex items-center gap-3 sm:mt-8 sm:gap-4">
          <ul className="hidden items-center gap-2 sm:flex">
            {items.map((movie, i) => (
              <li key={`${movie.mediaType}-${movie.id}`}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={copy.hero.show(titleFor(movie))}
                  aria-current={i === index}
                  className="flex h-11 w-11 items-center justify-center"
                >
                  <span
                    className={`h-2.5 rounded-full transition-all ${i === index ? "w-7 bg-clix" : "w-2.5 bg-mist/50 hover:bg-mist"}`}
                  />
                </button>
              </li>
            ))}
          </ul>
          {items.length > 1 && (
            <div className="flex items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => setIndex((current) => (current - 1 + items.length) % items.length)}
                aria-label={copy.hero.show(titleFor(items[(index - 1 + items.length) % items.length]))}
                className="icon-btn"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <span className="min-w-12 text-center text-sm tabular-nums text-paper/90" aria-live="polite">
                {index + 1} / {items.length}
              </span>
              <button
                type="button"
                onClick={() => setIndex((current) => (current + 1) % items.length)}
                aria-label={copy.hero.show(titleFor(items[(index + 1) % items.length]))}
                className="icon-btn"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setAutoPlay((v) => !v)}
            aria-pressed={!autoPlay}
            aria-label={autoPlay ? copy.hero.pauseSlideshow : copy.hero.playSlideshow}
            title={autoPlay ? copy.hero.pause : copy.hero.play}
            className="icon-btn"
          >
            {autoPlay ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <rect x="7" y="5" width="4" height="14" rx="1" />
                <rect x="13" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
