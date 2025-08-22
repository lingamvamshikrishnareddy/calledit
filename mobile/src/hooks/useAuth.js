// src/hooks/useAuth.js - FIXED: Simplified and more reliable
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import AuthService from '../services/auth';
import ApiService from '../services/api';

// Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on app start
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔍 useAuth: Initializing auth...');
        
        // Initialize AuthService
        await AuthService.initialize();
        
        // Get current user
        const currentUser = AuthService.getCurrentUser();
        
        if (isMounted) {
          if (currentUser) {
            console.log('✅ useAuth: Found current user:', currentUser.username);
            setUser(currentUser);
            setIsAuthenticated(true);
          } else {
            console.log('❌ useAuth: No current user found');
            setUser(null);
            setIsAuthenticated(false);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ useAuth: Auth initialization failed:', error);
        if (isMounted) {
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to AuthService state changes
  useEffect(() => {
    console.log('📡 useAuth: Setting up auth listener...');
    
    const unsubscribe = AuthService.addAuthStateListener((authData) => {
      console.log('🔄 useAuth: Auth state changed:', authData.type, authData.user?.username || 'No user');
      
      // Update state based on auth data
      if (authData.user && authData.isAuthenticated) {
        setUser(authData.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      
      // Stop loading when we get any auth state update
      if (loading) {
        setLoading(false);
      }
    });

    return () => {
      console.log('📡 useAuth: Cleaning up auth listener...');
      unsubscribe();
    };
  }, [loading]);

  const login = useCallback(async (credentials) => {
    try {
      console.log('🔑 useAuth: Starting login process...');
      setLoading(true);
      
      const response = await AuthService.login(credentials);
      console.log('✅ useAuth: Login successful');
      
      return response;
    } catch (error) {
      console.error('❌ useAuth: Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      console.log('📝 useAuth: Starting registration process...');
      setLoading(true);
      
      const response = await AuthService.register(userData);
      console.log('✅ useAuth: Registration successful');
      
      return response;
    } catch (error) {
      console.error('❌ useAuth: Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('👋 useAuth: Logging out...');
      setLoading(true);
      
      await AuthService.logout();
      console.log('✅ useAuth: Logout complete');
    } catch (error) {
      console.error('❌ useAuth: Logout error:', error);
      // Don't throw error - logout should always succeed locally
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      console.log('🔄 useAuth: Refreshing token...');
      const response = await AuthService.refreshAccessToken();
      console.log('✅ useAuth: Token refreshed successfully');
      return response;
    } catch (error) {
      console.error('❌ useAuth: Token refresh failed:', error);
      throw error;
    }
  }, []);

  const testConnection = useCallback(async () => {
    try {
      console.log('🔌 useAuth: Testing API connection...');
      const response = await ApiService.testConnection();
      console.log('✅ useAuth: Connection test successful:', response);
      return { status: 'connected', data: response };
    } catch (error) {
      console.error('❌ useAuth: Connection test failed:', error);
      return { 
        status: 'failed', 
        error: error.message,
        details: {
          message: error.message,
          code: error.code,
          url: error.config?.url
        }
      };
    }
  }, []);

  const updateUser = useCallback(async (updateData) => {
    try {
      console.log('👤 useAuth: Updating user profile...');
      const updatedUser = await AuthService.updateUserProfile(updateData);
      console.log('✅ useAuth: User profile updated');
      return updatedUser;
    } catch (error) {
      console.error('❌ useAuth: User update error:', error);
      throw error;
    }
  }, []);

  const clearAuth = useCallback(async () => {
    try {
      await AuthService.clearAuthData();
      console.log('🧹 useAuth: Auth data cleared');
    } catch (error) {
      console.error('❌ useAuth: Error clearing auth:', error);
    }
  }, []);

  const value = {
    // Auth state
    isAuthenticated,
    user,
    loading,
    
    // Auth actions
    login,
    register,
    logout,
    refreshToken,
    testConnection,
    updateUser,
    
    // Utility
    clearAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};