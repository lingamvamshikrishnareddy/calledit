// src/services/auth.js - Complete Auth Service
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@auth/access_token',
  REFRESH_TOKEN: '@auth/refresh_token',
  USER_DATA: '@auth/user_data',
};

class AuthService {
  constructor() {
    this.authListeners = [];
    this.currentUser = null;
    this.isInitialized = false;
  }

  // ============ TOKEN MANAGEMENT ============
  async storeTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken || ''],
      ]);
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  // ============ USER DATA MANAGEMENT ============
  async storeUserData(userData) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      this.currentUser = userData;
      this.notifyAuthListeners({ user: userData, isAuthenticated: true });
    } catch (error) {
      console.error('Error storing user data:', error);
      throw error;
    }
  }

  async getUserData() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // ============ AUTHENTICATION STATE ============
  async isLoggedIn() {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  async initializeAuth() {
    if (this.isInitialized) return;
    
    try {
      const userData = await this.getUserData();
      const isAuthenticated = await this.isLoggedIn();
      
      if (userData && isAuthenticated) {
        this.currentUser = userData;
        this.notifyAuthListeners({ user: userData, isAuthenticated: true });
      } else {
        this.currentUser = null;
        this.notifyAuthListeners({ user: null, isAuthenticated: false });
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing auth:', error);
      this.currentUser = null;
      this.notifyAuthListeners({ user: null, isAuthenticated: false });
      this.isInitialized = true;
    }
  }

  // ============ AUTH OPERATIONS ============
  async login(credentials) {
    try {
      // Import ApiService here to avoid circular dependency
      const ApiService = (await import('./api')).default;
      const response = await ApiService.login(credentials);
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      // Import ApiService here to avoid circular dependency
      const ApiService = (await import('./api')).default;
      const response = await ApiService.register(userData);
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.clearAuth();
      this.currentUser = null;
      this.notifyAuthListeners({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  async clearAuth() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  }

  async refreshCurrentUser() {
    try {
      // Import ApiService here to avoid circular dependency
      const ApiService = (await import('./api')).default;
      const userData = await ApiService.getCurrentUser();
      await this.storeUserData(userData);
      return userData;
    } catch (error) {
      console.error('Failed to refresh current user:', error);
      throw error;
    }
  }

  // ============ AUTH LISTENERS ============
  addAuthListener(callback) {
    this.authListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(listener => listener !== callback);
    };
  }

  notifyAuthListeners(authState) {
    this.authListeners.forEach(callback => {
      try {
        callback(authState);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  // ============ TOKEN VALIDATION ============
  async validateToken() {
    try {
      const token = await this.getAccessToken();
      if (!token) return false;

      // Simple token validation - check if it's not expired
      // You might want to implement more sophisticated validation
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  async refreshTokenIfNeeded() {
    try {
      const isValid = await this.validateToken();
      if (!isValid) {
        // Import ApiService here to avoid circular dependency
        const ApiService = (await import('./api')).default;
        await ApiService.refreshToken();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.logout();
      throw error;
    }
  }
}

export default new AuthService();