// services/api.js - FIXED: Added balance refresh and user data sync
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Network configuration
const NETWORK_CONFIG = {
  ANDROID_EMULATOR_IP: '10.0.2.2',
  COMPUTER_IP: '192.168.16.20',
  FALLBACK_IPS: ['192.168.1.20', '192.168.0.20', '10.0.0.20', 'localhost', '127.0.0.1'],
  PORT: 8000,
  PRODUCTION_URL: 'https://your-production-api.com'
};

class NetworkManager {
  constructor() {
    this.workingBaseUrl = null;
    this.lastSuccessfulUrl = null;
  }

  async findWorkingApiUrl() {
    console.log('🔍 Finding working API URL...');

    if (!__DEV__) {
      return NETWORK_CONFIG.PRODUCTION_URL;
    }

    if (this.workingBaseUrl && await this.testConnection(this.workingBaseUrl)) {
      return this.workingBaseUrl;
    }

    const urlsToTest = this.buildUrlsToTest();
    
    for (const url of urlsToTest) {
      if (await this.testConnection(url)) {
        console.log(`✅ Found working URL: ${url}`);
        this.workingBaseUrl = url;
        this.lastSuccessfulUrl = url;
        
        try {
          await AsyncStorage.setItem('@network/last_working_url', url);
        } catch (error) {
          console.warn('Could not store working URL:', error);
        }
        
        return url;
      }
    }

    console.error('❌ No working URL found');
    return this.getFallbackUrl();
  }

  buildUrlsToTest() {
    const platform = Platform.OS;
    const isPhysicalDevice = this.detectPhysicalDevice();
    const urlsToTest = [];

    if (platform === 'android') {
      if (isPhysicalDevice) {
        urlsToTest.push(`http://${NETWORK_CONFIG.COMPUTER_IP}:${NETWORK_CONFIG.PORT}`);
        NETWORK_CONFIG.FALLBACK_IPS.forEach(ip => {
          if (ip !== 'localhost' && ip !== '127.0.0.1') {
            urlsToTest.push(`http://${ip}:${NETWORK_CONFIG.PORT}`);
          }
        });
      } else {
        urlsToTest.push(`http://${NETWORK_CONFIG.ANDROID_EMULATOR_IP}:${NETWORK_CONFIG.PORT}`);
        urlsToTest.push(`http://${NETWORK_CONFIG.COMPUTER_IP}:${NETWORK_CONFIG.PORT}`);
      }
    } else if (platform === 'ios') {
      if (isPhysicalDevice) {
        urlsToTest.push(`http://${NETWORK_CONFIG.COMPUTER_IP}:${NETWORK_CONFIG.PORT}`);
        NETWORK_CONFIG.FALLBACK_IPS.forEach(ip => {
          if (ip !== 'localhost' && ip !== '127.0.0.1') {
            urlsToTest.push(`http://${ip}:${NETWORK_CONFIG.PORT}`);
          }
        });
      } else {
        urlsToTest.push(`http://localhost:${NETWORK_CONFIG.PORT}`);
        urlsToTest.push(`http://127.0.0.1:${NETWORK_CONFIG.PORT}`);
        urlsToTest.push(`http://${NETWORK_CONFIG.COMPUTER_IP}:${NETWORK_CONFIG.PORT}`);
      }
    }

    return urlsToTest;
  }

  detectPhysicalDevice() {
    const platform = Platform.OS;
    const isPhysicalDevice = Constants.isDevice === true;
    const isAndroidEmulator = platform === 'android' && !Constants.isDevice;
    const isIOSSimulator = platform === 'ios' && !Constants.isDevice;

    return isPhysicalDevice && !isAndroidEmulator && !isIOSSimulator;
  }

  getFallbackUrl() {
    const platform = Platform.OS;
    return platform === 'android' 
      ? `http://${NETWORK_CONFIG.ANDROID_EMULATOR_IP}:${NETWORK_CONFIG.PORT}`
      : `http://${NETWORK_CONFIG.COMPUTER_IP}:${NETWORK_CONFIG.PORT}`;
  }

