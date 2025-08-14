

// src/hooks/useLeaderboard.js
import { useState, useCallback } from 'react';
import ApiService from '../services/api';

export const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshLeaderboard = useCallback(async (period = 'weekly', limit = 50) => {
    setLoading(true);
    setError(null);

    try {
      const [leaderboardData, rankData] = await Promise.all([
        ApiService.getLeaderboard(period, limit),
        ApiService.getMyRank(period).catch(() => null),
      ]);

      setLeaderboard(leaderboardData);
      setUserRank(rankData);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshFriendsLeaderboard = useCallback(async (period = 'weekly') => {
    setLoading(true);
    setError(null);

    try {
      const friendsData = await ApiService.getFriendsLeaderboard(period);
      setFriendsLeaderboard(friendsData);
    } catch (err) {
      console.error('Error fetching friends leaderboard:', err);
      setError(err.message || 'Failed to load friends leaderboard');
      // Set empty array as fallback
      setFriendsLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    leaderboard,
    friendsLeaderboard,
    userRank,
    loading,
    error,
    refreshLeaderboard,
    refreshFriendsLeaderboard,
  };
};

