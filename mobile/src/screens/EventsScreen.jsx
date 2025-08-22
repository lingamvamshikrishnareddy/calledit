// src/screens/EventsScreen.jsx - FIXED
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PredictionCard from '../components/feed/PredictionCard';
import ApiService from '../services/api';
import AuthService from '../services/auth';
import { useAuth } from '../hooks/useAuth'; // ADDED: Use auth hook

const { width } = Dimensions.get('window');

const EventsScreen = ({ navigation }) => {
  // FIXED: Use auth hook instead of direct AuthService calls
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [filteredPredictions, setFilteredPredictions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // FIXED: Only load data when auth is ready and user exists
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      console.log('📱 EventsScreen: User authenticated, loading data...');
      loadInitialData();
    } else if (!authLoading && !isAuthenticated) {
      console.log('❌ EventsScreen: User not authenticated');
      // Clear data when not authenticated
      setPredictions([]);
      setCategories([]);
      setError('Please login to view predictions');
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    filterPredictions();
  }, [searchQuery, selectedCategory, predictions]);

  const loadInitialData = async () => {
    if (!isAuthenticated || !user) {
      console.log('⚠️ EventsScreen: Cannot load data - user not authenticated');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('📱 EventsScreen: Loading initial data...');
      await Promise.all([
        loadPredictions(),
        loadCategories()
      ]);
      console.log('✅ EventsScreen: Initial data loaded successfully');
    } catch (err) {
      console.error('❌ EventsScreen: Error loading initial data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPredictions = async () => {
    try {
      console.log('📊 EventsScreen: Loading predictions...');
      const data = await ApiService.getPredictions({ 
        status: 'active', 
        limit: 50 
      });
      console.log('📊 EventsScreen: Predictions loaded:', data?.length || 0);
      setPredictions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ EventsScreen: Error loading predictions:', err);
      throw new Error('Failed to load predictions: ' + err.message);
    }
  };

  const loadCategories = async () => {
    try {
      console.log('📂 EventsScreen: Loading categories...');
      const data = await ApiService.getCategories();
      console.log('📂 EventsScreen: Categories loaded:', data?.length || 0);
      
      // Add "all" category at the beginning
      const allCategories = [
        { id: 'all', name: '🌟 All', slug: 'all', prediction_count: 0 },
        ...(Array.isArray(data) ? data : [])
      ];
      setCategories(allCategories);
    } catch (err) {
      console.error('❌ EventsScreen: Error loading categories:', err);
      // Set default categories if API fails
      setCategories([
        { id: 'all', name: '🌟 All', slug: 'all', prediction_count: 0 },
        { id: 'pop_culture', name: '🎭 Pop Culture', slug: 'pop_culture', prediction_count: 0 },
        { id: 'sports', name: '⚽ Sports', slug: 'sports', prediction_count: 0 },
        { id: 'entertainment', name: '🎬 TV & Movies', slug: 'entertainment', prediction_count: 0 },
        { id: 'social_media', name: '📱 Social Drama', slug: 'social_media', prediction_count: 0 },
        { id: 'trending', name: '🔥 Viral', slug: 'trending', prediction_count: 0 },
      ]);
    }
  };

  const filterPredictions = () => {
    if (!predictions.length) {
      setFilteredPredictions([]);
      return;
    }

    let filtered = [...predictions];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => {
        if (!p.category) return false;
        return p.category.id === selectedCategory || p.category.slug === selectedCategory;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.creator?.username?.toLowerCase().includes(query)
      );
    }

    setFilteredPredictions(filtered);
  };

  const onRefresh = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    setRefreshing(true);
    try {
      await loadInitialData();
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  const handlePredictionPress = (prediction) => {
    if (!prediction?.id) {
      console.warn('⚠️ EventsScreen: Invalid prediction for navigation:', prediction);
      return;
    }
    
    console.log('🔍 EventsScreen: Navigating to prediction:', prediction.id);
    navigation.navigate('PredictionDetail', {
      predictionId: prediction.id,
      prediction
    });
  };

 const handleVote = async (voteData) => {
  if (!isAuthenticated || !user) {
    Alert.alert(
      'Login Required',
      'Please login to vote on predictions',
      [
        { text: 'Cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Auth') }
      ]
    );
    return;
  }

  try {
    console.log('🗳️ EventsScreen: Casting vote:', voteData);
    
    // FIXED: Ensure correct data structure
    await ApiService.castVote({
      prediction_id: voteData.prediction_id,
      vote: voteData.vote,
      confidence: voteData.confidence || 75
    });
    
    // Refresh predictions to show updated vote counts
    await loadPredictions();
    
    Alert.alert('Success!', `Your ${voteData.vote ? 'YES' : 'NO'} vote has been recorded!`);
  } catch (err) {
    console.error('❌ EventsScreen: Vote submission error:', err);
    Alert.alert('Error', err.message || 'Failed to submit vote');
  }
};

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search predictions, creators..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.categoriesContainer}>
      <Text style={styles.sectionTitle}>🔥 What's Hot</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.selectedCategory
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.selectedCategoryText
            ]}>
              {category.name}
            </Text>
            {category.prediction_count > 0 && (
              <Text style={[
                styles.categoryCount,
                selectedCategory === category.id && styles.selectedCategoryCount
              ]}>
                {category.prediction_count}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTrendingSection = () => {
    const trendingPredictions = filteredPredictions
      .filter(p => p.total_votes > 0) // Only show predictions with votes
      .sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))
      .slice(0, 3);

    if (trendingPredictions.length === 0) return null;

    return (
      <View style={styles.trendingSection}>
        <LinearGradient
          colors={['#FF69B4', '#FF1493']}
          style={styles.trendingHeader}
        >
          <Text style={styles.trendingTitle}>🚀 Trending Now</Text>
          <Text style={styles.trendingSubtitle}>Most voted this week</Text>
        </LinearGradient>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.trendingScroll}
        >
          {trendingPredictions.map((prediction, index) => (
            <TouchableOpacity
              key={prediction.id}
              style={styles.trendingCard}
              onPress={() => handlePredictionPress(prediction)}
            >
              <View style={styles.trendingRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.trendingCardTitle} numberOfLines={2}>
                {prediction.title}
              </Text>
              <View style={styles.trendingStats}>
                <Text style={styles.trendingStat}>
                  🗳️ {prediction.total_votes || 0} votes
                </Text>
                <Text style={styles.trendingStat}>
                  ⏰ {prediction.closes_at ? 
                    Math.max(0, Math.ceil((new Date(prediction.closes_at) - new Date()) / (1000 * 60 * 60 * 24)))
                    : 0}d left
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderPrediction = ({ item }) => (
    <PredictionCard
      prediction={item}
      onVote={handleVote}
      onPress={handlePredictionPress}
      currentUser={user}
      style={styles.predictionCard}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color="#666" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No matches found' : 'No predictions yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? `Try different keywords or browse categories above`
          : 'Check back soon for new predictions to vote on!'
        }
      </Text>
      {searchQuery && (
        <TouchableOpacity 
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery('')}
        >
          <Text style={styles.clearSearchText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
      <Text style={styles.emptyTitle}>Connection Error</Text>
      <Text style={styles.emptySubtitle}>{error}</Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={loadInitialData}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF69B4" />
      <Text style={styles.loadingText}>Loading predictions...</Text>
    </View>
  );

  // FIXED: Better loading state handling
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  // FIXED: Better auth required state
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.authRequiredContainer}>
        <Ionicons name="person-outline" size={64} color="#666" />
        <Text style={styles.authRequiredTitle}>Login Required</Text>
        <Text style={styles.authRequiredSubtitle}>Please login to view predictions</Text>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 Discover</Text>
        <Text style={styles.headerSubtitle}>Find your next winning call</Text>
      </View>

      {/* Search Bar */}
      {renderSearchBar()}

      {error && !loading ? renderErrorState() : (
        loading && !refreshing ? renderLoadingIndicator() : (
          <FlatList
            data={filteredPredictions}
            renderItem={renderPrediction}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#FF69B4']}
              />
            }
            ListHeaderComponent={
              <>
                {renderCategories()}
                {renderTrendingSection()}
                {filteredPredictions.length > 0 && (
                  <View style={styles.allPredictionsHeader}>
                    <Text style={styles.allPredictionsTitle}>
                      📋 All Predictions {searchQuery && `(${filteredPredictions.length})`}
                    </Text>
                  </View>
                )}
              </>
            }
            ListEmptyComponent={!loading ? renderEmptyState : null}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              filteredPredictions.length === 0 && styles.emptyContent
            ]}
          />
        )
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#111',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  categoriesContainer: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedCategory: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
  },
  selectedCategoryText: {
    color: '#000',
  },
  categoryCount: {
    fontSize: 11,
    color: '#999',
    marginLeft: 8,
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selectedCategoryCount: {
    color: '#000',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  trendingSection: {
    marginVertical: 20,
  },
  trendingHeader: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  trendingSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
  },
  trendingScroll: {
    paddingHorizontal: 10,
  },
  trendingCard: {
    backgroundColor: '#222',
    width: 200,
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  trendingRank: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF69B4',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  trendingCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  trendingStats: {
    gap: 5,
  },
  trendingStat: {
    fontSize: 12,
    color: '#999',
  },
  allPredictionsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  allPredictionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  predictionCard: {
    marginVertical: 5,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyContent: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  clearSearchButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  retryButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
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
    backgroundColor: '#000',
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
});

export default EventsScreen;