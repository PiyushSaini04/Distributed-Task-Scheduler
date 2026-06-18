import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../services/api';

interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs = 5000,
  enabled = true,
  deps: unknown[] = [],
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);

  fetcherRef.current = fetcher;

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    load(true);
    const id = setInterval(() => load(false), intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, intervalMs, enabled, ...deps]);

  return { data, loading, error, refresh: () => load(true) };
}
