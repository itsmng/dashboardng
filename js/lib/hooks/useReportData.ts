/**
 * UseReportData - Custom hook for fetching and managing report data
 * Provides standardized loading/error states and data fetching logic for all report components
 *
 * @module useReportData
 */

import { useState, useEffect, useCallback } from '../preact.js';
import { api } from '../config.js';

export interface UseReportDataResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  loadData: () => Promise<void>;
}

export function useReportData<T = unknown>(
  endpoint: string,
  params: Record<string, unknown> = {}
): UseReportDataResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const paramsKey = JSON.stringify(params);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.fetch(endpoint, params);
      setData((result.data ?? result) as T);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [endpoint, paramsKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    loadData,
  };
}

export default useReportData;
