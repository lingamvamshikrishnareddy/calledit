// src/screens/CreatePredictionScreen.jsx - COMPLETE FIXES
import React, { useState, useEffect } from 'react';
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
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    closes_at: '',
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      console.log('📂 Loading categories...');
      const data = await ApiService.getCategories();
      console.log('📂 Categories response:', data);
      
      // FIXED: Handle both array and object responses
      let categoriesArray = [];
      if (Array.isArray(data)) {
        categoriesArray = data;
      } else if (data && data.categories && Array.isArray(data.categories)) {
        categoriesArray = data.categories;
      } else {
        // Use fallback categories with database IDs
        categoriesArray = [
          { id: 'sports', name: '⚽ Sports', icon_name: 'football' },
          { id: 'pop-culture', name: '🎭 Pop Culture', icon_name: 'musical-notes' },
          { id: 'entertainment', name: '🎬 TV & Movies', icon_name: 'tv' },
          { id: 'social-media', name: '📱 Social Drama', icon_name: 'phone-portrait' },
          { id: 'trending', name: '🔥 Viral', icon_name: 'flame' },
          { id: 'other', name: '🤔 Other', icon_name: 'help-circle' },
        ];
      }
      
      if (categoriesArray.length > 0) {
        setCategories(categoriesArray);
        // Set first category as default
        setFormData(prev => ({ ...prev, category_id: categoriesArray[0].id }));
        console.log('✅ Categories loaded:', categoriesArray.length, 'categories');
      } else {
        throw new Error('No categories available');
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      // Use hardcoded fallback categories that match your database
      const fallbackCategories = [
        { id: 'sports', name: '⚽ Sports', icon_name: 'football' },
        { id: 'pop-culture', name: '🎭 Pop Culture', icon_name: 'musical-notes' },
        { id: 'entertainment', name: '🎬 TV & Movies', icon_name: 'tv' },
        { id: 'social-media', name: '📱 Social Drama', icon_name: 'phone-portrait' },
        { id: 'trending', name: '🔥 Viral', icon_name: 'flame' },
        { id: 'other', name: '🤔 Other', icon_name: 'help-circle' },
      ];
      setCategories(fallbackCategories);
      setFormData(prev => ({ ...prev, category_id: fallbackCategories[0].id }));
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Title validation
    if (!formData.title || !formData.title.trim()) {
      errors.title = 'Please enter a prediction title';
    } else if (formData.title.length > 200) {
      errors.title = 'Title must be less than 200 characters';
    } else if (formData.title.trim().length < 10) {
      errors.title = 'Title must be at least 10 characters';
    }

    // Description validation
    if (!formData.description || !formData.description.trim()) {
      errors.description = 'Please enter a description';
    } else if (formData.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    } else if (formData.description.trim().length < 20) {
      errors.description = 'Description must be at least 20 characters';
    }

    // Category validation
    if (!formData.category_id) {
      errors.category_id = 'Please select a category';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
  if (loading) return;

  console.log('🚀 Attempting to create prediction...');
  console.log('📝 Current form data:', formData);

  if (!validateForm()) {
    console.log('❌ Form validation failed:', formErrors);
    const firstError = Object.values(formErrors)[0];
    if (firstError) {
      Alert.alert('Validation Error', firstError);
    }
    return;
  }

  setLoading(true);
  
  try {
    // Create proper ISO date (7 days from now)
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + 7);
    closeDate.setHours(23, 59, 59, 999);
    
    // FIXED: Use proper backend format
    const predictionData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category_id: formData.category_id,
      closes_at: closeDate.toISOString(),
    };

    console.log('📤 Submitting prediction data:', predictionData);

    const response = await ApiService.createPrediction(predictionData);
    
    console.log('✅ Prediction created successfully:', response);
    
    Alert.alert(
      'Success! 🎉', 
      'Your prediction has been created and is now live!', 
      [
        { 
          text: 'View Prediction', 
          onPress: () => {
            // Reset form first
            setFormData({
              title: '',
              description: '',
              category_id: categories[0]?.id || '',
              closes_at: '',
            });
            setFormErrors({});
            
            // Navigate to main screen
            navigation.navigate('Main', { screen: 'Events' });
          }
        },
        { 
          text: 'Create Another', 
          onPress: () => {
            // Reset form
            setFormData({
              title: '',
              description: '',
              category_id: categories[0]?.id || '',
              closes_at: '',
            });
            setFormErrors({});
          }
        }
      ]
    );
  } catch (error) {
    console.error('❌ Create prediction error:', error);
    Alert.alert('Error', error.message || 'Failed to create prediction. Please try again.');
  } finally {
    setLoading(false);
  }
};
  // Check if form is valid for submit button styling
  const isFormValid = () => {
    return formData.title.trim().length >= 10 && 
           formData.description.trim().length >= 20 && 
           formData.category_id && 
           Object.keys(formErrors).length === 0;
  };

  if (categoriesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

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
            style={[
              styles.titleInput,
              formErrors.title && styles.inputError
            ]}
            placeholder="Will Taylor Swift announce a new album at the Grammys?"
            placeholderTextColor="#666"
            value={formData.title}
            onChangeText={(value) => handleInputChange('title', value)}
            multiline
            maxLength={200}
          />
          {formErrors.title && (
            <Text style={styles.errorText}>{formErrors.title}</Text>
          )}
          <Text style={[
            styles.charCount, 
            formData.title.length > 180 && styles.charCountWarning
          ]}>
            {formData.title.length}/200
          </Text>
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Details</Text>
          <TextInput
            style={[
              styles.descriptionInput,
              formErrors.description && styles.inputError
            ]}
            placeholder="Give some context... Why do you think this will happen? What are the signs? The more detail, the better!"
            placeholderTextColor="#666"
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            multiline
            maxLength={1000}
          />
          {formErrors.description && (
            <Text style={styles.errorText}>{formErrors.description}</Text>
          )}
          <Text style={[
            styles.charCount,
            formData.description.length > 900 && styles.charCountWarning
          ]}>
            {formData.description.length}/1000
          </Text>
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
                  formData.category_id === category.id && styles.selectedCategory
                ]}
                onPress={() => handleInputChange('category_id', category.id)}
              >
                <Ionicons 
                  name={category.icon_name || 'help-circle'} 
                  size={20} 
                  color={formData.category_id === category.id ? '#000' : '#FF69B4'}
                />
                <Text style={[
                  styles.categoryText,
                  formData.category_id === category.id && styles.selectedCategoryText
                ]}>
                  {category.name}
                </Text>
                {category.prediction_count && (
                  <Text style={[
                    styles.categoryCount,
                    formData.category_id === category.id && styles.selectedCategoryCount
                  ]}>
                    {category.prediction_count}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          {formErrors.category_id && (
            <Text style={styles.errorText}>{formErrors.category_id}</Text>
          )}
        </View>

        {/* Closing Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>⏰ Voting Period</Text>
          <Text style={styles.infoText}>
            Your prediction will be open for voting for 7 days from creation. 
            After that, the community will decide the outcome!
          </Text>
        </View>

        {/* Submit Button - FIXED: Always visible when form is valid */}
        <TouchableOpacity
          style={[
            styles.submitButton, 
            (!isFormValid() || loading) && styles.disabledButton
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid() || loading}
        >
          <LinearGradient
            colors={(!isFormValid() || loading) ? ['#666', '#666'] : ['#FF69B4', '#FF1493']}
            style={styles.submitGradient}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitButtonText}>Creating...</Text>
              </>
            ) : (
              <>
                <Ionicons name="rocket" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {isFormValid() ? '🚀 Launch Prediction' : '📝 Complete Form'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Form Status Indicator */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>📋 Form Status</Text>
          <View style={styles.statusItem}>
            <Ionicons 
              name={formData.title.length >= 10 ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={formData.title.length >= 10 ? "#4caf50" : "#666"} 
            />
            <Text style={[
              styles.statusText,
              formData.title.length >= 10 && styles.statusComplete
            ]}>
              Title ({formData.title.length}/200 chars)
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Ionicons 
              name={formData.description.length >= 20 ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={formData.description.length >= 20 ? "#4caf50" : "#666"} 
            />
            <Text style={[
              styles.statusText,
              formData.description.length >= 20 && styles.statusComplete
            ]}>
              Description ({formData.description.length}/1000 chars)
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Ionicons 
              name={formData.category_id ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={formData.category_id ? "#4caf50" : "#666"} 
            />
            <Text style={[
              styles.statusText,
              formData.category_id && styles.statusComplete
            ]}>
              Category selected
            </Text>
          </View>
        </View>

        {/* Debug Section (Dev Only) */}
        {__DEV__ && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>Debug Info (Dev Only)</Text>
            <Text style={styles.debugText}>Title: {formData.title.length}/200 chars</Text>
            <Text style={styles.debugText}>Description: {formData.description.length}/1000 chars</Text>
            <Text style={styles.debugText}>Category ID: {formData.category_id}</Text>
            <Text style={styles.debugText}>Form Valid: {isFormValid() ? '✅' : '❌'}</Text>
            <Text style={styles.debugText}>Loading: {loading ? '⏳' : '✅'}</Text>
            <Text style={styles.debugText}>Categories: {categories.length} loaded</Text>
            <Text style={styles.debugText}>Errors: {JSON.stringify(formErrors)}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ccc',
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
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 5,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  charCountWarning: {
    color: '#ff9800',
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
  categoryCount: {
    fontSize: 11,
    color: '#999',
    marginLeft: 6,
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selectedCategoryCount: {
    color: '#000',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  infoSection: {
    backgroundColor: '#0a1a2a',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4fc3f7',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#b3c7d6',
    lineHeight: 20,
  },
  statusSection: {
    backgroundColor: '#0a1a0a',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#2a4f2a',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 15,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  statusComplete: {
    color: '#4caf50',
  },
  submitButton: {
    marginBottom: 20,
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
  debugSection: {
    backgroundColor: '#1a0a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#333',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff9800',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 4,
  },
});

export default CreatePredictionScreen;