// ENHANCED: API Service with better network detection and diagnostics
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔧 CONFIGURATION: Update this with your computer's IP addresses
const NETWORK_CONFIG = {
  // Your main computer IP (from your logs)
  COMPUTER_IP: '192.168.16.20',
  
  // Alternative IPs to try if main fails (add your computer's other network IPs)
  FALLBACK_IPS: [
    '192.168.1.20',   // Common home network range
    '192.168.0.20',   // Another common range
    '10.0.0.20',      // Another possible range
  ],
  
  // Port your backend is running on
  PORT: 8000,
  
  // Production URL (when not in dev mode)
  PRODUCTION_URL: 'https://your-production-api.com'
};

/**
 * ENHANCED: Network diagnostics and multiple IP testing
 */
class NetworkManager {
  constructor() {
    this.workingBaseUrl = null;
    this.lastSuccessfulUrl = null;
  }

  async findWorkingApiUrl() {
    console.log('🔍 NetworkManager: Finding working API URL...');

    if (!__DEV__) {
      console.log('📦 Production mode - using production URL');
      return NETWORK_CONFIG.PRODUCTION_URL;
    }

    // If we already found a working URL, try it first
    if (this.workingBaseUrl) {
      console.log('🚀 Trying cached working URL:', this.workingBaseUrl);
      if (await this.testConnection(this.workingBaseUrl)) {
        return this.workingBaseUrl;
      } else {
        console.log('❌ Cached URL no longer working, searching...');
        this.workingBaseUrl = null;
      }
    }

    const platform = Platform.OS;
    const urlsToTest = [];

    // Build list of URLs to test based on device type
    const isPhysicalDevice = this.detectPhysicalDevice();
    
    if (platform === 'android') {
      if (isPhysicalDevice) {
        // Physical Android device - try computer IPs
        urlsToTest.push(`http://${NETWORK_CONFIG.COMPUTER_IP}:${NETWORK_CONFIG.PORT}`);
        NETWORK_CONFIG.FALLBACK_IPS.forEach(ip => {
          urlsToTest.push(`http://${ip}:${NETWORK_CONFIG.PORT}`);
        });
      } else {
        // Android emulator
        urlsToTest.push(`http://10.0.2.2:${NETWORK_CONFIG.PORT}`);
        // Also try computer IP as fallback
        urlsToTest.push(`http://${NETWORK_CONFIG.COMPUTER_IP}:${NETWORK_CONFIG.PORT}`);
      }
    } else if (platform === 'ios') {
      if (isPhysicalDevice) {
        // Physical iOS device - try computer IPs
        urlsToTest.push(`http://${NETWORK_CONFIG.COMPUTER_IP}:${NETWORK_CONFIG.PORT}`);
        NETWORK_CONFIG.FALLBACK_IPS.forEach(ip => {
          urlsToTest.push(`http://${ip}:${NETWORK_CONFIG.PORT}`);
        });
      } else {
        // iOS simulator
        urlsToTest.push(`http://localhost:${NETWORK_CONFIG.PORT}`);
        urlsToTest.push(`http://127.0.0.1:${NETWORK_CONFIG.PORT}`);
        // Also try computer IP as fallback
        urlsToTest.push(`http://${NETWORK_CONFIG.COMPUTER_IP}:${NETWORK_CONFIG.PORT}`);
      }
    }

    console.log('🎯 URLs to test:', urlsToTest);

    // Test each URL
    for (const url of urlsToTest) {
      console.log(`🔌 Testing connection to: ${url}`);
      
      if (await this.testConnection(url)) {
        console.log(`✅ Found working URL: ${url}`);
        this.workingBaseUrl = url;
        this.lastSuccessfulUrl = url;
        
        // Store successful URL for next time
        try {
          await AsyncStorage.setItem('@network/last_working_url', url);
        } catch (error) {
          console.warn('⚠️ Could not store working URL:', error);
        }
        
        return url;
      }
    }

    // If no URL worked, try the last successful one from storage
    try {
      const storedUrl = await AsyncStorage.getItem('@network/last_working_url');
      if (storedUrl && !urlsToTest.includes(storedUrl)) {
        console.log('🔄 Trying last successful URL from storage:', storedUrl);
        if (await this.testConnection(storedUrl)) {
          console.log('✅ Last successful URL still works:', storedUrl);
          this.workingBaseUrl = storedUrl;
          return storedUrl;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not retrieve stored URL:', error);
    }

    // If nothing worked, return the primary URL and let the user know
    const fallbackUrl = `http://${NETWORK_CONFIG.COMPUTER_IP}:${NETWORK_CONFIG.PORT}`;
    console.error('❌ No working URL found. Using fallback:', fallbackUrl);
    console.error('🔧 Troubleshooting tips:');
    console.error('   1. Make sure your backend server is running');
    console.error('   2. Check if your phone and computer are on the same WiFi network');
    console.error('   3. Verify your computer\'s IP address');
    console.error('   4. Check if your computer\'s firewall is blocking port 8000');
    
    return fallbackUrl;
  }

  detectPhysicalDevice() {
    const platform = Platform.OS;
    
    // Multiple detection methods
    const isPhysicalDevice = 
      Constants.isDevice === true ||
      Constants.deviceName !== undefined ||
      !Constants.isDevice === false;

    const isAndroidEmulator = 
      platform === 'android' && 
      (Constants.deviceName?.includes('sdk') ||
       Constants.deviceName?.includes('emulator') ||
       Constants.deviceName?.includes('Android SDK') ||
       Constants.isDevice === false);

    const isIOSSimulator = 
      platform === 'ios' && 
      Constants.isDevice === false;

    console.log('🔍 Enhanced Device Detection:', {
      platform,
      'Constants.isDevice': Constants.isDevice,
      'Constants.deviceName': Constants.deviceName,
      isPhysicalDevice: isPhysicalDevice && !isAndroidEmulator && !isIOSSimulator,
      isAndroidEmulator,
      isIOSSimulator,
    });

    return isPhysicalDevice && !isAndroidEmulator && !isIOSSimulator;
  }

  async testConnection(baseUrl, timeout = 5000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Connection successful to ${baseUrl}:`, data);
        return true;
      } else {
        console.log(`❌ Connection failed to ${baseUrl}: HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Connection failed to ${baseUrl}:`, error.message);
      return false;
    }
  }

  async diagnoseNetworkIssues() {
    console.log('🔍 Running network diagnostics...');
    
    const results = {
      platform: Platform.OS,
      device: Constants.deviceName,
      isDevice: Constants.isDevice,
      testedUrls: [],
      workingUrls: [],
      failedUrls: []
    };

    const urlsToTest = [
      `http://${NETWORK_CONFIG.COMPUTER_IP}:${NETWORK_CONFIG.PORT}`,
      `http://10.0.2.2:${NETWORK_CONFIG.PORT}`,
      `http://localhost:${NETWORK_CONFIG.PORT}`,
      `http://127.0.0.1:${NETWORK_CONFIG.PORT}`,
      ...NETWORK_CONFIG.FALLBACK_IPS.map(ip => `http://${ip}:${NETWORK_CONFIG.PORT}`)
    ];

    for (const url of urlsToTest) {
      results.testedUrls.push(url);
      
      if (await this.testConnection(url, 3000)) {
        results.workingUrls.push(url);
      } else {
        results.failedUrls.push(url);
      }
    }

    console.log('📊 Network Diagnostics Results:', results);
    return results;
  }
}

// Create network manager instance
const networkManager = new NetworkManager();

// Initialize API base URL
let API_BASE_URL = null;

// Function to get API base URL (async)
async function getApiBaseUrl() {
  if (!API_BASE_URL) {
    API_BASE_URL = await networkManager.findWorkingApiUrl();
  }
  return API_BASE_URL;
}

// Create axios instance with dynamic base URL
const createApiInstance = async () => {
  const baseURL = await getApiBaseUrl();
  console.log('🌐 Creating API instance with base URL:', baseURL);
  
  return axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
};

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

