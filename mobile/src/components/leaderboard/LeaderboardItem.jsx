// src/components/leaderboard/LeaderboardItem.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../common/Avatar';

const LeaderboardItem = ({ user, rank, onPress, showStats = true }) => {
  const {
    id,
    username,
    avatar,
    total_score,
    correct_predictions,
    total_predictions,
    current_streak,
    accuracy_rate
  } = user;

  const getRankColor = (rank) => {
    if (rank === 1) return '#ffd700'; // Gold
    if (rank === 2) return '#c0c0c0'; // Silver
    if (rank === 3) return '#cd7f32'; // Bronze
    return '#666';
  };

  const getRankIcon = (rank) => {
    if (rank <= 3) return 'trophy';
    return 'person';
  };

  const formatAccuracy = (accuracy) => {
    return accuracy ? `${(accuracy * 100).toFixed(1)}%` : '0%';
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress?.(user)}
      activeOpacity={0.7}
    >
      <View style={styles.rankContainer}>
        <Ionicons 
          name={getRankIcon(rank)} 
          size={20} 
          color={getRankColor(rank)} 
        />
        <Text style={[styles.rankText, { color: getRankColor(rank) }]}>
          {rank}
        </Text>
      </View>

      <Avatar 
        source={avatar ? { uri: avatar } : null}
        name={username}
        size={44}
        style={styles.avatar}
      />

      <View style={styles.userInfo}>
        <Text style={styles.username}>{username}</Text>
        <Text style={styles.score}>{total_score || 0} points</Text>
      </View>

      {showStats && (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatAccuracy(accuracy_rate)}</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{current_streak || 0}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {correct_predictions || 0}/{total_predictions || 0}
            </Text>
            <Text style={styles.statLabel}>W/L</Text>
          </View>
        </View>
      )}

      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rankContainer: {
    alignItems: 'center',
    width: 40,
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  avatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  score: {
    fontSize: 14,
    color: '#666',
  },
  stats: {
    flexDirection: 'row',
    marginRight: 12,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default LeaderboardItem;