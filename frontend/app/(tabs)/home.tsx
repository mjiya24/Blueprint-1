import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  potential_earnings: string;
  difficulty: string;
  startup_cost: string;
  match_score?: number;
  tags: string[];
}

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        await fetchPersonalizedIdeas(parsedUser.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPersonalizedIdeas = async (userId: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/ideas/personalized/${userId}`);
      setIdeas(response.data.slice(0, 6)); // Top 6 personalized ideas
    } catch (error) {
      console.error('Error fetching ideas:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name || 'Guest'}!</Text>
            <Text style={styles.subtitle}>Ready to make some money?</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#E2E8F0" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="bulb" size={28} color="#10B981" />
            <Text style={styles.statNumber}>{ideas.length}</Text>
            <Text style={styles.statLabel}>Ideas for You</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={28} color="#3B82F6" />
            <Text style={styles.statNumber}>15</Text>
            <Text style={styles.statLabel}>Total Ideas</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personalized for You</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/discover')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {ideas.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>No personalized ideas yet</Text>
              <Text style={styles.emptySubtext}>Complete your profile to get better recommendations</Text>
            </View>
          ) : (
            ideas.map((idea) => (
              <TouchableOpacity
                key={idea.id}
                style={styles.ideaCard}
                onPress={() => router.push({ pathname: '/idea-detail', params: { id: idea.id } })}
              >
                <View style={styles.ideaHeader}>
                  <View style={styles.ideaCategory}>
                    <Ionicons name="pricetag" size={16} color="#10B981" />
                    <Text style={styles.categoryText}>{idea.category}</Text>
                  </View>
                  {idea.match_score && idea.match_score > 0 && (
                    <View style={styles.matchBadge}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.matchText}>{idea.match_score}% Match</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.ideaTitle}>{idea.title}</Text>
                <Text style={styles.ideaDescription} numberOfLines={2}>
                  {idea.description}
                </Text>

                <View style={styles.ideaFooter}>
                  <View style={styles.ideaMeta}>
                    <View style={[styles.badge, { backgroundColor: getCostColor(idea.startup_cost) + '20' }]}>
                      <Text style={[styles.badgeText, { color: getCostColor(idea.startup_cost) }]}>
                        {idea.startup_cost} cost
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: getDifficultyColor(idea.difficulty) + '20' }]}>
                      <Text style={[styles.badgeText, { color: getDifficultyColor(idea.difficulty) }]}>
                        {idea.difficulty}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.earnings}>{idea.potential_earnings}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/discover')}
            >
              <Ionicons name="compass" size={32} color="#3B82F6" />
              <Text style={styles.actionText}>Discover All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/saved')}
            >
              <Ionicons name="bookmark" size={32} color="#10B981" />
              <Text style={styles.actionText}>Saved Ideas</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  seeAll: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  ideaCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
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
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    marginLeft: 4,
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
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '600',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
});
