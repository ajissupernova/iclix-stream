import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { heroBackdropUrl, logoUrl } from "../api/images";
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

function pickBackdrop(
  candidates: NonNullable<HeroTitle["images"]>["backdrops"],
  targetRatio: number,
  excludedPath?: string | null,
) {
  const available = candidates?.filter((image) => image.file_path !== excludedPath) ?? [];
  return available.reduce<(typeof available)[number] | null>((best, image) => {
    const ratio = image.aspect_ratio || image.width / image.height;
    const score = Math.abs(Math.log(ratio / targetRatio)) - Math.min(image.vote_average, 10) * 0.002;
    if (!best) return image;
    const bestRatio = best.aspect_ratio || best.width / best.height;
    const bestScore = Math.abs(Math.log(bestRatio / targetRatio)) - Math.min(best.vote_average, 10) * 0.002;
    return score < bestScore ? image : best;
  }, null)?.file_path ?? null;
}

export default function HeroCarousel({ items }: { items: HeroTitle[] }) {
  const { copy } = useLanguage();
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const itemsKey = items.map((item) => `${item.mediaType}:${item.id}`).join(",");

  const active = items[Math.min(index, items.length - 1)];
  const title = titleFor(active);

  useEffect(() => {
    setIndex(0);
  }, [itemsKey]);

  useEffect(() => {
    if (!autoPlay || paused || reducedMotion || items.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [autoPlay, paused, reducedMotion, items.length]);

  const trailerKey = useMemo(() => pickTrailerKey(active.videos?.results), [active]);
  const logo = useMemo(() => pickTitleLogo(active.images?.logos), [active]);
  const curated = items[Math.min(index, items.length - 1)];
  const desktopBackdrop = curated.desktopBackdropPath ?? pickBackdrop(active.images?.backdrops, 1.78) ?? active.backdrop_path;
  const mobileBackdrop = curated.mobileBackdropPath ?? pickBackdrop(active.images?.backdrops, 0.82, desktopBackdrop) ?? desktopBackdrop;
  const year = formatYear(active.mediaType === "movie" ? active.release_date : active.first_air_date);
  const runtime = formatDuration(active.mediaType === "movie" ? active.runtime : active.episode_run_time[0] ?? null);
  const genres = active.genres.map((g) => g.name).join(", ");

  return (
    <section
      aria-label={copy.hero.label}
      aria-roledescription="carousel"
      className="relative isolate flex min-h-[500px] items-end overflow-hidden sm:min-h-[680px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="absolute inset-0 -z-10">
        {items.map((movie, i) => {
          const isActive = movie.mediaType === active.mediaType && movie.id === active.id;
          const movieDesktopBackdrop = movie.desktopBackdropPath
            ?? (isActive ? desktopBackdrop : pickBackdrop(movie.images?.backdrops, 1.78) ?? movie.backdrop_path);
          const movieMobileBackdrop = movie.mobileBackdropPath
            ?? (isActive ? mobileBackdrop : pickBackdrop(movie.images?.backdrops, 0.82, movieDesktopBackdrop) ?? movieDesktopBackdrop);
          return (
            <div
              key={`${movie.mediaType}-${movie.id}`}
              aria-hidden={i !== index}
              className={`absolute inset-0 transition-opacity duration-200 ${i === index ? "opacity-100" : "opacity-0"}`}
            >
              <TmdbImage
                kind="backdrop"
                fill
                eager={i === 0}
                src={heroBackdropUrl(movieDesktopBackdrop)}
                mobileSrc={heroBackdropUrl(movieMobileBackdrop)}
                alt={i === index ? copy.common.backdropAlt(title) : ""}
                objectPosition={`${movie.desktopBackdropCrop?.x ?? 50}% ${movie.desktopBackdropCrop?.y ?? 50}%`}
                mobileObjectPosition={`${movie.mobileBackdropCrop?.x ?? 50}% ${movie.mobileBackdropCrop?.y ?? 50}%`}
              />
            </div>
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-r from-night/85 via-night/35 to-transparent max-sm:bg-gradient-to-b max-sm:from-night/0 max-sm:via-night/30 max-sm:to-night/85" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-night via-night/70 to-transparent max-sm:h-48 max-sm:from-night/90 max-sm:via-night/45 max-sm:to-transparent" />
      </div>

      <div className="hero-copy mx-auto w-full max-w-7xl px-[18px] pb-5 pt-8 text-center sm:px-6 sm:pb-16 sm:pt-20 sm:text-left">
        <p className="hero-tagline hidden max-w-xl text-sm italic text-paper/85 sm:block sm:text-base">
          {active.tagline || "\u00a0"}
        </p>

        <h1 className="mt-1 flex min-h-[3.5rem] items-center justify-center sm:mt-4 sm:h-28 sm:min-h-0 sm:justify-start lg:h-32">
          {logo ? (
            <Link
              to={active.mediaType === "movie" ? `/film/${active.id}` : `/serial/${active.id}`}
              aria-label={`${title} - ${copy.hero.details}`}
              className="inline-flex max-h-full max-w-full items-center justify-center rounded-sm sm:justify-start"
            >
              <img
                src={logoUrl(logo.file_path) ?? undefined}
                alt=""
                width={logo.width}
                height={logo.height}
                decoding="async"
                className="h-auto max-h-[3.5rem] w-auto max-w-full object-contain object-left drop-shadow-[0_2px_14px_rgba(9,8,26,0.9)] sm:max-h-28 lg:max-h-32"
              />
            </Link>
          ) : (
            <span className="line-clamp-2 block max-w-3xl break-words font-display text-[clamp(2rem,9vw,2.5rem)] font-extrabold leading-[0.95] tracking-tight sm:line-clamp-none sm:text-6xl lg:text-7xl">
              {title}
            </span>
          )}
        </h1>

        <div className="mt-1 flex min-w-0 items-center justify-center gap-x-2 overflow-hidden whitespace-nowrap text-xs sm:mt-4 sm:justify-start sm:flex-wrap sm:gap-x-4 sm:gap-y-1.5 sm:overflow-visible sm:text-sm">
          {active.vote_average > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-gold">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.6l-5.1 2.9L6 11.8 1.7 7.8l5.8-.7L10 1.8z" />
              </svg>
              {active.vote_average.toFixed(1)}
            </span>
          )}
          <p className="min-w-0 truncate text-paper/90">{[year, runtime, genres].filter(Boolean).join(" • ")}</p>
          <span className="hidden shrink-0 text-paper/85 sm:inline">
            {copy.hero.originalLanguage}: {formatLanguage(active.original_language)}
          </span>
        </div>
        <p className="mt-2 hidden h-[2.6rem] max-w-xl line-clamp-2 text-sm leading-[1.3rem] text-paper sm:mt-4 sm:block sm:h-[4.5rem] sm:line-clamp-3 sm:text-base sm:leading-relaxed">
          {active.overview || "\u00a0"}
        </p>
        <div className="mt-1 hidden min-h-5 max-w-xl sm:block"><TextLocaleNote locale={active.textLocale} /></div>

        <div className="mt-3 flex min-w-0 items-center justify-center gap-2 sm:mt-7 sm:justify-start sm:gap-3">
          <Link
            to={active.mediaType === "movie" ? `/film/${active.id}` : `/serial/${active.id}`}
            className="btn-primary min-h-11 min-w-0 flex-1 justify-center px-3 py-2 text-xs sm:flex-none sm:px-6 sm:py-2.5 sm:text-sm"
          >
            <span className="truncate">{copy.hero.details}</span>
          </Link>
          {trailerKey && (
            <TrailerButton
              trailerKey={trailerKey}
              title={title}
              className="max-sm:min-h-11 max-sm:min-w-0 max-sm:flex-1 max-sm:justify-center max-sm:px-3 max-sm:py-2 max-sm:text-xs"
            />
          )}
        </div>
        <div className="mt-2 flex items-center justify-center sm:justify-start">
          <WatchlistButton
            item={{ id: active.id, mediaType: active.mediaType }}
            title={title}
            variant="icon"
            iconStyle="bookmark"
            className="sm:hidden"
          />
          <WatchlistButton
            item={{ id: active.id, mediaType: active.mediaType }}
            title={title}
            className="hidden sm:inline-flex"
          />
        </div>

        <div className="relative mt-3 flex items-center justify-center gap-2 sm:mt-8 sm:justify-start sm:gap-4">
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
            <ul className="flex max-w-[calc(100%-3rem)] items-center justify-center gap-0.5 sm:hidden">
              {items.map((movie, i) => (
                <li key={`${movie.mediaType}-${movie.id}`}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={copy.hero.show(titleFor(movie))}
                    aria-current={i === index}
                    className="flex h-11 w-6 items-center justify-center"
                  >
                    <span className={`h-2 rounded-full transition-all duration-300 ${i === index ? "w-4 bg-clix" : "w-2 bg-paper/55"}`} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setAutoPlay((v) => !v)}
            aria-pressed={!autoPlay}
            aria-label={autoPlay ? copy.hero.pauseSlideshow : copy.hero.playSlideshow}
            title={autoPlay ? copy.hero.pause : copy.hero.play}
            className="icon-btn h-11 w-11 max-sm:absolute max-sm:right-0 sm:h-11 sm:w-11"
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
