import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { CuratedCollection } from "../api/siteConfig";

export default function CollectionRail({ collections, title = "Koleksi pilihan" }: { collections: CuratedCollection[]; title?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const headingId = useId();
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => {
      setAtStart(element.scrollLeft <= 4);
      setAtEnd(element.scrollLeft + element.clientWidth >= element.scrollWidth - 4);
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [collections]);

  const move = (direction: -1 | 1) => {
    const element = track.current;
    if (element) {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior });
    }
  };

  if (collections.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="mx-auto max-w-7xl py-7">
      <div className="flex items-end justify-between gap-4 px-4 sm:px-6">
        <h2 id={headingId} className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => move(-1)} disabled={atStart} aria-label="Geser koleksi ke kiri" className="icon-btn disabled:cursor-not-allowed disabled:opacity-40">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
          </button>
          <button type="button" onClick={() => move(1)} disabled={atEnd} aria-label="Geser koleksi ke kanan" className="icon-btn disabled:cursor-not-allowed disabled:opacity-40">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      <ul ref={track} tabIndex={0} aria-label="Daftar koleksi pilihan, geser ke samping untuk melihat semuanya" className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 focus-visible:rounded-panel sm:gap-4 sm:px-6">
        {collections.map((collection) => (
          <li key={collection.id} className="w-44 shrink-0 snap-start sm:w-56 lg:w-60">
            <Link to={`/koleksi/${collection.slug}`} aria-label={`Lihat koleksi ${collection.title}`} className="group relative flex aspect-[2.4/1] items-center justify-center overflow-hidden rounded-card border border-line bg-dusk p-3 transition hover:border-lineStrong sm:p-4">
              {collection.backdropUrl && <img src={collection.backdropUrl} alt="" width="720" height="300" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" style={{ objectPosition: `${collection.homeCrop.x}% ${collection.homeCrop.y}%` }} />}
              <span className="absolute inset-0 bg-night/55 transition group-hover:bg-night/40" aria-hidden="true" />
              {collection.logoUrl
                 ? <img src={collection.logoUrl} alt="" width="500" height="160" loading="lazy" decoding="async" className="relative max-h-full max-w-full object-contain" />
                : <span className="relative text-center font-display text-lg font-bold sm:text-xl">{collection.title}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
