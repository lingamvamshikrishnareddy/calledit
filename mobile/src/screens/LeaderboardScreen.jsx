// src/screens/LeaderboardScreen.jsx
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
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Load leaderboard and user rank concurrently
      const [leaderboardData, rankData] = await Promise.all([
        ApiService.getLeaderboard(timeFrame, 50),
        ApiService.getMyRank(timeFrame).catch(() => null) // Don't fail if rank not found
      ]);

      setLeaderboard(leaderboardData);
      setUserRank(rankData);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (selectedUser) => {
    navigation.navigate('UserProfile', { userId: selectedUser.id });
  };

  const onRefresh = useCallback(async () => {
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
            onPress={() => setTimeFrame(option.key)}
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
    if (!user || !userRank) return null;

    const userStats = [
      {
        icon: 'trophy',
        label: 'Rank',
        value: userRank.rank ? `#${userRank.rank}` : 'Unranked',
        color: userRank.rank && userRank.rank <= 3 ? '#ffd700' : '#007AFF',
      },
      {
        icon: 'trending-up',
        label: 'Points',
        value: userRank.points?.toString() || '0',
        color: '#4caf50',
        subtitle: `${timeFrame.replace('_', ' ').toUpperCase()}`
      },
      {
        icon: 'target',
        label: 'Accuracy',
        value: userRank.accuracy_rate ? `${(userRank.accuracy_rate * 100).toFixed(1)}%` : '0%',
        color: '#ff9500',
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

  const renderLeaderboardItem = ({ item, index }) => (
    <LeaderboardItem
      user={{
        id: item.user.id,
        username: item.user.username,
        display_name: item.user.display_name,
        avatar_url: item.user.avatar_url,
        total_points: item.points,
        predictions_made: item.predictions_made,
        predictions_correct: item.predictions_correct,
        accuracy_rate: item.accuracy_rate,
        streak: item.streak
      }}
      rank={item.rank}
      onPress={handleUserPress}
      showStats={true}
      timeFrame={timeFrame}
    />
  );

  const renderTopThree = () => {
    if (!leaderboard || leaderboard.length === 0) return null;

    const topThree = leaderboard.slice(0, 3);
    
    return (
      <View style={styles.topThreeContainer}>
        <Text style={styles.topThreeTitle}>🏆 Top Performers</Text>
        <View style={styles.podium}>
          {topThree.map((item, index) => {
            const rank = item.rank;
            const podiumHeight = rank === 1 ? 80 : rank === 2 ? 60 : 40;
            const podiumColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
            
            return (
              <TouchableOpacity
                key={item.user.id}
                style={[
                  styles.podiumItem,
                  { height: podiumHeight, backgroundColor: podiumColors[index] }
                ]}
                onPress={() => handleUserPress(item.user)}
              >
                <View style={styles.podiumUser}>
                  <Text style={styles.podiumRank}>{rank}</Text>
                  <Text style={styles.podiumUsername} numberOfLines={1}>
                    {item.user.username}
                  </Text>
                  <Text style={styles.podiumScore}>{item.points}</Text>
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
        Be the first to make predictions and climb the leaderboard!
      </Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => navigation.navigate('CreatePrediction')}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Prediction</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading leaderboard...</Text>
    </View>
  );

  if (error && !refreshing) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#f44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const remainingUsers = leaderboard.slice(3);

  return (
    <View style={styles.container}>
      {renderTimeFrameSelector()}
      
      {loading && !refreshing ? renderLoadingIndicator() : (
        <FlatList
          data={remainingUsers}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.user.id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#007AFF']}
            />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {renderUserStats()}
              {renderTopThree()}
              {remainingUsers.length > 0 && (
                <Text style={styles.remainingTitle}>All Rankings</Text>
              )}
            </>
          }
          ListEmptyComponent={!loading && leaderboard.length === 0 ? renderEmptyState : null}
          contentContainerStyle={[
            styles.listContent,
            leaderboard.length === 0 && styles.emptyContent
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