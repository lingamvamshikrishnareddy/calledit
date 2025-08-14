// src/screens/EventsScreen.jsx
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PredictionCard from '../components/feed/PredictionCard';
import ApiService from '../services/api';
import AuthService from '../services/auth';

const { width } = Dimensions.get('window');

const EventsScreen = ({ navigation }) => {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [filteredPredictions, setFilteredPredictions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Mock categories for Gen Z content
  const mockCategories = [
    { id: 'all', name: '🌟 All', icon: 'star' },
    { id: 'pop_culture', name: '🎭 Pop Culture', icon: 'musical-notes' },
    { id: 'sports', name: '⚽ Sports', icon: 'football' },
    { id: 'entertainment', name: '🎬 TV & Movies', icon: 'tv' },
    { id: 'social_media', name: '📱 Social Drama', icon: 'phone-portrait' },
    { id: 'trending', name: '🔥 Viral', icon: 'flame' },
  ];

  // Mock predictions for demo (replace with real API data)
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
    },
    {
      id: 3,
      title: "Will Messi score in the next El Clasico?",
      description: "The GOAT vs Real Madrid...",
      category: "sports",
      closes_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      yes_votes: 1234,
      no_votes: 567,
      total_votes: 1801,
      status: "open",
      creator: { username: "football_fanatic", display_name: "Goal Predictor" },
      created_at: new Date().toISOString(),
      user_vote: null
    },
    {
      id: 4,
      title: "Will Charli D'Amelio hit 200M TikTok followers this month?",
      description: "She's at 195M and growing fast...",
      category: "social_media",
      closes_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      yes_votes: 892,
      no_votes: 445,
      total_votes: 1337,
      status: "open",
      creator: { username: "tiktok_tracker", display_name: "Social Media Analyst" },
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
    loadPredictions();
    loadCategories();

    return unsubscribe;
  }, []);

  useEffect(() => {
    filterPredictions();
  }, [searchQuery, selectedCategory, predictions]);

  const loadPredictions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to load from API, fall back to mock data
      const data = await ApiService.getPredictions({ status: 'open', limit: 50 });
      setPredictions(data.length > 0 ? data : mockPredictions);
    } catch (err) {
      console.error('Error loading predictions:', err);
      // Use mock data as fallback
      setPredictions(mockPredictions);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await ApiService.getCategories();
      setCategories(data.length > 0 ? data : mockCategories);
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories(mockCategories);
    }
  };

  const filterPredictions = () => {
    let filtered = predictions;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.creator?.username.toLowerCase().includes(query)
      );
    }

    setFilteredPredictions(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPredictions();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handlePredictionPress = (prediction) => {
    navigation.navigate('PredictionDetail', {
      predictionId: prediction.id,
      prediction
    });
  };

  const handleVote = async (voteData) => {
    if (!user) {
      navigation.navigate('Auth');
      return;
    }

    try {
      await ApiService.castVote({
        prediction_id: voteData.predictionId,
        vote: voteData.vote,
        confidence: voteData.confidence || 75
      });
      
      // Refresh predictions to show updated vote counts
      await loadPredictions();
    } catch (err) {
      console.error('Vote submission error:', err);
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
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTrendingSection = () => {
    const trendingPredictions = filteredPredictions
      .sort((a, b) => b.total_votes - a.total_votes)
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
                  🗳️ {prediction.total_votes} votes
                </Text>
                <Text style={styles.trendingStat}>
                  ⏰ {Math.ceil((new Date(prediction.closes_at) - new Date()) / (1000 * 60 * 60 * 24))}d left
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

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF69B4" />
      <Text style={styles.loadingText}>Loading predictions...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 Discover</Text>
        <Text style={styles.headerSubtitle}>Find your next winning call</Text>
      </View>

      {/* Search Bar */}
      {renderSearchBar()}

      {loading && !refreshing ? renderLoadingIndicator() : (
        <FlatList
          data={filteredPredictions}
          renderItem={renderPrediction}
          keyExtractor={(item) => item.id.toString()}
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF69B4',
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
    backgroundColor: '#000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedCategory: {
    backgroundColor: '#FF69B4',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
  },
  selectedCategoryText: {
    color: '#000',
  },
  trendingSection: {
    marginVertical: 20,
  },
  trendingHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  trendingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  trendingSubtitle: {
    fontSize: 14,
    color: '#000',
    opacity: 0.8,
  },
  trendingScroll: {
    paddingLeft: 20,
  },
  trendingCard: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 12,
    marginRight: 15,
    width: width * 0.7,
    borderWidth: 1,
    borderColor: '#333',
  },
  trendingRank: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF69B4',
    borderRadius: 15,
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  trendingCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
    marginTop: 5,
  },
  trendingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendingStat: {
    fontSize: 12,
    color: '#ccc',
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
  listContent: {
    paddingBottom: 100,
  },
  emptyContent: {
    flexGrow: 1,
  },
  predictionCard: {
    marginHorizontal: 20,
    marginBottom: 15,
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
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  clearSearchButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  clearSearchText: {
    color: '#000',
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
    color: '#ccc',
  },
});

export default EventsScreen;