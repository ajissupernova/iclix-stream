interface CacheEntry {
  data: unknown;
  freshUntil: number;
  staleUntil: number;
}

const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 500;

export interface CacheHit {
  data: unknown;
  /** Lewat masa segar, masih boleh dipakai saat upstream gagal. */
  stale: boolean;
}

export function cacheGet(key: string): CacheHit | null {
  const entry = store.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.staleUntil) {
    store.delete(key);
    return null;
  }
  store.delete(key);
  store.set(key, entry);
  return { data: entry.data, stale: now > entry.freshUntil };
}

export function cacheSet(key: string, data: unknown, ttlMs: number): void {
  const now = Date.now();
  store.set(key, {
    data,
    freshUntil: now + ttlMs,
    // Data lama tetap disimpan sebagai jaring pengaman saat TMDb bermasalah.
    staleUntil: now + ttlMs + 7 * 24 * 60 * 60_000,
  });
  if (store.size > MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
}
