// src/services/api.js - Fixed API Service
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './auth';

const API_BASE_URL = 'http://localhost:8000'; // Change this for production

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async getAuthToken() {
    return await AuthService.getAccessToken();
  }

  async makeRequest(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      console.log(`Making request to: ${this.baseURL}${endpoint}`);
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // ============ AUTH ENDPOINTS ============
  async register(userData) {
    try {
      const response = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
          username: userData.username,
          display_name: userData.display_name || userData.username,
          email: userData.email,
          password: userData.password,
        },
      });
      
      if (response.access_token) {
        await AuthService.storeTokens(response.access_token, response.refresh_token);
        await AuthService.storeUserData(response.user);
      }
      
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async login(credentials) {
    try {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: credentials,
      });
      
      if (response.access_token) {
        await AuthService.storeTokens(response.access_token, response.refresh_token);
        await AuthService.storeUserData(response.user);
      }
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async logout() {
    await AuthService.clearAuth();
  }

  async getCurrentUser() {
    return this.makeRequest('/api/auth/me');
  }

  async refreshToken() {
    const refreshToken = await AuthService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    return this.makeRequest('/api/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshToken}`
      }
    });
  }

  // ============ USER ENDPOINTS ============
  async getUserProfile() {
    return this.makeRequest('/api/users/profile');
  }

  async updateUserProfile(profileData) {
    return this.makeRequest('/api/users/profile', {
      method: 'PUT',
      body: profileData,
    });
  }

  async searchUsers(query, limit = 20) {
    return this.makeRequest(`/api/users/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getUser(userId) {
    return this.makeRequest(`/api/users/${userId}`);
  }

  // ============ HEALTH CHECK ============
  async healthCheck() {
    return this.makeRequest('/health');
  }
}

export default new ApiService();