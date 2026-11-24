import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResult } from "../api/client";

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  code: string | null;
  reload: () => void;
}

/**
 * Menjalankan fetcher per kombinasi deps. AbortController dibatalkan saat deps
 * berubah atau komponen dilepas, sehingga respons basi tidak pernah menimpa state.
 */
export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<ApiResult<T>>,
  deps: unknown[],
  enabled = true,
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      setCode(null);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setData(null);
    setLoading(true);
    setError(null);
    setCode(null);

    void fetcherRef.current(controller.signal).then((result: ApiResult<T>) => {
      if (!active) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else if (result.code !== "ABORTED") {
        setError(result.message);
        setCode(result.code);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [...deps, attempt, enabled]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, loading, error, code, reload };
}
