import { useCallback, useEffect, useId, useMemo, useState } from "react";
import "./Admin.css";
import { api } from "../api/endpoints";
import { backdropUrl, posterUrl } from "../api/images";
import type { ImageAsset, MultiSearchItem } from "../api/tmdbTypes";
import {
  DEFAULT_SITE_CONTENT,
  type CollectionGroup,
  type CollectionSectionKind,
  type CuratedCollection,
  type CuratedTitle,
  type HomeSectionKey,
  type SiteContent,
  type SiteContentEnvelope,
  type SpotlightMode,
} from "../api/siteConfig";

type AdminTab = "overview" | "home" | "spotlight" | "collections" | "announcement" | "history";

const CATALOG_SECTIONS: Array<{ key: HomeSectionKey; title: string }> = [
  { key: "trending", title: "Sedang tren" },
  { key: "popular-movies", title: "Film populer" },
  { key: "top-rated", title: "Rating tertinggi" },
  { key: "now-playing", title: "Sedang tayang" },
  { key: "upcoming", title: "Segera hadir" },
  { key: "popular-tv", title: "Serial populer" },
  { key: "trending-tv", title: "Serial sedang tren" },
  { key: "top-rated-tv", title: "Serial rating tertinggi" },
];

const NAV_ITEMS: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Ringkasan" },
  { id: "home", label: "Beranda" },
  { id: "spotlight", label: "Spotlight" },
  { id: "collections", label: "Koleksi" },
  { id: "announcement", label: "Pengumuman" },
  { id: "history", label: "Riwayat" },
];

async function adminRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
  return body as T;
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Server lama belum mengirim collectionGroups, jadi konten dilengkapi sebelum dipakai UI. */
function withCollectionGroups(content: SiteContent): SiteContent {
  return content.collectionGroups ? content : { ...content, collectionGroups: [] };
}

function titleOf(item: MultiSearchItem) {
  return item.title || item.name || item.original_title || item.original_name || "Tanpa judul";
}

const SECTION_PRESETS: Array<{ kind: CollectionSectionKind; label: string; hint: string }> = [
  { kind: "watch-order", label: "Urutan menonton", hint: "Judul bernomor dengan catatan urutan, cocok untuk panduan menonton." },
  { kind: "titles", label: "Pilihan judul", hint: "Grid poster tanpa nomor urut, cocok untuk daftar rekomendasi." },
  { kind: "text", label: "Catatan editorial", hint: "Paragraf penjelasan tanpa daftar judul." },
];

const posterCache = new Map<string, string | null>();
const posterRequests = new Map<string, Promise<string | null>>();

/** Poster lama belum tersimpan di data kurasi, jadi diambil sekali saat baris itu tampil. */
function useCuratedPoster(title: CuratedTitle): string | null {
  const key = `${title.type}-${title.id}`;
  const [path, setPath] = useState<string | null>(() => title.posterPath ?? posterCache.get(key) ?? null);

  useEffect(() => {
    if (title.posterPath) {
      posterCache.set(key, title.posterPath);
      setPath(title.posterPath);
      return;
    }
    if (posterCache.has(key)) {
      setPath(posterCache.get(key) ?? null);
      return;
    }
    let active = true;
    let request = posterRequests.get(key);
    if (!request) {
      const pending = title.type === "movie" ? api.movieDetail(title.id) : api.tvDetail(title.id);
      request = pending
        .then((result) => (result.ok ? result.data.poster_path ?? null : null))
        .catch(() => null);
      posterRequests.set(key, request);
    }
    void request.then((value) => {
      posterCache.set(key, value);
      posterRequests.delete(key);
      if (active) setPath(value);
    });
    return () => { active = false; };
  }, [key, title.id, title.type, title.posterPath]);

  return posterUrl(path);
}

function CuratedTitlePoster({ title }: { title: CuratedTitle }) {
  const src = useCuratedPoster(title);
  return (
    <span className="relative block h-20 w-14 shrink-0 overflow-hidden rounded-md border border-line bg-dusk">
      {src
        ? <img src={src} alt="" width="342" height="513" loading="lazy" className="h-full w-full object-cover" />
        : <span aria-hidden="true" className="grid h-full w-full place-items-center px-1 text-center text-[10px] font-semibold leading-tight text-mist">{title.type === "movie" ? "Film" : "Serial"}</span>}
    </span>
  );
}

