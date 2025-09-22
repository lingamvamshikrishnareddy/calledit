// src/screens/PortfolioScreen.jsx - FIXED: Clean implementation without errors
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
  Image,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import ApiService from '../services/api';

const { width } = Dimensions.get('window');

const PortfolioScreen = ({ navigation }) => {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  
  // State management
  const [stats, setStats] = useState(null);
  const [myVotes, setMyVotes] = useState([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [canClaimBonus, setCanClaimBonus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('wallet');

  // Load data when user is authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      console.log('📱 PortfolioScreen: User authenticated, loading portfolio data...');
      loadPortfolioData();
    } else if (!authLoading && !isAuthenticated) {
      console.log('❌ PortfolioScreen: User not authenticated');
      resetState();
    }
  }, [authLoading, isAuthenticated, user]);

  const resetState = () => {
    setStats(null);
    setMyVotes([]);
    setPointsBalance(0);
    setPointsHistory([]);
    setCanClaimBonus(false);
  };

  const loadPortfolioData = async () => {
    if (!isAuthenticated || !user) {
      console.log('⚠️ PortfolioScreen: Cannot load data - user not authenticated');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 PortfolioScreen: Loading portfolio data...');
      
      const [votesResult, balanceResult, historyResult, bonusResult] = await Promise.allSettled([
        ApiService.getMyVotes(50, 0),
        ApiService.getPointsBalance(),
        ApiService.getPointsHistory(20),
        ApiService.canClaimDailyBonus()
      ]);

      // Handle votes
      if (votesResult.status === 'fulfilled') {
        const votes = Array.isArray(votesResult.value) ? votesResult.value : [];
        console.log('✅ My votes loaded:', votes.length);
        setMyVotes(votes);
        
        // Generate stats immediately after loading votes
        generateStats(votes, balanceResult.status === 'fulfilled' ? balanceResult.value : user.total_points || 0);
      } else {
        console.error('❌ Failed to load votes:', votesResult.reason);
        setMyVotes([]);
        generateStats([], balanceResult.status === 'fulfilled' ? balanceResult.value : user.total_points || 0);
      }

      // Handle points balance
      if (balanceResult.status === 'fulfilled') {
        console.log('✅ Points balance loaded:', balanceResult.value);
        setPointsBalance(balanceResult.value);
      } else {
        console.error('❌ Failed to load balance:', balanceResult.reason);
        setPointsBalance(user.total_points || 0);
      }

      // Handle points history
      if (historyResult.status === 'fulfilled') {
        console.log('✅ Points history loaded:', historyResult.value.length);
        setPointsHistory(historyResult.value);
      } else {
        console.error('❌ Failed to load history:', historyResult.reason);
        setPointsHistory([]);
      }

      // Handle daily bonus check
      if (bonusResult.status === 'fulfilled') {
        console.log('✅ Daily bonus check:', bonusResult.value);
        setCanClaimBonus(bonusResult.value);
      } else {
        console.error('❌ Failed to check bonus:', bonusResult.reason);
        setCanClaimBonus(false);
      }
      
    } catch (err) {
      console.error('❌ PortfolioScreen: Error loading portfolio data:', err);
      setError(err.message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const generateStats = useCallback((votes = myVotes, balance = pointsBalance) => {
    if (!user) return;
    
    try {
      console.log('📊 Generating stats with votes:', votes.length);
      
      const totalBets = votes?.length || 0;
      const activeBets = votes?.filter(vote => !vote.is_resolved)?.length || 0;
      const resolvedBets = votes?.filter(vote => vote.is_resolved)?.length || 0;
      const correctBets = votes?.filter(vote => vote.is_resolved && vote.is_correct)?.length || 0;
      const winRate = resolvedBets > 0 ? (correctBets / resolvedBets) * 100 : 0;
      
      // Calculate total points spent and earned
      const totalPointsSpent = votes?.reduce((sum, vote) => sum + (vote.points_spent || 0), 0) || 0;
      const totalPointsEarned = votes?.reduce((sum, vote) => sum + (vote.points_earned || 0), 0) || 0;
      
      const userStats = {
        totalBets,
        activeBets,
        resolvedBets,
        correctBets,
        winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal place
        pointsBalance: balance,
        totalPoints: user.total_points || 0,
        totalPointsSpent,
        totalPointsEarned,
        netProfit: totalPointsEarned - totalPointsSpent,
        currentStreak: user.current_streak || 0,
        longestStreak: user.longest_streak || 0,
        accuracyRate: user.accuracy_rate || winRate,
        level: user.level || 1,
      };
      
      console.log('📊 Generated stats:', userStats);
      setStats(userStats);
    } catch (err) {
      console.error('❌ Error generating stats:', err);
      setStats({
        totalBets: 0,
        activeBets: 0,
        resolvedBets: 0,
        correctBets: 0,
        winRate: 0,
        pointsBalance: 0,
        totalPoints: 0,
        totalPointsSpent: 0,
        totalPointsEarned: 0,
        netProfit: 0,
        currentStreak: 0,
        longestStreak: 0,
        accuracyRate: 0,
        level: 1,
      });
    }
  }, [user, myVotes, pointsBalance]);

  const handleClaimBonus = async () => {
    if (!canClaimBonus) return;

    try {
      setLoading(true);
      const result = await ApiService.claimDailyBonus();
      
      if (result.success) {
        Alert.alert(
          'Daily Bonus Claimed!',
          `You earned ${result.bonus_amount} points! Keep your streak going!`,
          [{ text: 'Awesome!', style: 'default' }]
        );
        
        // Refresh data to show new balance
        await loadPortfolioData();
      } else {
        Alert.alert('Cannot Claim Bonus', result.error || 'Unable to claim bonus at this time');
      }
    } catch (error) {
      console.error('❌ Failed to claim bonus:', error);
      Alert.alert('Error', error.message || 'Failed to claim daily bonus');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    setRefreshing(true);
    try {
      await loadPortfolioData();
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  const handleShare = async () => {
    try {
      const shareMessage = `Check out my prediction portfolio! 🎯\n\n💰 ${stats?.pointsBalance || 0} points balance\n🎲 ${stats?.totalBets || 0} predictions made\n🏆 ${stats?.correctBets || 0} correct predictions\n🔥 ${stats?.currentStreak || 0} day streak\n\nJoin me on PredictIt!`;
      
      await Share.share({
        message: shareMessage,
        title: 'My Prediction Portfolio',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

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
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  const formatPnL = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value}`;
  };

  // Better prediction title extraction
  const getPredictionTitle = (vote) => {
    // Try multiple sources for the title
    if (vote.prediction?.title) {
      return vote.prediction.title;
    }
    if (vote.title) {
      return vote.title;
    }
    if (vote.question) {
      return vote.question;
    }
    if (vote.prediction?.description) {
      return vote.prediction.description;
    }
    if (vote.description) {
      return vote.description;
    }
    return `Prediction ${vote.id ? vote.id.slice(0, 8) : 'Unknown'}`;
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#1F2937', '#374151']}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={['#EC4899', '#BE185D']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarText}>
                  {(user?.display_name || user?.username || 'U').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.displayName}>
              {user?.display_name || user?.username || 'Trader'}
            </Text>
            <Text style={styles.username}>@{user?.username || 'username'}</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Points Balance Display */}
      <LinearGradient
        colors={['#EC4899', '#BE185D']}
        style={styles.balanceCard}
      >
        <View style={styles.balanceHeader}>
          <Ionicons name="wallet" size={24} color="#fff" />
          <Text style={styles.balanceTitle}>Points Balance</Text>
        </View>
        <Text style={styles.balanceAmount}>{pointsBalance.toLocaleString()}</Text>
        
        {canClaimBonus && (
          <TouchableOpacity 
            style={styles.bonusButton}
            onPress={handleClaimBonus}
            disabled={loading}
          >
            <View style={styles.bonusContent}>
              <Ionicons name="gift" size={16} color="#EC4899" />
              <Text style={styles.bonusText}>Claim Daily Bonus</Text>
            </View>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </LinearGradient>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'wallet', label: 'Wallet', icon: 'wallet' },
        { key: 'bets', label: 'My Bets', icon: 'trending-up' },
        { key: 'stats', label: 'Stats', icon: 'analytics' }
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Ionicons 
            name={tab.icon} 
            size={18} 
            color={activeTab === tab.key ? '#EC4899' : '#6B7280'} 
          />
          <Text style={[
            styles.tabLabel,
            activeTab === tab.key && styles.activeTabLabel
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderWallet = () => (
    <View style={styles.tabContent}>
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Home')}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles.actionGradient}
          >
            <Ionicons name="trending-up" size={24} color="#fff" />
            <Text style={styles.actionText}>Make Prediction</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.actionGradient}
          >
            <Ionicons name="trophy" size={24} color="#fff" />
            <Text style={styles.actionText}>Leaderboard</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
      </View>

      {pointsHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt" size={48} color="#6B7280" />
          <Text style={styles.emptyTitle}>No Transactions Yet</Text>
          <Text style={styles.emptySubtitle}>Your points activity will appear here</Text>
        </View>
      ) : (
        pointsHistory.map((transaction, index) => (
          <View key={transaction.id || index} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <View style={styles.transactionInfo}>
                <Ionicons 
                  name={transaction.amount >= 0 ? 'add-circle' : 'remove-circle'} 
                  size={20} 
                  color={transaction.amount >= 0 ? '#EC4899' : '#EF4444'} 
                />
                <Text style={styles.transactionType}>{transaction.description}</Text>
              </View>
              <Text style={[
                styles.transactionAmount,
                transaction.amount >= 0 ? styles.positive : styles.negative
              ]}>
                {formatPnL(transaction.amount)}
              </Text>
            </View>
            <Text style={styles.transactionDate}>{formatDate(transaction.created_at)}</Text>
          </View>
        ))
      )}
    </View>
  );

  const renderBetCard = (vote, index) => {
    const title = getPredictionTitle(vote);
    const pointsSpent = vote.points_spent || vote.points_wagered || 10;
    const pointsEarned = vote.points_earned || 0;
    const pnl = pointsEarned - pointsSpent;
    
    return (
      <View key={vote.id || index} style={styles.betCard}>
        <LinearGradient
          colors={['#1F2937', '#374151']}
          style={styles.betGradient}
        >
          <View style={styles.betHeader}>
            <Text style={styles.betTitle} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.betBadges}>
              {!vote.is_resolved && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
              <View style={[
                styles.positionBadge,
                vote.vote ? styles.yesBadge : styles.noBadge
              ]}>
                <Text style={styles.positionText}>
                  {vote.vote ? 'YES' : 'NO'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.betStats}>
            <View style={styles.betStat}>
              <Text style={styles.betStatLabel}>Bet Amount</Text>
              <Text style={styles.betStatValue}>{pointsSpent} pts</Text>
            </View>
            <View style={styles.betStat}>
              <Text style={styles.betStatLabel}>Confidence</Text>
              <Text style={styles.betStatValue}>{vote.confidence || 50}%</Text>
            </View>
            <View style={styles.betStat}>
              <Text style={styles.betStatLabel}>P&L</Text>
              <Text style={[
                styles.betStatValue,
                pnl > 0 ? styles.profit : 
                pnl < 0 ? styles.loss : styles.neutral
              ]}>
                {formatPnL(pnl)} pts
              </Text>
            </View>
          </View>

          <View style={styles.betFooter}>
            <Text style={styles.betDate}>{formatDate(vote.created_at)}</Text>
            {vote.is_resolved && vote.is_correct !== undefined && (
              <View style={[
                styles.resultBadge,
                vote.is_correct ? styles.correctBadge : styles.incorrectBadge
              ]}>
                <Ionicons 
                  name={vote.is_correct ? 'checkmark-circle' : 'close-circle'} 
                  size={16} 
                  color="#fff" 
                />
                <Text style={styles.resultText}>
                  {vote.is_correct ? 'Won' : 'Lost'}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderBets = () => (
    <View style={styles.tabContent}>
      {myVotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="dice" size={48} color="#6B7280" />
          <Text style={styles.emptyTitle}>No Bets Yet</Text>
          <Text style={styles.emptySubtitle}>Start making predictions to see your bets here</Text>
        </View>
      ) : (
        myVotes
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .map((vote, index) => renderBetCard(vote, index))
      )}
    </View>
  );

  const renderStats = () => (
    <View style={styles.tabContent}>
      {stats ? (
        <>
          <View style={styles.statsGrid}>
            <LinearGradient
              colors={['#EC4899', '#BE185D']}
              style={[styles.statCard, styles.primaryCard]}
            >
              <Text style={styles.statValue}>{stats.totalBets || 0}</Text>
              <Text style={styles.statLabel}>Total Bets</Text>
            </LinearGradient>
            
            <View style={[styles.statCard, styles.secondaryCard]}>
              <Text style={styles.statValue}>{stats.activeBets || 0}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.secondaryCard]}>
              <Text style={styles.statValue}>{stats.correctBets || 0}</Text>
              <Text style={styles.statLabel}>Won</Text>
            </View>
            
            <View style={[styles.statCard, styles.secondaryCard]}>
              <Text style={styles.statValue}>{stats.winRate || 0}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.secondaryCard]}>
              <Text style={styles.statValue}>{stats.currentStreak || 0}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            
            <View style={[styles.statCard, styles.secondaryCard]}>
              <Text style={styles.statValue}>{stats.longestStreak || 0}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.secondaryCard]}>
              <Text style={[
                styles.statValue,
                stats.netProfit > 0 ? styles.profit : 
                stats.netProfit < 0 ? styles.loss : styles.neutral
              ]}>
                {formatPnL(stats.netProfit || 0)}
              </Text>
              <Text style={styles.statLabel}>Net P&L</Text>
            </View>
            
            <View style={[styles.statCard, styles.secondaryCard]}>
              <Text style={styles.statValue}>{stats.totalPointsEarned || 0}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="analytics" size={48} color="#6B7280" />
          <Text style={styles.emptyTitle}>No Stats Available</Text>
          <Text style={styles.emptySubtitle}>Your statistics will appear here once you start making predictions</Text>
        </View>
      )}
    </View>
  );

  // Show loading or auth required states
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4899" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authRequiredContainer}>
          <LinearGradient
            colors={['#EC4899', '#BE185D']}
            style={styles.authGradient}
          >
            <Ionicons name="person-circle" size={80} color="#fff" />
            <Text style={styles.authRequiredTitle}>Authentication Required</Text>
            <Text style={styles.authRequiredSubtitle}>
              Please log in to view your portfolio and track your predictions
            </Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderTabBar()}
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#EC4899']}
            tintColor="#EC4899"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#EC4899" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'wallet' && renderWallet()}
            {activeTab === 'bets' && renderBets()}
            {activeTab === 'stats' && renderStats()}
          </>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadPortfolioData}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  authRequiredContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  authGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authRequiredTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  authRequiredSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EC4899',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  bonusButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bonusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bonusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EC4899',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabLabel: {
    color: '#EC4899',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  transactionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positive: {
    color: '#EC4899',
  },
  negative: {
    color: '#EF4444',
  },
  transactionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryCard: {
    // LinearGradient applied directly
  },
  secondaryCard: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  betCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  betGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  betHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  betTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 12,
    lineHeight: 22,
  },
  betBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  liveBadge: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  positionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  yesBadge: {
    backgroundColor: '#EC4899',
  },
  noBadge: {
    backgroundColor: '#EF4444',
  },
  positionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  betStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  betStat: {
    flex: 1,
    alignItems: 'center',
  },
  betStatLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  betStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  profit: {
    color: '#EC4899',
  },
  loss: {
    color: '#EF4444',
  },
  neutral: {
    color: '#9CA3AF',
  },
  betFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  betDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  correctBadge: {
    backgroundColor: '#EC4899',
  },
  incorrectBadge: {
    backgroundColor: '#EF4444',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  errorCard: {
    backgroundColor: '#1F2937',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 12,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  bottomPadding: {
    height: 100,
  },
});

export default PortfolioScreen;