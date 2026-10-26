import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { enrollmentsApi } from "../api/endpoints";
import type { Enrollment } from "../api/types";

const PAGE_SIZE = 20;

interface EnrollmentDirectoryOptions {
  enabled: boolean;
  search: string;
  subjectId?: string;
  periodId?: string;
  excludeCancelled?: boolean;
}

export function useEnrollmentDirectory({
  enabled,
  search,
  subjectId,
  periodId,
  excludeCancelled = false,
}: EnrollmentDirectoryOptions) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const [refreshKey, setRefreshKey] = useState(0);
  const requestIdRef = useRef(0);
  const filters = { student_search: debouncedSearch, subject_id: subjectId, period_id: periodId, exclude_cancelled: excludeCancelled };
  const isSearchReady = search.trim().length === 0 || search.trim().length >= 2;

  useEffect(() => {
    const normalized = search.trim();
    if (!normalized) {
      setDebouncedSearch("");
      return;
    }
    const timeout = window.setTimeout(() => setDebouncedSearch(normalized), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!enabled || !isSearchReady) {
      setEnrollments([]);
      setHasMore(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    void enrollmentsApi.list(0, PAGE_SIZE + 1, filters).then((response) => {
      if (requestId !== requestIdRef.current) return;
      setEnrollments(response.data.slice(0, PAGE_SIZE));
      setHasMore(response.data.length > PAGE_SIZE);
    }).catch((requestError: unknown) => {
      if (requestId === requestIdRef.current) setError(getApiErrorMessage(requestError));
    }).finally(() => {
      if (requestId === requestIdRef.current) setIsLoading(false);
    });

    return () => {
      requestIdRef.current += 1;
    };
    // The serialized filter fields keep requests stable while this hook's state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, debouncedSearch, subjectId, periodId, excludeCancelled, isSearchReady, refreshKey]);

  const loadMore = useCallback(async () => {
    if (!enabled || !hasMore || isLoadingMore || !isSearchReady) return;
    const requestId = ++requestIdRef.current;
    setIsLoadingMore(true);
    setError(null);
    try {
      const response = await enrollmentsApi.list(enrollments.length, PAGE_SIZE + 1, filters);
      if (requestId !== requestIdRef.current) return;
      setEnrollments((current) => [...current, ...response.data.slice(0, PAGE_SIZE)]);
      setHasMore(response.data.length > PAGE_SIZE);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setError(getApiErrorMessage(requestError));
    } finally {
      if (requestId === requestIdRef.current) setIsLoadingMore(false);
    }
  }, [enabled, hasMore, isLoadingMore, isSearchReady, enrollments.length, filters]);

  const reload = useCallback(() => setRefreshKey((current) => current + 1), []);

  return { enrollments, isLoading: isLoading || (search.trim() !== debouncedSearch), isLoadingMore, error, hasMore, loadMore, reload, isSearchReady };
}
