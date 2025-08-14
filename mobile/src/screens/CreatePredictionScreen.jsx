// src/screens/CreatePredictionScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../services/api';

const CreatePredictionScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'pop_culture',
    closesAt: '',
  });

  const categories = [
    { id: 'pop_culture', name: '🎭 Pop Culture', icon: 'musical-notes' },
    { id: 'sports', name: '⚽ Sports', icon: 'football' },
    { id: 'entertainment', name: '🎬 TV & Movies', icon: 'tv' },
    { id: 'social_media', name: '📱 Social Drama', icon: 'phone-portrait' },
    { id: 'trending', name: '🔥 Viral', icon: 'flame' },
    { id: 'other', name: '🤔 Other', icon: 'help-circle' },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (loading) return;

    // Basic validation
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a prediction title');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setLoading(true);
    
    try {
      // Set default close date (7 days from now)
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 7);

      await ApiService.createPrediction({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        closes_at: closeDate.toISOString(),
      });
      
      Alert.alert('Success!', 'Your prediction has been created!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#FF69B4', '#FF1493']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>✨ Create Prediction</Text>
          <Text style={styles.headerSubtitle}>What do you think will happen?</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Your Prediction</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Will Taylor Swift announce..."
            placeholderTextColor="#666"
            value={formData.title}
            onChangeText={(value) => handleInputChange('title', value)}
            multiline
            maxLength={150}
          />
          <Text style={styles.charCount}>{formData.title.length}/150</Text>
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Details</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Give some context... Why do you think this will happen? What are the signs?"
            placeholderTextColor="#666"
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            multiline
            maxLength={500}
          />
          <Text style={styles.charCount}>{formData.description.length}/500</Text>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📂 Category</Text>
          <View style={styles.categoryContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  formData.category === category.id && styles.selectedCategory
                ]}
                onPress={() => handleInputChange('category', category.id)}
              >
                <Ionicons 
                  name={category.icon} 
                  size={20} 
                  color={formData.category === category.id ? '#000' : '#FF69B4'} 
                />
                <Text style={[
                  styles.categoryText,
                  formData.category === category.id && styles.selectedCategoryText
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Tips for Great Predictions</Text>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
            <Text style={styles.tipText}>Be specific and clear</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
            <Text style={styles.tipText}>Set realistic timeframes</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
            <Text style={styles.tipText}>Choose trending topics</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
            <Text style={styles.tipText}>Add context and reasoning</Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? ['#666', '#666'] : ['#FF69B4', '#FF1493']}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="rocket" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>🚀 Launch Prediction</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  titleInput: {
    backgroundColor: '#111',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  descriptionInput: {
    backgroundColor: '#111',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  selectedCategory: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
    marginLeft: 8,
  },
  selectedCategoryText: {
    color: '#000',
  },
  tipsSection: {
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 15,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 10,
  },
  submitButton: {
    marginBottom: 40,
    borderRadius: 15,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
});

export default CreatePredictionScreen;