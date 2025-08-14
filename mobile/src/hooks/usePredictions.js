// src/hooks/usePredictions.js
import { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/api';

export const usePredictions = (initialParams = {}) => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [params, setParams] = useState({
    status: 'open',
    limit: 20,
    offset: 0,
    ...initialParams,
  });

  const fetchPredictions = useCallback(async (resetData = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const currentParams = resetData ? { ...params, offset: 0 } : params;
      const response = await ApiService.getPredictions(currentParams);
      
      if (resetData) {
        setPredictions(response);
      } else {
        setPredictions(prev => [...prev, ...response]);
      }
      
      setHasMore(response.length >= currentParams.limit);
      
      if (!resetData) {
        setParams(prev => ({ ...prev, offset: prev.offset + prev.limit }));
      }
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err.message || 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, [params, loading]);

  const refreshPredictions = useCallback(async () => {
    setParams(prev => ({ ...prev, offset: 0 }));
    await fetchPredictions(true);
  }, [fetchPredictions]);

  const loadMorePredictions = useCallback(async () => {
    if (hasMore && !loading) {
      await fetchPredictions(false);
    }
  }, [fetchPredictions, hasMore, loading]);

  const updateParams = useCallback((newParams) => {
    setParams(prev => ({ ...prev, ...newParams, offset: 0 }));
  }, []);

  useEffect(() => {
    fetchPredictions(true);
  }, [params.status, params.category]); // Only reset when filters change

  return {
    predictions,
    loading,
    error,
    hasMore,
    params,
    refreshPredictions,
    loadMorePredictions,
    updateParams,
  };
};