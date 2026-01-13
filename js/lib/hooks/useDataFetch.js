import { useState, useEffect, useCallback, useRef } from '../preact.js';
import { api } from '../config.js';

/** @type {Map<string, CacheEntry>} */
const dataCache = new Map();

/** @type {Map<string, Promise<any>>} */
const pendingRequests = new Map();

/**
 * Shared data fetcher hook with caching and request deduplication.
 *
 * @param {string} endpoint - API endpoint to fetch
 * @param {Object} [params={}] - Query parameters
 * @param {UseDataFetchOptions} [options={}] - Configuration options
 * @returns {UseDataFetchResult} { data, loading, error, refetch, invalidate, isCached }
 * @example
 * const { data, loading, error, refetch } = useDataFetch('/tickets', { status: 'open' }, {
 *   refetchInterval: 60000,
 *   staleTime: 30000
 * });
 */
export const useDataFetch = (endpoint, params = {}, options = {}) => {
export const useDataFetch = (endpoint, params = {}, options = {}) => {
    const {
        cacheKey = null,
        enabled = true,
        refetchInterval = null,
        staleTime = 30000,
        onSuccess = null,
        onError = null,
        dependencies = []
    } = options;

    const effectiveCacheKey = cacheKey || generateCacheKey(endpoint, params);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const lastFetchTime = useRef(null);
    const isMounted = useRef(true);

    const fetchData = useCallback(async (forceRefresh = false) => {
        if (!enabled) return;

        const cached = dataCache.get(effectiveCacheKey);
        if (!forceRefresh && cached && (Date.now() - cached.timestamp < staleTime)) {
            if (isMounted.current) {
                setData(cached.data);
                setLoading(false);
                setError(null);
            }
            if (onSuccess) onSuccess(cached.data);
            return cached.data;
        }

        if (pendingRequests.has(effectiveCacheKey)) {
            return pendingRequests.get(effectiveCacheKey);
        }

        setLoading(true);
        setError(null);

        const promise = api.fetch(endpoint, params)
            .then(response => {
                const result = response.data ?? response;

                dataCache.set(effectiveCacheKey, {
                    data: result,
                    timestamp: Date.now()
                });

                if (isMounted.current) {
                    setData(result);
                    setLoading(false);
                }

                pendingRequests.delete(effectiveCacheKey);
                if (onSuccess) onSuccess(result);
                return result;
            })
            .catch(err => {
                if (isMounted.current) {
                    setError(err.message);
                    setLoading(false);
                }
                pendingRequests.delete(effectiveCacheKey);
                if (onError) onError(err);
                throw err;
            });

        pendingRequests.set(effectiveCacheKey, promise);
        return promise;
    }, [endpoint, effectiveCacheKey, enabled, staleTime, onSuccess, onError, params]);

    // Cleanup on unmount
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
        if (!refetchInterval) return;
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

/**
 * Generate a cache key from endpoint and params
 * @private
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {string} Generated cache key
 */
const generateCacheKey = (endpoint, params) => {
    const sortedParams = Object.keys(params ?? {})
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&');
    return `${endpoint}:${sortedParams}`;
};

/**
 * Clear all cached data
 * @returns {void}
 */
export const clearAllCache = () => dataCache.clear();

/**
 * Invalidate all cache entries for a specific endpoint
 * @param {string} endpoint - Endpoint prefix to invalidate
 * @returns {void}
 */
export const invalidateEndpoint = (endpoint) => {
    for (const key of dataCache.keys()) {
        if (key.startsWith(endpoint)) {
            dataCache.delete(key);
        }
    }
};

/**
 * Invalidate cache entries matching a pattern
 * @param {string|RegExp} pattern - Pattern to match cache keys
 * @returns {void}
 */
export const invalidatePattern = (pattern) => {
    const regex = new RegExp(pattern);
    for (const key of dataCache.keys()) {
        if (regex.test(key)) {
            dataCache.delete(key);
        }
    }
};

export default useDataFetch;

// ========================================
// Type Definitions
// ========================================

/**
 * @typedef {Object} CacheEntry
 * @property {*} data - Cached data
 * @property {number} timestamp - Cache entry timestamp (Unix ms)
 */

/**
 * @typedef {Object} UseDataFetchOptions
 * @property {string|null} [cacheKey] - Custom cache key (auto-generated if not provided)
 * @property {boolean} [enabled=true] - Whether fetching is enabled
 * @property {number|null} [refetchInterval] - Auto-refetch interval in ms
 * @property {number} [staleTime=30000] - Cache validity duration in ms
 * @property {function(*): void} [onSuccess] - Callback on successful fetch
 * @property {function(Error): void} [onError] - Callback on error
 * @property {Array} [dependencies=[]] - Additional dependencies for refetching
 */

/**
 * @typedef {Object} UseDataFetchResult
 * @property {*} data - Fetched data
 * @property {boolean} loading - Loading state
 * @property {string|null} error - Error message if failed
 * @property {function(boolean): Promise<*>} refetch - Function to manually refetch data
 * @property {function(): void} invalidate - Function to invalidate cache entry
 * @property {boolean} isCached - Whether data is from cache
 */
