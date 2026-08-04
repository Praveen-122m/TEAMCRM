import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useApi = (apiFunc) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunc(...args);
      setData(result.data || result);
      return result.data || result;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  return { data, error, loading, execute, setData };
};
