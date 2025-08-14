// src/hooks/useAuth.js - Fixed useAuth hook
import { useState, useEffect } from 'react';
import AuthService from '../services/auth';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.addAuthListener(({ user: authUser, isAuthenticated: authState }) => {
      setUser(authUser);
      setIsAuthenticated(authState);
      setLoading(false);
    });

    // Initialize auth state
    const initAuth = async () => {
      try {
        await AuthService.initializeAuth();
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setLoading(false);
      }
    };

    initAuth();

    return unsubscribe;
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const result = await AuthService.login(credentials);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const result = await AuthService.register(userData);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await AuthService.refreshCurrentUser();
      return updatedUser;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };
};