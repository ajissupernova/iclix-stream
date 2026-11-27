import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/endpoints";
import { pageToItems } from "../api/transform";
import type { TmdbPage } from "../api/tmdbTypes";
import { useLanguage } from "../context/Language";
import { useApi, type UseApiState } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useHeroDetails } from "../hooks/useHeroDetails";
import { curatedCollectionTitles, DEFAULT_SITE_CONTENT, type SiteContent } from "../api/siteConfig";
import ErrorState from "../components/ErrorState";
import CollectionRail from "../components/CollectionRail";
import GenreStrip from "../components/GenreStrip";
import HeroCarousel from "../components/HeroCarousel";
import MediaRow from "../components/MediaRow";
import { HeroSkeleton } from "../components/Skeleton";

function itemsOf<T extends { id: number }>(state: UseApiState<TmdbPage<T>>, mediaType: "movie" | "tv") {
  return pageToItems(state.data, mediaType, 15);
}

export default function Home() {
  const { lang, copy } = useLanguage();
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [siteContentLoaded, setSiteContentLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    let requestId = 0;
    let controller: AbortController | null = null;
    let refreshTimer: number | null = null;
    const refresh = () => {
      const currentRequest = ++requestId;
      controller?.abort();
      controller = new AbortController();
      fetch("/api/site-content", { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((result) => {
          if (!active || currentRequest !== requestId) return;
          if (result?.content) setSiteContent(result.content as SiteContent);
          setSiteContentLoaded(true);
        })
        .catch((error: unknown) => {
          if (active && currentRequest === requestId && !(error instanceof DOMException && error.name === "AbortError")) {
            setSiteContentLoaded(true);
          }
        });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    const scheduleRefresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(refresh, 250);
    };
    refresh();
    window.addEventListener("focus", scheduleRefresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      controller?.abort();
      window.removeEventListener("focus", scheduleRefresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);
  useDocumentTitle("");

  const visibleHomeSections = siteContent.homeSections.filter((section) => section.visible);
  const requiredCatalogs = new Set<string>(
    visibleHomeSections.flatMap((section) =>
      section.kind === "catalog" && section.key ? [section.key] : [],
    ),
  );
  if (siteContent.spotlight.mode === "popular") requiredCatalogs.add("popular-movies");
  if (siteContent.spotlight.mode === "trending" || siteContent.spotlight.mode === "random") requiredCatalogs.add("trending");
  const catalogEnabled = (key: string) => siteContentLoaded && requiredCatalogs.has(key);
  const trending = useApi((s) => api.trendingMovies(s), [lang], catalogEnabled("trending"));
  const popular = useApi((s) => api.popularMovies(s), [lang], catalogEnabled("popular-movies"));
  const topRated = useApi((s) => api.topRatedMovies(s), [lang], catalogEnabled("top-rated"));
  const nowPlaying = useApi((s) => api.nowPlayingMovies(s), [lang], catalogEnabled("now-playing"));
  const upcoming = useApi((s) => api.upcomingMovies(s), [lang], catalogEnabled("upcoming"));
  const tvPopular = useApi((s) => api.popularTv(s), [lang], catalogEnabled("popular-tv"));
  const tvTrending = useApi((s) => api.trendingTv(s), [lang], catalogEnabled("trending-tv"));
  const tvTopRated = useApi((s) => api.topRatedTv(s), [lang], catalogEnabled("top-rated-tv"));

  const heroTitles = useMemo(() => {
    const source = siteContent.spotlight.mode === "manual"
      ? siteContent.spotlight.titleIds
      : siteContent.spotlight.mode === "popular"
        ? (popular.data?.results ?? []).map((item) => ({ id: item.id, type: "movie" as const }))
        : (trending.data?.results ?? []).map((item) => ({ id: item.id, type: "movie" as const }));
    const picked = siteContent.spotlight.mode === "random"
      ? [...source].sort(() => Math.random() - 0.5)
      : source;
    return picked.slice(0, 10);
  }, [siteContent.spotlight, trending.data, popular.data]);
  const hero = useHeroDetails(heroTitles, lang);

  const showHero = hero.items.length > 0;
  const spotlightMode = siteContent.spotlight.mode;
  const spotlightLoading = spotlightMode === "popular"
    ? popular.loading
    : spotlightMode === "manual" ? false : trending.loading;
  const spotlightError = spotlightMode === "manual"
    ? null
    : spotlightMode === "popular" ? popular.error : trending.error;
  const spotlightErrorCode = spotlightMode === "manual"
    ? null
    : spotlightMode === "popular" ? popular.code : trending.code;
  const spotlightReload = spotlightMode === "popular" ? popular.reload : trending.reload;
  const heroLoading = spotlightLoading || (heroTitles.length > 0 && hero.loading);
  const heroError = spotlightError ?? (hero.error ? copy.home.heroError : null);
  const heroErrorCode = spotlightError ? spotlightErrorCode : null;
  // Tanpa API key, satu banner sudah cukup; kartu error per baris hanya mengulang pesan.
  const configMissing = spotlightErrorCode === "NO_KEY";
  const rowError = (message: string | null) => (configMissing ? null : message);
  const collectionGroups = siteContent.collectionGroups ?? [];
  const groupedCollectionIds = new Set(collectionGroups.flatMap((group) => group.collectionIds));
  const tileCollections = visibleHomeSections.flatMap((section) => {
    if (section.kind !== "collection") return [];
    const collection = siteContent.collections.find((item) => item.id === section.collectionId);
    return collection?.showOnHome && collection.homeStyle === "tile" && !groupedCollectionIds.has(collection.id) ? [collection] : [];
  });
  let collectionRailRendered = false;

  return (
    <>
      {siteContentLoaded && siteContent.announcement.enabled && siteContent.announcement.text && (
        <aside className="border-b border-line bg-dusk px-4 py-3 text-center text-sm text-paper" role="status">
          {siteContent.announcement.text}
        </aside>
      )}
      {siteContentLoaded && showHero && <HeroCarousel items={hero.items} />}
      {(!siteContentLoaded || (!showHero && heroLoading)) && <HeroSkeleton />}
      {siteContentLoaded && !showHero && !configMissing && !heroLoading && heroError && (
        <div className="mx-auto max-w-3xl px-4 pt-10">
            <ErrorState message={heroError} code={heroErrorCode} onRetry={spotlightReload} />
        </div>
      )}
      {siteContentLoaded && !showHero && configMissing && (
        <div className="mx-auto max-w-3xl px-4 pt-10">
          <ErrorState
            message={heroError ?? copy.home.noKey}
            code="NO_KEY"
            onRetry={spotlightReload}
          />
        </div>
      )}

      <div>
        {siteContentLoaded && visibleHomeSections.map((section) => {
          if (section.kind === "genres") return <GenreStrip key={section.id} />;
          if (section.kind === "collection-group") {
            const group = collectionGroups.find((item) => item.id === section.groupId);
            if (!group) return null;
            const members = group.collectionIds.flatMap((id) => {
              const collection = siteContent.collections.find((item) => item.id === id);
              return collection?.showOnHome ? [collection] : [];
            });
            if (members.length === 0) return null;
            return <CollectionRail key={section.id} title={group.title || "Koleksi pilihan"} collections={members} />;
          }
          if (section.kind === "collection") {
            const collection = siteContent.collections.find((item) => item.id === section.collectionId);
            if (!collection?.showOnHome || groupedCollectionIds.has(collection.id)) return null;
            if (collection.homeStyle === "tile") {
              if (collectionRailRendered) return null;
              collectionRailRendered = true;
              return <CollectionRail key={`collection-rail-${section.id}`} collections={tileCollections} />;
            }
            return (
              <section key={section.id} className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
                <Link to={`/koleksi/${collection.slug}`} className="group relative flex min-h-44 items-end overflow-hidden rounded-panel border border-line bg-dusk p-6 transition hover:border-lineStrong sm:min-h-60 sm:p-9">
                  {collection.backdropUrl && <img src={collection.backdropUrl} alt="" width="1600" height="600" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-300 group-hover:scale-[1.02]" style={{ objectPosition: `${collection.homeCrop.x}% ${collection.homeCrop.y}%` }} />}
                  <span className="absolute inset-0 bg-gradient-to-r from-night via-night/70 to-transparent" aria-hidden="true" />
                  <span className="relative max-w-2xl">
                    {collection.logoUrl ? <img src={collection.logoUrl} alt={collection.title} width="500" height="160" loading="lazy" decoding="async" className="mb-4 max-h-16 max-w-[min(100%,20rem)] object-contain object-left" /> : <span className="block font-display text-2xl font-bold sm:text-4xl">{collection.title}</span>}
                    <span className="block text-sm text-paper/90">{collection.description || `${curatedCollectionTitles(collection).length} judul pilihan`}</span>
                    <span className="mt-3 inline-block text-sm font-semibold text-clixText">Lihat koleksi</span>
                  </span>
                </Link>
              </section>
            );
          }
          const key = section.key;
          if (!key) return null;
          const rowProps = {
            items: key === "trending" ? itemsOf(trending, "movie")
              : key === "popular-movies" ? itemsOf(popular, "movie")
                : key === "top-rated" ? itemsOf(topRated, "movie")
                  : key === "now-playing" ? itemsOf(nowPlaying, "movie")
                    : key === "upcoming" ? itemsOf(upcoming, "movie")
                      : key === "popular-tv" ? itemsOf(tvPopular, "tv")
                        : key === "trending-tv" ? itemsOf(tvTrending, "tv")
                          : itemsOf(tvTopRated, "tv"),
            loading: key === "trending" ? trending.loading
              : key === "popular-movies" ? popular.loading
                : key === "top-rated" ? topRated.loading
                  : key === "now-playing" ? nowPlaying.loading
                    : key === "upcoming" ? upcoming.loading
                      : key === "popular-tv" ? tvPopular.loading
                        : key === "trending-tv" ? tvTrending.loading
                          : tvTopRated.loading,
            error: rowError(key === "trending" ? trending.error
              : key === "popular-movies" ? popular.error
                : key === "top-rated" ? topRated.error
                  : key === "now-playing" ? nowPlaying.error
                    : key === "upcoming" ? upcoming.error
                      : key === "popular-tv" ? tvPopular.error
                        : key === "trending-tv" ? tvTrending.error
                          : tvTopRated.error),
            errorCode: key === "trending" ? trending.code
              : key === "popular-movies" ? popular.code
                : key === "top-rated" ? topRated.code
                  : key === "now-playing" ? nowPlaying.code
                    : key === "upcoming" ? upcoming.code
                      : key === "popular-tv" ? tvPopular.code
                        : key === "trending-tv" ? tvTrending.code
                          : tvTopRated.code,
            onRetry: key === "trending" ? trending.reload
              : key === "popular-movies" ? popular.reload
                : key === "top-rated" ? topRated.reload
                  : key === "now-playing" ? nowPlaying.reload
                    : key === "upcoming" ? upcoming.reload
                      : key === "popular-tv" ? tvPopular.reload
                        : key === "trending-tv" ? tvTrending.reload
                          : tvTopRated.reload,
          };
          const titles: Record<string, string> = {
            trending: copy.home.trending,
            "popular-movies": copy.home.popularMovies,
            "top-rated": copy.home.topRated,
            "now-playing": copy.home.nowPlaying,
            upcoming: copy.home.upcoming,
            "popular-tv": copy.home.tvPopular,
            "trending-tv": copy.home.tvTrending,
            "top-rated-tv": copy.home.tvTopRated,
          };
          return (
            <MediaRow
              key={section.id}
              title={section.title || titles[key] || key}
              seeAllHref={key === "popular-movies" ? "/katalog" : key === "top-rated" ? "/katalog?urut=vote_average.desc" : key.includes("tv") ? "/serial" : undefined}
              ranked={key === "trending"}
              {...rowProps}
            />
          );
        })}
      </div>

    </>
  );
}
