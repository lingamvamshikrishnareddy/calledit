import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { usePredictions } from '../hooks/usePredictions';
import PredictionCard from '../components/feed/PredictionCard';

const HomeScreen = () => {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const { 
    predictions, 
    loading: predictionsLoading, 
    error: predictionsError,
    fetchPredictions,
    refreshPredictions 
  } = usePredictions();
  
  const [refreshing, setRefreshing] = useState(false);

  // Initial data load
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🏠 HomeScreen initial user:', user.username);
      fetchPredictions();
    }
  }, [isAuthenticated, user, fetchPredictions]);

  // Log auth changes
  useEffect(() => {
    console.log('🏠 Auth change in HomeScreen:', isAuthenticated ? 'CURRENT' : 'NO_AUTH', user?.username || 'No user');
  }, [isAuthenticated, user]);

  const handleRefresh = useCallback(async () => {
    if (refreshing || authLoading) return;
    
    setRefreshing(true);
    try {
      await refreshPredictions();
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, authLoading, refreshPredictions]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      `Are you sure you want to logout, ${user?.display_name || user?.username}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled automatically by auth state change
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'Logout failed. Please try again.');
            }
          },
        },
      ]
    );
  }, [user, logout]);

  const handleRetryConnection = useCallback(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#FF69B4', '#FF1493', '#8A2BE2']}
        style={styles.headerGradient}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user?.display_name || user?.username || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.welcomeText}>Welcome back!</Text>
                  <Text style={styles.usernameText}>
                    {user?.display_name || user?.username || 'User'}
                  </Text>
                  {user && (
                    <Text style={styles.pointsText}>
                      🏆 {user.total_points || 0} points
                    </Text>
                  )}
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                disabled={authLoading}
              >
                <Ionicons name="log-out-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user?.predictions_made || 0}</Text>
                <Text style={styles.statLabel}>Predictions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {user?.accuracy_rate ? `${Math.round(user.accuracy_rate * 100)}%` : '0%'}
                </Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user?.current_streak || 0}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  const renderError = () => {
    if (!predictionsError) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={48} color="#ff6b6b" />
        <Text style={styles.errorTitle}>Connection Issue</Text>
        <Text style={styles.errorMessage}>
          {predictionsError.includes('Authentication') 
            ? 'Your session has expired. Please log out and log back in.'
            : 'Unable to load predictions. Check your connection.'
          }
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetryConnection}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        
        {predictionsError.includes('Authentication') && (
          <TouchableOpacity style={styles.logoutRetryButton} onPress={handleLogout}>
            <Text style={styles.logoutRetryButtonText}>Logout & Re-login</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="telescope-outline" size={64} color="#666" />
      <Text style={styles.emptyTitle}>No Predictions Yet</Text>
      <Text style={styles.emptyMessage}>
        Be the first to make a prediction and start earning points!
      </Text>
    </View>
  );

  const renderPredictionItem = ({ item, index }) => (
    <PredictionCard 
      key={`prediction-${item.id}-${index}`} // FIXED: Unique key combining ID and index
      prediction={item} 
      onPress={() => {
        // Navigate to prediction details
        console.log('🔍 Opening prediction:', item.id);
      }}
    />
  );

  // FIXED: Generate unique key for each item
  const getItemKey = (item, index) => {
    // Create unique key combining multiple identifiers
    const baseKey = `${item.id || index}`;
    const timestampKey = item.created_at || item.updated_at || Date.now();
    const uniqueKey = `prediction_${baseKey}_${timestampKey}_${index}`;
    
    console.log('🔑 Generated key for item:', uniqueKey);
    return uniqueKey;
  };

  // FIXED: Clean predictions data to ensure unique IDs
  const getCleanedPredictions = useCallback(() => {
    if (!predictions || !Array.isArray(predictions)) {
      return [];
    }

    // Filter out any duplicate IDs and invalid entries
    const seen = new Set();
    const cleanedPredictions = predictions.filter((prediction, index) => {
      if (!prediction) {
        console.warn('⚠️ Found null/undefined prediction at index:', index);
        return false;
      }

      if (!prediction.id) {
        console.warn('⚠️ Found prediction without ID at index:', index, prediction);
        return false;
      }

      if (seen.has(prediction.id)) {
        console.warn('⚠️ Found duplicate prediction ID:', prediction.id);
        return false;
      }

      seen.add(prediction.id);
      return true;
    });

    console.log('🧹 Cleaned predictions:', {
      original: predictions.length,
      cleaned: cleanedPredictions.length,
      removed: predictions.length - cleanedPredictions.length
    });

    return cleanedPredictions;
  }, [predictions]);

  const renderContent = () => {
    if (authLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      );
    }

    if (!isAuthenticated || !user) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={48} color="#666" />
          <Text style={styles.errorTitle}>Not Authenticated</Text>
          <Text style={styles.errorMessage}>Please log in to view predictions</Text>
        </View>
      );
    }

    if (predictionsError && !predictions.length) {
      return renderError();
    }

    if (predictionsLoading && !predictions.length && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Loading predictions...</Text>
        </View>
      );
    }

    const cleanedPredictions = getCleanedPredictions();

    return (
      <FlatList
        data={cleanedPredictions}
        renderItem={renderPredictionItem}
        keyExtractor={getItemKey} // FIXED: Use custom key extractor
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF69B4']}
            tintColor="#FF69B4"
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={predictionsError && cleanedPredictions.length > 0 ? (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={20} color="#ff9500" />
            <Text style={styles.warningText}>Some data may be outdated</Text>
          </View>
        ) : null}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true} // FIXED: Improve performance
        maxToRenderPerBatch={10} // FIXED: Limit rendering batch size
        windowSize={10} // FIXED: Optimize memory usage
        initialNumToRender={5} // FIXED: Start with fewer items
        getItemLayout={(data, index) => ({
          length: 200, // Approximate height of each item
          offset: 200 * index,
          index,
        })} // FIXED: Optimize scrolling performance
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    zIndex: 1,
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  usernameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  pointsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  logoutButton: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    paddingVertical: 15,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  logoutRetryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF69B4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  logoutRetryButtonText: {
    color: '#FF69B4',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    marginLeft: 8,
    color: '#ff9500',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HomeScreen;