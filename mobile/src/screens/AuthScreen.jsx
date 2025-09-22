// src/screens/AuthScreen.jsx - Updated with Hot Pink Theme
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

const AuthScreen = () => {
  const { login, register, testConnection, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Test connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await testConnection();
        setConnectionStatus(result);
        if (result.status === 'failed') {
          Alert.alert(
            'Connection Error',
            'Cannot connect to server. Please check if the backend is running.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Connection test failed:', error);
        setConnectionStatus({ status: 'failed', error: error.message });
      }
    };
    
    checkConnection();
  }, [testConnection]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      Alert.alert('Error', 'Username is required');
      return false;
    }

    if (!isLogin && !formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    }

    if (!isLogin && !formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!formData.password.trim()) {
      Alert.alert('Error', 'Password is required');
      return false;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (!isLogin && formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (loading || authLoading) return;

    if (!validateForm()) return;

    setLoading(true);
    
    try {
      if (isLogin) {
        console.log('Attempting login with:', { username: formData.username });
        const result = await login({
          username: formData.username,
          password: formData.password,
        });
        console.log('Login successful:', result);
        // No need for Alert or navigation - the app will automatically navigate
        // when isAuthenticated becomes true in useAuth
      } else {
        console.log('Attempting registration with:', { 
          username: formData.username, 
          email: formData.email 
        });
        const result = await register({
          username: formData.username,
          display_name: formData.username,
          email: formData.email,
          password: formData.password,
        });
        console.log('Registration successful:', result);
        // No need for Alert or navigation - the app will automatically navigate
        // when isAuthenticated becomes true in useAuth
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const retryConnection = async () => {
    setConnectionStatus(null);
    const result = await testConnection();
    setConnectionStatus(result);
    
    if (result.status === 'connected') {
      Alert.alert('Success', 'Connected to server successfully!');
    } else {
      Alert.alert('Failed', 'Still cannot connect to server');
    }
  };

  const isFormLoading = loading || authLoading;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Connection Status Indicator */}
        {connectionStatus && (
          <View style={styles.connectionStatus}>
            <View style={[
              styles.statusIndicator, 
              { backgroundColor: connectionStatus.status === 'connected' ? '#22ddd7' : '#f44336' }
            ]} />
            <Text style={styles.statusText}>
              {connectionStatus.status === 'connected' ? 'Connected' : 'Disconnected'}
            </Text>
            {connectionStatus.status === 'failed' && (
              <TouchableOpacity onPress={retryConnection} style={styles.retryButton}>
                <Ionicons name="refresh" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}
        
        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {isLogin ? '👋 Welcome Back!' : '🎉 Join the Fun!'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin 
              ? 'Ready to make some predictions?' 
              : 'Start calling your shots!'
            }
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#666"
            value={formData.username}
            onChangeText={(value) => handleInputChange('username', value)}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isFormLoading}
          />
        </View>

        {!isLogin && (
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isFormLoading}
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            secureTextEntry
            editable={!isFormLoading}
          />
        </View>

        {!isLogin && (
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#666"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              secureTextEntry
              editable={!isFormLoading}
            />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton, 
            (isFormLoading || connectionStatus?.status === 'failed') && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={isFormLoading || connectionStatus?.status === 'failed'}
        >
          {isFormLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => {
            setIsLogin(!isLogin);
            // Clear form when switching
            setFormData({
              username: '',
              email: '',
              password: '',
              confirmPassword: '',
            });
          }}
          disabled={isFormLoading}
        >
          <Text style={styles.switchText}>
            {isLogin 
              ? "Don't have an account? Sign up!" 
              : "Already have an account? Sign in!"
            }
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🎯 Join thousands making predictions and winning bragging rights!
        </Text>
        {connectionStatus?.status === 'failed' && (
          <Text style={styles.errorText}>
            ⚠️ Server connection failed. Check if backend is running.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f60976',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    alignSelf: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  retryButton: {
    padding: 4,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  form: {
    flex: 1,
    backgroundColor: '#000',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: '#f60976',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#f60976',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 30,
  },
  switchText: {
    fontSize: 16,
    color: '#f60976',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
});

export default AuthScreen;