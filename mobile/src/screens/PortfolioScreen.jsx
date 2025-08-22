// src/screens/PortfolioScreen.jsx - FIXED: Crash Prevention and Auth Handling
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import ApiService from '../services/api';

const PortfolioScreen = ({ navigation }) => {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  
  // State management
  const [stats, setStats] = useState(null);
  const [myVotes, setMyVotes] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Load data when user is authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      console.log('📱 PortfolioScreen: User authenticated, loading portfolio data...');
      loadPortfolioData();
    } else if (!authLoading && !isAuthenticated) {
      console.log('❌ PortfolioScreen: User not authenticated');
      // Clear data when not authenticated
      setStats(null);
      setMyVotes([]);
      setMyRank(null);
    }
  }, [authLoading, isAuthenticated, user]);

  const loadPortfolioData = async () => {
    if (!isAuthenticated || !user) {
      console.log('⚠️ PortfolioScreen: Cannot load data - user not authenticated');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 PortfolioScreen: Loading portfolio data...');
      
      // Load data in parallel with error handling for each
      const [votesResult, rankResult] = await Promise.allSettled([
        ApiService.getMyVotes(20, 0),
        ApiService.getMyRank('all_time')
      ]);

      // Handle votes result
      if (votesResult.status === 'fulfilled') {
        console.log('✅ My votes loaded:', votesResult.value?.length || 0);
        setMyVotes(Array.isArray(votesResult.value) ? votesResult.value : []);
      } else {
        console.error('❌ Failed to load votes:', votesResult.reason);
        setMyVotes([]);
      }

      // Handle rank result  
      if (rankResult.status === 'fulfilled') {
        console.log('✅ My rank loaded:', rankResult.value);
        setMyRank(rankResult.value);
      } else {
        console.error('❌ Failed to load rank:', rankResult.reason);
        setMyRank(null);
      }

      // Generate stats from available data
      generateStats();
      
    } catch (err) {
      console.error('❌ PortfolioScreen: Error loading portfolio data:', err);
      setError(err.message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const generateStats = useCallback(() => {
    if (!user) return;
    
    try {
      const userStats = {
        totalVotes: myVotes?.length || user.predictions_made || 0,
        correctPredictions: user.predictions_correct || 0,
        totalPoints: user.total_points || 0,
        currentStreak: user.current_streak || 0,
        longestStreak: user.longest_streak || 0,
        accuracyRate: user.accuracy_rate || 0,
        level: user.level || 1,
        rank: myRank?.rank || 0
      };
      
      console.log('📊 Generated stats:', userStats);
      setStats(userStats);
    } catch (err) {
      console.error('❌ Error generating stats:', err);
      setStats({
        totalVotes: 0,
        correctPredictions: 0,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        accuracyRate: 0,
        level: 1,
        rank: 0
      });
    }
  }, [user, myVotes, myRank]);

  const onRefresh = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    setRefreshing(true);
    try {
      await loadPortfolioData();
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled automatically by auth state change
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const formatAccuracy = (rate) => {
    if (!rate || isNaN(rate)) return '0%';
    return `${Math.round(rate * 100)}%`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Unknown';
    }
  };

  const navigateToLeaderboard = () => {
    navigation.navigate('Leaderboard');
  };

  const navigateToSettings = () => {
    // Add settings screen navigation when implemented
    Alert.alert('Coming Soon', 'Settings screen will be available soon!');
  };

  // FIXED: Better loading state handling
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // FIXED: Better auth required state
  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authRequiredContainer}>
          <Ionicons name="person-outline" size={64} color="#666" />
          <Text style={styles.authRequiredTitle}>Login Required</Text>
          <Text style={styles.authRequiredSubtitle}>Please login to view your portfolio</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📊 My Portfolio</Text>
          <Text style={styles.headerSubtitle}>Track your prediction game</Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={navigateToSettings}
        >
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#FF69B4']}
            tintColor="#FF69B4"
          />
        }
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#FF69B4', '#FF1493']}
            style={styles.profileGradient}
          >
            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {(user.display_name || user.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.displayName}>
                  {user.display_name || user.username || 'User'}
                </Text>
                <Text style={styles.username}>@{user.username || 'username'}</Text>
                {user.bio && (
                  <Text style={styles.bio}>{user.bio}</Text>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>🏆 Your Stats</Text>
            
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.primaryStat]}>
                <Text style={styles.statValue}>{stats.totalPoints}</Text>
                <Text style={styles.statLabel}>Total Points</Text>
              </View>
              
              <View style={[styles.statCard, styles.primaryStat]}>
                <Text style={styles.statValue}>#{stats.rank || '---'}</Text>
                <Text style={styles.statLabel}>Global Rank</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalVotes}</Text>
                <Text style={styles.statLabel}>Predictions Made</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.correctPredictions}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatAccuracy(stats.accuracyRate)}</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.currentStreak}</Text>
                <Text style={styles.statLabel}>Current Streak</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.longestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>Lv. {stats.level}</Text>
                <Text style={styles.statLabel}>Level</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>🚀 Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={navigateToLeaderboard}
          >
            <LinearGradient
              colors={['#FF69B4', '#FF1493']}
              style={styles.actionGradient}
            >
              <Ionicons name="trophy" size={24} color="#fff" />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>View Leaderboard</Text>
                <Text style={styles.actionSubtitle}>See how you rank</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreatePrediction')}
          >
            <View style={styles.actionGradient}>
              <Ionicons name="add-circle" size={24} color="#FF69B4" />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: '#fff' }]}>Create Prediction</Text>
                <Text style={[styles.actionSubtitle, { color: '#ccc' }]}>Share your insight</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Votes */}
        {myVotes.length > 0 && (
          <View style={styles.votesSection}>
            <Text style={styles.sectionTitle}>🗳️ Recent Votes</Text>
            
            {myVotes.slice(0, 5).map((vote, index) => (
              <View key={vote.id || index} style={styles.voteCard}>
                <View style={styles.voteHeader}>
                  <Text style={styles.voteTitle} numberOfLines={2}>
                    {vote.prediction?.title || 'Unknown Prediction'}
                  </Text>
                  <View style={[
                    styles.voteResult,
                    vote.vote ? styles.yesVote : styles.noVote
                  ]}>
                    <Text style={styles.voteResultText}>
                      {vote.vote ? 'YES' : 'NO'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.voteFooter}>
                  <Text style={styles.voteDate}>
                    {formatDate(vote.created_at)}
                  </Text>
                  {vote.confidence && (
                    <Text style={styles.voteConfidence}>
                      {vote.confidence}% confident
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={24} color="#f44336" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadPortfolioData}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#f44336" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ccc',
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authRequiredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  authRequiredSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  profileCard: {
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  profileGradient: {
    padding: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontStyle: 'italic',
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  primaryStat: {
    backgroundColor: '#FF69B4',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  actionButton: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#222',
  },
  actionContent: {
    flex: 1,
    marginLeft: 15,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  votesSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  voteCard: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  voteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  voteTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: 10,
  },
  voteResult: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  yesVote: {
    backgroundColor: '#4caf50',
  },
  noVote: {
    backgroundColor: '#f44336',
  },
  voteResultText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  voteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voteDate: {
    fontSize: 12,
    color: '#999',
  },
  voteConfidence: {
    fontSize: 12,
    color: '#FF69B4',
  },
  errorCard: {
    backgroundColor: '#2a1a1a',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    textAlign: 'center',
    marginVertical: 10,
  },
  retryButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#2a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f44336',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 100,
  },
});

export default PortfolioScreen;