import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "../api/client";

export function useFetch<T>(fetcher: () => Promise<T>, dependencies: readonly unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  const requestIdRef = useRef(0);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const nextData = await fetcherRef.current();
      if (requestId === requestIdRef.current) setData(nextData);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(getApiErrorMessage(requestError));
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    return () => {
      requestIdRef.current += 1;
    };
    // Dependencies are supplied by domain hooks when their resource ID changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, ...dependencies]);

  return { data, isLoading, error, reload };
}
