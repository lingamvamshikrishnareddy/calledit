// src/hooks/useVotes.js
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
      const votesData = await ApiService.getMyVotes(limit, offset);
      setVotes(votesData);
    } catch (err) {
      console.error('Error fetching votes:', err);
      setError(err.message || 'Failed to load votes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVoteStatistics = useCallback(async () => {
    try {
      const statsData = await ApiService.getVoteStatistics();
      setStatistics(statsData);
    } catch (err) {
      console.error('Error fetching vote statistics:', err);
      // Don't set error for statistics as it's optional
    }
  }, []);

  const castVote = useCallback(async (voteData) => {
    try {
      const response = await ApiService.castVote(voteData);
      // Refresh votes after successful vote
      await fetchMyVotes();
      return response;
    } catch (err) {
      console.error('Error casting vote:', err);
      throw err;
    }
  }, [fetchMyVotes]);

  const updateVote = useCallback(async (voteId, voteData) => {
    try {
      const response = await ApiService.updateVote(voteId, voteData);
      // Refresh votes after successful update
      await fetchMyVotes();
      return response;
    } catch (err) {
      console.error('Error updating vote:', err);
      throw err;
    }
  }, [fetchMyVotes]);

  const deleteVote = useCallback(async (voteId) => {
    try {
      await ApiService.deleteVote(voteId);
      // Remove vote from local state
      setVotes(prev => prev.filter(vote => vote.id !== voteId));
    } catch (err) {
      console.error('Error deleting vote:', err);
      throw err;
    }
  }, []);

  return {
    votes,
    statistics,
    loading,
    error,
    fetchMyVotes,
    fetchVoteStatistics,
    castVote,
    updateVote,
    deleteVote,
  };
};
