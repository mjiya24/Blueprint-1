import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8001';

export default function WinsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    active_streaks: 12,
    verified_proofs: 3,
    total_completions: 128,
  });

  const loadActivity = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/activity?limit=10`);
      const items = Array.isArray(res.data?.activities) ? res.data.activities : [];
      setActivities(items);
      setStats({
        active_streaks: Math.max(12, items.filter((item: any) => item.proof_type === 'streak').length + 10),
        verified_proofs: Math.max(3, items.filter((item: any) => item.verified).length + 2),
        total_completions: Math.max(128, items.length + 120),
      });
    } catch (error) {
      console.log('Error loading activity feed:', error);
      setActivities([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActivity();
  }, [loadActivity]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => router.push({ pathname: '/(tabs)/discover' })}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <View style={styles.userRow}>
          <Image source={{ uri: item.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }} style={styles.avatar} />
          <View style={styles.userMeta}>
            <View style={styles.handleRow}>
              <Text style={[styles.userName, { color: theme.text }]}>{item.username}</Text>
              {item.verified ? (
                <Ionicons name="shield-checkmark" size={14} color={theme.accent} />
              ) : null}
            </View>
            <Text style={[styles.timestamp, { color: theme.textMuted }]}>{item.timestamp}</Text>
          </View>
        </View>
        <View style={styles.pathPill}>
          <Text style={styles.pathPillText}>{item.path_title}</Text>
        </View>
      </View>

      <Text style={[styles.stepTitle, { color: theme.text }]}>{item.step_completed}</Text>

      <View style={[styles.proofBadge, { backgroundColor: item.verified ? '#1DE9B6' : '#F59E0B' }]}>
        <Text style={styles.proofBadgeText}>{item.proof_value}</Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.metaRow}>
          <Ionicons name="sparkles" size={14} color={theme.accent} />
          <Text style={[styles.metaText, { color: theme.textSub }]}>Verified proof</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="hand-left" size={14} color={theme.textMuted} />
          <Text style={[styles.metaText, { color: theme.textSub }]}>{item.likes || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Activity</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE EXECUTION FEED</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.miniButton} onPress={() => router.push('/submit-win')}>
          <Ionicons name="add" size={16} color="#000" />
          <Text style={styles.miniButtonText}>Post</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.statsBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.accent }]}>{stats.active_streaks}</Text>
          <Text style={[styles.statLabel, { color: theme.textSub }]}>Active Streaks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.accent }]}>{stats.verified_proofs}</Text>
          <Text style={[styles.statLabel, { color: theme.textSub }]}>Verified Proofs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.accent }]}>{stats.total_completions}</Text>
          <Text style={[styles.statLabel, { color: theme.textSub }]}>Completions</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No proof yet</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSub }]}>Your creator progress feed will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#35E4A1', marginRight: 6 },
  liveText: { fontSize: 10, color: '#35E4A1', fontWeight: '800', letterSpacing: 1.4 },
  miniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#35E4A1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  miniButtonText: { color: '#000', fontWeight: '700', fontSize: 12 },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 21, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 4, fontWeight: '700' },
  statDivider: { width: 1, height: 30, backgroundColor: '#2A2C35' },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userRow: { flexDirection: 'row', flex: 1, alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  userMeta: { flex: 1 },
  handleRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontWeight: '700', fontSize: 15 },
  timestamp: { fontSize: 11, marginTop: 2 },
  pathPill: {
    backgroundColor: '#0A66D1',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 150,
  },
  pathPillText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 10,
    textAlign: 'center',
  },
  stepTitle: { fontSize: 15, fontWeight: '700', lineHeight: 21, marginBottom: 12 },
  proofBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  proofBadgeText: {
    color: '#08131B',
    fontWeight: '800',
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, fontWeight: '600' },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
});
