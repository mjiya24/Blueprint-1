import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { fetchPaths, fetchUserPathProgress, saveUserPathProgress } from '../../src/services/api';
import type { PathModel, UserPathProgress } from '../../src/types/path';

const getDifficultyColor = (d: string) => {
  if (d === 'beginner') return '#00D95F';
  if (d === 'intermediate') return '#F59E0B';
  return '#FF6B6B';
};

export default function SavedScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const elevatedCard = theme.isDark ? null : {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  };
  const [paths, setPaths] = useState<PathModel[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, UserPathProgress | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => { loadPaths(); }, []);

  const loadPaths = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        setPaths([]);
        setIsLoading(false);
        return;
      }

      const u = JSON.parse(userData);
      setUser(u);

      if (u.is_guest) {
        setPaths([]);
        setIsLoading(false);
        return;
      }

      const { paths: livePaths } = await fetchPaths();
      setPaths(livePaths);

      const entries = await Promise.all(
        livePaths.map(async (path) => {
          const progress = await fetchUserPathProgress(u.id, path.id).catch(() => null);
          return [path.id, progress] as const;
        })
      );
      setProgressMap(Object.fromEntries(entries));
    } catch {
      setPaths([]);
      setProgressMap({});
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPaths();
    setRefreshing(false);
  };

  const handleCheckpoint = async (path: PathModel) => {
    if (!user) return;

    const current = progressMap[path.id];
    const activeSteps = path.steps || [];
    const nextStep = activeSteps.find((step) => !(current?.completed_step_ids || []).includes(step.id));
    const completed = [...new Set([...(current?.completed_step_ids || []), nextStep?.id ?? activeSteps[0]?.id ?? ''])];
    const percentComplete = activeSteps.length > 0 ? Math.min(100, Math.round((completed.length / activeSteps.length) * 100)) : 0;

    const payload: UserPathProgress = {
      id: current?.id ?? `${user.id}-${path.id}`,
      user_id: user.id,
      path_id: path.id,
      started_at: current?.started_at ?? new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      completed_step_ids: completed,
      percent_complete: percentComplete,
      status: percentComplete >= 100 ? 'completed' : 'active',
    };

    await saveUserPathProgress(payload).catch(() => null);
    setProgressMap(prev => ({ ...prev, [path.id]: payload }));
  };

  const renderCard = ({ item }: { item: PathModel }) => {
    const progress = progressMap[item.id] ?? null;
    const percent = progress?.percent_complete ?? 0;
    const nextSteps = (item.steps || []).slice(0, 3);

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard]}>
        <View style={styles.cardTop}>
          <View style={styles.catBadge}>
            <Text style={styles.catText}>{item.category}</Text>
          </View>
          <TouchableOpacity style={[styles.progressBtn, { backgroundColor: theme.accentLight }]} onPress={() => handleCheckpoint(item)}>
            <Ionicons name="checkmark-done" size={16} color="#00D95F" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: theme.textSub }]} numberOfLines={2}>{item.summary || item.description || 'Path details coming soon.'}</Text>

        <View style={styles.progressSection}>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: percent >= 100 ? '#00D95F' : '#3B82F6' }]} />
          </View>
          <Text style={[styles.progressText, { color: percent >= 100 ? '#00D95F' : '#3B82F6' }]}>
            {percent === 100 ? 'Path complete' : `${percent}% complete`}
          </Text>
        </View>

        <View style={styles.checkpointList}>
          {nextSteps.map((step) => (
            <Text key={step.id} style={[styles.checkpointItem, { color: theme.textSub }]}>
              {progress?.completed_step_ids?.includes(step.id) ? '✓' : '○'} {step.title}
            </Text>
          ))}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.pillsRow}>
            <View style={[styles.pill, { backgroundColor: getDifficultyColor(item.difficulty) + '18' }]}>
              <Text style={[styles.pillText, { color: getDifficultyColor(item.difficulty) }]}>{item.difficulty}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: '#8B5CF618' }]}>
              <Text style={[styles.pillText, { color: '#A78BFA' }]}>{item.estimated_duration_days ?? 7} days</Text>
            </View>
          </View>
          <Text style={[styles.earnings, { color: theme.accent }]}>{item.price > 0 ? `$${item.price}` : 'Free'}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }] }>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
        <ActivityIndicator size="large" color="#00D95F" />
      </View>
    );
  }

  if (user?.is_guest) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }] }>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>My Plans</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.lockIcon, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard]}>
            <Ionicons name="lock-closed" size={32} color={theme.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Progress is locked in Guest Mode</Text>
          <Text style={[styles.emptyDesc, { color: theme.textSub }]}>Create a free account to track active paths and checkpoint completion.</Text>
          <TouchableOpacity style={styles.signUpButton} onPress={() => router.push('/onboarding/auth')}>
            <Text style={styles.signUpText}>Create Free Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }] }>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>My Plans</Text>
          <Text style={[styles.subtitle, { color: theme.textSub }]}>{paths.length} active paths</Text>
        </View>
        {paths.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{paths.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={paths}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D95F" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={52} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No active paths yet</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSub }]}>Explore the catalog and start your next Pathfinder route.</Text>
            <TouchableOpacity style={styles.signUpButton} onPress={() => router.push('/(tabs)/discover')}>
              <Text style={styles.signUpText}>Explore Paths</Text>
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
  card: { backgroundColor: '#111827', borderRadius: 18, padding: 18, marginBottom: 10, borderWidth: 1, borderColor: '#1F2A44' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catBadge: { backgroundColor: '#00D95F12', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catText: { fontSize: 11, color: '#00D95F', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  progressBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#8E8E8E', lineHeight: 18, marginBottom: 12 },
  progressSection: { marginBottom: 10 },
  progressTrack: { height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 11, fontWeight: '600' },
  checkpointList: { marginBottom: 12, gap: 6 },
  checkpointItem: { fontSize: 12, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  earnings: { fontSize: 18, fontWeight: '800', color: '#00D95F' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  lockIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#2A2C35' },
  emptyTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: '#8E8E8E', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  signUpButton: { backgroundColor: '#00D95F', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  signUpText: { color: '#000', fontSize: 15, fontWeight: '700' },
});
