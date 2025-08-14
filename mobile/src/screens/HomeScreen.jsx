// src/screens/HomeScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PredictionCard from '../components/feed/PredictionCard';
import FeedItem from '../components/feed/FeedItem';
import ApiService from '../services/api';
import AuthService from '../services/auth';

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [predictions, setPredictions] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [activeTab, setActiveTab] = useState('predictions');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Mock data for demo
  const mockPredictions = [
    {
      id: 1,
      title: "Will Taylor Swift announce a new album at the Grammys?",
      description: "Based on her recent social media hints and past patterns...",
      category: "pop_culture",
      closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      yes_votes: 847,
      no_votes: 234,
      total_votes: 1081,
      status: "open",
      creator: { username: "swiftie_prophet", display_name: "Taylor's Oracle" },
      created_at: new Date().toISOString(),
      user_vote: null
    },
    {
      id: 2,
      title: "Will someone get eliminated on Love Island tonight?",
      description: "Tension is high in the villa...",
      category: "entertainment",
      closes_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      yes_votes: 523,
      no_votes: 412,
      total_votes: 935,
      status: "open",
      creator: { username: "reality_guru", display_name: "Reality TV Expert" },
      created_at: new Date().toISOString(),
      user_vote: null
    }
  ];

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
    if (activeTab === 'activity') {
      fetchActivityFeed();
    } else {
      fetchPredictions();
    }
  }, [activeTab]);

  const loadData = async () => {
    if (activeTab === 'predictions') {
      await fetchPredictions();
    } else {
      await fetchActivityFeed();
    }
  };

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: 'open',
        limit: 20,
        offset: 0
      };
      const response = await ApiService.getPredictions(params);
      setPredictions(response.length > 0 ? response : mockPredictions);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setPredictions(mockPredictions); // Fallback to mock data
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityFeed = async () => {
    try {
      setLoading(true);
      // Mock activity feed
      const mockActivity = [
        {
          id: 1,
          type: 'prediction_created',
          user: { username: 'john_doe', avatar: null },
          prediction: { title: 'Will Bitcoin reach $100k by end of year?' },
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          data: {}
        },
        {
          id: 2,
          type: 'vote_cast',
          user: { username: 'jane_smith', avatar: null },
          prediction: { title: 'Next iPhone release date prediction' },
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
          data: { vote_type: 'yes' }
        }
      ];
      setActivityFeed(mockActivity);
    } catch (err) {
      console.error('Error fetching activity feed:', err);
      setError('Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (voteData) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to vote', [
        { text: 'Cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Auth') }
      ]);
      return;
    }

    try {
      const response = await ApiService.castVote({
        prediction_id: voteData.predictionId,
        vote: voteData.vote,
        confidence: voteData.confidence || 50
      });
      
      // Update predictions list to reflect new vote
      await fetchPredictions();
      Alert.alert('Success', 'Your vote has been recorded! 🎉');
    } catch (err) {
      console.error('Vote submission error:', err);
      Alert.alert('Error', err.message || 'Failed to submit vote. Please try again.');
    }
  };

  const handlePredictionPress = (prediction) => {
    navigation.navigate('PredictionDetail', { 
      predictionId: prediction.id,
      prediction 
    });
  };

  const handleActivityPress = (activity) => {
    if (activity.prediction) {
      navigation.navigate('PredictionDetail', { 
        prediction: activity.prediction 
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [activeTab]);

  const renderPrediction = ({ item }) => (
    <PredictionCard
      prediction={item}
      onVote={handleVote}
      onPress={handlePredictionPress}
      currentUser={user}
    />
  );

  const renderActivity = ({ item }) => (
    <FeedItem
      item={item}
      onPress={handleActivityPress}
    />
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={['#FF69B4', '#FF1493', '#8A2BE2']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🔥 What's Happening</Text>
          <Text style={styles.headerSubtitle}>Make your calls, earn your bragging rights</Text>
        </View>
      </LinearGradient>
      
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'predictions' && styles.activeTab]}
          onPress={() => setActiveTab('predictions')}
        >
          <Ionicons 
            name="trending-up" 
            size={20} 
            color={activeTab === 'predictions' ? '#FF69B4' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'predictions' && styles.activeTabText]}>
            🎯 Hot Takes
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
          onPress={() => setActiveTab('activity')}
        >
          <Ionicons 
            name="pulse" 
            size={20} 
            color={activeTab === 'activity' ? '#FF69B4' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>
            📱 Feed
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'predictions' ? 'trending-up-outline' : 'pulse-outline'} 
        size={64} 
        color="#666" 
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'predictions' ? 'No Hot Takes Yet' : 'No Activity Yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'predictions' 
          ? 'Check back later for new predictions to vote on!'
          : 'Follow some users to see their activity here.'
        }
      </Text>
      {activeTab === 'predictions' && (
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('CreatePrediction')}
        >
          <LinearGradient
            colors={['#FF69B4', '#FF1493']}
            style={styles.createButtonGradient}
          >
            <Ionicons name="add" size={20} color="#000" />
            <Text style={styles.createButtonText}>✨ Create Prediction</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF69B4" />
      <Text style={styles.loadingText}>Loading the hottest takes...</Text>
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

  const currentData = activeTab === 'predictions' ? predictions : activityFeed;
  const isEmpty = currentData.length === 0;

  return (
    <View style={styles.container}>
      {loading && !refreshing ? renderLoadingIndicator() : (
        <FlatList
          data={currentData}
          renderItem={activeTab === 'predictions' ? renderPrediction : renderActivity}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#FF69B4']}
              tintColor="#FF69B4"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            isEmpty && styles.emptyContent
          ]}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!loading && isEmpty ? renderEmptyState : null}
        />
      )}
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePrediction')}
      >
        <LinearGradient
          colors={['#FF69B4', '#FF1493']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={24} color="#000" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    marginBottom: 10,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#000',
    opacity: 0.8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
  listContent: {
    paddingBottom: 100,
  },
  emptyContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
  createButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  createButtonText: {
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
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;