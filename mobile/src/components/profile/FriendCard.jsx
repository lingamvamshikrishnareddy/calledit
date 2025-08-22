// src/components/profile/FriendCard.jsx - FIXED: Safe property access
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FriendCard = ({ 
  friend, 
  showRank = false, 
  rank, 
  points, 
  accuracy, 
  streak,
  onPress 
}) => {
  // FIXED: Safe access to friend properties with multiple fallback options
  if (!friend) {
    console.warn('⚠️ FriendCard: No friend data provided');
    return null;
  }

  // Extract data safely with fallbacks
  const friendName = friend.display_name || friend.username || 'Unknown User';
  const friendScore = points || friend.total_points || friend.points || friend.score || 0;
  const friendStreak = streak || friend.current_streak || friend.streak || 0;
  const friendAccuracy = accuracy || friend.accuracy_rate || 0;
  const friendPredictions = friend.predictions_made || 0;
  const friendRank = rank || friend.rank || 0;
  const friendAvatar = friend.avatar_url || friend.avatar || null;

  // Format accuracy as percentage
  const accuracyPercent = typeof friendAccuracy === 'number' 
    ? Math.round(friendAccuracy * (friendAccuracy <= 1 ? 100 : 1))
    : 0;

  const handlePress = () => {
    if (onPress) {
      onPress(friend);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Rank Badge (if showing rank) */}
      {showRank && friendRank > 0 && (
        <View style={styles.rankContainer}>
          <Text style={styles.rankText}>#{friendRank}</Text>
        </View>
      )}

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {friendAvatar ? (
          <Image source={{ uri: friendAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>
              {friendName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.username} numberOfLines={1}>
          {friendName}
        </Text>
        
        <View style={styles.statsRow}>
          {/* Points */}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{friendScore}</Text>
            <Text style={styles.statLabel}>pts</Text>
          </View>
          
          {/* Streak */}
          <View style={styles.statItem}>
            <Ionicons name="flame" size={14} color="#FF6B35" />
            <Text style={styles.statValue}>{friendStreak}</Text>
          </View>
          
          {/* Accuracy (if available) */}
          {accuracyPercent > 0 && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{accuracyPercent}%</Text>
              <Text style={styles.statLabel}>acc</Text>
            </View>
          )}
        </View>

        {/* Additional info for leaderboard */}
        {showRank && friendPredictions > 0 && (
          <Text style={styles.predictionCount}>
            {friendPredictions} predictions made
          </Text>
        )}
      </View>

      {/* Right Arrow */}
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  rankContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
  },
  defaultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF69B4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF69B4',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  predictionCount: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
});

export default FriendCard;