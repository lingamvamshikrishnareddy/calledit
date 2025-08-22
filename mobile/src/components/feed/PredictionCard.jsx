// src/components/feed/PredictionCard.jsx - FIXED: Correct vote data format
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PredictionCard = ({ 
  prediction, 
  onVote, 
  onPress, 
  currentUser, 
  style 
}) => {
  if (!prediction) {
    return null;
  }

  const formatTimeLeft = () => {
    if (!prediction.closes_at) return 'Unknown';
    
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

  const getVoteDistribution = () => {
    const totalVotes = (prediction.yes_votes || 0) + (prediction.no_votes || 0);
    if (totalVotes === 0) return { yesPercentage: 50, noPercentage: 50 };
    
    const yesPercentage = (prediction.yes_votes / totalVotes) * 100;
    const noPercentage = 100 - yesPercentage;
    
    return { yesPercentage, noPercentage };
  };

  const handleVote = async (voteValue) => {
  if (!onVote || !prediction.id) {
    console.warn('⚠️ PredictionCard: Missing onVote handler or prediction ID');
    return;
  }

  console.log('🗳️ PredictionCard: Handling vote:', { 
    predictionId: prediction.id, 
    vote: voteValue,
    user: currentUser?.username 
  });

  // FIXED: Send vote data in correct format
  const voteData = {
    prediction_id: prediction.id,  // Use prediction_id for backend
    vote: voteValue,               // boolean: true for YES, false for NO
    confidence: 75                 // default confidence level
  };

  try {
    await onVote(voteData);
  } catch (error) {
    console.error('❌ PredictionCard: Vote failed:', error);
  }
};

  const { yesPercentage, noPercentage } = getVoteDistribution();
  const totalVotes = (prediction.yes_votes || 0) + (prediction.no_votes || 0);
  const isActive = prediction.status === 'open' || prediction.status === 'active';
  const hasUserVoted = prediction.user_vote !== null && prediction.user_vote !== undefined;
  const timeLeft = formatTimeLeft();
  const isClosed = timeLeft === 'Closed';

  return (
    <TouchableOpacity 
      style={[styles.card, style]} 
      onPress={() => onPress && onPress(prediction)}
      activeOpacity={0.95}
    >
      <LinearGradient
        colors={['#111', '#1a1a1a']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.creatorInfo}>
            <Ionicons name="person-circle" size={24} color="#FF69B4" />
            <Text style={styles.creatorName}>
              {prediction.creator?.display_name || prediction.creator?.username || 'Unknown'}
            </Text>
          </View>
          <View style={styles.timeInfo}>
            <Ionicons 
              name={isClosed ? "lock-closed" : "time"} 
              size={16} 
              color={isClosed ? "#666" : "#FF69B4"} 
            />
            <Text style={[styles.timeText, isClosed && styles.closedText]}>
              {timeLeft}
            </Text>
          </View>
        </View>

        {/* Prediction Title */}
        <Text style={styles.title}>{prediction.title}</Text>

        {/* Description */}
        {prediction.description && (
          <Text style={styles.description} numberOfLines={2}>
            {prediction.description}
          </Text>
        )}

        {/* Category */}
        {prediction.category && (
          <View style={styles.categoryContainer}>
            <View style={[styles.categoryBadge, { backgroundColor: prediction.category.color || '#3B82F6' }]}>
              <Text style={styles.categoryText}>{prediction.category.name}</Text>
            </View>
          </View>
        )}

        {/* Vote Distribution Bar */}
        <View style={styles.distributionContainer}>
          <View style={styles.distributionBar}>
            <View 
              style={[
                styles.yesBar, 
                { flex: yesPercentage }
              ]}
            >
              {yesPercentage > 15 && (
                <Text style={styles.distributionText}>
                  {yesPercentage.toFixed(0)}%
                </Text>
              )}
            </View>
            <View 
              style={[
                styles.noBar, 
                { flex: noPercentage }
              ]}
            >
              {noPercentage > 15 && (
                <Text style={styles.distributionText}>
                  {noPercentage.toFixed(0)}%
                </Text>
              )}
            </View>
          </View>

          <View style={styles.voteStats}>
            <Text style={styles.yesVotes}>👍 {prediction.yes_votes || 0}</Text>
            <Text style={styles.totalVotes}>{totalVotes} votes</Text>
            <Text style={styles.noVotes}>👎 {prediction.no_votes || 0}</Text>
          </View>
        </View>

        {/* User Vote Status */}
        {hasUserVoted && (
          <View style={styles.userVoteStatus}>
            <Ionicons 
              name="checkmark-circle" 
              size={16} 
              color="#4caf50" 
            />
            <Text style={styles.userVoteText}>
              You voted: {prediction.user_vote ? 'YES 👍' : 'NO 👎'}
            </Text>
          </View>
        )}

        {/* Vote Buttons */}
        {isActive && !hasUserVoted && currentUser && (
          <View style={styles.voteButtons}>
            <TouchableOpacity
              style={[styles.voteButton, styles.yesButton]}
              onPress={() => handleVote(true)}
            >
              <Ionicons name="thumbs-up" size={16} color="#fff" />
              <Text style={styles.voteButtonText}>YES</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.voteButton, styles.noButton]}
              onPress={() => handleVote(false)}
            >
              <Ionicons name="thumbs-down" size={16} color="#fff" />
              <Text style={styles.voteButtonText}>NO</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Login Prompt for Non-authenticated Users */}
        {!currentUser && isActive && (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>Login to vote on this prediction</Text>
          </View>
        )}

        {/* Closed Status */}
        {!isActive && (
          <View style={styles.closedStatus}>
            <Ionicons name="lock-closed" size={16} color="#666" />
            <Text style={styles.closedStatusText}>
              Voting closed
              {prediction.resolution !== null && prediction.resolution !== undefined && (
                ` • Result: ${prediction.resolution ? 'YES' : 'NO'}`
              )}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
    marginLeft: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#FF69B4',
    marginLeft: 4,
    fontWeight: '500',
  },
  closedText: {
    color: '#666',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 22,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 18,
    marginBottom: 12,
  },
  categoryContainer: {
    marginBottom: 15,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  distributionContainer: {
    marginBottom: 15,
  },
  distributionBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
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
    fontSize: 10,
    fontWeight: 'bold',
  },
  voteStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yesVotes: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600',
  },
  totalVotes: {
    fontSize: 12,
    color: '#ccc',
    fontWeight: '500',
  },
  noVotes: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: '600',
  },
  userVoteStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d4f0c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  userVoteText: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600',
    marginLeft: 6,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  yesButton: {
    backgroundColor: '#4caf50',
  },
  noButton: {
    backgroundColor: '#f44336',
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  loginPrompt: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF69B4',
    alignItems: 'center',
  },
  loginPromptText: {
    fontSize: 12,
    color: '#FF69B4',
    fontWeight: '500',
  },
  closedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closedStatusText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default PredictionCard;