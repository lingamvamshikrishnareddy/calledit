// src/components/feed/PredictionCard.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import VoteButtons from './VoteButtons';

const PredictionCard = ({ prediction, onVote, onPress }) => {
  const {
    id,
    title,
    description,
    creator,
    created_at,
    expires_at,
    category,
    yes_votes,
    no_votes,
    user_vote,
    status
  } = prediction;

  const totalVotes = yes_votes + no_votes;
  const yesPercentage = totalVotes > 0 ? (yes_votes / totalVotes) * 100 : 50;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      sports: 'basketball',
      politics: 'flag',
      technology: 'laptop',
      entertainment: 'film',
      finance: 'trending-up',
      weather: 'cloud',
      other: 'help-circle'
    };
    return icons[category] || 'help-circle';
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#28a745',
      closed: '#ffc107',
      resolved: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  return (
    <Card style={styles.card}>
      <TouchableOpacity onPress={() => onPress?.(prediction)} activeOpacity={0.8}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Avatar 
              source={creator?.avatar ? { uri: creator.avatar } : null}
              name={creator?.username || 'Unknown'}
              size={32}
            />
            <View style={styles.userDetails}>
              <Text style={styles.username}>{creator?.username || 'Unknown'}</Text>
              <Text style={styles.timestamp}>{formatDate(created_at)}</Text>
            </View>
          </View>
          <View style={styles.categoryBadge}>
            <Ionicons 
              name={getCategoryIcon(category)} 
              size={12} 
              color="#666" 
              style={styles.categoryIcon}
            />
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {description && (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>

        {/* Vote Progress */}
        <View style={styles.voteProgress}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${yesPercentage}%` }
              ]} 
            />
          </View>
          <View style={styles.voteStats}>
            <Text style={styles.voteText}>
              Yes: {yes_votes} ({yesPercentage.toFixed(0)}%)
            </Text>
            <Text style={styles.voteText}>
              No: {no_votes} ({(100 - yesPercentage).toFixed(0)}%)
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
            <Text style={styles.statusText}>{status.toUpperCase()}</Text>
            {expires_at && (
              <Text style={styles.expiryText}>
                Expires: {formatDate(expires_at)}
              </Text>
            )}
          </View>
          
          {status === 'open' && (
            <VoteButtons
              predictionId={id}
              userVote={user_vote}
              onVote={onVote}
              disabled={!!user_vote}
            />
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 8,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  content: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  voteProgress: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#ffebee',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 2,
  },
  voteStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voteText: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  expiryText: {
    fontSize: 11,
    color: '#999',
  },
});

export default PredictionCard;