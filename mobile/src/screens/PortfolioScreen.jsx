// src/screens/PortfolioScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../services/api';
import AuthService from '../services/auth';

const { width } = Dimensions.get('window');

const PortfolioScreen = ({ navigation }) => {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [userVotes, setUserVotes] = useState([]);
  const [voteStatistics, setVoteStatistics] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'completed', 'stats'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen for auth changes
    const unsubscribe = AuthService.addAuthListener(({ user: authUser }) => {
      setUser(authUser);
    });

    // Initial data load
    loadPortfolioData();

    return unsubscribe;
  }, []);

  useEffect(() => {
    loadPortfolioData();
  }, [activeTab]);

  const loadPortfolioData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [votesData, statsData] = await Promise.all([
        ApiService.getMyVotes(50, 0),
        ApiService.getVoteStatistics().catch(() => null)
      ]);

      setUserVotes(votesData);
      setVoteStatistics(statsData);
    } catch (err) {
      console.error('Error loading portfolio data:', err);
      setError('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPortfolioData();
      // Also refresh user data
      await AuthService.refreshCurrentUser();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleVotePress = (vote) => {
    navigation.navigate('PredictionDetail', { 
      predictionId: vote.prediction_id,
      prediction: vote.prediction 
    });
  };

  const handleDeleteVote = async (voteId) => {
    Alert.alert(
      'Delete Vote',
      'Are you sure you want to delete this vote? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteVote(voteId);
              await loadPortfolioData();
              Alert.alert('Success', 'Vote deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete vote');
            }
          }
        }
      ]
    );
  };

  const filterVotes = () => {
    if (!userVotes) return [];
    
    switch (activeTab) {
      case 'active':
        return userVotes.filter(vote => 
          vote.prediction?.status === 'open' || 
          vote.prediction?.status === 'active'
        );
      case 'completed':
        return userVotes.filter(vote => 
          vote.prediction?.status === 'resolved' || 
          vote.prediction?.status === 'closed'
        );
      default:
        return userVotes;
    }
  };

  const renderStatsOverview = () => {
    if (!user) return null;

    const stats = [
      {
        icon: 'trophy',
        label: 'Total Points',
        value: user.total_points?.toString() || '0',
        color: '#ffd700',
      },
      {
        icon: 'target',
        label: 'Accuracy',
        value: user.accuracy_rate ? `${(user.accuracy_rate * 100).toFixed(1)}%` : '0%',
        color: '#4caf50',
      },
      {
        icon: 'flame',
        label: 'Current Streak',
        value: user.current_streak?.toString() || '0',
        color: '#ff6b35',
      },
      {
        icon: 'trending-up',
        label: 'Level',
        value: user.level?.toString() || '1',
        color: '#667eea',
      },
    ];

    return (
      <View style={styles.statsOverview}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
              <Ionicons name={stat.icon} size={24} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'active', label: 'Active', icon: 'pulse' },
        { key: 'completed', label: 'History', icon: 'checkmark-done' },
        { key: 'stats', label: 'Statistics', icon: 'analytics' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Ionicons 
            name={tab.icon} 
            size={18} 
            color={activeTab === tab.key ? '#667eea' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === tab.key && styles.activeTabText
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderVoteItem = ({ item }) => {
    const isActive = item.prediction?.status === 'open' || item.prediction?.status === 'active';
    const isCorrect = item.prediction?.status === 'resolved' && 
                     item.prediction?.result === item.vote;

    return (
      <TouchableOpacity 
        style={styles.voteCard}
        onPress={() => handleVotePress(item)}
      >
        <View style={styles.voteHeader}>
          <View style={styles.voteInfo}>
            <View style={[
              styles.voteIndicator, 
              { backgroundColor: item.vote ? '#4caf50' : '#f44336' }
            ]}>
              <Ionicons 
                name={item.vote ? 'thumbs-up' : 'thumbs-down'} 
                size={16} 
                color="#fff" 
              />
            </View>
            <View style={styles.voteDetails}>
              <Text style={styles.voteTitle} numberOfLines={2}>
                {item.prediction?.title || 'Unknown Prediction'}
              </Text>
              <Text style={styles.voteSubtitle}>
                Confidence: {item.confidence}% • {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.voteActions}>
            {!isActive && (
              <View style={[
                styles.resultBadge,
                { backgroundColor: isCorrect ? '#4caf50' : '#f44336' }
              ]}>
                <Text style={styles.resultText}>
                  {isCorrect ? '+' + (item.points_earned || 0) : '0'}
                </Text>
              </View>
            )}
            
            {isActive && (
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteVote(item.id)}
              >
                <Ionicons name="trash" size={18} color="#f44336" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.voteFooter}>
          <View style={[
            styles.statusBadge, 
            { 
              backgroundColor: isActive ? '#ffa50020' : '#66666620',
            }
          ]}>
            <Text style={[
              styles.statusText,
              { color: isActive ? '#ffa500' : '#666' }
            ]}>
              {item.prediction?.status?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
          
          {item.prediction?.closes_at && (
            <Text style={styles.closesAt}>
              {isActive ? 'Closes: ' : 'Closed: '}
              {new Date(item.prediction.closes_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatistics = () => {
    if (!voteStatistics && !user) {
      return (
        <View style={styles.noStatsContainer}>
          <Ionicons name="analytics-outline" size={64} color="#ccc" />
          <Text style={styles.noStatsTitle}>No Statistics Yet</Text>
          <Text style={styles.noStatsText}>
            Make some predictions to see your performance statistics here.
          </Text>
        </View>
      );
    }

    const userStats = AuthService.getUserStats();
    
    return (
      <ScrollView style={styles.statisticsContainer} showsVerticalScrollIndicator={false}>
        {/* Performance Overview */}
        <View style={styles.performanceCard}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.performanceGradient}
          >
            <Text style={styles.performanceTitle}>Performance Overview</Text>
            <View style={styles.performanceStats}>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceValue}>
                  {userStats?.predictionsMade || userVotes.length || 0}
                </Text>
                <Text style={styles.performanceLabel}>Predictions</Text>
              </View>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceValue}>
                  {userStats?.predictionsCorrect || 
                   userVotes.filter(vote => 
                     vote.prediction?.status === 'resolved' && 
                     vote.prediction?.result === vote.vote
                   ).length || 0}
                </Text>
                <Text style={styles.performanceLabel}>Correct</Text>
              </View>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceValue}>
                  {user?.accuracy_rate ? `${(user.accuracy_rate * 100).toFixed(1)}%` : '0%'}
                </Text>
                <Text style={styles.performanceLabel}>Accuracy</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Streak Information */}
        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <Ionicons name="flame" size={24} color="#ff6b35" />
            <Text style={styles.streakTitle}>Streak Information</Text>
          </View>
          <View style={styles.streakStats}>
            <View style={styles.streakStat}>
              <Text style={styles.streakValue}>
                {user?.current_streak || 0}
              </Text>
              <Text style={styles.streakLabel}>Current Streak</Text>
            </View>
            <View style={styles.streakStat}>
              <Text style={styles.streakValue}>
                {user?.longest_streak || userStats?.longestStreak || 0}
              </Text>
              <Text style={styles.streakLabel}>Best Streak</Text>
            </View>
          </View>
        </View>

        {/* Points Breakdown */}
        <View style={styles.pointsCard}>
          <Text style={styles.cardTitle}>Points Breakdown</Text>
          <View style={styles.pointsBreakdown}>
            <View style={styles.pointsRow}>
              <Text style={styles.pointsLabel}>Total Points</Text>
              <Text style={styles.pointsValue}>{user?.total_points || 0}</Text>
            </View>
            <View style={styles.pointsRow}>
              <Text style={styles.pointsLabel}>Current Level</Text>
              <Text style={styles.pointsValue}>Level {user?.level || 1}</Text>
            </View>
            <View style={styles.pointsRow}>
              <Text style={styles.pointsLabel}>Points to Next Level</Text>
              <Text style={styles.pointsValue}>
                {Math.max(0, ((user?.level || 1) * 1000) - (user?.total_points || 0))}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Activity Summary */}
        {voteStatistics && (
          <View style={styles.activityCard}>
            <Text style={styles.cardTitle}>Recent Activity</Text>
            <View style={styles.activityStats}>
              <View style={styles.activityStat}>
                <Ionicons name="calendar" size={20} color="#667eea" />
                <Text style={styles.activityLabel}>This Week</Text>
                <Text style={styles.activityValue}>
                  {voteStatistics.this_week_votes || 0} votes
                </Text>
              </View>
              <View style={styles.activityStat}>
                <Ionicons name="trending-up" size={20} color="#4caf50" />
                <Text style={styles.activityLabel}>This Month</Text>
                <Text style={styles.activityValue}>
                  {voteStatistics.this_month_votes || 0} votes
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderEmptyState = () => {
    const messages = {
      active: {
        icon: 'pulse-outline',
        title: 'No Active Predictions',
        subtitle: 'You have no active predictions. Start making some predictions!',
        buttonText: 'Browse Predictions',
        action: () => navigation.navigate('Home')
      },
      completed: {
        icon: 'checkmark-done-outline',
        title: 'No Completed Predictions',
        subtitle: 'Your completed predictions will appear here once they are resolved.',
        buttonText: 'Make Prediction',
        action: () => navigation.navigate('CreatePrediction')
      },
    };

    const config = messages[activeTab];
    if (!config) return null;

    return (
      <View style={styles.emptyState}>
        <Ionicons name={config.icon} size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>{config.title}</Text>
        <Text style={styles.emptySubtitle}>{config.subtitle}</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={config.action}>
          <Text style={styles.emptyButtonText}>{config.buttonText}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#667eea" />
      <Text style={styles.loadingText}>Loading portfolio...</Text>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={48} color="#ccc" />
        <Text style={styles.errorText}>Please log in to view your portfolio</Text>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  const filteredVotes = filterVotes();

  return (
    <View style={styles.container}>
      {/* Stats Overview */}
      {renderStatsOverview()}

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Content */}
      {loading && !refreshing ? renderLoadingIndicator() : (
        <>
          {activeTab === 'stats' ? renderStatistics() : (
            <FlatList
              data={filteredVotes}
              renderItem={renderVoteItem}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  colors={['#667eea']}
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.listContent,
                filteredVotes.length === 0 && styles.emptyContent
              ]}
              ListEmptyComponent={!loading && filteredVotes.length === 0 ? renderEmptyState : null}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  statsOverview: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#667eea',
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContent: {
    flexGrow: 1,
  },
  voteCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  voteInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  voteIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  voteDetails: {
    flex: 1,
  },
  voteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  voteSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  voteActions: {
    alignItems: 'center',
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    padding: 4,
  },
  voteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  closesAt: {
    fontSize: 10,
    color: '#666',
  },
  statisticsContainer: {
    flex: 1,
  },
  performanceCard: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  performanceGradient: {
    padding: 20,
    alignItems: 'center',
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  performanceStat: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  streakCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  streakStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  streakStat: {
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: '#666',
  },
  pointsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  pointsBreakdown: {
    gap: 12,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#666',
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activityCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityStats: {
    gap: 12,
  },
  activityStat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginLeft: 8,
  },
  activityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  noStatsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noStatsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noStatsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
  emptyButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PortfolioScreen;