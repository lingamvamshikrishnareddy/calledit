// src/components/feed/PredictionCard.jsx - Enhanced with better UI/UX
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const PredictionCard = ({ 
  prediction, 
  onVote, 
  onPress, 
  currentUser, 
  disabled = false,
  style 
}) => {
  const [votingState, setVotingState] = useState(null); // 'yes', 'no', or null

  // Check if user has already voted
  const userHasVoted = prediction?.user_vote !== undefined && prediction?.user_vote !== null;
  const userVote = prediction?.user_vote;

  const handleVotePress = async (voteValue) => {
    if (!onVote || disabled || userHasVoted) {
      return;
    }

    // Haptic feedback would go here in a real app
    setVotingState(voteValue ? 'yes' : 'no');

    try {
      await onVote({
        prediction_id: prediction.id,
        vote: voteValue,
        confidence: 75 // Default confidence
      });
    } catch (error) {
      console.error('Vote failed:', error);
      Alert.alert('Vote Failed', error.message || 'Failed to submit vote');
    } finally {
      setVotingState(null);
    }
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress(prediction);
    }
  };

  const formatTimeRemaining = () => {
    if (!prediction?.closes_at) return 'No deadline';
    
    try {
      const now = new Date();
      const closeTime = new Date(prediction.closes_at);
      const diff = closeTime - now;
      
      if (diff <= 0) return 'Closed';
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        return `${days}d ${hours}h left`;
      } else if (hours > 0) {
        return `${hours}h left`;
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${minutes}m left`;
      }
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getVotePercentages = () => {
    const yesVotes = prediction?.yes_votes || 0;
    const noVotes = prediction?.no_votes || 0;
    const total = yesVotes + noVotes;
    
    if (total === 0) {
      return { yesPercent: 50, noPercent: 50 };
    }
    
    return {
      yesPercent: Math.round((yesVotes / total) * 100),
      noPercent: Math.round((noVotes / total) * 100)
    };
  };

  const { yesPercent, noPercent } = getVotePercentages();
  const totalVotes = (prediction?.yes_votes || 0) + (prediction?.no_votes || 0);

  const isExpired = () => {
    if (!prediction?.closes_at) return false;
    return new Date(prediction.closes_at) <= new Date();
  };

  const canVote = !userHasVoted && !isExpired() && prediction?.status === 'active';

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#1F2937', '#374151']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.categoryContainer}>
            {prediction?.category && (
              <View style={[styles.categoryBadge, { backgroundColor: prediction.category.color || '#6B7280' }]}>
                <Text style={styles.categoryText}>{prediction.category.name || 'Other'}</Text>
              </View>
            )}
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={styles.timeText}>{formatTimeRemaining()}</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={3}>
          {prediction?.title || 'Unknown Prediction'}
        </Text>

        {/* Description */}
        {prediction?.description && (
          <Text style={styles.description} numberOfLines={2}>
            {prediction.description}
          </Text>
        )}

        {/* Vote Distribution Bar */}
        <View style={styles.voteDistribution}>
          <View style={styles.distributionBar}>
            <View style={[styles.yesBar, { width: `${yesPercent}%` }]} />
            <View style={[styles.noBar, { width: `${noPercent}%` }]} />
          </View>
          <View style={styles.distributionLabels}>
            <Text style={styles.yesPercent}>{yesPercent}% YES</Text>
            <Text style={styles.noPercent}>{noPercent}% NO</Text>
          </View>
        </View>

        {/* Vote Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={16} color="#9CA3AF" />
            <Text style={styles.statText}>{totalVotes} votes</Text>
          </View>
          
          {prediction?.creator && (
            <View style={styles.stat}>
              <Ionicons name="person-outline" size={16} color="#9CA3AF" />
              <Text style={styles.statText}>
                {prediction.creator.display_name || prediction.creator.username}
              </Text>
            </View>
          )}
        </View>

        {/* User Vote Status */}
        {userHasVoted && (
          <View style={styles.userVoteStatus}>
            <View style={[
              styles.userVoteBadge,
              userVote ? styles.userVoteYes : styles.userVoteNo
            ]}>
              <Ionicons 
                name={userVote ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.userVoteText}>
                You voted {userVote ? 'YES' : 'NO'}
              </Text>
            </View>
          </View>
        )}

        {/* Vote Buttons */}
        {canVote && (
          <View style={styles.voteButtons}>
            {/* YES Button - Cyan */}
            <TouchableOpacity
              style={[
                styles.voteButton,
                styles.yesButton,
                votingState === 'yes' && styles.votingButton
              ]}
              onPress={() => handleVotePress(true)}
              disabled={disabled || votingState !== null}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#06B6D4', '#0891B2']} // Cyan gradient
                style={styles.voteButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {votingState === 'yes' ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="sync" size={20} color="#fff" />
                    <Text style={styles.voteButtonText}>Voting...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="thumbs-up" size={20} color="#fff" />
                    <Text style={styles.voteButtonText}>YES</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* NO Button - Pink/Red */}
            <TouchableOpacity
              style={[
                styles.voteButton,
                styles.noButton,
                votingState === 'no' && styles.votingButton
              ]}
              onPress={() => handleVotePress(false)}
              disabled={disabled || votingState !== null}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#EC4899', '#BE185D']} // Pink gradient
                style={styles.voteButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {votingState === 'no' ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="sync" size={20} color="#fff" />
                    <Text style={styles.voteButtonText}>Voting...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="thumbs-down" size={20} color="#fff" />
                    <Text style={styles.voteButtonText}>NO</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Closed/Expired State */}
        {!canVote && !userHasVoted && (
          <View style={styles.closedState}>
            <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
            <Text style={styles.closedText}>
              {isExpired() ? 'Voting Closed' : 'Voting Not Available'}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  gradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 24,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 16,
  },
  voteDistribution: {
    marginBottom: 16,
  },
  distributionBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  yesBar: {
    backgroundColor: '#06B6D4', // Cyan for YES
    height: '100%',
  },
  noBar: {
    backgroundColor: '#EC4899', // Pink for NO
    height: '100%',
  },
  distributionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  yesPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#06B6D4', // Cyan
  },
  noPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EC4899', // Pink
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  userVoteStatus: {
    marginBottom: 16,
    alignItems: 'center',
  },
  userVoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  userVoteYes: {
    backgroundColor: '#06B6D4', // Cyan
  },
  userVoteNo: {
    backgroundColor: '#EC4899', // Pink
  },
  userVoteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  voteButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  voteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  votingButton: {
    opacity: 0.8,
  },
  closedState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    backgroundColor: '#374151',
    borderRadius: 12,
  },
  closedText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});

export default PredictionCard;