  async testConnection(baseUrl, timeout = 5000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Create network manager instance
const networkManager = new NetworkManager();

// API service class
class ApiService {
  constructor() {
    this.api = null;
    this.authToken = null;
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    const baseURL = await networkManager.findWorkingApiUrl();
    this.api = axios.create({
      baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
    this.initialized = true;
    console.log('✅ API Service initialized with:', baseURL);
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const storedToken = await AsyncStorage.getItem('@auth/access_token');
          if (storedToken && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${storedToken}`;
            this.authToken = storedToken;
          }
        } catch (error) {
          console.error('Error getting token from storage:', error);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle network errors
        if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          networkManager.workingBaseUrl = null;
          const newBaseUrl = await networkManager.findWorkingApiUrl();
          
          if (newBaseUrl !== this.api.defaults.baseURL) {
            this.api.defaults.baseURL = newBaseUrl;
            return this.api(originalRequest);
          }
          
          throw new Error('Cannot connect to server. Please check your network connection.');
        }

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const errorDetail = error.response?.data?.detail;
          if (errorDetail && (errorDetail.includes('expired') || errorDetail.includes('Invalid token'))) {
            try {
              if (this.isRefreshing) {
                await this.refreshPromise;
              } else {
                this.isRefreshing = true;
                this.refreshPromise = this.attemptTokenRefresh();
                await this.refreshPromise;
              }

              const newToken = await AsyncStorage.getItem('@auth/access_token');
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.api(originalRequest);
              }
            } catch (refreshError) {
              await this.clearAuthData();
              throw new Error('Authentication expired. Please log in again.');
            } finally {
              this.isRefreshing = false;
              this.refreshPromise = null;
            }
          }
        }

        // Handle other errors
        if (error.response?.status === 404) {
          throw new Error(error.response?.data?.message || 'Resource not found');
        }

        if (error.response?.status === 422) {
          const details = error.response?.data?.details || error.response?.data?.detail;
          throw new Error(details || 'Validation error');
        }

        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        }

        throw new Error(error.message || 'Request failed');
      }
    );
  }

  async attemptTokenRefresh() {
    try {
      const refreshToken = await AsyncStorage.getItem('@auth/refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const baseURL = await networkManager.findWorkingApiUrl();
      const response = await axios.post(`${baseURL}/api/auth/refresh`, {
        refresh_token: refreshToken
      });

      if (response.data?.access_token) {
        await AsyncStorage.multiSet([
          ['@auth/access_token', response.data.access_token],
          ['@auth/refresh_token', response.data.refresh_token || refreshToken],
        ]);

        if (response.data.user) {
          await AsyncStorage.setItem('@auth/user_data', JSON.stringify(response.data.user));
        }

        this.setAuthToken(response.data.access_token);
        return response.data;
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      console.error('Token refresh failed:', error.message);
      throw error;
    }
  }

  async clearAuthData() {
    try {
      await AsyncStorage.multiRemove([
        '@auth/access_token',
        '@auth/refresh_token',
        '@auth/user_data',
      ]);
      this.clearAuthToken();
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  setAuthToken(token) {
    this.authToken = token;
    if (this.api && token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else if (this.api) {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  clearAuthToken() {
    this.authToken = null;
    if (this.api) {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // Auth endpoints
  async register(userData) {
    await this.ensureInitialized();
    const response = await this.api.post('/api/auth/register', {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      display_name: userData.display_name || userData.username,
    });

    if (response.data?.access_token) {
      this.setAuthToken(response.data.access_token);
    }

    return response.data;
  }

  async login(credentials) {
    await this.ensureInitialized();
    const response = await this.api.post('/api/auth/login', {
      username: credentials.username,
      password: credentials.password,
    });

    if (response.data?.access_token) {
      this.setAuthToken(response.data.access_token);
    }

    return response.data;
  }

  async logout() {
    await this.ensureInitialized();
    try {
      await this.api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error.message);
    } finally {
      this.clearAuthToken();
    }
  }

  async getCurrentUser() {
    await this.ensureInitialized();
    const response = await this.api.get('/api/auth/me');
    return response.data;
  }

  // FIXED: Add method to refresh user data with latest balance
  async refreshUserData() {
    await this.ensureInitialized();
    try {
      console.log('🔄 Refreshing user data from server...');
      const response = await this.api.get('/api/auth/me');
      
      // Update cached user data
      await AsyncStorage.setItem('@auth/user_data', JSON.stringify(response.data));
      
      console.log('✅ User data refreshed:', {
        username: response.data.username,
        points: response.data.total_points
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);
      throw error;
    }
  }

  // Vote endpoints
  async castVote(voteData) {
    await this.ensureInitialized();
    
    const apiVoteData = {
      prediction_id: voteData.prediction_id ? voteData.prediction_id.toString() : voteData.predictionId?.toString(),
      vote: voteData.vote,
      confidence: voteData.confidence || 75
    };

    if (!apiVoteData.prediction_id) {
      throw new Error('Prediction ID is required');
    }

    if (apiVoteData.vote === undefined || apiVoteData.vote === null) {
      throw new Error('Vote value is required');
    }

    console.log('🗳️ Casting vote:', apiVoteData);
    const response = await this.api.post('/api/votes/', apiVoteData);
    console.log('✅ Vote response:', response.data);
    
    return response.data;
  }

  async getMyVotes(limit = 50, offset = 0) {
    await this.ensureInitialized();
    console.log(`📊 Fetching votes: limit=${limit}, offset=${offset}`);
    const response = await this.api.get('/api/votes/my-votes', {
      params: { limit, offset }
    });
    console.log(`✅ Received ${response.data?.length || 0} votes`);
    return response.data || [];
  }

  async getUserVoteForPrediction(predictionId) {
    await this.ensureInitialized();
    try {
      const response = await this.api.get(`/api/votes/user/${predictionId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getVoteStatistics() {
    await this.ensureInitialized();
    try {
      const response = await this.api.get('/api/votes/my-stats');
      return response.data;
    } catch (error) {
      return {
        total_votes: 0,
        active_votes: 0,
        resolved_votes: 0,
        correct_votes: 0,
        accuracy_rate: 0,
        win_rate: 0,
        average_confidence: 0,
        current_streak: 0,
        longest_streak: 0,
        total_points_earned: 0,
        total_points_spent: 0
      };
    }
  }

  // Prediction endpoints
  async getPredictions(filters = {}) {
    await this.ensureInitialized();
    const params = {};
    
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    if (filters.limit) params.limit = filters.limit;
    if (filters.offset !== undefined) params.offset = filters.offset;
    if (filters.sort_by) params.sort_by = filters.sort_by;
    if (filters.sort_order) params.sort_order = filters.sort_order;

    const response = await this.api.get('/api/predictions/', { params });
    return response.data || [];
  }

  async getPrediction(predictionId) {
    await this.ensureInitialized();
    const response = await this.api.get(`/api/predictions/${predictionId}`);
    return response.data;
  }

  async createPrediction(predictionData) {
    await this.ensureInitialized();
    const response = await this.api.post('/api/predictions/', {
      title: predictionData.title,
      description: predictionData.description,
      category_id: predictionData.category_id,
      closes_at: predictionData.closes_at
    });
    return response.data;
  }

  async getCategories() {
    await this.ensureInitialized();
    try {
      const response = await this.api.get('/api/predictions/categories');
      return response.data;
    } catch (error) {
      // Return fallback categories
      return [
        { id: 'sports', name: '⚽ Sports', icon_name: 'football' },
        { id: 'pop_culture', name: '🎭 Pop Culture', icon_name: 'musical-notes' },
        { id: 'entertainment', name: '🎬 TV & Movies', icon_name: 'tv' },
        { id: 'social_media', name: '📱 Social Drama', icon_name: 'phone-portrait' },
        { id: 'trending', name: '🔥 Viral', icon_name: 'flame' },
        { id: 'other', name: '🤔 Other', icon_name: 'help-circle' },
      ];
    }
  }

  // Points endpoints
  async getPointsBalance() {
    await this.ensureInitialized();
    try {
      console.log('💰 Fetching points balance...');
      const response = await this.api.get('/api/points/balance');
      const balance = response.data?.balance || 0;
      console.log(`✅ Current balance: ${balance}`);
      return balance;
    } catch (error) {
      console.error('❌ Failed to fetch balance:', error);
      return 0;
    }
  }

  // FIXED: Add method to get full user stats including balance
  async getUserStats() {
    await this.ensureInitialized();
    try {
      console.log('📊 Fetching user stats...');
      const response = await this.api.get('/api/points/stats');
      console.log('✅ User stats:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch user stats:', error);
      throw error;
    }
  }

  async claimDailyBonus() {
    await this.ensureInitialized();
    try {
      const response = await this.api.post('/api/points/daily-bonus');
      return {
        success: response.data.success,
        bonus_amount: response.data.bonus_amount,
        new_balance: response.data.new_balance,
        points_earned: response.data.bonus_amount,
        error: response.data.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to claim daily bonus'
      };
    }
  }

  async canClaimDailyBonus() {
    await this.ensureInitialized();
    try {
      const response = await this.api.get('/api/points/can-claim-bonus');
      return response.data.can_claim;
    } catch (error) {
      return false;
    }
  }

  async getPointsHistory(limit = 20) {
    await this.ensureInitialized();
    try {
      const response = await this.api.get('/api/points/transactions', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      return [];
    }
  }

  // Leaderboard endpoints
  async getLeaderboard(timeframe = 'all_time', limit = 50) {
    await this.ensureInitialized();
    const response = await this.api.get('/api/leaderboard', {
      params: { period: timeframe, limit }
    });
    return response.data;
  }

  async getMyRank(timeframe = 'all_time') {
    await this.ensureInitialized();
    const response = await this.api.get('/api/leaderboard/my-rank', {
      params: { period: timeframe }
    });
    return response.data;
  }

  // User endpoints
  async getUser(userId) {
    await this.ensureInitialized();
    const response = await this.api.get(`/api/users/${userId}`);
    return response.data;
  }

  async updateProfile(profileData) {
    await this.ensureInitialized();
    const response = await this.api.put('/api/users/profile', profileData);
    return response.data;
  }

  // Utility methods
  async testConnection() {
    await this.ensureInitialized();
    const response = await this.api.get('/health');
    return response.data;
  }

  async refreshApiUrl() {
    try {
      networkManager.workingBaseUrl = null;
      networkManager.lastSuccessfulUrl = null;
      
      try {
        await AsyncStorage.removeItem('@network/last_working_url');
      } catch (storageError) {
        console.warn('Could not clear stored URL:', storageError);
      }
      
      const newBaseUrl = await networkManager.findWorkingApiUrl();
      
      if (this.api) {
        this.api.defaults.baseURL = newBaseUrl;
      }
      
      try {
        const testResult = await this.testConnection();
        return {
          success: true,
          newUrl: newBaseUrl,
          testResult
        };
      } catch (testError) {
        return {
          success: false,
          newUrl: newBaseUrl,
          error: testError.message
        };
      }
      
    } catch (error) {
      throw new Error(`Failed to refresh API URL: ${error.message}`);
    }
  }

  formatPredictionForDisplay(prediction) {
    return {
      ...prediction,
      yes_votes: prediction.yes_votes || 0,
      no_votes: prediction.no_votes || 0,
      total_votes: prediction.total_votes || ((prediction.yes_votes || 0) + (prediction.no_votes || 0)),
      closes_at: prediction.closes_at,
      created_at: prediction.created_at,
      creator: prediction.creator || { username: 'Unknown', display_name: 'Unknown User' },
      category: prediction.category || { id: 'other', name: 'Other' }
    };
  }
}

// Create and export singleton instance
const apiService = new ApiService();

export { apiService, networkManager };
export default apiService;