    console.log('🚀 ApiService: Initializing...');
    this.api = await createApiInstance();
    this.setupInterceptors();
    this.initialized = true;
    console.log('✅ ApiService: Initialized');
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
          console.error('❌ Error getting token from storage:', error);
        }

        if (__DEV__) {
          console.log('📤 API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
            fullURL: `${config.baseURL}${config.url}`,
            hasAuth: !!config.headers.Authorization,
          });
        }
        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor with enhanced error handling
    this.api.interceptors.response.use(
      (response) => {
        if (__DEV__) {
          console.log('📥 API Response:', {
            status: response.status,
            url: response.config?.url,
          });
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        if (__DEV__) {
          console.error('❌ API Error:', {
            message: error.message,
            status: error.response?.status,
            url: error.config?.url,
            code: error.code,
          });
        }

        // Handle network errors - try to reconnect with different URL
        if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
          console.log('🔄 Network error detected, trying to find working URL...');
          
          // Clear cached working URL and find a new one
          networkManager.workingBaseUrl = null;
          const newBaseUrl = await networkManager.findWorkingApiUrl();
          
          if (newBaseUrl !== this.api.defaults.baseURL) {
            console.log('🔄 Switching to new base URL:', newBaseUrl);
            this.api.defaults.baseURL = newBaseUrl;
            API_BASE_URL = newBaseUrl;
            
            // Retry the original request with new base URL
            return this.api(originalRequest);
          }
          
          throw new Error('Cannot connect to server. Please check your network connection and ensure the backend is running.');
        }

        // Handle 401 errors with automatic token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const errorDetail = error.response?.data?.detail;
          if (errorDetail && (errorDetail.includes('expired') || errorDetail.includes('Invalid token'))) {
            console.log('🔄 Token expired, attempting refresh...');

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
                console.log('🔄 Retrying request with new token');
                return this.api(originalRequest);
              }
            } catch (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
              await this.clearAuthData();
              throw new Error('Authentication expired. Please log in again.');
            } finally {
              this.isRefreshing = false;
              this.refreshPromise = null;
            }
          }
        }

        // Handle other error cases
        if (error.response?.status === 401) {
          throw new Error('Authentication failed');
        }

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

      console.log('🔄 Attempting token refresh...');
      const baseURL = await getApiBaseUrl();
      const response = await axios.post(`${baseURL}/api/auth/refresh`, {
        refresh_token: refreshToken
      });

      if (response.data?.access_token) {
        console.log('✅ Token refresh successful');

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
      console.error('❌ Token refresh failed:', error.message);
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
      console.log('🧹 Auth data cleared from storage');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
    }
  }

  setAuthToken(token) {
    this.authToken = token;
    if (this.api && token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('🔐 Auth token set in API service');
    } else if (this.api) {
      delete this.api.defaults.headers.common['Authorization'];
      console.log('🔓 Auth token removed from API service');
    }
  }

  clearAuthToken() {
    this.authToken = null;
    if (this.api) {
      delete this.api.defaults.headers.common['Authorization'];
    }
    console.log('🧹 Auth token cleared from API service');
  }

  getAuthToken() {
    return this.authToken;
  }

  // Enhanced connection test
  async testConnection() {
    try {
      await this.ensureInitialized();
      console.log('🔌 Testing connection to:', `${this.api.defaults.baseURL}/health`);
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      
      // Run network diagnostics if connection fails
      console.log('🔍 Running network diagnostics...');
      await networkManager.diagnoseNetworkIssues();
      
      throw error;
    }
  }

  // Auth endpoints (with initialization check)
  async register(userData) {
    await this.ensureInitialized();
    try {
      console.log('📝 Registering user:', { username: userData.username, email: userData.email });

      const registerData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        display_name: userData.display_name || userData.username,
      };

      const response = await this.api.post('/api/auth/register', registerData);

      if (response.data?.access_token) {
        this.setAuthToken(response.data.access_token);
      }

      console.log('✅ Registration successful');
      return response.data;
    } catch (error) {
      console.error('❌ Registration failed:', error.message);
      throw error;
    }
  }

  async login(credentials) {
    await this.ensureInitialized();
    try {
      console.log('🔑 Logging in user:', { username: credentials.username });

      const response = await this.api.post('/api/auth/login', {
        username: credentials.username,
        password: credentials.password,
      });

      if (response.data?.access_token) {
        this.setAuthToken(response.data.access_token);
      }

      console.log('✅ Login successful');
      return response.data;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  }

  async logout() {
    await this.ensureInitialized();
    try {
      console.log('👋 Logging out...');
      const response = await this.api.post('/api/auth/logout');
      this.clearAuthToken();
      console.log('✅ Logout successful');
      return response.data;
    } catch (error) {
      console.error('❌ Logout failed:', error.message);
      this.clearAuthToken();
      return null;
    }
  }

  async refreshToken(refreshToken) {
    await this.ensureInitialized();
    try {
      console.log('🔄 Refreshing token...');
      const response = await this.api.post('/api/auth/refresh', {
        refresh_token: refreshToken
      });

      if (response.data?.access_token) {
        this.setAuthToken(response.data.access_token);
      }

      console.log('✅ Token refresh successful');
      return response.data;
    } catch (error) {
      console.error('❌ Token refresh failed:', error.message);
      throw error;
    }
  }

  async getCurrentUser() {
    await this.ensureInitialized();
    try {
      console.log('👤 Getting current user...');
      const response = await this.api.get('/api/auth/me');
      console.log('✅ Got current user:', response.data.username);
      return response.data;
    } catch (error) {
      console.error('❌ Get current user failed:', error.message);
      throw error;
    }
  }

  async updateUserProfile(updateData) {
    await this.ensureInitialized();
    try {
      console.log('📝 Updating user profile...');
      const response = await this.api.put('/api/users/me', updateData);
      console.log('✅ Profile update successful');
      return response.data;
    } catch (error) {
      console.error('❌ Profile update failed:', error.message);
      throw error;
    }
  }

  // All other endpoints with initialization check
  async getPredictions(filters = {}) {
    await this.ensureInitialized();
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.limit) params.limit = filters.limit;
      if (filters.offset !== undefined) params.offset = filters.offset;
      if (filters.sort_by) params.sort_by = filters.sort_by;
      if (filters.sort_order) params.sort_order = filters.sort_order;

      console.log('📊 Getting predictions with params:', params);
      const response = await this.api.get('/api/predictions/', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Get predictions failed:', error.message);
      throw error;
    }
  }

  async getPrediction(predictionId) {
    await this.ensureInitialized();
    try {
      console.log('📊 Getting prediction:', predictionId);
      const response = await this.api.get(`/api/predictions/${predictionId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Get prediction failed:', error.message);
      throw error;
    }
  }

  async createPrediction(predictionData) {
    await this.ensureInitialized();
    try {
      console.log('📝 Creating prediction...');
      const createData = {
        title: predictionData.title,
        description: predictionData.description,
        category_id: predictionData.category_id,
        closes_at: predictionData.closes_at
      };

      const response = await this.api.post('/api/predictions/', createData);
      console.log('✅ Prediction created');
      return response.data;
    } catch (error) {
      console.error('❌ Create prediction failed:', error.message);
      throw error;
    }
  }

  async getCategories() {
    await this.ensureInitialized();
    try {
      console.log('📂 Getting categories...');
      const response = await this.api.get('/api/predictions/categories');
      console.log('✅ Categories loaded:', response.data?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Get categories failed:', error.message);
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

  async castVote(voteData) {
    await this.ensureInitialized();
    try {
      console.log('🗳️ Casting vote...');
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

      const response = await this.api.post('/api/votes/', apiVoteData);
      console.log('✅ Vote cast successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Cast vote failed:', error.message);
      throw error;
    }
  }

  async getMyVotes(limit = 50, offset = 0) {
    await this.ensureInitialized();
    try {
      const response = await this.api.get('/api/votes/my-votes', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Get my votes failed:', error.message);
      return [];
    }
  }

  async getLeaderboard(timeframe = 'all_time', limit = 50) {
    await this.ensureInitialized();
    try {
      console.log('🏆 Getting leaderboard:', { timeframe, limit });
      const response = await this.api.get('/api/leaderboard', {
        params: { period: timeframe, limit }
      });
      console.log('✅ Leaderboard loaded:', response.data?.length || 0, 'entries');
      return response.data;
    } catch (error) {
      console.error('❌ Get leaderboard failed:', error.message);
      // Return fallback data
      return [{
        rank: 1,
        user: { id: 'mock1', username: 'top_predictor', display_name: 'Top Predictor' },
        points: 2500,
        predictions_made: 85,
        predictions_correct: 68,
        accuracy_rate: 0.80,
        streak: 12
      }];
    }
  }

  async getMyRank(timeframe = 'all_time') {
    await this.ensureInitialized();
    try {
      console.log('📊 Getting my rank for:', timeframe);
      const response = await this.api.get('/api/leaderboard/my-rank', {
        params: { period: timeframe }
      });
      console.log('✅ My rank loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Get my rank failed:', error.message);
      return {
        rank: 15,
        points: 750,
        predictions_made: 28,
        predictions_correct: 19,
        accuracy_rate: 0.68,
        streak: 3
      };
    }
  }

  async getFriendsLeaderboard(timeframe = 'weekly', limit = 50) {
    await this.ensureInitialized();
    try {
      console.log('🏆 Getting friends leaderboard:', { timeframe, limit });
      const response = await this.api.get('/api/friends/leaderboard', {
        params: { period: timeframe, limit }
      });
      console.log('✅ Friends leaderboard loaded:', response.data?.length || 0, 'entries');
      return response.data;
    } catch (error) {
      console.error('❌ Get friends leaderboard failed:', error.message);
      throw error;
    }
  }

  async getUsers(limit = 20, offset = 0) {
    await this.ensureInitialized();
    try {
      const response = await this.api.get('/api/users', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Get users failed:', error.message);
      throw error;
    }
  }

  async getUser(userId) {
    await this.ensureInitialized();
    try {
      const response = await this.api.get(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Get user failed:', error.message);
      throw error;
    }
  }

  async searchUsers(query, limit = 20) {
    await this.ensureInitialized();
    try {
      const response = await this.api.get('/api/users/search', {
        params: { q: query, limit }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Search users failed:', error.message);
      throw error;
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

  // Utility method to run network diagnostics
  async runNetworkDiagnostics() {
    return await networkManager.diagnoseNetworkIssues();
  }

  // Force URL refresh (clears cached working URL)
  // Force URL refresh (clears cached working URL)
  async refreshApiUrl() {
    try {
      console.log('🔄 Refreshing API URL...');
      
      // Clear all cached URLs
      networkManager.workingBaseUrl = null;
      networkManager.lastSuccessfulUrl = null;
      API_BASE_URL = null;
      
      // Clear stored working URL from AsyncStorage
      try {
        await AsyncStorage.removeItem('@network/last_working_url');
        console.log('🧹 Cleared stored working URL from cache');
      } catch (storageError) {
        console.warn('⚠️ Could not clear stored URL:', storageError);
      }
      
      // Find new working URL
      const newBaseUrl = await getApiBaseUrl();
      
      if (this.api) {
        this.api.defaults.baseURL = newBaseUrl;
        console.log('🔄 API base URL refreshed to:', newBaseUrl);
      } else {
        console.log('🔄 API instance will be created with new URL:', newBaseUrl);
      }
      
      // Test the new connection
      try {
        const testResult = await this.testConnection();
        console.log('✅ New API URL connection test successful:', testResult);
        return {
          success: true,
          newUrl: newBaseUrl,
          testResult
        };
      } catch (testError) {
        console.warn('⚠️ New API URL connection test failed:', testError.message);
        return {
          success: false,
          newUrl: newBaseUrl,
          error: testError.message
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to refresh API URL:', error);
      throw new Error(`Failed to refresh API URL: ${error.message}`);
    }
  }
}

// Create and export a singleton instance of ApiService
const apiService = new ApiService();

// Export the singleton instance and utility functions
export { apiService, networkManager, getApiBaseUrl };

// Also export as default for convenience
export default apiService;