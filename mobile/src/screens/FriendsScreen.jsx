// src/screens/FriendsScreen.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FriendCard from '../components/profile/FriendCard';
import ApiService from '../services/api';
import AuthService from '../services/auth';

const FriendsScreen = ({ navigation }) => {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [friends, setFriends] = useState([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'leaderboard'

  useEffect(() => {
    // Listen for auth changes
    const unsubscribe = AuthService.addAuthListener(({ user: authUser }) => {
      setUser(authUser);
    });

    // Initial data load
    loadData();

    return unsubscribe;
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    if (!user) return;
    
    if (activeTab === 'friends') {
      await fetchFriends();
    } else {
      await fetchFriendsLeaderboard();
    }
  };

  const fetchFriends = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual friends API when implemented
      // For now using mock data since friends system might not be implemented yet
      const mockFriends = [
        { 
          id: 'u2', 
          username: 'alice_wonder', 
          display_name: 'Alice Wonder',
          avatar_url: null, 
          total_points: 1250, 
          current_streak: 7,
          predictions_made: 45,
          predictions_correct: 32,
          accuracy_rate: 0.71
        },
        { 
          id: 'u3', 
          username: 'bob_builder', 
          display_name: 'Bob Builder',
          avatar_url: null, 
          total_points: 950, 
          current_streak: 3,
          predictions_made: 28,
          predictions_correct: 18,
          accuracy_rate: 0.64
        },
        { 
          id: 'u4', 
          username: 'sarah_jones', 
          display_name: 'Sarah Jones',
          avatar_url: null, 
          total_points: 1890, 
          current_streak: 12,
          predictions_made: 67,
          predictions_correct: 49,
          accuracy_rate: 0.73
        },
        { 
          id: 'u5', 
          username: 'mike_wilson', 
          display_name: 'Mike Wilson',
          avatar_url: null, 
          total_points: 670, 
          current_streak: 2,
          predictions_made: 21,
          predictions_correct: 12,
          accuracy_rate: 0.57
        },
        { 
          id: 'u6', 
          username: 'emma_davis', 
          display_name: 'Emma Davis',
          avatar_url: null, 
          total_points: 2100, 
          current_streak: 15,
          predictions_made: 82,
          predictions_correct: 63,
          accuracy_rate: 0.77
        },
      ];
      setFriends(mockFriends);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendsLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const leaderboard = await ApiService.getFriendsLeaderboard('weekly');
      setFriendsLeaderboard(leaderboard);
    } catch (err) {
      console.error('Error fetching friends leaderboard:', err);
      // Fallback to mock data if API fails
      const mockLeaderboard = friends
        .sort((a, b) => b.total_points - a.total_points)
        .map((friend, index) => ({
          rank: index + 1,
          user: friend,
          points: friend.total_points,
          predictions_made: friend.predictions_made,
          predictions_correct: friend.predictions_correct,
          accuracy_rate: friend.accuracy_rate,
          streak: friend.current_streak
        }));
      setFriendsLeaderboard(mockLeaderboard);
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (userId) => {
    navigation.navigate('UserProfile', { userId });
  };

  const handleAddFriend = () => {
    navigation.navigate('SearchUsers');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [activeTab]);

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
        onPress={() => setActiveTab('friends')}
      >
        <Ionicons 
          name="people" 
          size={20} 
          color={activeTab === 'friends' ? '#FF69B4' : '#666'} 
        />
        <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
          Friends
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
        onPress={() => setActiveTab('leaderboard')}
      >
        <Ionicons 
          name="trophy" 
          size={20} 
          color={activeTab === 'leaderboard' ? '#FF69B4' : '#666'} 
        />
        <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>
          Rankings
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFriend = ({ item, index }) => (
    <TouchableOpacity onPress={() => handleUserPress(item.id)}>
      <FriendCard 
        friend={item} 
        showRank={activeTab === 'leaderboard'}
        rank={activeTab === 'leaderboard' ? index + 1 : undefined}
      />
    </TouchableOpacity>
  );

  const renderLeaderboardItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleUserPress(item.user.id)}>
      <FriendCard 
        friend={item.user} 
        showRank={true}
        rank={item.rank}
        points={item.points}
        accuracy={item.accuracy_rate}
        streak={item.streak}
      />
    </TouchableOpacity>
  );

  const renderHeader = () => {
    const currentData = activeTab === 'friends' ? friends : friendsLeaderboard;
    const title = activeTab === 'friends' ? 'Your Friends' : 'Friends Rankings';
    const subtitle = activeTab === 'friends' 
      ? `${friends.length} friends connected`
      : `Weekly rankings among your ${friends.length} friends`;

    return (
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'friends' ? 'people-outline' : 'trophy-outline'} 
        size={80} 
        color="#FF69B4" 
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'friends' ? 'No Friends Yet' : 'No Rankings Available'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'friends' 
          ? 'Connect with friends to see their predictions and compete on the leaderboard!'
          : 'Add friends to see weekly rankings and compete together!'
        }
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddFriend}>
        <Ionicons name="person-add" size={20} color="#000" />
        <Text style={styles.emptyButtonText}>Find Friends</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF69B4" />
      <Text style={styles.loadingText}>Loading...</Text>
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

  const currentData = activeTab === 'friends' ? friends : friendsLeaderboard;
  const renderItem = activeTab === 'friends' ? renderFriend : renderLeaderboardItem;
  const isEmpty = currentData.length === 0;

  return (
    <View style={styles.container}>
      {renderTabBar()}
      
      {loading && !refreshing ? renderLoadingIndicator() : (
        <FlatList
          data={currentData}
          keyExtractor={item => activeTab === 'friends' ? item.id : item.user.id}
          renderItem={renderItem}
          contentContainerStyle={isEmpty ? styles.emptyContainer : styles.list}
          ListHeaderComponent={!isEmpty ? renderHeader : null}
          ListEmptyComponent={!loading && isEmpty ? renderEmptyState : null}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#FF69B4']}
            />
          }
        />
      )}
      
      {/* Add Friend FAB */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddFriend}>
        <Ionicons name="person-add" size={24} color="#000" />
        <Text style={styles.addText}>Add Friend</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000', 
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingTop: 50,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF69B4',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#FF69B4',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 10,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#FF69B4',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  list: { 
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF69B4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#000',
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
    color: '#ccc',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#000',
  },
  errorText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: { 
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#FF69B4', 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addText: { 
    color: '#000', 
    fontSize: 16, 
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default FriendsScreen;