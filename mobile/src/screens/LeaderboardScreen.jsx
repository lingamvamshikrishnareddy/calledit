// src/screens/LeaderboardScreen.jsx - Hot Pink & Cyan Theme
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
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LeaderboardItem from '../components/leaderboard/LeaderboardItem';
import StatsCard from '../components/leaderboard/StatsCard';
import ApiService from '../services/api';
import { useAuth } from '../hooks/useAuth';

const { width, height } = Dimensions.get('window');

const LeaderboardScreen = ({ navigation }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [timeFrame, setTimeFrame] = useState('weekly');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const timeFrameOptions = [
    { key: 'weekly', label: 'This Week', icon: 'calendar', color: '#f60976' },
    { key: 'monthly', label: 'This Month', icon: 'calendar-outline', color: '#00d4ff' },
    { key: 'all_time', label: 'All Time', icon: 'trophy', color: '#ff6b35' },
  ];

  useEffect(() => {
    if (!authLoading) {
      loadLeaderboardData();
    }
  }, [authLoading, timeFrame]);

  const loadLeaderboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 LeaderboardScreen: Loading data for timeFrame:', timeFrame);
      
      const promises = [];
      
      promises.push(
        ApiService.getLeaderboard(timeFrame, 50).catch(err => {
          console.error('❌ Leaderboard fetch failed:', err);
          return [];
        })
      );
      
      if (isAuthenticated && user) {
        promises.push(
          ApiService.getMyRank(timeFrame).catch(err => {
            console.error('❌ Rank fetch failed:', err);
            return null;
          })
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      const [leaderboardData, rankData] = await Promise.all(promises);

      console.log('✅ Data loaded:', {
        leaderboardCount: Array.isArray(leaderboardData) ? leaderboardData.length : 0,
        hasUserRank: !!rankData,
        isAuthenticated,
      });

      setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
      setUserRank(rankData);
      
    } catch (err) {
      console.error('❌ LeaderboardScreen: Critical error:', err);
      setError('Failed to load leaderboard data. Please try again.');
      setLeaderboard([]);
      setUserRank(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (selectedUser) => {
    try {
      if (!selectedUser || !selectedUser.id) {
        console.warn('⚠️ Invalid user selected:', selectedUser);
        return;
      }
      
      console.log('👤 Navigating to user profile:', selectedUser.username || selectedUser.id);
      navigation.navigate('UserProfile', { userId: selectedUser.id });
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    try {
      console.log('🔄 LeaderboardScreen: Refreshing...');
      setRefreshing(true);
      await loadLeaderboardData();
    } catch (error) {
      console.error('❌ Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [timeFrame, isAuthenticated]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <View style={styles.headerIconBg}>
              <Ionicons name="trophy" size={32} color="#FFD700" />
            </View>
          </View>
          <Text style={styles.headerTitle}>Global Leaderboard</Text>
          <Text style={styles.headerSubtitle}>
            Compete with the world's best traders
          </Text>
          
          {/* Decorative elements */}
          <View style={styles.decorativeElements}>
            <View style={[styles.decorativeDot, { backgroundColor: '#f60976' }]} />
            <View style={[styles.decorativeDot, { backgroundColor: '#00d4ff' }]} />
            <View style={[styles.decorativeDot, { backgroundColor: '#ff6b35' }]} />
          </View>
        </View>
      </View>
      
      {/* Time Frame Selector */}
      <View style={styles.timeFrameWrapper}>
        <View style={styles.timeFrameBackground}>
          <Text style={styles.timeFrameLabel}>Performance Period</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeFrameContainer}
          >
            {timeFrameOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.timeFrameButton,
                  timeFrame === option.key && styles.activeTimeFrame
                ]}
                onPress={() => {
                  try {
                    console.log('📅 Time frame changed to:', option.key);
                    setTimeFrame(option.key);
                  } catch (error) {
                    console.error('❌ TimeFrame change error:', error);
                  }
                }}
              >
                {timeFrame === option.key ? (
                  <View style={[styles.activeTimeFrameContent, { backgroundColor: option.color }]}>
                    <View style={styles.activeTimeFrameIcon}>
                      <Ionicons name={option.icon} size={18} color="#FFFFFF" />
                    </View>
                    <Text style={styles.activeTimeFrameText}>{option.label}</Text>
                  </View>
                ) : (
                  <View style={styles.inactiveTimeFrameContent}>
                    <Ionicons name={option.icon} size={18} color="#9CA3AF" />
                    <Text style={styles.timeFrameText}>{option.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );

  const renderUserStats = () => {
    if (!isAuthenticated || !user) return null;

    const statsData = userRank || {
      rank: null,
      points: user.total_points || 0,
      accuracy_rate: user.accuracy_rate || 0,
      streak: user.current_streak || 0
    };

    return (
      <View style={styles.userStatsWrapper}>
        <View style={styles.userStatsCard}>
          <View style={styles.statsHeader}>
            <View style={styles.statsHeaderContent}>
              <View style={styles.statsTitleContainer}>
                <View style={styles.statsIconContainer}>
                  <Ionicons name="person" size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.statsTitle}>Your Performance</Text>
              </View>
              <View style={styles.timeFrameBadge}>
                <Text style={styles.statsSubtitle}>
                  {timeFrame.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: statsData.rank && statsData.rank <= 3 ? '#FFD700' : '#f60976' }]}>
                <Ionicons name="trophy" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>
                {statsData.rank ? `#${statsData.rank}` : 'Unranked'}
              </Text>
              <Text style={styles.statLabel}>Global Rank</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#00d4ff' }]}>
                <Ionicons name="trending-up" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>{statsData.points?.toLocaleString() || '0'}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="target" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>
                {statsData.accuracy_rate ? `${(statsData.accuracy_rate * 100).toFixed(1)}%` : '0%'}
              </Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="flame" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>{statsData.streak || 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderPodium = () => {
    if (!leaderboard || leaderboard.length === 0) return null;

    const topThree = leaderboard.slice(0, 3);
    if (topThree.length === 0) return null;

    const podiumOrder = [1, 0, 2]; // Second, First, Third
    const podiumHeights = [80, 100, 60];
    const podiumColors = ['#C0C0C0', '#FFD700', '#CD7F32']; // Silver, Gold, Bronze

    return (
      <View style={styles.podiumWrapper}>
        <View style={styles.podiumCard}>
          <View style={styles.podiumHeader}>
            <View style={styles.podiumHeaderIcon}>
              <Ionicons name="trophy" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.podiumTitle}>Top Performers</Text>
            <Text style={styles.podiumSubtitle}>Elite traders of the period</Text>
          </View>
          
          <View style={styles.podium}>
            {podiumOrder.map((index) => {
              const item = topThree[index];
              if (!item || !item.user) return null;
              
              const displayIndex = podiumOrder.indexOf(index);
              const rank = item.rank || (index + 1);
              
              return (
                <TouchableOpacity
                  key={item.user.id || `podium_${index}`}
                  style={styles.podiumItemContainer}
                  onPress={() => handleUserPress(item.user)}
                  activeOpacity={0.8}
                >
                  <View style={styles.podiumUserInfo}>
                    <View style={[styles.podiumAvatar, rank === 1 && styles.firstPlaceAvatar]}>
                      <Text style={styles.podiumAvatarText}>
                        {(item.user.display_name || item.user.username || 'U').charAt(0).toUpperCase()}
                      </Text>
                      {rank === 1 && (
                        <View style={styles.crownIcon}>
                          <Ionicons name="diamond" size={12} color="#FFD700" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.podiumUsername} numberOfLines={1}>
                      {item.user.display_name || item.user.username || 'User'}
                    </Text>
                    <Text style={styles.podiumScore}>
                      {item.points?.toLocaleString() || 0} pts
                    </Text>
                  </View>
                  
                  <View
                    style={[
                      styles.podiumBase,
                      { 
                        height: podiumHeights[displayIndex],
                        backgroundColor: podiumColors[index] || podiumColors[2]
                      }
                    ]}
                  >
                    <View style={styles.podiumRankContainer}>
                      <Text style={styles.podiumRank}>{rank}</Text>
                      <Ionicons 
                        name={rank === 1 ? "trophy" : rank === 2 ? "medal" : "ribbon"} 
                        size={rank === 1 ? 28 : 24} 
                        color="#FFFFFF" 
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderLeaderboardItem = ({ item, index }) => {
    try {
      if (!item || !item.user) {
        console.warn('⚠️ Invalid leaderboard item:', item);
        return null;
      }

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

      const rank = item.rank || (index + 4);
      const isTopTen = rank <= 10;

      return (
        <TouchableOpacity
          onPress={() => handleUserPress(safeItem)}
          activeOpacity={0.8}
          style={styles.itemWrapper}
        >
          <View style={[styles.leaderboardItem, isTopTen && styles.topTenItem]}>
            <View style={styles.rankContainer}>
              <View style={[styles.rankBadge, { backgroundColor: rank <= 3 ? '#FFD700' : isTopTen ? '#f60976' : '#4B5563' }]}>
                <Text style={styles.rankText}>#{rank}</Text>
              </View>
            </View>
            
            <View style={styles.userContainer}>
              <View style={styles.userAvatarContainer}>
                <View style={styles.avatarBackground}>
                  <Text style={styles.avatarText}>
                    {safeItem.display_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                {isTopTen && (
                  <View style={styles.avatarBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                  </View>
                )}
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {safeItem.display_name}
                </Text>
                <View style={styles.userStatsRow}>
                  <Text style={styles.userStatsText}>
                    {safeItem.predictions_made} predictions
                  </Text>
                  <View style={styles.accuracyBadge}>
                    <Text style={styles.accuracyText}>
                      {(safeItem.accuracy_rate * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsText}>
                {safeItem.total_points.toLocaleString()}
              </Text>
              <Text style={styles.pointsLabel}>points</Text>
              {safeItem.streak > 0 && (
                <View style={styles.streakIndicator}>
                  <Ionicons name="flame" size={12} color="#EF4444" />
                  <Text style={styles.streakText}>{safeItem.streak}</Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity style={styles.chevronContainer}>
              <Ionicons name="chevron-forward" size={20} color="#f60976" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    } catch (error) {
      console.error('❌ Error rendering leaderboard item:', error);
      return null;
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateContent}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="trophy-outline" size={60} color="#FFFFFF" />
        </View>
        <Text style={styles.emptyTitle}>No Rankings Yet</Text>
        <Text style={styles.emptySubtitle}>
          {!isAuthenticated 
            ? 'Join the competition and climb the ranks among the world\'s best traders'
            : 'Start making predictions to appear on the global leaderboard!'
          }
        </Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            try {
              navigation.navigate(isAuthenticated ? 'CreatePrediction' : 'Auth');
            } catch (error) {
              console.error('❌ Navigation error:', error);
            }
          }}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons 
              name={isAuthenticated ? "add" : "log-in"} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.actionButtonText}>
              {isAuthenticated ? 'Make Prediction' : 'Join Competition'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <View style={styles.errorContent}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="alert-circle" size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.errorTitle}>Connection Failed</Text>
        <Text style={styles.errorText}>{error || 'Unable to load leaderboard data'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            try {
              onRefresh();
            } catch (error) {
              console.error('❌ Retry error:', error);
            }
          }}
        >
          <View style={styles.retryContent}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
          <Text style={styles.loadingText}>Initializing leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !refreshing && leaderboard.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        {renderHeader()}
        {renderError()}
      </SafeAreaView>
    );
  }

  const remainingUsers = leaderboard.slice(3);
  const hasLeaderboardData = leaderboard && leaderboard.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      {loading && !refreshing ? (
        <View style={styles.container}>
          {renderHeader()}
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
            <Text style={styles.loadingText}>Loading global rankings...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={remainingUsers}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item, index) => {
            try {
              return item?.user?.id?.toString() || `item_${index}`;
            } catch {
              return `fallback_${index}`;
            }
          }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#f60976', '#00d4ff']}
              tintColor="#f60976"
              progressBackgroundColor="#1A1A1A"
            />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <>
              {renderHeader()}
              {renderUserStats()}
              {hasLeaderboardData && renderPodium()}
              {remainingUsers.length > 0 && (
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleIcon}>
                    <Ionicons name="list" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={styles.sectionTitle}>Complete Rankings</Text>
                  <View style={styles.sectionDivider} />
                </View>
              )}
            </>
          )}
          ListEmptyComponent={!loading && !hasLeaderboardData ? renderEmptyState : null}
          contentContainerStyle={[
            styles.listContent,
            !hasLeaderboardData && !loading && styles.emptyContent
          ]}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  
  // Header Styles
  headerContainer: {
    marginBottom: 0,
  },
  headerBackground: {
    backgroundColor: '#1A1A1A',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  headerContent: {
    alignItems: 'center',
    position: 'relative',
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  headerIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f60976',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    fontWeight: '500',
  },
  decorativeElements: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  decorativeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
  },
  
  // Time Frame Selector
  timeFrameWrapper: {
    marginTop: -20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  timeFrameBackground: {
    backgroundColor: '#2A2A2A',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  timeFrameLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeFrameContainer: {
    gap: 16,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  timeFrameButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  activeTimeFrameContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  activeTimeFrameIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  inactiveTimeFrameContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#333',
  },
  timeFrameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeTimeFrameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // User Stats
  userStatsWrapper: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  userStatsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#333',
  },
  statsHeader: {
    marginBottom: 28,
  },
  statsHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f60976',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timeFrameBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  statsSubtitle: {
    fontSize: 11,
    color: '#00d4ff',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Podium
  podiumWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  podiumCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#333',
  },
  podiumHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  podiumHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f60976',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  podiumTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  podiumSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 20,
    paddingHorizontal: 12,
  },
  podiumItemContainer: {
    alignItems: 'center',
    flex: 1,
  },
  podiumUserInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f60976',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  firstPlaceAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  crownIcon: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  podiumAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  podiumUsername: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  podiumScore: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  podiumBase: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  podiumRankContainer: {
    alignItems: 'center',
    gap: 8,
  },
  podiumRank: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  sectionTitleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f60976',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  sectionDivider: {
    flex: 2,
    height: 2,
    backgroundColor: '#f60976',
    borderRadius: 1,
    opacity: 0.3,
  },
  
  // Leaderboard Items
  itemWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  topTenItem: {
    borderColor: '#f60976',
    backgroundColor: '#2A1A2A',
  },
  rankContainer: {
    marginRight: 16,
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  userAvatarContainer: {
    position: 'relative',
  },
  avatarBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f60976',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userStatsText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  accuracyBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  accuracyText: {
    fontSize: 11,
    color: '#00d4ff',
    fontWeight: '600',
  },
  pointsContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pointsLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  streakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  streakText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
  },
  chevronContainer: {
    padding: 4,
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f60976',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.8,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    paddingHorizontal: 32,
  },
  emptyStateContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 48,
    marginVertical: 32,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f60976',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f60976',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Error State
  errorState: {
    flex: 1,
    paddingHorizontal: 32,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 48,
    marginVertical: 32,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 32,
  },
  retryButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  retryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f60976',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 10,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // List Content
  listContent: {
    paddingBottom: 32,
  },
  emptyContent: {
    flex: 1,
  },
});

export default LeaderboardScreen;