function CuratedTitleList({
  items,
  onChange,
  showWatchOrder = true,
  emptyLabel = "Belum ada judul. Cari judul di bawah untuk menambahkannya.",
}: {
  items: CuratedTitle[];
  onChange: (items: CuratedTitle[]) => void;
  showWatchOrder?: boolean;
  emptyLabel?: string;
}) {
  const reorder = (index: number, direction: -1 | 1) => {
    const next = [...items];
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next);
  };

  if (items.length === 0) return <p className="text-sm text-mist">{emptyLabel}</p>;

  return (
    <ol className="space-y-2">
      {items.map((title, index) => {
        const name = title.label || (title.type === "movie" ? "Film" : "Serial");
        return (
          <li key={`${title.type}-${title.id}`} className="grid gap-3 rounded-lg border border-line bg-night p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <CuratedTitlePoster title={title} />
            <div className="min-w-0">
              <p className="font-medium break-words">{index + 1}. {name} <span className="text-xs text-mist">· TMDb {title.id}</span></p>
              {showWatchOrder && (
                <label className="mt-2 block text-xs text-mist">Catatan urutan
                  <input value={title.watchOrder || ""} onChange={(event) => onChange(items.map((item, i) => i === index ? { ...item, watchOrder: event.target.value } : item))} placeholder="Contoh: Setelah film kedua" className="mt-1 w-full rounded border border-lineStrong bg-dusk px-2 py-2 text-sm text-paper" />
                </label>
              )}
            </div>
            <span className="flex gap-1">
              <button type="button" aria-label={`Pindahkan ${name} ke atas`} onClick={() => reorder(index, -1)} disabled={index === 0} className="icon-btn rounded-lg disabled:cursor-not-allowed disabled:opacity-40">↑</button>
              <button type="button" aria-label={`Pindahkan ${name} ke bawah`} onClick={() => reorder(index, 1)} disabled={index === items.length - 1} className="icon-btn rounded-lg disabled:cursor-not-allowed disabled:opacity-40">↓</button>
              <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} className="btn-quiet text-red-200">Hapus</button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SpotlightTitleList({
  items,
  onChange,
}: {
  items: CuratedTitle[];
  onChange: (items: CuratedTitle[]) => void;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <ol className="space-y-2">
      {items.map((item, index) => {
        const name = item.label || (item.type === "movie" ? "Film" : "Serial");
        return (
          <li
            key={item.id}
            draggable
            onDragStart={(event) => {
              setDraggedIndex(index);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedIndex !== null) move(draggedIndex, index);
              setDraggedIndex(null);
            }}
            onDragEnd={() => setDraggedIndex(null)}
            className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-line bg-night p-3 ${draggedIndex === index ? "opacity-50" : ""}`}
          >
            <CuratedTitlePoster title={item} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium break-words">{index + 1}. {name}</span>
              <span className="text-xs text-mist">{item.type === "movie" ? "Film" : "Serial"}</span>
            </span>
            <span className="flex shrink-0 gap-1">
              <button type="button" aria-label={`Pindahkan ${name} ke atas`} onClick={() => move(index, index - 1)} disabled={index === 0} className="icon-btn rounded-lg disabled:cursor-not-allowed disabled:opacity-40">↑</button>
              <button type="button" aria-label={`Pindahkan ${name} ke bawah`} onClick={() => move(index, index + 1)} disabled={index === items.length - 1} className="icon-btn rounded-lg disabled:cursor-not-allowed disabled:opacity-40">↓</button>
              <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="btn-quiet text-red-200">Hapus</button>
            </span>
            <SpotlightBackdropPicker
              title={item}
              onChange={(patch) => onChange(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, ...patch } : entry))}
            />
          </li>
        );
      })}
    </ol>
  );
}

function SpotlightBackdropPicker({
  title,
  onChange,
}: {
  title: CuratedTitle;
  onChange: (patch: Partial<CuratedTitle>) => void;
}) {
  const [backdrops, setBackdrops] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const request = title.type === "movie"
      ? api.movieHero(title.id, controller.signal)
      : api.tvHero(title.id, controller.signal);
    void request.then((result) => {
      if (controller.signal.aborted) return;
      if (!result.ok) {
        setError("Backdrop TMDb gagal dimuat. Coba lagi.");
        return;
      }
      setBackdrops(result.data.images?.backdrops ?? []);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Backdrop TMDb gagal dimuat. Coba lagi.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [title.id, title.type]);

  const preview = (path: string | undefined, crop: { x: number; y: number } | undefined, ratio: string, label: string) => (
    <div className="mt-3">
      <p className="mb-2 text-xs font-semibold text-paper">{label}</p>
      <div className="relative max-w-sm overflow-hidden rounded-md border border-line bg-dusk" style={{ aspectRatio: ratio }}>
        {path ? <img src={backdropUrl(path) ?? undefined} alt={`Pratinjau backdrop ${label}`} width="1280" height="720" className="h-full w-full object-cover" style={{ objectPosition: `${crop?.x ?? 50}% ${crop?.y ?? 50}%` }} /> : <p className="grid h-full place-items-center text-xs text-mist">Backdrop bawaan TMDb</p>}
      </div>
      {path && <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {(["x", "y"] as const).map((axis) => (
          <label key={axis} className="text-xs text-mist">{axis === "x" ? "Posisi horizontal" : "Posisi vertikal"}
            <input type="range" min="0" max="100" value={crop?.[axis] ?? 50} onChange={(event) => onChange({ [label === "Desktop" ? "desktopBackdropCrop" : "mobileBackdropCrop"]: { x: label === "Desktop" ? title.desktopBackdropCrop?.x ?? 50 : title.mobileBackdropCrop?.x ?? 50, y: label === "Desktop" ? title.desktopBackdropCrop?.y ?? 50 : title.mobileBackdropCrop?.y ?? 50, [axis]: Number(event.target.value) } })} className="mt-1 block min-h-11 w-full accent-clix" />
          </label>
        ))}
      </div>}
    </div>
  );

  return (
    <div className="col-span-full w-full border-t border-line pt-3">
      <h4 className="text-sm font-semibold">Backdrop spotlight</h4>
      <p className="mt-1 text-xs text-mist">Pilih gambar terpisah untuk desktop dan mobile. Geser posisi untuk mengatur crop.</p>
      {loading ? <p role="status" className="mt-3 text-sm text-mist">Memuat backdrop TMDb…</p>
        : error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>
          : backdrops.length === 0 ? <p className="mt-3 text-sm text-mist">TMDb belum menyediakan backdrop untuk judul ini.</p>
            : <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {(["desktopBackdropPath", "mobileBackdropPath"] as const).map((key) => {
                const label = key.startsWith("desktop") ? "Desktop" : "Mobile";
                const selected = title[key];
                const crop = title[key === "desktopBackdropPath" ? "desktopBackdropCrop" : "mobileBackdropCrop"];
                return <fieldset key={key} className="min-w-0">
                  <legend className="text-sm font-semibold">{label}</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {backdrops.map((image) => <button key={image.file_path} type="button" aria-label={`Pilih backdrop ${label.toLowerCase()} ${image.file_path}`} aria-pressed={selected === image.file_path} onClick={() => onChange({ [key]: image.file_path, [key === "desktopBackdropPath" ? "desktopBackdropCrop" : "mobileBackdropCrop"]: { x: 50, y: 50 } })} className={`overflow-hidden rounded-md border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clix ${selected === image.file_path ? "border-clix" : "border-line hover:border-lineStrong"}`}>
                      <img src={backdropUrl(image.file_path, false) ?? undefined} alt="" width={image.width} height={image.height} loading="lazy" className="aspect-video w-full object-cover" />
                    </button>)}
                  </div>
                  {preview(selected, crop, label === "Desktop" ? "16 / 9" : "4 / 5", label)}
                </fieldset>;
              })}
            </div>}
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-panel border border-line bg-dusk p-5 sm:p-6 ${className}`}>{children}</section>;
}

function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    event.currentTarget.value = "";
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Pilih file JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 3 MB.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("File tidak bisa dibaca."));
        reader.onerror = () => reject(new Error("File tidak bisa dibaca."));
        reader.readAsDataURL(file);
      });
      const result = await adminRequest<{ url: string }>("/api/admin/upload", {
        method: "POST",
        body: JSON.stringify({ dataUrl }),
      });
      onChange(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gambar gagal diunggah.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-semibold">{label}</label>
      <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => void upload(event)} disabled={uploading} className="mt-2 block min-h-11 w-full rounded-lg border border-lineStrong bg-night text-sm text-paper file:mr-3 file:min-h-11 file:border-0 file:bg-panel file:px-3 file:font-semibold file:text-paper hover:file:bg-haze disabled:cursor-not-allowed disabled:opacity-60" />
      <p className="mt-1 text-xs text-mist">JPG, PNG, atau WebP. Maksimal 3 MB.</p>
      {uploading && <p role="status" className="mt-2 text-sm text-mist">Mengunggah gambar...</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-200">{error}</p>}
      {value && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-line bg-night p-2">
          <img src={value} alt={`Pratinjau ${label.toLowerCase()}`} width="112" height="72" className="h-[72px] w-28 rounded object-contain" />
          <button type="button" onClick={() => onChange("")} className="btn-quiet text-red-200">Hapus gambar</button>
        </div>
      )}
    </div>
  );
}

function CropPositionEditor({
  label,
  imageUrl,
  position,
  aspectClass,
  onChange,
}: {
  label: string;
  imageUrl: string;
  position: { x: number; y: number };
  aspectClass: string;
  onChange: (position: { x: number; y: number }) => void;
}) {
  const id = useId();
  return (
    <fieldset className="rounded-lg border border-line bg-night p-4">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      <div className={`relative mt-2 overflow-hidden rounded-lg border border-lineStrong bg-dusk ${aspectClass}`}>
        {imageUrl
          ? <img src={imageUrl} alt={`Pratinjau crop ${label.toLowerCase()}`} width="1200" height="500" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${position.x}% ${position.y}%` }} />
          : <p className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-mist">Unggah gambar latar untuk mengatur crop.</p>}
        <span className="absolute inset-0 border border-white/20" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label htmlFor={`${id}-x`} className="text-xs font-semibold text-mist">Fokus horizontal: {position.x}%
          <input id={`${id}-x`} type="range" min="0" max="100" value={position.x} disabled={!imageUrl} onChange={(event) => onChange({ ...position, x: Number(event.target.value) })} className="mt-2 block min-h-11 w-full accent-clix disabled:cursor-not-allowed disabled:opacity-50" />
        </label>
        <label htmlFor={`${id}-y`} className="text-xs font-semibold text-mist">Fokus vertikal: {position.y}%
          <input id={`${id}-y`} type="range" min="0" max="100" value={position.y} disabled={!imageUrl} onChange={(event) => onChange({ ...position, y: Number(event.target.value) })} className="mt-2 block min-h-11 w-full accent-clix disabled:cursor-not-allowed disabled:opacity-50" />
        </label>
      </div>
    </fieldset>
  );
}

function SearchTitles({
  onAdd,
  exclude = [],
  type = "multi",
}: {
  onAdd: (item: CuratedTitle) => void;
  exclude?: number[];
  type?: "multi" | "movie" | "tv";
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MultiSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void api.search(query.trim(), type, 1, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        if (!result.ok) {
          setError(result.message);
          setResults([]);
          return;
        }
        setResults(result.data.results.filter((item) => item.media_type === "movie" || item.media_type === "tv").slice(0, 8));
      }).catch(() => {
        if (!controller.signal.aborted) setError("Pencarian katalog gagal. Coba lagi.");
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, type]);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold" htmlFor={inputId}>Cari judul TMDb</label>
      <input id={inputId} value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg border border-lineStrong bg-night px-4 py-3 text-paper placeholder:text-mist focus:border-clix" placeholder="Ketik judul film atau serial" />
      {loading && <p className="text-sm text-mist" role="status">Mencari di katalog...</p>}
      {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
      {!loading && query.trim().length >= 2 && !error && results.length === 0 && <p className="text-sm text-mist">Tidak ada judul yang cocok.</p>}
      {results.length > 0 && (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {results.map((item) => {
            const exists = exclude.includes(item.id);
            const poster = posterUrl(item.poster_path);
            return (
              <li key={`${item.media_type}-${item.id}`} className="flex items-center gap-3 p-3">
                <span className="relative block h-20 w-14 shrink-0 overflow-hidden rounded-md border border-line bg-dusk">
                  {poster
                    ? <img src={poster} alt="" width="342" height="513" loading="lazy" className="h-full w-full object-cover" />
                    : <span aria-hidden="true" className="grid h-full w-full place-items-center px-1 text-center text-[10px] font-semibold leading-tight text-mist">Tanpa poster</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{titleOf(item)}</span>
                  <span className="block text-xs text-mist">{item.media_type === "tv" ? "Serial" : "Film"} · {item.release_date || item.first_air_date || "Tahun tidak tersedia"}</span>
                </span>
                <button type="button" disabled={exists} onClick={() => item.media_type !== "person" && onAdd({ id: item.id, type: item.media_type, label: titleOf(item), posterPath: item.poster_path ?? undefined })} className="btn-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-50">
                  {exists ? "Sudah ditambahkan" : "Tambahkan"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CollectionEditor({
  collection,
  onChange,
  onDelete,
}: {
  collection: CuratedCollection;
  onChange: (collection: CuratedCollection) => void;
  onDelete: () => void;
}) {
  const update = (patch: Partial<CuratedCollection>) => onChange({ ...collection, ...patch });
  const [sectionPreset, setSectionPreset] = useState<CollectionSectionKind | "">("");
  const activePreset = SECTION_PRESETS.find((item) => item.kind === sectionPreset);
  const addSection = () => {
    if (!activePreset) return;
    update({ sections: [...collection.sections, { id: newId(), title: activePreset.label, kind: activePreset.kind, description: "" }] });
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Nama koleksi
          <input value={collection.title} onChange={(event) => update({ title: event.target.value })} className="mt-2 w-full rounded-lg border border-lineStrong bg-night px-3 py-3 font-normal" />
        </label>
        <label className="block text-sm font-semibold">Alamat halaman
          <input value={collection.slug} onChange={(event) => update({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="mt-2 w-full rounded-lg border border-lineStrong bg-night px-3 py-3 font-normal" />
        </label>
      </div>
      <label className="block text-sm font-semibold">Deskripsi
        <textarea value={collection.description} onChange={(event) => update({ description: event.target.value })} rows={3} className="mt-2 w-full rounded-lg border border-lineStrong bg-night px-3 py-3 font-normal" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageUploadField label="Logo koleksi (opsional)" value={collection.logoUrl} onChange={(logoUrl) => update({ logoUrl })} />
        <ImageUploadField label="Gambar latar (opsional)" value={collection.backdropUrl} onChange={(backdropUrl) => update({ backdropUrl })} />
      </div>
      <label className="block max-w-xl text-sm font-semibold">Tampilan koleksi di beranda
        <select value={collection.homeStyle} onChange={(event) => update({ homeStyle: event.target.value as CuratedCollection["homeStyle"] })} className="mt-2 min-h-12 w-full rounded-lg border border-lineStrong bg-night px-3 font-normal">
          <option value="banner">Banner lebar</option>
          <option value="tile">Thumbnail dalam baris geser</option>
        </select>
      </label>
      <div className="grid gap-4 xl:grid-cols-2">
        <CropPositionEditor
          label={collection.homeStyle === "tile" ? "Crop thumbnail di baris koleksi" : "Crop banner di beranda"}
          imageUrl={collection.backdropUrl}
          position={collection.homeCrop}
          aspectClass={collection.homeStyle === "tile" ? "aspect-[2.4/1]" : "aspect-[4.8/1]"}
          onChange={(homeCrop) => update({ homeCrop })}
        />
        <CropPositionEditor
          label="Crop banner halaman koleksi"
          imageUrl={collection.backdropUrl}
          position={collection.pageCrop}
          aspectClass="aspect-[4.2/1]"
          onChange={(pageCrop) => update({ pageCrop })}
        />
      </div>
      <section aria-label="Pratinjau halaman koleksi" className="overflow-hidden rounded-panel border border-line bg-night">
        <div className="relative flex min-h-48 items-end overflow-hidden p-5 sm:min-h-56 sm:p-7">
          {collection.backdropUrl && (
            <img
              src={collection.backdropUrl}
              alt=""
              width="1200"
              height="500"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: `${collection.pageCrop.x}% ${collection.pageCrop.y}%` }}
            />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-night via-night/70 to-night/20" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <p className="mb-2 text-xs font-semibold text-paper/80">Pratinjau halaman publik</p>
            <h3 className="font-display text-2xl font-bold sm:text-3xl">{collection.title || "Nama koleksi"}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-paper/90">
              {collection.description || "Deskripsi koleksi akan tampil di sini."}
            </p>
            <p className="mt-3 text-xs text-paper/80">
              {collection.sections.length} bagian · {collection.titleIds.length} judul pilihan
            </p>
          </div>
        </div>
      </section>
      {collection.titleIds.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Pilihan judul lama</h3>
          <p className="text-sm text-mist">Judul lama tetap ditampilkan sebagai pilihan judul. Buat section baru untuk mengatur jenis dan isinya.</p>
          <CuratedTitleList items={collection.titleIds} showWatchOrder={false} onChange={(titleIds) => update({ titleIds })} />
        </div>
      )}
      <div className="space-y-3 border-t border-line pt-5">
        <div>
          <h3 className="font-semibold">Section di dalam koleksi</h3>
          <p className="text-sm text-mist">Pilih jenis section yang ingin ditambahkan. Koleksi baru tidak memiliki section bawaan.</p>
        </div>
        <div className="rounded-lg border border-dashed border-lineStrong p-3 sm:flex sm:items-end sm:gap-3">
          <label className="block flex-1 text-sm font-semibold">Jenis section
            <select value={sectionPreset} onChange={(event) => setSectionPreset(event.target.value as CollectionSectionKind)} className="mt-1 min-h-11 w-full rounded border border-lineStrong bg-dusk px-3 font-normal">
              <option value="">Pilih jenis section</option>
              {SECTION_PRESETS.map((preset) => <option key={preset.kind} value={preset.kind}>{preset.label}</option>)}
            </select>
            {activePreset && <span className="mt-1 block text-xs font-normal text-mist">{activePreset.hint}</span>}
          </label>
          <button type="button" onClick={addSection} disabled={!activePreset} className="btn-secondary mt-3 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0">Tambah section</button>
        </div>
        {collection.sections.map((section, index) => (
          <div key={section.id} className="grid gap-3 rounded-lg border border-line bg-night p-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm font-semibold">Judul section<input value={section.title} onChange={(event) => update({ sections: collection.sections.map((item, i) => i === index ? { ...item, title: event.target.value } : item) })} className="mt-1 w-full rounded border border-lineStrong bg-dusk px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold">Tipe
              <select value={section.kind} onChange={(event) => {
                const kind = event.target.value as CollectionSectionKind;
                const preset = SECTION_PRESETS.find((item) => item.kind === kind);
                update({ sections: collection.sections.map((item, i) => i === index ? {
                  ...item,
                  kind,
                  title: SECTION_PRESETS.some((entry) => entry.label === item.title) ? preset?.label ?? item.title : item.title,
                } : item) });
              }} className="mt-1 min-h-11 w-full rounded border border-lineStrong bg-dusk px-3 font-normal">
                {SECTION_PRESETS.map((preset) => <option key={preset.kind} value={preset.kind}>{preset.label}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => update({ sections: collection.sections.filter((_, i) => i !== index) })} className="btn-quiet text-red-200">Hapus</button>
            <label className="text-sm font-semibold sm:col-span-3">Isi section<textarea value={section.description || ""} onChange={(event) => update({ sections: collection.sections.map((item, i) => i === index ? { ...item, description: event.target.value } : item) })} rows={2} className="mt-1 w-full rounded border border-lineStrong bg-dusk px-3 py-2 font-normal" /></label>
            {section.kind !== "text" && <div className="space-y-3 sm:col-span-3">
              <p className="text-sm text-mist">Judul di section</p>
              <CuratedTitleList
                items={section.titleIds ?? []}
                showWatchOrder={section.kind === "watch-order"}
                onChange={(titleIds) => update({ sections: collection.sections.map((entry, i) => i === index ? { ...entry, titleIds } : entry) })}
              />
              <SearchTitles exclude={(section.titleIds ?? []).map((item) => item.id)} onAdd={(title) => update({ sections: collection.sections.map((entry, i) => i === index ? { ...entry, titleIds: [...(entry.titleIds ?? []), title] } : entry) })} />
            </div>}
          </div>
        ))}
      </div>
      <div className="border-t border-line pt-4">
        <button type="button" onClick={onDelete} className="btn-quiet text-red-200">Hapus koleksi ini</button>
      </div>
    </div>
  );
}

function CollectionGroupEditor({
  group,
  groups,
  collections,
  onChange,
  onDelete,
}: {
  group: CollectionGroup;
  groups: CollectionGroup[];
  collections: CuratedCollection[];
  onChange: (group: CollectionGroup) => void;
  onDelete: () => void;
}) {
  const [pick, setPick] = useState("");
  const members = group.collectionIds.flatMap((id) => {
    const collection = collections.find((item) => item.id === id);
    return collection ? [collection] : [];
  });
  const available = collections.filter((item) =>
    !group.collectionIds.includes(item.id) && !groups.some((other) => other.id !== group.id && other.collectionIds.includes(item.id)),
  );
  const reorder = (index: number, direction: -1 | 1) => {
    const next = [...group.collectionIds];
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange({ ...group, collectionIds: next });
  };
  const add = () => {
    if (!pick || group.collectionIds.includes(pick)) return;
    onChange({ ...group, collectionIds: [...group.collectionIds, pick] });
    setPick("");
  };

  return (
    <div className="space-y-4 rounded-lg border border-line bg-night p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="text-sm font-semibold">Nama lingkup
          <input value={group.title} onChange={(event) => onChange({ ...group, title: event.target.value })} className="mt-1 w-full rounded border border-lineStrong bg-dusk px-3 py-2 font-normal" />
        </label>
        <button type="button" onClick={onDelete} className="btn-quiet text-red-200">Hapus lingkup</button>
        <p className="text-xs text-mist sm:col-span-2">Menghapus lingkup tidak menghapus koleksinya. Koleksi yang dilepas bisa ditambahkan lagi lewat "Tambahkan koleksi ke beranda".</p>
      </div>
      {members.length === 0 ? <p className="text-sm text-mist">Belum ada koleksi di lingkup ini.</p> : (
        <ul className="space-y-2">
          {members.map((collection, index) => (
            <li key={collection.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-dusk p-2">
              <span className="relative block h-12 w-20 shrink-0 overflow-hidden rounded border border-line bg-night">
                {collection.backdropUrl
                  ? <img src={collection.backdropUrl} alt="" width="720" height="300" loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: `${collection.homeCrop.x}% ${collection.homeCrop.y}%` }} />
                  : <span aria-hidden="true" className="grid h-full w-full place-items-center text-[10px] text-mist">Tanpa gambar</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{collection.title || "Tanpa judul"}</span>
                <span className="block text-xs text-mist">{collection.titleIds.length} judul · {collection.homeStyle === "tile" ? "Thumbnail" : "Banner"}</span>
              </span>
              <span className="ml-auto flex shrink-0 gap-1">
                <button type="button" aria-label={`Geser ${collection.title || "koleksi"} ke kiri`} onClick={() => reorder(index, -1)} disabled={index === 0} className="icon-btn rounded-lg disabled:cursor-not-allowed disabled:opacity-40">←</button>
                <button type="button" aria-label={`Geser ${collection.title || "koleksi"} ke kanan`} onClick={() => reorder(index, 1)} disabled={index === members.length - 1} className="icon-btn rounded-lg disabled:cursor-not-allowed disabled:opacity-40">→</button>
                <button type="button" onClick={() => onChange({ ...group, collectionIds: group.collectionIds.filter((id) => id !== collection.id) })} className="btn-quiet text-red-200">Hapus</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm font-semibold">Tambah koleksi
            <select value={pick} onChange={(event) => setPick(event.target.value)} className="mt-1 min-h-11 w-full rounded border border-lineStrong bg-dusk px-3 font-normal">
              <option value="">Pilih koleksi</option>
              {available.map((collection) => <option key={collection.id} value={collection.id}>{collection.title || "Tanpa judul"}</option>)}
            </select>
          </label>
          <button type="button" disabled={!pick} onClick={add} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50">Tambahkan</button>
        </div>
      ) : <p className="text-sm text-mist">Semua koleksi sudah masuk lingkup ini.</p>}
    </div>
  );
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [secret, setSecret] = useState("");
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [publishedContent, setPublishedContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [history, setHistory] = useState<SiteContentEnvelope["history"]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dropTargetSectionId, setDropTargetSectionId] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    const result = await adminRequest<SiteContentEnvelope>("/api/admin/content");
    setPublishedContent(withCollectionGroups(result.published));
    setContent(withCollectionGroups(result.draft));
    setHistory(result.history);
    setDirty(false);
  }, []);

  useEffect(() => {
    let active = true;
    adminRequest<{ configured: boolean; authenticated: boolean }>("/api/admin/status")
      .then((status) => {
        if (!active) return;
        setConfigured(status.configured);
        setAuthenticated(status.authenticated);
        if (status.authenticated) void loadContent().catch((reason: Error) => setError(reason.message));
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => { active = false; };
  }, [loadContent]);

  const selected = useMemo(() => content.collections.find((item) => item.id === selectedCollection) ?? content.collections[0], [content.collections, selectedCollection]);

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await adminRequest("/api/admin/unlock", { method: "POST", body: JSON.stringify({ secret }) });
      setAuthenticated(true);
      setSecret("");
      await loadContent();
      setNotice("Panel admin terbuka.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kunci admin tidak cocok.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (publish: boolean) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await adminRequest<SiteContentEnvelope>("/api/admin/content", {
        method: "PUT",
        body: JSON.stringify({ content, publish }),
      });
      setPublishedContent(withCollectionGroups(result.published));
      setContent(withCollectionGroups(result.draft));
      setHistory(result.history);
      setDirty(false);
      setNotice(publish ? "Perubahan sudah diterbitkan ke situs." : "Draft tersimpan. Pengunjung belum melihat perubahan ini.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Perubahan gagal disimpan.");
    } finally {
      setBusy(false);
    }
  };

  const updateContent = (next: SiteContent) => {
    setContent(next);
    setDirty(true);
    setNotice("");
  };
  const hasUnpublishedChanges = JSON.stringify(content) !== JSON.stringify(publishedContent);
  const groupedCollectionIds = new Set(content.collectionGroups.flatMap((group) => group.collectionIds));
  const standaloneCollectionIds = new Set(content.homeSections.flatMap((section) => section.kind === "collection" && section.collectionId ? [section.collectionId] : []));
  const collectionsWithoutHome = content.collections.filter((item) => !groupedCollectionIds.has(item.id) && !standaloneCollectionIds.has(item.id));

  if (configured === null) {
    return (
      <main className="admin-auth-shell grid min-h-screen place-items-center px-4">
        <Panel className="w-full max-w-md">
          <h1 className="font-display text-2xl font-bold">Memeriksa akses admin</h1>
          {error ? (
            <>
              <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>
              <button type="button" onClick={() => window.location.reload()} className="btn-secondary mt-5">Coba lagi</button>
            </>
          ) : (
            <p role="status" className="mt-3 text-sm text-mist">Memuat status panel...</p>
          )}
        </Panel>
      </main>
    );
  }

  const moveSection = (index: number, direction: -1 | 1) => {
    const next = [...content.homeSections];
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    updateContent({ ...content, homeSections: next });
  };

  const moveSectionTo = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const next = [...content.homeSections];
    const sourceIndex = next.findIndex((item) => item.id === sourceId);
    if (sourceIndex < 0) return;
    const [moved] = next.splice(sourceIndex, 1);
    const targetIndex = next.findIndex((item) => item.id === targetId);
    if (targetIndex < 0) return;
    next.splice(targetIndex, 0, moved);
    updateContent({ ...content, homeSections: next });
  };

  const addCollection = () => {
    const title = "Koleksi baru";
    const collection: CuratedCollection = {
      id: newId(), slug: `koleksi-${newId().slice(0, 6)}`, title, description: "",
      logoUrl: "", backdropUrl: "", homeStyle: "banner",
      homeCrop: { x: 50, y: 50 }, pageCrop: { x: 50, y: 50 },
      showOnHome: true, titleIds: [], sections: [],
    };
    updateContent({ ...content, collections: [...content.collections, collection], homeSections: [...content.homeSections, { id: newId(), kind: "collection", collectionId: collection.id, title, visible: true }] });
    setSelectedCollection(collection.id);
    setActiveTab("collections");
  };

  const addCollectionGroup = () => {
    const group: CollectionGroup = { id: newId(), title: "Koleksi pilihan", collectionIds: [] };
    updateContent({
      ...content,
      collectionGroups: [...content.collectionGroups, group],
      homeSections: [...content.homeSections, { id: newId(), kind: "collection-group", groupId: group.id, visible: true }],
    });
  };

  const logout = async () => {
    try { await adminRequest("/api/admin/lock", { method: "POST" }); } catch { /* Cookie sesi tetap kedaluwarsa di server. */ }
    setAuthenticated(false);
    setNotice("");
  };

  if (configured === false) {
      return <main className="admin-auth-shell grid min-h-screen place-items-center bg-night px-4"><Panel className="w-full max-w-lg"><h1 className="font-display text-2xl font-bold">Admin belum dikonfigurasi</h1><p className="mt-3 text-mist">Atur <code className="text-paper">ADMIN_SECRET</code> dengan nilai acak minimal 16 karakter pada environment server, lalu mulai ulang aplikasi.</p></Panel></main>;
  }
  if (!authenticated) {
    return (
      <main className="admin-auth-shell grid min-h-screen place-items-center bg-night px-4 py-12">
        <Panel className="w-full max-w-md">
          <a href="/" className="font-display text-xl font-extrabold"><span className="text-brand">i</span>Clix <span className="text-mist">/ studio</span></a>
          <h1 className="mt-8 font-display text-3xl font-bold">Masuk ke ruang kurasi</h1>
          <p className="mt-2 leading-relaxed text-mist">Panel ini tidak memakai akun. Gunakan kunci admin yang disiapkan di server.</p>
          <form onSubmit={unlock} className="mt-6 space-y-4">
            <label htmlFor="admin-secret" className="block text-sm font-semibold">Kunci admin</label>
            <input id="admin-secret" type="password" autoComplete="current-password" value={secret} onChange={(event) => setSecret(event.target.value)} required className="min-h-12 w-full rounded-lg border border-lineStrong bg-night px-4 text-paper" />
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <button disabled={busy} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Memeriksa..." : "Buka panel"}</button>
          </form>
          <a href="/" className="mt-5 inline-flex min-h-11 items-center text-sm text-mist underline-offset-4 hover:text-paper hover:underline">Kembali ke iClix</a>
        </Panel>
      </main>
    );
  }

  const pageTitles: Record<AdminTab, { title: string; detail: string }> = {
    overview: { title: "Ruang kurasi", detail: "Atur apa yang tampil di iClix dan kapan perubahan dipublikasikan." },
    home: { title: "Susunan beranda", detail: "Atur urutan, visibilitas, dan koleksi yang muncul di halaman depan." },
    spotlight: { title: "Spotlight", detail: "Pilih sumber film untuk carousel utama." },
    collections: { title: "Koleksi tematik", detail: "Bangun halaman seperti MCU, Star Wars, atau dunia cerita pilihanmu." },
    announcement: { title: "Pengumuman situs", detail: "Tampilkan pesan singkat yang relevan di atas beranda." },
    history: { title: "Riwayat perubahan", detail: "Lihat draft tersimpan dan pulihkan versi sebagai draft." },
  };

  return (
    <div className="admin-shell min-h-screen bg-night text-paper">
      <header className="admin-header sticky top-0 z-20 border-b border-line bg-night/95 backdrop-blur">
        <div className="admin-header-inner mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="/" className="font-display text-xl font-extrabold"><span className="text-brand">i</span>Clix <span className="text-sm font-medium text-mist">studio</span></a>
          <div className="flex items-center gap-2">
            {dirty && <span className="hidden text-sm text-gold sm:inline">Ada perubahan belum tersimpan</span>}
            <button type="button" disabled={busy || !dirty} onClick={() => void save(false)} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50">Simpan draft</button>
            <button type="button" disabled={busy || !hasUnpublishedChanges} onClick={() => void save(true)} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">Terbitkan</button>
            <button type="button" onClick={() => void logout()} className="btn-quiet">Kunci panel</button>
          </div>
        </div>
      </header>
      <div className="admin-layout mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-8">
        <nav aria-label="Navigasi pengelolaan" className="admin-nav flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} aria-current={activeTab === item.id ? "page" : undefined} className={`admin-nav-item min-h-11 shrink-0 rounded-lg px-4 text-left text-sm font-semibold transition lg:w-full ${activeTab === item.id ? "bg-haze text-paper" : "text-mist hover:bg-dusk hover:text-paper"}`}>{item.label}</button>
          ))}
        </nav>
        <main className="admin-content min-w-0">
          <div className="admin-page-heading mb-6">
            <p className="text-sm text-clix">PENGELOLAAN SITUS</p>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{pageTitles[activeTab].title}</h1>
            <p className="mt-2 max-w-2xl text-mist">{pageTitles[activeTab].detail}</p>
          </div>
          {error && <p role="alert" className="mb-4 rounded-lg border border-red-300/40 bg-red-950/40 p-3 text-sm text-red-100">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded-lg border border-clix/40 bg-clix/10 p-3 text-sm text-paper">{notice}</p>}

          {activeTab === "overview" && (
            <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
              <Panel>
                <p className="text-sm text-mist">STATUS KONTEN</p>
                <h2 className="mt-2 font-display text-2xl font-bold">{dirty ? "Perubahan belum disimpan" : hasUnpublishedChanges ? "Ada draft belum diterbitkan" : "Semua perubahan tersimpan"}</h2>
                <p className="mt-2 text-sm leading-relaxed text-mist">Simpan draft untuk menahan perubahan dari pengunjung. Terbitkan saat susunan sudah siap.</p>
                <div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={!dirty || busy} onClick={() => void save(false)} className="btn-secondary disabled:opacity-50">Simpan draft</button><button type="button" disabled={!hasUnpublishedChanges || busy} onClick={() => void save(true)} className="btn-primary disabled:opacity-50">Terbitkan perubahan</button></div>
              </Panel>
              <Panel>
                <p className="text-sm text-mist">YANG BISA DIATUR</p>
                <ul className="mt-3 space-y-2 text-sm"><li>Urutan section beranda: {content.homeSections.length}</li><li>Koleksi kurasi: {content.collections.length}</li><li>Lingkup baris koleksi: {content.collectionGroups.length}</li><li>Mode spotlight: {content.spotlight.mode}</li><li>Pengumuman: {content.announcement.enabled ? "aktif" : "nonaktif"}</li></ul>
              </Panel>
              <Panel className="xl:col-span-2">
                <h2 className="font-display text-xl font-bold">Pintasan pengelolaan</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {NAV_ITEMS.slice(1, 5).map((item) => <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className="rounded-lg border border-line bg-night p-4 text-left transition hover:border-lineStrong"><span className="block font-semibold">{item.label}</span><span className="mt-1 block text-sm text-mist">{pageTitles[item.id].detail}</span></button>)}
                </div>
              </Panel>
            </div>
          )}

          {activeTab === "home" && (
            <div className="space-y-4">
              <Panel>
                <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-xl font-bold">Urutan section</h2><p className="mt-1 text-sm text-mist">Seret pegangan untuk mengubah urutan. Tombol panah tetap tersedia untuk keyboard dan layar sentuh.</p><p className="mt-1 text-xs text-mist">Urutan di situs publik berubah setelah kamu menekan Terbitkan.</p></div><button type="button" onClick={addCollection} className="btn-secondary">Buat koleksi</button></div>
                <ol className="mt-5 space-y-2">
                  {content.homeSections.map((section, index) => {
                    const collection = content.collections.find((item) => item.id === section.collectionId);
                    const group = section.kind === "collection-group" ? content.collectionGroups.find((item) => item.id === section.groupId) : undefined;
                    const title = section.kind === "collection-group"
                      ? section.title || group?.title || "Lingkup koleksi"
                      : section.kind === "collection" ? section.title || collection?.title || "Koleksi" : section.title || CATALOG_SECTIONS.find((item) => item.key === section.key)?.title || "Section katalog";
                    return <li
                      key={section.id}
                      onDragOver={(event) => {
                        if (!draggedSectionId || draggedSectionId === section.id) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropTargetSectionId(section.id);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const sourceId = event.dataTransfer.getData("text/plain") || draggedSectionId;
                        if (sourceId) moveSectionTo(sourceId, section.id);
                        setDraggedSectionId(null);
                        setDropTargetSectionId(null);
                      }}
                      className={`grid gap-3 rounded-lg border bg-night p-3 transition-colors sm:grid-cols-[auto_1fr_auto_auto] sm:items-center ${dropTargetSectionId === section.id ? "border-clix bg-panel" : "border-line"} ${draggedSectionId === section.id ? "opacity-50" : ""}`}
                    >
                      <span
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", section.id);
                          setDraggedSectionId(section.id);
                        }}
                        onDragEnd={() => {
                          setDraggedSectionId(null);
                          setDropTargetSectionId(null);
                        }}
                        title="Seret untuk mengubah urutan"
                        className="flex min-h-11 w-11 cursor-grab touch-none items-center justify-center rounded-lg text-xl text-mist active:cursor-grabbing"
                      >
                        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true"><circle cx="6" cy="4" r="1.5" /><circle cx="14" cy="4" r="1.5" /><circle cx="6" cy="10" r="1.5" /><circle cx="14" cy="10" r="1.5" /><circle cx="6" cy="16" r="1.5" /><circle cx="14" cy="16" r="1.5" /></svg>
                        <span className="sr-only">Pegangan seret untuk {title}</span>
                      </span>
                      <span><span className="block font-semibold">{title}</span><span className="text-xs text-mist">{section.kind === "collection" ? collection?.homeStyle === "tile" ? "Thumbnail koleksi, urutan kiri ke kanan" : "Banner koleksi" : section.kind === "collection-group" ? `Lingkup ${group?.collectionIds.length ?? 0} koleksi, baris geser` : "Data katalog TMDb"}</span></span>
                      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={section.visible && (section.kind !== "collection" || collection?.showOnHome !== false)} onChange={(event) => updateContent({
                        ...content,
                        homeSections: content.homeSections.map((item) => item.id === section.id ? { ...item, visible: event.target.checked } : item),
                        collections: section.kind === "collection" ? content.collections.map((item) => item.id === section.collectionId ? { ...item, showOnHome: event.target.checked } : item) : content.collections,
                      })} className="h-5 w-5 accent-clix" />Tampilkan</label>
                      <span className="flex gap-1"><button type="button" aria-label={`Pindahkan ${title} ke atas`} disabled={index === 0} onClick={() => moveSection(index, -1)} className="icon-btn rounded-lg disabled:cursor-not-allowed disabled:opacity-40">↑</button><button type="button" aria-label={`Pindahkan ${title} ke bawah`} disabled={index === content.homeSections.length - 1} onClick={() => moveSection(index, 1)} className="icon-btn rounded-lg disabled:cursor-not-allowed disabled:opacity-40">↓</button></span>
                    </li>;
                  })}
                </ol>
                <div className="mt-5 border-t border-line pt-4">
                  <h3 className="font-semibold">Tambahkan section katalog</h3>
                  <div className="mt-3 flex flex-wrap gap-2">{CATALOG_SECTIONS.filter((catalog) => !content.homeSections.some((section) => section.key === catalog.key)).map((catalog) => <button key={catalog.key} type="button" onClick={() => updateContent({ ...content, homeSections: [...content.homeSections, { id: newId(), kind: "catalog", key: catalog.key, visible: true }] })} className="btn-secondary">{catalog.title}</button>)}</div>
                </div>
                <div className="mt-5 border-t border-line pt-4">
                  <h3 className="font-semibold">Tambahkan koleksi ke beranda</h3>
                  <p className="mt-1 text-xs text-mist">Koleksi yang belum punya section sendiri dan belum masuk lingkup.</p>
                  {collectionsWithoutHome.length === 0
                    ? <p className="mt-3 text-sm text-mist">Semua koleksi sudah tampil di beranda.</p>
                    : <div className="mt-3 flex flex-wrap gap-2">{collectionsWithoutHome.map((collection) => <button key={collection.id} type="button" onClick={() => updateContent({ ...content, homeSections: [...content.homeSections, { id: newId(), kind: "collection", collectionId: collection.id, title: collection.title, visible: true }] })} className="btn-secondary">{collection.title || "Tanpa judul"}</button>)}</div>}
                </div>
              </Panel>
              <Panel>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold">Lingkup baris koleksi</h2>
                    <p className="mt-1 text-sm text-mist">Gabungkan beberapa koleksi thumbnail ke satu baris geser. Setiap lingkup tampil sebagai satu section yang bisa diurutkan di daftar atas.</p>
                    <p className="mt-1 text-xs text-mist">Koleksi yang masuk lingkup tidak lagi tampil sebagai section sendiri.</p>
                  </div>
                  <button type="button" onClick={addCollectionGroup} className="btn-secondary">Buat lingkup</button>
                </div>
                {content.collectionGroups.length === 0
                  ? <p className="mt-5 rounded-lg border border-dashed border-lineStrong p-5 text-sm text-mist">Belum ada lingkup. Koleksi thumbnail yang belum masuk lingkup tetap tampil dalam satu baris "Koleksi pilihan".</p>
                  : <div className="mt-5 space-y-4">
                    {content.collectionGroups.map((group) => (
                      <CollectionGroupEditor
                        key={group.id}
                        group={group}
                        groups={content.collectionGroups}
                        collections={content.collections}
                        onChange={(next) => {
                          const added = next.collectionIds.filter((id) => !group.collectionIds.includes(id));
                          updateContent({
                            ...content,
                            collectionGroups: content.collectionGroups.map((item) => item.id === next.id ? next : item),
                            homeSections: content.homeSections
                              .filter((section) => !(section.kind === "collection" && section.collectionId && added.includes(section.collectionId)))
                              .map((section) => section.kind === "collection-group" && section.groupId === next.id ? { ...section, title: next.title } : section),
                          });
                        }}
                        onDelete={() => updateContent({
                          ...content,
                          collectionGroups: content.collectionGroups.filter((item) => item.id !== group.id),
                          homeSections: content.homeSections.filter((section) => !(section.kind === "collection-group" && section.groupId === group.id)),
                        })}
                      />
                    ))}
                  </div>}
              </Panel>
            </div>
          )}

          {activeTab === "spotlight" && (
            <div className="space-y-4">
              <Panel>
                <h2 className="font-display text-xl font-bold">Sumber pilihan spotlight</h2>
                <p className="mt-1 text-sm text-mist">Mode populer dan tren mengikuti hasil katalog TMDb. Mode acak mengacak hasil tren. Mode pilihan manual memakai daftar yang kamu susun.</p>
                <label className="mt-5 block max-w-md text-sm font-semibold">Mode spotlight
                  <select value={content.spotlight.mode} onChange={(event) => updateContent({ ...content, spotlight: { ...content.spotlight, mode: event.target.value as SpotlightMode } })} className="mt-2 min-h-12 w-full rounded-lg border border-lineStrong bg-night px-3">
                    <option value="trending">Sedang tren</option><option value="popular">Populer</option><option value="random">Acak dari tren</option><option value="manual">Pilihan manual</option>
                  </select>
                </label>
                {content.spotlight.mode === "manual" && (
                  <div className="mt-6">
                    <h3 className="mb-3 font-semibold">Film dan serial untuk carousel, maksimal 10</h3>
                    <p className="mb-3 text-sm text-mist">Tarik film untuk mengubah urutan, atau gunakan tombol panah.</p>
                    <div className="mb-4">
                      <SpotlightTitleList
                        items={content.spotlight.titleIds}
                        onChange={(titleIds) => updateContent({ ...content, spotlight: { ...content.spotlight, titleIds } })}
                      />
                    </div>
                    {content.spotlight.titleIds.length < 10
                      ? <SearchTitles type="multi" exclude={content.spotlight.titleIds.map((item) => item.id)} onAdd={(title) => updateContent({ ...content, spotlight: { ...content.spotlight, titleIds: [...content.spotlight.titleIds, title] } })} />
                      : <p className="text-sm text-mist">Spotlight sudah berisi 10 judul. Hapus satu untuk menambahkan judul lain.</p>}
                  </div>
                )}
              </Panel>
              <Panel><h2 className="font-semibold">Catatan tampilan</h2><p className="mt-2 text-sm leading-relaxed text-mist">Carousel saat ini memakai detail film dari TMDb, termasuk gambar, sinopsis, logo judul, dan tautan halaman film. Hanya film yang bisa dipilih sebagai spotlight.</p></Panel>
            </div>
          )}

          {activeTab === "collections" && (
            <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
              <Panel className="h-fit">
                <div className="flex items-center justify-between gap-2"><h2 className="font-display text-lg font-bold">Koleksi</h2><button type="button" aria-label="Buat koleksi baru" onClick={addCollection} className="icon-btn rounded-lg text-xl">+</button></div>
                {content.collections.length === 0 ? <p className="mt-4 text-sm text-mist">Belum ada koleksi kurasi.</p> : <ul className="mt-3 space-y-1">{content.collections.map((item) => <li key={item.id}><button type="button" onClick={() => setSelectedCollection(item.id)} aria-current={selected?.id === item.id ? "page" : undefined} className={`min-h-11 w-full rounded-lg px-3 text-left text-sm ${selected?.id === item.id ? "bg-haze font-semibold" : "text-mist hover:bg-night hover:text-paper"}`}>{item.title || "Tanpa judul"}</button></li>)}</ul>}
                <button type="button" onClick={addCollection} className="btn-secondary mt-4 w-full">Buat koleksi</button>
                <p className="mt-4 text-xs leading-relaxed text-mist">Baris geser thumbnail diatur lewat Beranda, bagian "Lingkup baris koleksi".</p>
              </Panel>
              <Panel>
                {selected ? <CollectionEditor collection={selected} onChange={(next) => updateContent({ ...content, collections: content.collections.map((item) => item.id === next.id ? next : item), homeSections: content.homeSections.map((section) => section.collectionId === next.id ? { ...section, title: next.title } : section) })} onDelete={() => {
                  updateContent({
                    ...content,
                    collections: content.collections.filter((item) => item.id !== selected.id),
                    homeSections: content.homeSections.filter((item) => item.collectionId !== selected.id),
                    collectionGroups: content.collectionGroups.map((group) => ({ ...group, collectionIds: group.collectionIds.filter((id) => id !== selected.id) })),
                  });
                  setSelectedCollection("");
                }} /> : <div className="py-12 text-center"><h2 className="font-display text-xl font-bold">Mulai koleksi pertama</h2><p className="mt-2 text-sm text-mist">Pilih judul, susun panduan menonton, dan tambahkan bagian editorial.</p><button type="button" onClick={addCollection} className="btn-primary mt-5">Buat koleksi</button></div>}
              </Panel>
            </div>
          )}

          {activeTab === "announcement" && <Panel>
            <h2 className="font-display text-xl font-bold">Pesan di beranda</h2>
            <p className="mt-1 text-sm text-mist">Gunakan untuk informasi singkat, bukan promosi yang tidak relevan. Pesan hanya tampil setelah diterbitkan.</p>
            <label className="mt-5 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={content.announcement.enabled} onChange={(event) => updateContent({ ...content, announcement: { ...content.announcement, enabled: event.target.checked } })} className="h-5 w-5 accent-clix" />Aktifkan pengumuman</label>
            <label htmlFor="announcement-text" className="mt-4 block text-sm font-semibold">Teks pengumuman</label>
            <textarea id="announcement-text" value={content.announcement.text} maxLength={240} onChange={(event) => updateContent({ ...content, announcement: { ...content.announcement, text: event.target.value } })} rows={3} className="mt-2 w-full rounded-lg border border-lineStrong bg-night px-4 py-3" />
            <p className="mt-1 text-right text-xs text-mist">{content.announcement.text.length}/240 karakter</p>
          </Panel>}

          {activeTab === "history" && <Panel>
            <h2 className="font-display text-xl font-bold">Versi tersimpan</h2>
            <p className="mt-1 text-sm text-mist">Memulihkan versi akan mengganti draft. Terbitkan lagi jika ingin pengunjung melihatnya.</p>
            {history.length === 0 ? <p className="mt-5 rounded-lg border border-dashed border-lineStrong p-5 text-sm text-mist">Belum ada perubahan tersimpan.</p> : <ol className="mt-5 space-y-2">{history.map((entry, index) => <li key={`${entry.savedAt}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-night p-3"><span><span className="block font-semibold">{entry.label}</span><time className="text-xs text-mist" dateTime={entry.savedAt}>{new Date(entry.savedAt).toLocaleString("id-ID")}</time></span><button type="button" disabled={busy} onClick={() => {
              setBusy(true); setError("");
              void adminRequest<SiteContentEnvelope>("/api/admin/restore", { method: "POST", body: JSON.stringify({ index }) }).then((result) => { setContent(withCollectionGroups(result.draft)); setHistory(result.history); setDirty(false); setNotice("Versi dipulihkan sebagai draft."); }).catch((reason: Error) => setError(reason.message)).finally(() => setBusy(false));
            }} className="btn-secondary disabled:opacity-50">Pulihkan sebagai draft</button></li>)}</ol>}
          </Panel>}

          <p className="mt-6 text-xs text-mist">Draft disimpan di server. Pastikan volume penyimpanan aplikasi persisten agar perubahan tidak hilang saat deploy.</p>
        </main>
      </div>
    </div>
  );
}
