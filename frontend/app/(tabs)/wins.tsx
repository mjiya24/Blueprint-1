import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { WinCard } from '../../components/WinCard';
import { useTheme } from '../../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

const CATEGORIES = ['All', 'AI & Automation', 'Digital & Content', 'Agency & B2B', 'No-Code & SaaS', 'Local & Service', 'Passive & Investment', 'Gig Economy'];

export default function WinsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const elevatedCard = theme.isDark ? null : {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  };
  const [wins, setWins] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stats, setStats] = useState({ total_wins: 0, total_earned: 0, verified_count: 0 });

  useEffect(() => {
    AsyncStorage.getItem('user').then(d => d && setUser(JSON.parse(d)));
    loadWins();
  }, []);

  const loadWins = async (category?: string) => {
    try {
      const cat = category || selectedCategory;
      const params = cat !== 'All' ? `?category=${encodeURIComponent(cat)}` : '';
      const [winsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/wins${params}`),
        axios.get(`${API_URL}/api/wins/stats`),
      ]);
      setWins(winsRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.log('Error loading wins:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWins();
  }, [selectedCategory]);

  const selectCategory = (cat: string) => {
    setSelectedCategory(cat);
    loadWins(cat);
  };

  const handleUpvote = async (winId: string) => {
    try {
      await axios.post(`${API_URL}/api/wins/${winId}/upvote`);
      setWins(prev => prev.map(w => w.id === winId ? { ...w, upvotes: (w.upvotes || 0) + 1 } : w));
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }] }>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Community Wins</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE FEED</Text>
          </View>
        </View>
        {user?.is_architect && (
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => router.push('/submit-win')}
            data-testid="submit-win-btn"
          >
            <Ionicons name="add" size={18} color="#000" />
            <Text style={styles.submitBtnText}>Post Win</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard] }>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.accent }]}>{stats.total_wins}</Text>
          <Text style={[styles.statLabel, { color: theme.textSub }]}>Total Wins</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.accent }]}>${(stats.total_earned / 1000).toFixed(0)}K+</Text>
          <Text style={[styles.statLabel, { color: theme.textSub }]}>Total Earned</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.accent }]}>{stats.verified_count}</Text>
          <Text style={[styles.statLabel, { color: theme.textSub }]}>Verified</Text>
        </View>
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: theme.surface, borderColor: theme.border },
              selectedCategory === item && [styles.filterChipActive, { backgroundColor: theme.accentLight, borderColor: theme.accent }],
              elevatedCard,
            ]}
            onPress={() => selectCategory(item)}
          >
            <Text style={[styles.filterText, { color: theme.textSub }, selectedCategory === item && [styles.filterTextActive, { color: theme.accent }]]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.filterList}
      />

      {/* Wins Feed */}
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#00D95F" />
        </View>
      ) : wins.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No wins yet</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSub }]}>Be the first to share your Blueprint success!</Text>
          {user?.is_architect && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/submit-win')}>
              <Text style={styles.emptyBtnText}>Share Your Win</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={wins}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <WinCard win={item} onUpvote={() => handleUpvote(item.id)} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D95F" />}
          ListFooterComponent={
            !user?.is_architect ? (
              <TouchableOpacity
                style={styles.architectCta}
                onPress={() => router.push('/architect-upgrade')}
                data-testid="architect-cta-wins"
              >
                <Ionicons name="flash" size={16} color="#000" />
                <Text style={styles.architectCtaText}>Post your win — Architect Tier</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00D95F' },
  liveText: { fontSize: 10, color: '#00D95F', fontWeight: '800', letterSpacing: 1.5 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00D95F', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  submitBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#1A1C23', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2A2C35',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#00D95F' },
  statLabel: { fontSize: 10, color: '#4A4A4A', fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#2A2C35' },
  filterList: { maxHeight: 44, marginBottom: 4 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 4, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#1A1C23', borderWidth: 1, borderColor: '#2A2C35',
  },
  filterChipActive: { backgroundColor: '#00D95F18', borderColor: '#00D95F' },
  filterText: { fontSize: 12, color: '#4A4A4A', fontWeight: '600' },
  filterTextActive: { color: '#00D95F' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  emptyDesc: { fontSize: 14, color: '#4A4A4A', textAlign: 'center' },
  emptyBtn: { backgroundColor: '#00D95F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 4 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  architectCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00D95F', borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 20,
  },
  architectCtaText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
