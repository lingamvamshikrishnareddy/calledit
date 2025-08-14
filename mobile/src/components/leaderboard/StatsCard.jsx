// src/components/leaderboard/StatsCard.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../common/Card';

const StatsCard = ({ title, stats, style }) => {
  const renderStatItem = (stat, index) => (
    <View key={index} style={[styles.statItem, index > 0 && styles.statBorder]}>
      <View style={styles.statHeader}>
        <Ionicons 
          name={stat.icon} 
          size={20} 
          color={stat.color || '#007AFF'} 
        />
        <Text style={styles.statLabel}>{stat.label}</Text>
      </View>
      <Text style={[styles.statValue, { color: stat.color || '#333' }]}>
        {stat.value}
      </Text>
      {stat.subtitle && (
        <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
      )}
    </View>
  );

  return (
    <Card style={[styles.card, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.statsContainer}>
        {stats.map(renderStatItem)}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#f0f0f0',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default StatsCard;