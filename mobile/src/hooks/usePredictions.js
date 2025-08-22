// src/hooks/usePredictions.js - FIXED: Prevent duplicate predictions
import { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/api';

export const usePredictions = (initialParams = {}) => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [userVotes, setUserVotes] = useState(new Map());
  const [categoryCounts, setCategoryCounts] = useState(new Map());
  const [params, setParams] = useState({
    status: 'active',
    limit: 20,
    offset: 0,
    ...initialParams,
  });

  // FIXED: Helper to deduplicate predictions
  const deduplicatePredictions = useCallback((predictionsList) => {
    if (!Array.isArray(predictionsList)) return [];
    
    const seen = new Set();
    const deduplicated = predictionsList.filter(prediction => {
      if (!prediction || !prediction.id) {
        console.warn('⚠️ Filtering out invalid prediction:', prediction);
        return false;
      }
      
      if (seen.has(prediction.id)) {
        console.warn('⚠️ Filtering out duplicate prediction ID:', prediction.id);
        return false;
      }
      
      seen.add(prediction.id);
      return true;
    });
    
    console.log('🔍 Deduplication result:', {
      original: predictionsList.length,
      deduplicated: deduplicated.length,
      removed: predictionsList.length - deduplicated.length
    });
    
    return deduplicated;
  }, []);

  const fetchPredictions = useCallback(async (resetData = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log('📊 usePredictions: Fetching predictions with params:', resetData ? { ...params, offset: 0 } : params);
      
      const currentParams = resetData ? { ...params, offset: 0 } : params;
      const response = await ApiService.getPredictions(currentParams);
      
      console.log('✅ usePredictions: Got predictions:', response?.length || 0);
      
      // FIXED: Deduplicate before setting state
      const cleanResponse = deduplicatePredictions(response || []);
      
      if (resetData) {
        setPredictions(cleanResponse);
      } else {
        setPredictions(prev => {
          // FIXED: Combine and deduplicate when appending
          const combined = [...prev, ...cleanResponse];
          return deduplicatePredictions(combined);
        });
      }
      
      setHasMore((cleanResponse?.length || 0) >= currentParams.limit);
      
      if (!resetData) {
        setParams(prev => ({ ...prev, offset: prev.offset + prev.limit }));
      }
    } catch (err) {
      console.error('❌ usePredictions: Error fetching predictions:', err);
      setError(err.message || 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, [params, loading, deduplicatePredictions]);

  const refreshPredictions = useCallback(async () => {
    console.log('🔄 usePredictions: Refreshing predictions...');
    setParams(prev => ({ ...prev, offset: 0 }));
    await fetchPredictions(true);
  }, [fetchPredictions]);

  const loadMorePredictions = useCallback(async () => {
    if (hasMore && !loading) {
      console.log('📊 usePredictions: Loading more predictions...');
      await fetchPredictions(false);
    }
  }, [fetchPredictions, hasMore, loading]);

  const updateParams = useCallback((newParams) => {
    console.log('🔧 usePredictions: Updating params:', newParams);
    setParams(prev => ({ ...prev, ...newParams, offset: 0 }));
  }, []);

  const getUserVoteForPrediction = useCallback(async (predictionId, userId) => {
    try {
      console.log('🗳️ usePredictions: Getting user vote for prediction:', predictionId);
      
      const cachedVote = userVotes.get(predictionId);
      if (cachedVote !== undefined) {
        return cachedVote;
      }

      const vote = await ApiService.getUserVoteForPrediction(predictionId, userId);
      
      setUserVotes(prev => new Map(prev).set(predictionId, vote));
      
      console.log('✅ usePredictions: Got user vote:', vote);
      return vote;
    } catch (err) {
      console.error('❌ usePredictions: Error getting user vote:', err);
      return null;
    }
  }, [userVotes]);

  const countPredictionsByCategory = useCallback(async (categoryId) => {
    try {
      console.log('📊 usePredictions: Counting predictions for category:', categoryId);
      
      const cachedCount = categoryCounts.get(categoryId);
      if (cachedCount !== undefined) {
        return cachedCount;
      }

      const count = await ApiService.countPredictionsByCategory(categoryId);
      
      setCategoryCounts(prev => new Map(prev).set(categoryId, count));
      
      console.log('✅ usePredictions: Got category count:', count);
      return count;
    } catch (err) {
      console.error('❌ usePredictions: Error counting predictions:', err);
      return 0;
    }
  }, [categoryCounts]);

  const loadUserVotesForPredictions = useCallback(async (userId, predictionIds = null) => {
    if (!userId) return;

    try {
      console.log('🗳️ usePredictions: Loading user votes for predictions...');
      
      const idsToLoad = predictionIds || predictions.map(p => p.id);
      const votes = await ApiService.getUserVotesForPredictions(idsToLoad, userId);
      
      setUserVotes(prev => {
        const newMap = new Map(prev);
        votes.forEach(vote => {
          newMap.set(vote.prediction_id, vote.vote);
        });
        return newMap;
      });
      
      console.log('✅ usePredictions: Loaded user votes:', votes.length);
    } catch (err) {
      console.error('❌ usePredictions: Error loading user votes:', err);
    }
  }, [predictions]);

  const clearCache = useCallback(() => {
    console.log('🧹 usePredictions: Clearing cache...');
    setUserVotes(new Map());
    setCategoryCounts(new Map());
  }, []);

  // Initial load
  useEffect(() => {
    console.log('🚀 usePredictions: Initial load or params changed');
    fetchPredictions(true);
  }, [params.status, params.category]);

  return {
    predictions,
    loading,
    error,
    hasMore,
    params,
    userVotes,
    categoryCounts,
    fetchPredictions,
    refreshPredictions,
    loadMorePredictions,
    updateParams,
    getUserVoteForPrediction,
    countPredictionsByCategory,
    loadUserVotesForPredictions,
    clearCache,
  };
};