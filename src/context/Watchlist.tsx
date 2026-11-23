import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "iclix:daftar-saya:v2";

export interface WatchItem {
  id: number;
  mediaType: "movie" | "tv";
}

interface WatchlistValue {
  items: WatchItem[];
  has: (item: WatchItem) => boolean;
  toggle: (item: WatchItem) => void;
}

const WatchlistContext = createContext<WatchlistValue | null>(null);

function sameItem(a: WatchItem, b: WatchItem): boolean {
  return a.id === b.id && a.mediaType === b.mediaType;
}

function readStored(): WatchItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is WatchItem =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as WatchItem).id === "number" &&
        ((v as WatchItem).mediaType === "movie" || (v as WatchItem).mediaType === "tv"),
    );
  } catch {
    return [];
  }
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchItem[]>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Penyimpanan penuh atau diblokir: daftar tetap berfungsi selama sesi berjalan.
    }
  }, [items]);

  const has = useCallback((item: WatchItem) => items.some((i) => sameItem(i, item)), [items]);

  const toggle = useCallback((item: WatchItem) => {
    setItems((prev) =>
      prev.some((i) => sameItem(i, item)) ? prev.filter((i) => !sameItem(i, item)) : [item, ...prev],
    );
  }, []);

  const value = useMemo(() => ({ items, has, toggle }), [items, has, toggle]);

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist(): WatchlistValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist harus dipakai di dalam WatchlistProvider");
  return ctx;
}
