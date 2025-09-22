// src/components/common/VoteButtons.jsx - FIXED: Proper vote data format
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VoteButtons = ({ 
  predictionId, 
  userVote, 
  onVote, 
  disabled = false,
  showConfidence = false,
  confidence = 75 
}) => {
  const handleVote = (voteValue) => {
    if (disabled || userVote !== undefined) {
      console.warn('⚠️ VoteButtons: Voting disabled or user already voted');
      return;
    }

    if (!predictionId) {
      console.error('❌ VoteButtons: Missing prediction ID');
      return;
    }

    console.log('🗳️ VoteButtons: Casting vote:', { 
      predictionId, 
      vote: voteValue, 
      confidence 
    });

    // FIXED: Use correct data format that matches backend expectations
    const voteData = {
      prediction_id: predictionId,  // Use prediction_id for backend
      vote: voteValue,              // boolean: true for YES, false for NO
      confidence: confidence        // confidence level (1-100)
    };

    onVote?.(voteData);
  };

  // Show user's existing vote
  if (userVote !== undefined && userVote !== null) {
    return (
      <View style={styles.votedContainer}>
        <View style={[
          styles.votedIndicator, 
          userVote ? styles.votedYes : styles.votedNo
        ]}>
          <Ionicons 
            name={userVote ? "thumbs-up" : "thumbs-down"} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.votedText}>
            You voted: {userVote ? 'YES' : 'NO'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.voteButton, 
          styles.yesButton,
          disabled && styles.disabledButton
        ]}
        onPress={() => handleVote(true)}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="thumbs-up" size={18} color="#fff" />
        <Text style={styles.voteButtonText}>YES</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.voteButton, 
          styles.noButton,
          disabled && styles.disabledButton
        ]}
        onPress={() => handleVote(false)}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Ionicons name="thumbs-down" size={18} color="#fff" />
        <Text style={styles.voteButtonText}>NO</Text>
      </TouchableOpacity>

      {showConfidence && (
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceText}>Confidence: {confidence}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  yesButton: {
    backgroundColor: '#4caf50',
  },
  noButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    opacity: 0.5,
  },
  voteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  votedContainer: {
    marginTop: 12,
  },
  votedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 6,
  },
  votedYes: {
    backgroundColor: '#4caf50',
  },
  votedNo: {
    backgroundColor: '#f44336',
  },
  votedText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  confidenceContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  confidenceText: {
    color: '#888',
    fontSize: 12,
  },
});

export default VoteButtons;