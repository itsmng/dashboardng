import { useState, useEffect, useCallback, useRef } from '../preact.js';
import { api } from '../config.js';

interface CacheEntry<T = unknown> {
    data: T;
    timestamp: number;
}

interface UseDataFetchOptions<T = unknown> {
    cacheKey?: string;
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    dependencies?: unknown[];
}

interface UseDataFetchResult<T = unknown> {
    data: T | undefined;
    loading: boolean;
    error: string | undefined;
    refetch: (forceRefresh?: boolean) => Promise<T | undefined>;
    invalidate: () => void;
    isCached: boolean;
}

const dataCache = new Map<string, CacheEntry>();

const pendingRequests = new Map<string, Promise<unknown>>();

export const useDataFetch = <T = unknown>(
    endpoint: string,
    params: Record<string, unknown> = {},
    options: UseDataFetchOptions<T> = {}
): UseDataFetchResult<T> => {
    const {
        cacheKey,
        enabled = true,
        refetchInterval,
        staleTime = 30_000,
        onSuccess,
        onError,
        dependencies = []
    } = options;

    const effectiveCacheKey = cacheKey || generateCacheKey(endpoint, params);

    const [data, setData] = useState<T | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);
    const isMounted = useRef(true);

    const fetchData = useCallback(async (forceRefresh = false): Promise<T | undefined> => {
        if (!enabled) {return;}

        const cached = dataCache.get(effectiveCacheKey) as CacheEntry<T> | undefined;
        if (!forceRefresh && cached && (Date.now() - cached.timestamp < staleTime)) {
            if (isMounted.current) {
                setData(cached.data);
                setLoading(false);
                setError(undefined);
            }
            if (onSuccess) {onSuccess(cached.data);}
            return cached.data;
        }

        if (pendingRequests.has(effectiveCacheKey)) {
            return pendingRequests.get(effectiveCacheKey) as Promise<T | undefined>;
        }

        setLoading(true);
        setError(undefined);

        const promise = api.fetch(endpoint, params)
            .then((response) => {
                const result = (response as { data?: T }).data ?? response as T;

                dataCache.set(effectiveCacheKey, {
                    data: result,
                    timestamp: Date.now()
                });

                if (isMounted.current) {
                    setData(result);
                    setLoading(false);
                }

                pendingRequests.delete(effectiveCacheKey);
                if (onSuccess) {onSuccess(result);}
                return result;
            })
            .catch((err: Error) => {
                if (isMounted.current) {
                    setError(err.message);
                    setLoading(false);
                }
                pendingRequests.delete(effectiveCacheKey);
                if (onError) onError(err);
                throw err;
            });

        pendingRequests.set(effectiveCacheKey, promise);
        return promise as Promise<T | undefined>;
    }, [endpoint, effectiveCacheKey, enabled, staleTime, onSuccess, onError, params]);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData, ...dependencies]);

    useEffect(() => {
        if (!refetchInterval) {return;}
        const interval = setInterval(() => fetchData(true), refetchInterval);
        return () => clearInterval(interval);
    }, [refetchInterval, fetchData]);

    const refetch = useCallback(() => fetchData(true), [fetchData]);

    const invalidate = useCallback(() => {
        dataCache.delete(effectiveCacheKey);
    }, [effectiveCacheKey]);

    return {
        data,
        loading,
        error,
        refetch,
        invalidate,
        isCached: dataCache.has(effectiveCacheKey)
    };
};

const generateCacheKey = (endpoint: string, params: Record<string, unknown>): string => {
    const sortedParams = Object.keys(params ?? {})
        .toSorted()
        .map(k => `${k}=${params[k]}`)
        .join('&');
    return `${endpoint}:${sortedParams}`;
};

export const clearAllCache = (): void => dataCache.clear();

export const invalidateEndpoint = (endpoint: string): void => {
    for (const key of dataCache.keys()) {
        if (key.startsWith(endpoint)) {
            dataCache.delete(key);
        }
    }
};

export const invalidatePattern = (pattern: string | RegExp): void => {
    const regex = new RegExp(pattern);
    for (const key of dataCache.keys()) {
        if (regex.test(key)) {
            dataCache.delete(key);
        }
    }
};

export default useDataFetch;
