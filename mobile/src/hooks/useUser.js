
// src/hooks/useUsers.js
import { useState, useCallback } from 'react';
import ApiService from '../services/api';

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchUsers = useCallback(async (query, limit = 20) => {
    if (!query || query.length < 2) {
      setUsers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await ApiService.searchUsers(query, limit);
      setUsers(results);
    } catch (err) {
      console.error('Error searching users:', err);
      setError(err.message || 'Failed to search users');
    } finally {
      setLoading(false);
    }
  }, []);

  const getUser = useCallback(async (userId) => {
    setLoading(true);
    setError(null);

    try {
      const user = await ApiService.getUser(userId);
      return user;
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err.message || 'Failed to load user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    setLoading(true);
    setError(null);

    try {
      const updatedUser = await ApiService.updateUserProfile(profileData);
      return updatedUser;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    users,
    loading,
    error,
    searchUsers,
    getUser,
    updateProfile,
  };
};
