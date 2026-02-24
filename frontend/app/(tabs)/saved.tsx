import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SavedScreen() {
  const router = useRouter();
  const [savedIdeas, setSavedIdeas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadSavedIdeas();
  }, []);

  const loadSavedIdeas = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        if (!parsedUser.is_guest) {
          const response = await axios.get(`${API_URL}/api/saved-ideas/${parsedUser.id}`);
          setSavedIdeas(response.data);
        }
      }
    } catch (error) {
      console.error('Error loading saved ideas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedIdeas();
    setRefreshing(false);
  };

  const handleUnsave = async (ideaId: string) => {
    try {
      await axios.delete(`${API_URL}/api/saved-ideas/${user.id}/${ideaId}`);
      setSavedIdeas(savedIdeas.filter(idea => idea.id !== ideaId));
    } catch (error) {
      console.error('Error removing saved idea:', error);
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

  const renderIdeaCard = ({ item }: { item: any }) => (
    <View style={styles.ideaCard}>
      <TouchableOpacity
        style={styles.ideaContent}
        onPress={() => router.push({ pathname: '/idea-detail', params: { id: item.id } })}
      >
        <View style={styles.ideaHeader}>
          <View style={styles.ideaCategory}>
            <Ionicons name="pricetag" size={14} color="#10B981" />
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <TouchableOpacity
            style={styles.unsaveButton}
            onPress={() => handleUnsave(item.id)}
          >
            <Ionicons name="bookmark" size={20} color="#10B981" />
          </TouchableOpacity>
        </View>

        <Text style={styles.ideaTitle}>{item.title}</Text>
        <Text style={styles.ideaDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.ideaFooter}>
          <View style={styles.ideaMeta}>
            <View style={[styles.badge, { backgroundColor: getCostColor(item.startup_cost) + '20' }]}>
              <Text style={[styles.badgeText, { color: getCostColor(item.startup_cost) }]}>
                {item.startup_cost}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getDifficultyColor(item.difficulty) + '20' }]}>
              <Text style={[styles.badgeText, { color: getDifficultyColor(item.difficulty) }]}>
                {item.difficulty}
              </Text>
            </View>
          </View>
          <Text style={styles.earnings}>{item.potential_earnings}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (user?.is_guest) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.title}>Saved Ideas</Text>
        </View>
        <View style={styles.guestState}>
          <Ionicons name="person-outline" size={64} color="#64748B" />
          <Text style={styles.guestText}>Guest Mode</Text>
          <Text style={styles.guestSubtext}>
            Create an account to save ideas and track your progress
          </Text>
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push('/onboarding/auth')}
          >
            <Text style={styles.signUpButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Saved Ideas</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{savedIdeas.length}</Text>
        </View>
      </View>

      <FlatList
        data={savedIdeas}
        renderItem={renderIdeaCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={64} color="#64748B" />
            <Text style={styles.emptyText}>No saved ideas yet</Text>
            <Text style={styles.emptySubtext}>
              Explore ideas and save the ones you like
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/discover')}
            >
              <Text style={styles.exploreButtonText}>Discover Ideas</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#10B981',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  ideaCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 12,
  },
  ideaContent: {
    padding: 20,
  },
  ideaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ideaCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  unsaveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ideaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  ideaDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 16,
  },
  ideaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ideaMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  earnings: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#E2E8F0',
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  exploreButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  guestState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  guestText: {
    fontSize: 20,
    color: '#E2E8F0',
    fontWeight: 'bold',
    marginTop: 20,
  },
  guestSubtext: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  signUpButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 32,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
