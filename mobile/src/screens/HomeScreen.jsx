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
import { useAuth } from '../hooks/useAuth';
import { usePredictions } from '../hooks/usePredictions';
import { useVotes } from '../hooks/useVotes';
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
  
  const { castVote, loading: voteLoading } = useVotes();
  
  const [refreshing, setRefreshing] = useState(false);
  const [userVotes, setUserVotes] = useState(new Map()); // Track user votes

  // Initial data load
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🏠 HomeScreen initial user:', user.username);
      fetchPredictions();
    }
  }, [isAuthenticated, user, fetchPredictions]);

  // Log auth changes
  useEffect(() => {
    console.log('🏠 Auth state in HomeScreen:', {
      isAuthenticated,
      user: user?.username || 'No user',
      loading: authLoading
    });
  }, [isAuthenticated, user, authLoading]);

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

  const handleVote = useCallback(async (voteData) => {
    if (!user || !isAuthenticated) {
      console.warn('⚠️ User not authenticated for voting');
      Alert.alert('Authentication Required', 'Please log in to vote on predictions');
      return;
    }

    if (voteLoading) {
      console.warn('⚠️ Vote already in progress');
      return;
    }

    console.log('🗳️ HomeScreen: Handling vote:', voteData);

    try {
      // Cast the vote
      const result = await castVote(voteData);
      console.log('✅ Vote successful:', result);

      // Update local state to reflect the vote
      setUserVotes(prev => new Map(prev).set(voteData.prediction_id, voteData.vote));

      // Refresh predictions to get updated counts
      await refreshPredictions();

      // Show success message
      Alert.alert(
        'Vote Recorded!', 
        `Your ${voteData.vote ? 'YES' : 'NO'} vote has been recorded.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Vote failed:', error);
      
      let errorMessage = 'Failed to record your vote. Please try again.';
      if (error.message.includes('already voted')) {
        errorMessage = 'You have already voted on this prediction.';
      } else if (error.message.includes('Authentication')) {
        errorMessage = 'Your session has expired. Please log out and log back in.';
      } else if (error.message.includes('closed')) {
        errorMessage = 'Voting has closed for this prediction.';
      }

      Alert.alert('Vote Failed', errorMessage);
    }
  }, [user, isAuthenticated, voteLoading, castVote, refreshPredictions]);

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
      <View style={styles.headerBackground}>
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
      </View>
    </View>
  );

  const renderError = () => {
    if (!predictionsError) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={48} color="#EC4899" />
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

  const renderPredictionItem = ({ item, index }) => {
    // Add user vote status to prediction
    const predictionWithVote = {
      ...item,
      user_vote: userVotes.get(item.id)
    };

    return (
      <PredictionCard 
        key={`prediction-${item.id}-${index}`}
        prediction={predictionWithVote} 
        onVote={handleVote}
        onPress={() => {
          // Navigate to prediction details
          console.log('🔍 Opening prediction:', item.id);
        }}
        currentUser={user} // Pass current user to show/hide vote buttons
        disabled={voteLoading}
      />
    );
  };

  // Generate unique key for each item
  const getItemKey = (item, index) => {
    const baseKey = `${item.id || index}`;
    const timestampKey = item.created_at || item.updated_at || Date.now();
    const uniqueKey = `prediction_${baseKey}_${timestampKey}_${index}`;
    return uniqueKey;
  };

  // Clean predictions data to ensure unique IDs
  const getCleanedPredictions = useCallback(() => {
    if (!predictions || !Array.isArray(predictions)) {
      return [];
    }

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
          <ActivityIndicator size="large" color="#f60976" />
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
          <ActivityIndicator size="large" color="#f60976" />
          <Text style={styles.loadingText}>Loading predictions...</Text>
        </View>
      );
    }

    const cleanedPredictions = getCleanedPredictions();

    return (
      <FlatList
        data={cleanedPredictions}
        renderItem={renderPredictionItem}
        keyExtractor={getItemKey}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#f60976']}
            tintColor="#f60976"
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={predictionsError && cleanedPredictions.length > 0 ? (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={20} color="#8B5CF6" />
            <Text style={styles.warningText}>Some data may be outdated</Text>
          </View>
        ) : null}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
        getItemLayout={(data, index) => ({
          length: 200,
          offset: 200 * index,
          index,
        })}
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderContent()}
      {voteLoading && (
        <View style={styles.voteLoadingOverlay}>
          <View style={styles.voteLoadingContent}>
            <ActivityIndicator size="large" color="#f60976" />
            <Text style={styles.voteLoadingText}>Recording your vote...</Text>
          </View>
        </View>
      )}
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
  headerBackground: {
    backgroundColor: '#f60976',
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
    backgroundColor: '#f60976',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  logoutRetryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#f60976',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  logoutRetryButtonText: {
    color: '#f60976',
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
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  warningText: {
    marginLeft: 8,
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  voteLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  voteLoadingContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  voteLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#f60976',
    fontWeight: '600',
  },
});

export default HomeScreen;