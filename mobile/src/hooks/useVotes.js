// src/hooks/useVotes.js - FIXED: Complete useVotes hook
import { useState, useCallback } from 'react';
import ApiService from '../services/api';

export const useVotes = () => {
  const [votes, setVotes] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMyVotes = useCallback(async (limit = 50, offset = 0) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📊 useVotes: Fetching user votes...');
      const votesData = await ApiService.getMyVotes(limit, offset);
      setVotes(votesData);
      console.log('✅ useVotes: Fetched', votesData?.length || 0, 'votes');
      return votesData;
    } catch (err) {
      console.error('❌ useVotes: Error fetching votes:', err);
      const errorMessage = err.message || 'Failed to load votes';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVoteStatistics = useCallback(async () => {
    try {
      console.log('📈 useVotes: Fetching vote statistics...');
      const statsData = await ApiService.getVoteStatistics();
      setStatistics(statsData);
      console.log('✅ useVotes: Got statistics:', statsData);
      return statsData;
    } catch (err) {
      console.error('❌ useVotes: Error fetching vote statistics:', err);
      // Don't set error for statistics as it's optional
      return null;
    }
  }, []);

  const castVote = useCallback(async (voteData) => {
    if (loading) {
      console.warn('⚠️ useVotes: Vote already in progress');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🗳️ useVotes: Casting vote...', voteData);
      
      // Validate vote data
      if (!voteData.prediction_id && !voteData.predictionId) {
        throw new Error('Prediction ID is required');
      }
      
      if (voteData.vote === undefined || voteData.vote === null) {
        throw new Error('Vote value is required');
      }

      // Normalize the vote data
      const normalizedVoteData = {
        prediction_id: voteData.prediction_id || voteData.predictionId,
        vote: voteData.vote,
        confidence: voteData.confidence || 75
      };

      const response = await ApiService.castVote(normalizedVoteData);
      console.log('✅ useVotes: Vote cast successfully:', response);
      
      // Optionally refresh votes after successful vote
      // You can uncomment this if you want to auto-refresh
      // await fetchMyVotes();
      
      return response;
    } catch (err) {
      console.error('❌ useVotes: Error casting vote:', err);
      const errorMessage = err.message || 'Failed to cast vote';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const updateVote = useCallback(async (voteId, voteData) => {
    if (loading) {
      console.warn('⚠️ useVotes: Vote update already in progress');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 useVotes: Updating vote...', voteId, voteData);
      
      // Validate inputs
      if (!voteId) {
        throw new Error('Vote ID is required');
      }

      const response = await ApiService.updateVote(voteId, voteData);
      console.log('✅ useVotes: Vote updated successfully:', response);
      
      // Update the vote in local state
      setVotes(prev => prev.map(vote => 
        vote.id === voteId 
          ? { ...vote, ...response } 
          : vote
      ));

      return response;
    } catch (err) {
      console.error('❌ useVotes: Error updating vote:', err);
      const errorMessage = err.message || 'Failed to update vote';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const deleteVote = useCallback(async (voteId) => {
    if (loading) {
      console.warn('⚠️ useVotes: Vote deletion already in progress');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🗑️ useVotes: Deleting vote...', voteId);
      
      // Validate input
      if (!voteId) {
        throw new Error('Vote ID is required');
      }

      await ApiService.deleteVote(voteId);
      console.log('✅ useVotes: Vote deleted successfully');
      
      // Remove vote from local state
      setVotes(prev => prev.filter(vote => vote.id !== voteId));
      
      return true;
    } catch (err) {
      console.error('❌ useVotes: Error deleting vote:', err);
      const errorMessage = err.message || 'Failed to delete vote';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const getUserVoteForPrediction = useCallback(async (predictionId) => {
    try {
      console.log('🔍 useVotes: Getting user vote for prediction:', predictionId);
      
      // Validate input
      if (!predictionId) {
        throw new Error('Prediction ID is required');
      }

      const voteData = await ApiService.getUserVoteForPrediction(predictionId);
      console.log('✅ useVotes: Got user vote:', voteData);
      return voteData;
    } catch (err) {
      console.error('❌ useVotes: Error getting user vote:', err);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshVotes = useCallback(async () => {
    return await fetchMyVotes();
  }, [fetchMyVotes]);

  const clearVotes = useCallback(() => {
    setVotes([]);
    setStatistics(null);
    setError(null);
  }, []);

  // Utility function to check if user has voted on a prediction
  const hasVotedOnPrediction = useCallback((predictionId) => {
    return votes.some(vote => 
      vote.prediction_id === predictionId || 
      vote.prediction?.id === predictionId
    );
  }, [votes]);

  // Utility function to get user's vote for a specific prediction from local state
  const getLocalVoteForPrediction = useCallback((predictionId) => {
    return votes.find(vote => 
      vote.prediction_id === predictionId || 
      vote.prediction?.id === predictionId
    );
  }, [votes]);

  return {
    // State
    votes,
    statistics,
    loading,
    error,
    
    // Actions
    fetchMyVotes,
    fetchVoteStatistics,
    castVote,
    updateVote,
    deleteVote,
    getUserVoteForPrediction,
    clearError,
    refreshVotes,
    clearVotes,
    
    // Utility functions
    hasVotedOnPrediction,
    getLocalVoteForPrediction,
  };
};