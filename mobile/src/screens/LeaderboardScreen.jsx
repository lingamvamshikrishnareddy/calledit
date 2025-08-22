// src/screens/LeaderboardScreen.jsx - FIXED: Better error handling and fallbacks
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LeaderboardItem from '../components/leaderboard/LeaderboardItem';
import StatsCard from '../components/leaderboard/StatsCard';
import ApiService from '../services/api';
import AuthService from '../services/auth';

const LeaderboardScreen = ({ navigation }) => {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [timeFrame, setTimeFrame] = useState('weekly');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const timeFrameOptions = [
    { key: 'weekly', label: 'This Week', icon: 'calendar' },
    { key: 'monthly', label: 'This Month', icon: 'calendar-outline' },
    { key: 'all_time', label: 'All Time', icon: 'trophy' },
  ];

  useEffect(() => {
    // Listen for auth changes
    const unsubscribe = AuthService.addAuthListener(({ user: authUser }) => {
      console.log('🔄 LeaderboardScreen: Auth user changed:', authUser?.username || 'No user');
      setUser(authUser);
    });

    // Initial data load
    loadLeaderboardData();

    return unsubscribe;
  }, []);

  useEffect(() => {
    loadLeaderboardData();
  }, [timeFrame]);

  const loadLeaderboardData = async () => {
    if (!user) {
      console.log('⚠️ LeaderboardScreen: No user, skipping leaderboard load');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 LeaderboardScreen: Loading leaderboard data for timeFrame:', timeFrame);
      
      // Load leaderboard and user rank with proper error handling
      const [leaderboardData, rankData] = await Promise.all([
        ApiService.getLeaderboard(timeFrame, 50).catch(err => {
          console.error('❌ LeaderboardScreen: Leaderboard fetch failed:', err.message);
          return []; // Return empty array on error
        }),
        ApiService.getMyRank(timeFrame).catch(err => {
          console.error('❌ LeaderboardScreen: Rank fetch failed:', err.message);
          return null; // Return null on error
        })
      ]);

      console.log('✅ LeaderboardScreen: Data loaded:', {
        leaderboardCount: leaderboardData?.length || 0,
        hasUserRank: !!rankData
      });

      setLeaderboard(leaderboardData || []);
      setUserRank(rankData);
    } catch (err) {
      console.error('❌ LeaderboardScreen: Loading error:', err.message);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (selectedUser) => {
    if (!selectedUser || !selectedUser.id) {
      console.warn('⚠️ LeaderboardScreen: Invalid user selected');
      return;
    }
    
    console.log('👤 LeaderboardScreen: User pressed:', selectedUser.username);
    navigation.navigate('UserProfile', { userId: selectedUser.id });
  };

  const onRefresh = useCallback(async () => {
    console.log('🔄 LeaderboardScreen: Refreshing...');
    setRefreshing(true);
    try {
      await loadLeaderboardData();
    } finally {
      setRefreshing(false);
    }
  }, [timeFrame, user]);

  const renderTimeFrameSelector = () => (
    <View style={styles.timeFrameContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timeFrameSelector}
      >
        {timeFrameOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.timeFrameButton,
              timeFrame === option.key && styles.activeTimeFrame
            ]}
            onPress={() => {
              console.log('📅 LeaderboardScreen: Time frame changed to:', option.key);
              setTimeFrame(option.key);
            }}
          >
            <Ionicons 
              name={option.icon} 
              size={16} 
              color={timeFrame === option.key ? 'white' : '#666'} 
            />
            <Text style={[
              styles.timeFrameText,
              timeFrame === option.key && styles.activeTimeFrameText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderUserStats = () => {
    if (!user) return null;

    // Use userRank data if available, otherwise fall back to user data
    const statsData = userRank || {
      rank: null,
      points: user.total_points || 0,
      accuracy_rate: user.accuracy_rate || 0,
      streak: user.current_streak || 0
    };

    const userStats = [
      {
        icon: 'trophy',
        label: 'Rank',
        value: statsData.rank ? `#${statsData.rank}` : 'Unranked',
        color: statsData.rank && statsData.rank <= 3 ? '#ffd700' : '#007AFF',
      },
      {
        icon: 'trending-up',
        label: 'Points',
        value: statsData.points?.toString() || '0',
        color: '#4caf50',
        subtitle: `${timeFrame.replace('_', ' ').toUpperCase()}`
      },
      {
        icon: 'target',
        label: 'Accuracy',
        value: statsData.accuracy_rate ? `${(statsData.accuracy_rate * 100).toFixed(1)}%` : '0%',
        color: '#ff9500',
      },
      {
        icon: 'flame',
        label: 'Streak',
        value: statsData.streak?.toString() || '0',
        color: '#ff6b35',
      },
    ];

    return (
      <StatsCard
        title="Your Performance"
        stats={userStats}
        style={styles.userStatsCard}
      />
    );
  };

  const renderLeaderboardItem = ({ item, index }) => {
    if (!item || !item.user) {
      console.warn('⚠️ LeaderboardScreen: Invalid leaderboard item:', item);
      return null;
    }

    // Ensure all required data exists
    const safeItem = {
      id: item.user.id || `user_${index}`,
      username: item.user.username || 'Unknown',
      display_name: item.user.display_name || item.user.username || 'Unknown User',
      avatar_url: item.user.avatar_url || null,
      total_points: item.points || 0,
      predictions_made: item.predictions_made || 0,
      predictions_correct: item.predictions_correct || 0,
      accuracy_rate: item.accuracy_rate || 0,
      streak: item.streak || 0
    };

    return (
      <LeaderboardItem
        user={safeItem}
        rank={item.rank || index + 1}
        onPress={handleUserPress}
        showStats={true}
        timeFrame={timeFrame}
      />
    );
  };

  const renderTopThree = () => {
    if (!leaderboard || leaderboard.length === 0) return null;

    const topThree = leaderboard.slice(0, 3);
    
    return (
      <View style={styles.topThreeContainer}>
        <Text style={styles.topThreeTitle}>🏆 Top Performers</Text>
        <View style={styles.podium}>
          {topThree.map((item, index) => {
            if (!item || !item.user) return null;
            
            const rank = item.rank || (index + 1);
            const podiumHeight = rank === 1 ? 80 : rank === 2 ? 60 : 40;
            const podiumColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
            
            return (
              <TouchableOpacity
                key={item.user.id || `podium_${index}`}
                style={[
                  styles.podiumItem,
                  { height: podiumHeight, backgroundColor: podiumColors[index] || '#cd7f32' }
                ]}
                onPress={() => handleUserPress(item.user)}
              >
                <View style={styles.podiumUser}>
                  <Text style={styles.podiumRank}>{rank}</Text>
                  <Text style={styles.podiumUsername} numberOfLines={1}>
                    {item.user.username || 'Unknown'}
                  </Text>
                  <Text style={styles.podiumScore}>{item.points || 0}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Leaderboard Data</Text>
      <Text style={styles.emptySubtitle}>
        {!user 
          ? 'Please log in to view the leaderboard'
          : 'Be the first to make predictions and climb the leaderboard!'
        }
      </Text>
      {user && (
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('CreatePrediction')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create Prediction</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading leaderboard...</Text>
    </View>
  );

  // Handle no user state
  if (!user) {
    return (
      <View style={styles.container}>
        {renderTimeFrameSelector()}
        <View style={styles.notLoggedInContainer}>
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text style={styles.notLoggedInTitle}>Login Required</Text>
          <Text style={styles.notLoggedInText}>
            Please log in to view the leaderboard and compete with other users.
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Auth')}
          >
            <Ionicons name="log-in" size={20} color="#fff" />
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={styles.container}>
        {renderTimeFrameSelector()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const remainingUsers = leaderboard.slice(3);
  const hasLeaderboardData = leaderboard && leaderboard.length > 0;

  return (
    <View style={styles.container}>
      {renderTimeFrameSelector()}
      
      {loading && !refreshing ? renderLoadingIndicator() : (
        <FlatList
          data={remainingUsers}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item, index) => item?.user?.id?.toString() || `item_${index}`}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {renderUserStats()}
              {hasLeaderboardData && renderTopThree()}
              {remainingUsers.length > 0 && (
                <Text style={styles.remainingTitle}>All Rankings</Text>
              )}
            </>
          }
          ListEmptyComponent={!loading && !hasLeaderboardData ? renderEmptyState : null}
          contentContainerStyle={[
            styles.listContent,
            !hasLeaderboardData && styles.emptyContent
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  timeFrameContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 50,
  },
  timeFrameSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  timeFrameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  activeTimeFrame: {
    backgroundColor: '#007AFF',
  },
  timeFrameText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  activeTimeFrameText: {
    color: 'white',
  },
  userStatsCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  topThreeContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topThreeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
  },
  podiumItem: {
    width: 80,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'flex-end',
    paddingBottom: 8,
    marginHorizontal: 4,
  },
  podiumUser: {
    alignItems: 'center',
  },
  podiumRank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  podiumUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: 10,
    color: 'white',
  },
  remainingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f5f5f5',
  },
  notLoggedInTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LeaderboardScreen;