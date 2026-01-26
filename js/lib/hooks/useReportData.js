/**
 * UseReportData - Custom hook for fetching and managing report data
 * Provides standardized loading/error states and data fetching logic for all report components
 *
 * @module useReportData
 */

import { useState, useEffect, useCallback } from '../preact.js';
import { api } from '../config.js';

/**
 * Hook for fetching report data with standardized loading/error states
 *
 * @param {string} endpoint - API endpoint to fetch data from (e.g., '/reports/overview')
 * @param {Object} params - Query parameters to pass to the API
 * @returns {UseReportDataResult} Object containing data, loading, error, and loadData function
 */
export function useReportData(endpoint, params = {}) {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(undefined);

  const paramsKey = JSON.stringify(params);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await api.fetch(endpoint, params);
      setData(result.data ?? result);
    } catch (error) {
      setError(error.message);
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

/**
 * @typedef {Object} UseReportDataResult
 * @property {*} data - The fetched data from the API
 * @property {boolean} loading - Whether data is currently being loaded
 * @property {string|null} error - Error message if fetch failed, null otherwise
 * @property {function(): void} loadData - Function to manually reload the data
 */

export default useReportData;
