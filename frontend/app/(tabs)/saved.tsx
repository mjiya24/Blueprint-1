import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const getDifficultyColor = (d: string) => {
  if (d === 'beginner') return '#00D95F';
  if (d === 'intermediate') return '#F59E0B';
  return '#FF6B6B';
};

export default function SavedScreen() {
  const router = useRouter();
  const [savedIdeas, setSavedIdeas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => { loadSavedIdeas(); }, []);

  const loadSavedIdeas = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const u = JSON.parse(userData);
        setUser(u);
        if (!u.is_guest) {
          const res = await axios.get(`${API_URL}/api/saved-ideas/${u.id}`);
          setSavedIdeas(res.data);
        }
      }
    } catch (e) {
      console.error('Error loading saved ideas:', e);
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
      setSavedIdeas(prev => prev.filter(i => i.id !== ideaId));
    } catch (e) {
      console.error('Error removing saved idea:', e);
    }
  };

  const getProgressColor = (p: number) => p === 100 ? '#00D95F' : p >= 50 ? '#F59E0B' : '#3B82F6';

  const renderCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/idea-detail', params: { id: item.id } })}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{item.category}</Text>
          </View>
          <TouchableOpacity style={styles.unsaveBtn} onPress={() => handleUnsave(item.id)}>
            <Ionicons name="bookmark" size={18} color="#00D95F" />
          </TouchableOpacity>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        {/* Progress bar */}
        {item.progress_percentage !== undefined && (
          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${item.progress_percentage}%`,
                backgroundColor: getProgressColor(item.progress_percentage),
              }]} />
            </View>
            <Text style={[styles.progressText, { color: getProgressColor(item.progress_percentage) }]}>
              {item.progress_percentage === 100 ? 'Blueprint Complete!' : `${item.progress_percentage}% complete`}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.pillsRow}>
            <View style={[styles.pill, { backgroundColor: getDifficultyColor(item.difficulty) + '18' }]}>
              <Text style={[styles.pillText, { color: getDifficultyColor(item.difficulty) }]}>{item.difficulty}</Text>
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
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#00D95F" />
      </View>
    );
  }

  if (user?.is_guest) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.header}>
          <Text style={styles.title}>My Plans</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={32} color="#4A4A4A" />
          </View>
          <Text style={styles.emptyTitle}>Plans are locked in Guest Mode</Text>
          <Text style={styles.emptyDesc}>
            Create a free account to save blueprints and track your progress toward your first dollar.
          </Text>
          <TouchableOpacity style={styles.signUpButton} onPress={() => router.push('/onboarding/auth')}>
            <Text style={styles.signUpText}>Create Free Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Plans</Text>
          <Text style={styles.subtitle}>{savedIdeas.length} blueprints saved</Text>
        </View>
        {savedIdeas.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{savedIdeas.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={savedIdeas}
        renderItem={renderCard}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D95F" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={52} color="#2A2C35" />
            <Text style={styles.emptyTitle}>No saved blueprints</Text>
            <Text style={styles.emptyDesc}>Explore ideas and start your first Blueprint</Text>
            <TouchableOpacity style={styles.signUpButton} onPress={() => router.push('/(tabs)/discover')}>
              <Text style={styles.signUpText}>Discover Blueprints</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#8E8E8E' },
  countBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#00D95F', justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 14, fontWeight: '700', color: '#000' },
  listContainer: { paddingHorizontal: 24, paddingBottom: 32 },
  card: { backgroundColor: '#1A1C23', borderRadius: 16, padding: 18, marginBottom: 10, borderWidth: 1, borderColor: '#2A2C35' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catBadge: { backgroundColor: '#00D95F12', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catText: { fontSize: 11, color: '#00D95F', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  unsaveBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#00D95F12', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#8E8E8E', lineHeight: 18, marginBottom: 12 },
  progressSection: { marginBottom: 12 },
  progressTrack: { height: 4, backgroundColor: '#000', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 11, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillsRow: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  earnings: { fontSize: 14, fontWeight: '700', color: '#00D95F' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  lockIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#2A2C35' },
  emptyTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: '#8E8E8E', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  signUpButton: { backgroundColor: '#00D95F', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  signUpText: { color: '#000', fontSize: 15, fontWeight: '700' },
});
