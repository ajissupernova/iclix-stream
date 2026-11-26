import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/endpoints";
import type { SiteContent, CuratedTitle } from "../api/siteConfig";
import { curatedCollectionTitles, DEFAULT_SITE_CONTENT } from "../api/siteConfig";
import type { MediaItem } from "../api/transform";
import MediaCard from "../components/MediaCard";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

interface CollectionState {
  content: SiteContent;
  titles: Map<string, MediaItem>;
  loading: boolean;
  error: string;
}

const keyFor = (item: CuratedTitle) => `${item.type}-${item.id}`;

export default function CollectionPage() {
  const { slug = "" } = useParams();
  const [state, setState] = useState<CollectionState>({
    content: DEFAULT_SITE_CONTENT,
    titles: new Map(),
    loading: true,
    error: "",
  });

  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    try {
      const response = await fetch("/api/site-content");
      if (!response.ok) throw new Error("Konten koleksi tidak dapat dimuat.");
      const result = await response.json() as { content: SiteContent };
      const collection = result.content.collections.find((item) => item.slug === slug);
      if (!collection) {
        setState({ content: result.content, titles: new Map(), loading: false, error: "Koleksi tidak ditemukan." });
        return;
      }
      const unique = curatedCollectionTitles(collection);
      const results = await Promise.all(unique.map(async (item) => {
        if (item.type === "movie") {
          const response = await api.movieDetail(item.id);
          if (!response.ok) return null;
          return {
            key: keyFor(item),
            value: {
              id: response.data.id, mediaType: item.type, title: response.data.title,
              date: response.data.release_date, voteAverage: response.data.vote_average,
              voteCount: response.data.vote_count, posterPath: response.data.poster_path,
            } satisfies MediaItem,
          };
        }
        const response = await api.tvDetail(item.id);
        if (!response.ok) return null;
        return {
          key: keyFor(item),
          value: {
            id: response.data.id, mediaType: item.type, title: response.data.name,
            date: response.data.first_air_date, voteAverage: response.data.vote_average,
            voteCount: response.data.vote_count, posterPath: response.data.poster_path,
          } satisfies MediaItem,
        };
      }));
      setState({
        content: result.content,
        titles: new Map(results.filter((item): item is NonNullable<typeof item> => item !== null).map((item) => [item.key, item.value])),
        loading: false,
        error: "",
      });
    } catch (error) {
      setState((previous) => ({ ...previous, loading: false, error: error instanceof Error ? error.message : "Koleksi gagal dimuat." }));
    }
  }, [slug]);

  useEffect(() => { void load(); }, [load]);
  const collection = useMemo(() => state.content.collections.find((item) => item.slug === slug), [state.content, slug]);
  useDocumentTitle(collection?.title || "Koleksi");

  if (state.loading) return <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-16 sm:px-6"><p role="status" className="text-mist">Memuat koleksi dan judulnya...</p></main>;
  if (state.error || !collection) return <main className="mx-auto min-h-[60vh] max-w-3xl px-4 py-16 sm:px-6"><h1 className="font-display text-3xl font-bold">Koleksi tidak tersedia</h1><p className="mt-3 text-mist">{state.error || "Koleksi tidak ditemukan."}</p><button type="button" onClick={() => void load()} className="btn-secondary mt-5">Coba lagi</button><Link to="/" className="btn-quiet ml-2">Kembali ke beranda</Link></main>;

  const displayTitles = (items: CuratedTitle[]) => items.flatMap((item) => {
    const media = state.titles.get(keyFor(item));
    return media ? [{ item, media }] : [];
  });
  const curatedTitles = curatedCollectionTitles(collection);

  return (
    <main>
      <header className="relative isolate flex min-h-[330px] items-end overflow-hidden border-b border-line bg-dusk sm:min-h-[420px]">
        {collection.backdropUrl && <img src={collection.backdropUrl} alt="" width="1600" height="600" className="absolute inset-0 -z-10 h-full w-full object-cover" style={{ objectPosition: `${collection.pageCrop.x}% ${collection.pageCrop.y}%` }} />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/75 to-night/25" />
        <div className="absolute inset-y-0 left-0 -z-10 w-full bg-gradient-to-r from-night/50 via-transparent to-transparent" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-20 sm:px-6 sm:pb-14">
          <Link to="/" className="inline-flex min-h-11 items-center text-sm text-paper underline-offset-4 hover:underline">Beranda</Link>
          {collection.logoUrl ? <h1 className="mt-5"><img src={collection.logoUrl} alt={collection.title} width="500" height="160" className="max-h-24 max-w-full object-contain object-left" /></h1> : <h1 className="mt-5 max-w-4xl font-display text-4xl font-extrabold sm:text-6xl">{collection.title}</h1>}
          {collection.description && <p className="mt-4 max-w-2xl leading-relaxed text-paper/90">{collection.description}</p>}
          <p className="mt-4 text-sm text-paper/90">{curatedTitles.length} judul terkurasi</p>
        </div>
      </header>

      {collection.titleIds.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6">
          <h2 className="font-display text-2xl font-bold">Pilihan judul</h2>
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {collection.titleIds.map((item) => {
              const media = state.titles.get(keyFor(item));
              return <li key={keyFor(item)}>
                {media ? <MediaCard item={media} showType /> : <div className="aspect-[2/3] rounded-card border border-line bg-dusk p-3 text-sm text-mist">{item.label || "Judul tidak dapat dimuat."}</div>}
              </li>;
            })}
          </ul>
        </section>
      )}

      {collection.sections.map((section) => (
        <section key={section.id} className="border-t border-line/70 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-bold">{section.title}</h2>
            {section.description && <p className="mt-3 max-w-3xl leading-relaxed text-mist">{section.description}</p>}
            {section.kind === "titles" && (section.titleIds?.length ?? 0) > 0 && <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{displayTitles(section.titleIds ?? []).map(({ media, item }) => <li key={keyFor(item)}><MediaCard item={media} showType /></li>)}</ul>}
            {section.kind === "watch-order" && (section.titleIds?.length ?? 0) > 0 && (
              <ol className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {(section.titleIds ?? []).map((item, index) => {
                  const media = state.titles.get(keyFor(item));
                  return (
                    <li key={keyFor(item)} className="relative pt-8">
                      <span aria-hidden="true" className="absolute left-0 top-0 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-clix/50 bg-night font-serif text-sm font-bold italic tabular-nums text-clix">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {media ? <MediaCard item={media} showType /> : <div className="aspect-[2/3] rounded-card border border-line bg-dusk p-3 text-sm text-mist">{item.label || "Judul tidak dapat dimuat."}</div>}
                      {item.watchOrder && <p className="mt-2 text-sm leading-snug text-mist">{item.watchOrder}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>
      ))}
    </main>
  );
}
