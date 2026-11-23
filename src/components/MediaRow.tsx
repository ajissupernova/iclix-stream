import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { MediaItem } from "../api/transform";
import { useLanguage } from "../context/Language";
import ErrorState from "./ErrorState";
import MediaCard from "./MediaCard";
import { MediaRowSkeleton } from "./Skeleton";

interface Props {
  title: string;
  seeAllHref?: string;
  items: MediaItem[] | null;
  loading: boolean;
  error: string | null;
  errorCode?: string | null;
  onRetry?: () => void;
  headingLevel?: 2 | 3;
  /** Tampilkan nomor urut besar di poster, dipakai untuk baris 10 teratas. */
  ranked?: boolean;
  /** Dipakai saat baris berada di dalam kolom grid yang sudah punya padding sendiri. */
  inset?: boolean;
}

export default function MediaRow({
  title,
  seeAllHref,
  items,
  loading,
  error,
  errorCode,
  onRetry,
  headingLevel = 2,
  ranked = false,
  inset = false,
}: Props) {
  const { copy } = useLanguage();
  const scroller = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const Heading = headingLevel === 3 ? "h3" : "h2";

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 4);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  if (!loading && !error && (items === null || items.length === 0)) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const frame = inset ? "" : "mx-auto max-w-7xl px-4 sm:px-6";

  return (
    <section aria-label={title} className="py-5 sm:py-8">
      <div className={`${frame} flex items-end justify-between gap-3`}>
        <div className="flex items-baseline gap-4">
          <Heading className="text-balance font-display text-xl font-bold tracking-tight sm:text-[1.65rem]">
            {title}
          </Heading>
          {seeAllHref && !loading && !error && (
            <Link
              to={seeAllHref}
              className="min-h-11 text-sm font-medium text-mist underline-offset-4 transition hover:text-paper hover:underline"
            >
              {copy.common.seeAll}
            </Link>
          )}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={atStart}
            aria-label={copy.mediaRow.scrollLeft(title)}
            className="icon-btn disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={atEnd}
            aria-label={copy.mediaRow.scrollRight(title)}
            className="icon-btn disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {loading && <MediaRowSkeleton inset={inset} />}

      {!loading && error && (
        <div className={inset ? "mt-4" : "mx-auto mt-4 max-w-7xl px-4 sm:px-6"}>
          <ErrorState message={error} code={errorCode} onRetry={onRetry} compact />
        </div>
      )}

      {!loading && !error && items && items.length > 0 && (
        <div className="relative mt-4">
          <ul
            ref={scroller}
            className={`no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4 ${
              inset ? "" : "mx-auto max-w-7xl px-4 sm:px-6"
            }`}
          >
            {items.map((item, index) => (
              <li key={`${item.mediaType}-${item.id}`} className="w-32 shrink-0 snap-start sm:w-44 lg:w-48">
                <MediaCard item={item} rank={ranked ? index + 1 : undefined} />
              </li>
            ))}
          </ul>
          {!atEnd && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-night to-transparent sm:w-16"
            />
          )}
        </div>
      )}
    </section>
  );
}
