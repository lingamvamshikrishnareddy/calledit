// src/screens/PredictionDetailScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../services/api';
import AuthService from '../services/auth';

const PredictionDetailScreen = ({ route, navigation }) => {
  const { prediction: initialPrediction, predictionId } = route.params || {};
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [prediction, setPrediction] = useState(initialPrediction);
  const [loading, setLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);

  useEffect(() => {
    if (predictionId && !initialPrediction) {
      loadPrediction();
    }
  }, [predictionId]);

  const loadPrediction = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getPrediction(predictionId);
      setPrediction(data);
    } catch (error) {
      console.error('Error loading prediction:', error);
      Alert.alert('Error', 'Failed to load prediction details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (vote, confidence = 75) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to vote on predictions', [
        { text: 'Cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Auth') }
      ]);
      return;
    }

    if (!prediction) return;

    setVoteLoading(true);
    try {
      await ApiService.castVote({
        prediction_id: prediction.id,
        vote,
        confidence
      });

      // Reload prediction to get updated data
      if (predictionId) {
        await loadPrediction();
      }

      Alert.alert('Success!', `Your ${vote ? 'YES' : 'NO'} vote has been recorded!`);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit vote');
    } finally {
      setVoteLoading(false);
    }
  };

  const getVoteDistribution = () => {
    if (!prediction) return { yesPercentage: 50, noPercentage: 50 };
    
    const totalVotes = (prediction.yes_votes || 0) + (prediction.no_votes || 0);
    if (totalVotes === 0) return { yesPercentage: 50, noPercentage: 50 };
    
    const yesPercentage = (prediction.yes_votes / totalVotes) * 100;
    const noPercentage = 100 - yesPercentage;
    
    return { yesPercentage, noPercentage };
  };

  const formatTimeLeft = () => {
    if (!prediction?.closes_at) return 'Unknown';
    
    const now = new Date();
    const closesAt = new Date(prediction.closes_at);
    const diff = closesAt - now;
    
    if (diff <= 0) return 'Closed';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return 'Closing soon';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
        <Text style={styles.loadingText}>Loading prediction...</Text>
      </View>
    );
  }

  if (!prediction) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#f44336" />
        <Text style={styles.errorText}>Prediction not found</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { yesPercentage, noPercentage } = getVoteDistribution();
  const totalVotes = (prediction.yes_votes || 0) + (prediction.no_votes || 0);
  const isActive = prediction.status === 'open' || prediction.status === 'active';
  const hasUserVoted = prediction.user_vote !== null && prediction.user_vote !== undefined;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prediction Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Prediction Card */}
        <View style={styles.predictionCard}>
          <Text style={styles.predictionTitle}>{prediction.title}</Text>
          
          {prediction.description && (
            <Text style={styles.predictionDescription}>
              {prediction.description}
            </Text>
          )}

          <View style={styles.predictionMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="person" size={16} color="#FF69B4" />
              <Text style={styles.metaText}>
                {prediction.creator?.username || 'Unknown'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={16} color="#FF69B4" />
              <Text style={styles.metaText}>{formatTimeLeft()}</Text>
            </View>
          </View>
        </View>

        {/* Vote Distribution */}
        <View style={styles.distributionCard}>
          <Text style={styles.cardTitle}>📊 Current Predictions</Text>
          
          <View style={styles.distributionBar}>
            <View style={[styles.yesBar, { flex: yesPercentage }]}>
              {yesPercentage > 15 && (
                <Text style={styles.distributionText}>
                  {yesPercentage.toFixed(0)}%
                </Text>
              )}
            </View>
            <View style={[styles.noBar, { flex: noPercentage }]}>
              {noPercentage > 15 && (
                <Text style={styles.distributionText}>
                  {noPercentage.toFixed(0)}%
                </Text>
              )}
            </View>
          </View>

          <View style={styles.distributionStats}>
            <Text style={styles.yesStats}>👍 YES: {prediction.yes_votes || 0}</Text>
            <Text style={styles.totalStats}>Total: {totalVotes}</Text>
            <Text style={styles.noStats}>👎 NO: {prediction.no_votes || 0}</Text>
          </View>
        </View>

        {/* User Vote Status */}
        {hasUserVoted && (
          <View style={styles.userVoteCard}>
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color="#4caf50" 
            />
            <Text style={styles.userVoteText}>
              You voted: {prediction.user_vote ? 'YES 👍' : 'NO 👎'}
            </Text>
          </View>
        )}

        {/* Voting Buttons */}
        {isActive && !hasUserVoted && (
          <View style={styles.votingSection}>
            <Text style={styles.cardTitle}>🗳️ Cast Your Vote</Text>
            
            <View style={styles.voteButtons}>
              <TouchableOpacity
                style={[styles.voteButton, styles.yesButton]}
                onPress={() => handleVote(true)}
                disabled={voteLoading}
              >
                <Ionicons name="thumbs-up" size={24} color="#fff" />
                <Text style={styles.voteButtonText}>YES</Text>
                <Text style={styles.voteButtonSubtext}>I think it will happen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.voteButton, styles.noButton]}
                onPress={() => handleVote(false)}
                disabled={voteLoading}
              >
                <Ionicons name="thumbs-down" size={24} color="#fff" />
                <Text style={styles.voteButtonText}>NO</Text>
                <Text style={styles.voteButtonSubtext}>I don't think so</Text>
              </TouchableOpacity>
            </View>

            {voteLoading && (
              <View style={styles.votingLoader}>
                <ActivityIndicator size="small" color="#FF69B4" />
                <Text style={styles.votingLoaderText}>Submitting your vote...</Text>
              </View>
            )}
          </View>
        )}

        {/* Closed Prediction Info */}
        {!isActive && (
          <View style={styles.closedCard}>
            <Ionicons name="lock-closed" size={24} color="#666" />
            <Text style={styles.closedText}>
              This prediction is closed
            </Text>
            {prediction.result !== null && prediction.result !== undefined && (
              <Text style={styles.resultText}>
                Result: {prediction.result ? 'YES' : 'NO'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerBackButton: {
    marginRight: 15,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  predictionCard: {
    backgroundColor: '#111',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  predictionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    lineHeight: 26,
  },
  predictionDescription: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 22,
    marginBottom: 15,
  },
  predictionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 5,
  },
  distributionCard: {
    backgroundColor: '#111',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  distributionBar: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
  },
  yesBar: {
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noBar: {
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distributionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  distributionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  yesStats: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '600',
  },
  totalStats: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  noStats: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
  userVoteCard: {
    backgroundColor: '#0d4f0c',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  userVoteText: {
    fontSize: 16,
    color: '#4caf50',
    fontWeight: '600',
    marginLeft: 10,
  },
  votingSection: {
    backgroundColor: '#111',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  voteButton: {
    flex: 1,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesButton: {
    backgroundColor: '#4caf50',
  },
  noButton: {
    backgroundColor: '#f44336',
  },
  voteButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  voteButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  votingLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  votingLoaderText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 10,
  },
  closedCard: {
    backgroundColor: '#222',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  closedText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginTop: 10,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PredictionDetailScreen;