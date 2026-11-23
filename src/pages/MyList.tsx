import { useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/endpoints";
import { toMediaItem } from "../api/transform";
import type { MediaItem } from "../api/transform";
import { useLanguage } from "../context/Language";
import { useWatchlist, type WatchItem } from "../context/Watchlist";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import MediaCard from "../components/MediaCard";
import { GridSkeleton } from "../components/Skeleton";

interface ResolvedEntry {
  watch: WatchItem;
  media: MediaItem | null;
}

interface MyListData {
  entries: ResolvedEntry[];
  missingCount: number;
}

export default function MyList() {
  const { items, toggle } = useWatchlist();
  const { lang, isEn } = useLanguage();
  useDocumentTitle(isEn ? "My List" : "Daftar Saya");

  const itemsKey = items.map((i) => `${i.mediaType}-${i.id}`).join(",");

  const state = useApi<MyListData>(
    async (signal) => {
      if (items.length === 0) return { ok: true, data: { entries: [], missingCount: 0 } };
      const results = await Promise.all(
        items.map((item) =>
          item.mediaType === "movie" ? api.movieDetail(item.id, signal) : api.tvDetail(item.id, signal),
        ),
      );
      const entries: ResolvedEntry[] = [];
      let failed = 0;
      results.forEach((result, index) => {
        const watch = items[index];
        if (result.ok) {
          entries.push({ watch, media: toMediaItem(result.data, watch.mediaType) });
        } else {
          if (result.code !== "NOT_FOUND") failed += 1;
          entries.push({ watch, media: null });
        }
      });
      if (failed > 0 && entries.every((e) => e.media === null)) {
        const firstError = results.find((r) => !r.ok);
        if (firstError && !firstError.ok) {
          return { ok: false, status: firstError.status, code: firstError.code, message: firstError.message };
        }
      }
      return { ok: true, data: { entries, missingCount: entries.filter((e) => e.media === null).length } };
    },
    [itemsKey, lang],
  );

  const entries = useMemo(() => state.data?.entries ?? [], [state.data]);
  const hasItems = items.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {isEn ? "My List" : "Daftar Saya"}
      </h1>

      {!hasItems && (
        <EmptyState
          title={isEn ? "Your list is empty" : "Daftar Anda masih kosong"}
          description={
            isEn
              ? "Press the add button on any card to keep it here. The list is stored on this device."
              : "Tekan tombol tambah pada kartu film atau serial untuk menyimpannya di sini. Daftar tersimpan di perangkat ini."
          }
          action={
            <Link
              to="/katalog"
              className="btn-primary"
            >
              {isEn ? "Browse movies" : "Buka katalog film"}
            </Link>
          }
        />
      )}

      {hasItems && state.loading && (
        <>
          <p className="mt-2 text-sm text-mist" aria-live="polite">
            {isEn ? "Loading your list..." : "Memuat daftar Anda..."}
          </p>
          <GridSkeleton count={Math.min(12, Math.max(4, items.length))} />
        </>
      )}

      {hasItems && !state.loading && state.error && (
        <div className="mt-6">
          <ErrorState
            message={state.error}
            code={state.code}
            onRetry={state.reload}
          />
        </div>
      )}

      {hasItems && !state.loading && !state.error && (
        <>
          <p className="mt-2 text-sm text-mist">
            {isEn
              ? `${items.length} titles saved on this device.`
              : `${items.length} judul tersimpan di perangkat ini.`}
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {entries.map(({ watch, media }) => (
              <li key={`${watch.mediaType}-${watch.id}`}>
                {media ? (
                  <MediaCard item={media} />
                ) : (
                  <div className="rounded-card border border-line bg-dusk p-4 text-center">
                    <p className="text-sm font-semibold text-paper">
                      {isEn ? "Not available" : "Tidak tersedia"}
                    </p>
                    <p className="mt-1 text-xs text-mist">
                      {isEn
                        ? "This title was removed or the id is invalid."
                        : "Judul ini sudah dihapus atau id tidak berlaku."}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggle(watch)}
                      className="mt-3 min-h-11 w-full rounded-full border border-line text-xs font-semibold text-paper transition hover:border-lineStrong hover:bg-panel"
                    >
                      {isEn ? "Remove from list" : "Hapus dari daftar"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
