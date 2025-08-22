// src/services/auth.js - COMPLETE FIX: Authentication Service
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
    this.apiService = null; // Will be set dynamically to avoid circular dependency
  }

  // ============ INITIALIZATION ============
  async initialize() {
    console.log('🔧 AuthService: Starting initialization...');
    
    if (this.isInitialized) {
      console.log('✅ AuthService: Already initialized');
      return;
    }
    
    try {
      // Load stored user data and check if logged in
      const userData = await this.getUserData();
      const token = await this.getAccessToken();
      
      console.log('📊 AuthService: Init check -', { 
        hasUserData: !!userData, 
        hasToken: !!token,
        username: userData?.username 
      });
      
      if (userData && token) {
        this.currentUser = userData;
        
        // Set token in API service
        if (this.apiService) {
          this.apiService.setAuthToken(token);
        }
        
        console.log('✅ AuthService: User restored from storage:', userData.username);
        this.notifyAuthListeners({ 
          type: 'RESTORED',
          user: userData, 
          isAuthenticated: true 
        });
      } else {
        this.currentUser = null;
        console.log('❌ AuthService: No valid stored auth');
        this.notifyAuthListeners({ 
          type: 'NO_AUTH',
          user: null, 
          isAuthenticated: false 
        });
      }
      
      this.isInitialized = true;
      console.log('✅ AuthService: Initialization complete');
    } catch (error) {
      console.error('❌ AuthService: Initialization failed:', error);
      this.currentUser = null;
      this.notifyAuthListeners({ 
        type: 'ERROR',
        user: null, 
        isAuthenticated: false 
      });
      this.isInitialized = true;
    }
  }

  // ============ AUTH STATE LISTENERS ============
  addAuthStateListener(callback) {
    console.log('📡 AuthService: Adding auth listener');
    this.authListeners.push(callback);
    
    // Immediately call with current state
    const currentState = {
      type: 'CURRENT',
      user: this.currentUser,
      isAuthenticated: !!this.currentUser
    };
    
    try {
      callback(currentState);
    } catch (error) {
      console.error('❌ AuthService: Error in immediate listener callback:', error);
    }
    
    // Return unsubscribe function
    return () => {
      console.log('📡 AuthService: Removing auth listener');
      this.authListeners = this.authListeners.filter(listener => listener !== callback);
    };
  }

  // FIXED: Add missing addAuthListener method for compatibility
  addAuthListener = this.addAuthStateListener;

  notifyAuthListeners(authState) {
    console.log('📢 AuthService: Notifying listeners:', authState.type, authState.user?.username || 'No user');
    
    this.authListeners.forEach((callback, index) => {
      try {
        callback(authState);
      } catch (error) {
        console.error(`❌ AuthService: Error in auth listener ${index}:`, error);
      }
    });
  }

  // ============ TOKEN MANAGEMENT ============
  async storeTokens(accessToken, refreshToken) {
    try {
      console.log('💾 AuthService: Storing tokens');
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken || ''],
      ]);
      
      // CRITICAL: Set token in API service immediately
      if (this.apiService && accessToken) {
        this.apiService.setAuthToken(accessToken);
        console.log('🔐 AuthService: Token set in API service');
      }
    } catch (error) {
      console.error('❌ AuthService: Error storing tokens:', error);
      throw error;
    }
  }

  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('❌ AuthService: Error getting access token:', error);
      return null;
    }
  }

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('❌ AuthService: Error getting refresh token:', error);
      return null;
    }
  }

  async clearTokens() {
    try {
      console.log('🧹 AuthService: Clearing tokens');
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
      
      // Clear token from API service
      if (this.apiService) {
        this.apiService.clearAuthToken();
      }
    } catch (error) {
      console.error('❌ AuthService: Error clearing tokens:', error);
    }
  }

  // ============ USER DATA MANAGEMENT ============
  async storeUserData(userData) {
    try {
      console.log('💾 AuthService: Storing user data for:', userData.username);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      this.currentUser = userData;
    } catch (error) {
      console.error('❌ AuthService: Error storing user data:', error);
      throw error;
    }
  }

  async getUserData() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('❌ AuthService: Error getting user data:', error);
      return null;
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async clearUserData() {
    try {
      console.log('🧹 AuthService: Clearing user data');
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      this.currentUser = null;
    } catch (error) {
      console.error('❌ AuthService: Error clearing user data:', error);
    }
  }

  // ============ AUTHENTICATION STATE ============
  async isLoggedIn() {
    try {
      const token = await this.getAccessToken();
      const user = await this.getUserData();
      return !!(token && user);
    } catch (error) {
      console.error('❌ AuthService: Error checking login status:', error);
      return false;
    }
  }

  // ============ AUTH OPERATIONS ============
  async login(credentials) {
    try {
      console.log('🔑 AuthService: Starting login for:', credentials.username);
      
      // Import ApiService dynamically to avoid circular dependency
      if (!this.apiService) {
        const ApiService = (await import('./api')).default;
        this.apiService = ApiService;
      }
      
      const response = await this.apiService.login(credentials);
      
      if (response && response.access_token && response.user) {
        console.log('✅ AuthService: Login response received');
        
        // Store tokens and user data
        await this.storeTokens(response.access_token, response.refresh_token);
        await this.storeUserData(response.user);
        
        // Update current user
        this.currentUser = response.user;
        
        // Notify listeners
        this.notifyAuthListeners({ 
          type: 'LOGIN_SUCCESS',
          user: response.user, 
          isAuthenticated: true 
        });
        
        console.log('✅ AuthService: Login complete for:', response.user.username);
        return response;
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('❌ AuthService: Login failed:', error);
      this.notifyAuthListeners({ 
        type: 'LOGIN_FAILED',
        user: null, 
        isAuthenticated: false 
      });
      throw error;
    }
  }

  async register(userData) {
    try {
      console.log('📝 AuthService: Starting registration for:', userData.username);
      
      // Import ApiService dynamically to avoid circular dependency
      if (!this.apiService) {
        const ApiService = (await import('./api')).default;
        this.apiService = ApiService;
      }
      
      const response = await this.apiService.register(userData);
      
      if (response && response.access_token && response.user) {
        console.log('✅ AuthService: Registration response received');
        
        // Store tokens and user data
        await this.storeTokens(response.access_token, response.refresh_token);
        await this.storeUserData(response.user);
        
        // Update current user
        this.currentUser = response.user;
        
        // Notify listeners
        this.notifyAuthListeners({ 
          type: 'REGISTER_SUCCESS',
          user: response.user, 
          isAuthenticated: true 
        });
        
        console.log('✅ AuthService: Registration complete for:', response.user.username);
        return response;
      } else {
        throw new Error('Invalid registration response');
      }
    } catch (error) {
      console.error('❌ AuthService: Registration failed:', error);
      this.notifyAuthListeners({ 
        type: 'REGISTER_FAILED',
        user: null, 
        isAuthenticated: false 
      });
      throw error;
    }
  }

  async logout() {
    try {
      console.log('👋 AuthService: Starting logout...');
      
      // Import ApiService dynamically to avoid circular dependency
      if (!this.apiService) {
        const ApiService = (await import('./api')).default;
        this.apiService = ApiService;
      }
      
      // Try to logout from server (don't fail if this fails)
      try {
        await this.apiService.logout();
      } catch (error) {
        console.warn('⚠️ AuthService: Server logout failed (continuing anyway):', error.message);
      }
      
      // Clear local auth data
      await this.clearAuthData();
      
      // Update current user
      this.currentUser = null;
      
      // Notify listeners
      this.notifyAuthListeners({ 
        type: 'LOGOUT_SUCCESS',
        user: null, 
        isAuthenticated: false 
      });
      
      console.log('✅ AuthService: Logout complete');
    } catch (error) {
      console.error('❌ AuthService: Logout failed:', error);
      
      // Even if logout fails, clear local data
      await this.clearAuthData();
      this.currentUser = null;
      
      this.notifyAuthListeners({ 
        type: 'LOGOUT_FAILED',
        user: null, 
        isAuthenticated: false 
      });
      
      throw error;
    }
  }

  async clearAuthData() {
    try {
      console.log('🧹 AuthService: Clearing all auth data');
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
      this.currentUser = null;
      
      // Clear token from API service
      if (this.apiService) {
        this.apiService.clearAuthToken();
      }
    } catch (error) {
      console.error('❌ AuthService: Error clearing auth data:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      console.log('🔄 AuthService: Refreshing access token...');
      
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Import ApiService dynamically to avoid circular dependency
      if (!this.apiService) {
        const ApiService = (await import('./api')).default;
        this.apiService = ApiService;
      }
      
      const response = await this.apiService.refreshToken(refreshToken);
      
      if (response && response.access_token) {
        console.log('✅ AuthService: Token refreshed successfully');
        
        // Store new tokens
        await this.storeTokens(response.access_token, response.refresh_token);
        
        // Update user data if included
        if (response.user) {
          await this.storeUserData(response.user);
          this.currentUser = response.user;
        }
        
        // Notify listeners
        this.notifyAuthListeners({ 
          type: 'TOKEN_REFRESHED',
          user: this.currentUser, 
          isAuthenticated: true 
        });
        
        return response;
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      console.error('❌ AuthService: Token refresh failed:', error);
      
      // If refresh fails, user needs to login again
      await this.clearAuthData();
      this.notifyAuthListeners({ 
        type: 'TOKEN_EXPIRED',
        user: null, 
        isAuthenticated: false 
      });
      
      throw error;
    }
  }

  async updateUserProfile(updateData) {
    try {
      console.log('👤 AuthService: Updating user profile...');
      
      if (!this.currentUser) {
        throw new Error('No current user');
      }
      
      // Import ApiService dynamically to avoid circular dependency
      if (!this.apiService) {
        const ApiService = (await import('./api')).default;
        this.apiService = ApiService;
      }
      
      const updatedUser = await this.apiService.updateUserProfile(updateData);
      
      if (updatedUser) {
        // Update stored user data
        await this.storeUserData(updatedUser);
        this.currentUser = updatedUser;
        
        // Notify listeners
        this.notifyAuthListeners({ 
          type: 'PROFILE_UPDATED',
          user: updatedUser, 
          isAuthenticated: true 
        });
        
        console.log('✅ AuthService: User profile updated');
        return updatedUser;
      } else {
        throw new Error('Profile update failed');
      }
    } catch (error) {
      console.error('❌ AuthService: Profile update failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new AuthService();