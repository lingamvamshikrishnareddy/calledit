// src/components/feed/VoteButtons.jsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VoteButtons = ({ predictionId, userVote, onVote, disabled = false }) => {
  const handleVote = (voteType) => {
    if (disabled || userVote) return;
    onVote?.({ prediction_id: predictionId, vote_type: voteType });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.voteButton,
          styles.yesButton,
          userVote === 'yes' && styles.selectedYes,
          disabled && styles.disabled,
        ]}
        onPress={() => handleVote('yes')}
        disabled={disabled}
      >
        <Ionicons 
          name="thumbs-up" 
          size={16} 
          color={userVote === 'yes' ? 'white' : '#4caf50'} 
        />
        <Text style={[
          styles.buttonText,
          { color: userVote === 'yes' ? 'white' : '#4caf50' }
        ]}>
          Yes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.voteButton,
          styles.noButton,
          userVote === 'no' && styles.selectedNo,
          disabled && styles.disabled,
        ]}
        onPress={() => handleVote('no')}
        disabled={disabled}
      >
        <Ionicons 
          name="thumbs-down" 
          size={16} 
          color={userVote === 'no' ? 'white' : '#f44336'} 
        />
        <Text style={[
          styles.buttonText,
          { color: userVote === 'no' ? 'white' : '#f44336' }
        ]}>
          No
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  yesButton: {
    borderColor: '#4caf50',
    backgroundColor: 'transparent',
  },
  noButton: {
    borderColor: '#f44336',
    backgroundColor: 'transparent',
  },
  selectedYes: {
    backgroundColor: '#4caf50',
  },
  selectedNo: {
    backgroundColor: '#f44336',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default VoteButtons;