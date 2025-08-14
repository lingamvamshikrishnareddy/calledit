// src/components/feed/FeedItem.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../common/Avatar';
import Card from '../common/Card';

const FeedItem = ({ item, onPress }) => {
  const { type, user, prediction, timestamp, data } = item;

  const getActivityIcon = (type) => {
    const icons = {
      prediction_created: 'add-circle',
      vote_cast: 'thumbs-up',
      prediction_won: 'trophy',
      prediction_lost: 'close-circle',
      streak_milestone: 'flame',
    };
    return icons[type] || 'information-circle';
  };

  const getActivityColor = (type) => {
    const colors = {
      prediction_created: '#007AFF',
      vote_cast: '#4caf50',
      prediction_won: '#ffc107',
      prediction_lost: '#f44336',
      streak_milestone: '#ff9500',
    };
    return colors[type] || '#666';
  };

  const getActivityText = (type, data) => {
    switch (type) {
      case 'prediction_created':
        return 'created a new prediction';
      case 'vote_cast':
        return `voted ${data?.vote_type || ''} on a prediction`;
      case 'prediction_won':
        return 'won a prediction';
      case 'prediction_lost':
        return 'lost a prediction';
      case 'streak_milestone':
        return `reached a ${data?.streak_count || 0} day streak!`;
      default:
        return 'had some activity';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card style={styles.card}>
      <TouchableOpacity onPress={() => onPress?.(item)} activeOpacity={0.8}>
        <View style={styles.container}>
          <Avatar 
            source={user?.avatar ? { uri: user.avatar } : null}
            name={user?.username || 'Unknown'}
            size={36}
          />
          
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.username}>{user?.username || 'Unknown'}</Text>
              <Text style={styles.activityText}>
                {getActivityText(type, data)}
              </Text>
            </View>
            
            {prediction && (
              <Text style={styles.predictionTitle} numberOfLines={1}>
                "{prediction.title}"
              </Text>
            )}
            
            <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
          </View>

          <View style={[styles.iconContainer, { backgroundColor: getActivityColor(type) + '20' }]}>
            <Ionicons 
              name={getActivityIcon(type)} 
              size={20} 
              color={getActivityColor(type)} 
            />
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 4,
  },
  activityText: {
    fontSize: 14,
    color: '#666',
  },
  predictionTitle: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default FeedItem;