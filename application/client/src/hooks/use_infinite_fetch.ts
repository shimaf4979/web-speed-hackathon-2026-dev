import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_LIMIT = 30;

interface ReturnValues<T> {
  data: Array<T>;
  error: Error | null;
  isLoading: boolean;
  fetchMore: () => void;
}

interface Options {
  pageSize?: number;
  serverPagination?: boolean;
  prefetchKey?: string;
}

declare global {
  interface Window {
    __PREFETCH_TIMELINE__?: Promise<unknown[]>;
  }
}

function consumePrefetch<T>(key: string): Promise<T[]> | null {
  if (key === "__PREFETCH_TIMELINE__" && window.__PREFETCH_TIMELINE__) {
    const p = window.__PREFETCH_TIMELINE__ as Promise<T[]>;
    window.__PREFETCH_TIMELINE__ = undefined;
    return p;
  }
  return null;
}

export function useInfiniteFetch<T>(
  apiPath: string,
  fetcher: (apiPath: string) => Promise<T[]>,
  options?: Options,
): ReturnValues<T> {
  const internalRef = useRef({ hasReachedEnd: false, isLoading: false, offset: 0 });
  const pageSize = options?.pageSize ?? DEFAULT_LIMIT;
  const serverPagination = options?.serverPagination === true;
  const prefetchKey = options?.prefetchKey;

  const [result, setResult] = useState<Omit<ReturnValues<T>, "fetchMore">>({
    data: [],
    error: null,
    isLoading: true,
  });

  const fetchMore = useCallback(() => {
    const { hasReachedEnd, isLoading, offset } = internalRef.current;
    if (apiPath === "" || isLoading || hasReachedEnd) {
      return;
    }

    setResult((cur) => ({
      ...cur,
      isLoading: true,
    }));
    internalRef.current = {
      hasReachedEnd,
      isLoading: true,
      offset,
    };

    const prefetched = offset === 0 && prefetchKey ? consumePrefetch<T>(prefetchKey) : null;
    const dataPromise = prefetched ?? (() => {
      const requestPath = serverPagination
        ? `${apiPath}${apiPath.includes("?") ? "&" : "?"}limit=${pageSize}&offset=${offset}`
        : apiPath;
      return fetcher(requestPath);
    })();

    void dataPromise.then(
      (items) => {
        const nextItems = serverPagination ? items : items.slice(offset, offset + pageSize);
        setResult((cur) => ({
          ...cur,
          data: [...cur.data, ...nextItems],
          error: null,
          isLoading: false,
        }));
        internalRef.current = {
          hasReachedEnd: nextItems.length < pageSize,
          isLoading: false,
          offset: offset + nextItems.length,
        };
      },
      (error) => {
        setResult((cur) => ({
          ...cur,
          error,
          isLoading: false,
        }));
        internalRef.current = {
          hasReachedEnd,
          isLoading: false,
          offset,
        };
      },
    );
  }, [apiPath, fetcher, pageSize, prefetchKey]);

  useEffect(() => {
    if (apiPath === "") {
      setResult(() => ({
        data: [],
        error: null,
        isLoading: false,
      }));
      internalRef.current = {
        hasReachedEnd: true,
        isLoading: false,
        offset: 0,
      };
      return;
    }

    setResult(() => ({
      data: [],
      error: null,
      isLoading: true,
    }));
    internalRef.current = {
      hasReachedEnd: false,
      isLoading: false,
      offset: 0,
    };

    fetchMore();
  }, [fetchMore]);

  return {
    ...result,
    fetchMore,
  };
}
