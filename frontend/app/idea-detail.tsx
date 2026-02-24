import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function IdeaDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [idea, setIdea] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Check if already saved
        if (!parsedUser.is_guest) {
          const savedResponse = await axios.get(`${API_URL}/api/saved-ideas/${parsedUser.id}`);
          const saved = savedResponse.data.some((item: any) => item.id === id);
          setIsSaved(saved);
        }
      }

      // Fetch idea details
      const ideaResponse = await axios.get(`${API_URL}/api/ideas/${id}`);
      setIdea(ideaResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load idea details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to save ideas');
      return;
    }

    if (user.is_guest) {
      Alert.alert(
        'Guest Mode',
        'Create an account to save ideas',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => router.push('/onboarding/auth') }
        ]
      );
      return;
    }

    try {
      if (isSaved) {
        await axios.delete(`${API_URL}/api/saved-ideas/${user.id}/${id}`);
        setIsSaved(false);
      } else {
        await axios.post(`${API_URL}/api/saved-ideas`, {
          user_id: user.id,
          idea_id: id,
          status: 'saved',
        });
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      Alert.alert('Error', 'Failed to save idea');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10B981';
      case 'intermediate': return '#F59E0B';
      case 'advanced': return '#EF4444';
      default: return '#64748B';
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
      default: return '#64748B';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!idea) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>Idea not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveToggle}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={isSaved ? '#10B981' : '#E2E8F0'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.categoryBadge}>
          <Ionicons name="pricetag" size={16} color="#10B981" />
          <Text style={styles.categoryText}>{idea.category}</Text>
        </View>

        <Text style={styles.title}>{idea.title}</Text>

        <View style={styles.metaContainer}>
          <View style={[styles.metaBadge, { backgroundColor: getCostColor(idea.startup_cost) + '20' }]}>
            <Ionicons name="cash" size={16} color={getCostColor(idea.startup_cost)} />
            <Text style={[styles.metaText, { color: getCostColor(idea.startup_cost) }]}>
              {idea.startup_cost} cost
            </Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: getDifficultyColor(idea.difficulty) + '20' }]}>
            <Ionicons name="bar-chart" size={16} color={getDifficultyColor(idea.difficulty)} />
            <Text style={[styles.metaText, { color: getDifficultyColor(idea.difficulty) }]}>
              {idea.difficulty}
            </Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: '#3B82F620' }]}>
            <Ionicons name="time" size={16} color="#3B82F6" />
            <Text style={[styles.metaText, { color: '#3B82F6' }]}>
              {idea.time_needed}
            </Text>
          </View>
        </View>

        <View style={styles.earningsCard}>
          <Ionicons name="trending-up" size={28} color="#10B981" />
          <View style={styles.earningsContent}>
            <Text style={styles.earningsLabel}>Potential Earnings</Text>
            <Text style={styles.earningsValue}>{idea.potential_earnings}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{idea.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Skills</Text>
          <View style={styles.skillsContainer}>
            {idea.required_skills.map((skill: string, index: number) => (
              <View key={index} style={styles.skillChip}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {idea.is_location_based && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Best Locations</Text>
            <View style={styles.locationsContainer}>
              {idea.location_types.map((location: string, index: number) => (
                <View key={index} style={styles.locationChip}>
                  <Ionicons name="location" size={16} color="#3B82F6" />
                  <Text style={styles.locationText}>{location}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Action Steps</Text>
          <Text style={styles.sectionSubtitle}>Follow these steps to get started</Text>
          
          {idea.action_steps.map((step: string, index: number) => (
            <TouchableOpacity
              key={index}
              style={styles.stepCard}
              onPress={() => setExpandedStep(expandedStep === index ? null : index)}
            >
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
              {expandedStep === index && (
                <View style={styles.stepExpanded}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.stepExpandedText}>Tap to mark as complete</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {idea.tags.map((tag: string, index: number) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => Alert.alert('Coming Soon', 'Action tracking feature coming soon!')}
        >
          <Ionicons name="rocket" size={20} color="#fff" />
          <Text style={styles.startButtonText}>Start This Idea</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#E2E8F0',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#10B98120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    lineHeight: 36,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  earningsContent: {
    marginLeft: 16,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#E2E8F0',
    lineHeight: 24,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  skillText: {
    fontSize: 14,
    color: '#E2E8F0',
    marginLeft: 6,
    fontWeight: '500',
  },
  locationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F620',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  locationText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 6,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  stepCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 22,
    paddingTop: 4,
  },
  stepExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  stepExpandedText: {
    fontSize: 13,
    color: '#94A3B8',
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#8B5CF620',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  bottomSpace: {
    height: 100,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
