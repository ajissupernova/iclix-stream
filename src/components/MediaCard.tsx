import { Link } from "react-router-dom";
import type { MediaItem } from "../api/transform";
import { posterSrcSet, posterUrl } from "../api/images";
import { useLanguage } from "../context/Language";
import { formatYear } from "../utils/format";
import WatchlistButton from "./WatchlistButton";
import TmdbImage from "./TmdbImage";

export function mediaHref(item: MediaItem): string {
  return item.mediaType === "tv" ? `/serial/${item.id}` : `/film/${item.id}`;
}

interface Props {
  item: MediaItem;
  /** Posisi dalam daftar berperingkat, ditampilkan sebagai angka besar di poster. */
  rank?: number;
  /** Tampilkan label Film/Serial, dipakai pada daftar campuran seperti hasil pencarian. */
  showType?: boolean;
}

export default function MediaCard({ item, rank, showType = false }: Props) {
  const { copy } = useLanguage();
  const year = formatYear(item.date);
  const typeLabel = item.mediaType === "tv" ? copy.common.tvLabel : copy.common.movieLabel;

  return (
    <article className="group relative">
      <Link
        to={mediaHref(item)}
        className="block rounded-card transition-transform duration-200 ease-out focus-visible:-translate-y-1 group-hover:-translate-y-1"
      >
        <div className="relative">
          <TmdbImage
            kind="poster"
            src={posterUrl(item.posterPath)}
            srcSet={posterSrcSet(item.posterPath)}
            sizes="(min-width: 1280px) 200px, (min-width: 1024px) 180px, (min-width: 640px) 176px, 45vw"
            alt={copy.common.posterAlt(item.title)}
            className="media-poster rounded-card ring-1 ring-paper/10 transition duration-200 group-hover:shadow-raise group-hover:ring-paper/30"
          />
          {showType && (
            <span className="absolute left-2 top-2 rounded-full bg-night/85 px-2 py-0.5 text-[11px] font-semibold text-paper ring-1 ring-line">
              {typeLabel}
            </span>
          )}
          {rank !== undefined && (
            <span
              aria-hidden="true"
              className="absolute -left-1 bottom-1 font-display text-4xl font-extrabold leading-none text-paper drop-shadow-[0_2px_10px_rgba(9,8,26,0.95)]"
            >
              {rank}
            </span>
          )}
          {rank !== undefined && <span className="sr-only">{copy.common.rank(rank)}</span>}
        </div>
        <div className="mt-2.5 px-0.5">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-paper">
            {item.title}
          </h3>
          <p className="mt-0.5 flex items-center gap-2 text-xs tabular-nums text-mist">
            {item.voteAverage > 0 && (
              <span className="inline-flex items-center gap-1 text-gold">
                <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden="true">
                  <path d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.6l-5.1 2.9L6 11.8 1.7 7.8l5.8-.7L10 1.8z" />
                </svg>
                <span className="sr-only">{copy.common.rating} </span>
                {item.voteAverage.toFixed(1)}
              </span>
            )}
            {year && <span>{year}</span>}
          </p>
        </div>
      </Link>
      <WatchlistButton
        item={{ id: item.id, mediaType: item.mediaType }}
        title={item.title}
        variant="icon"
        className="absolute right-2 top-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
      />
    </article>
  );
}
