import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { EarningsCommandCenter } from '../../components/EarningsCommandCenter';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

const progressColor = (value: number) => {
  if (value >= 100) return '#00D95F';
  if (value >= 60) return '#3B82F6';
  if (value >= 30) return '#F59E0B';
  return '#8B5CF6';
};

export default function ArchitectDashboardScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedIdeas, setSavedIdeas] = useState<any[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      const userRaw = await AsyncStorage.getItem('user');
      if (!userRaw) {
        setUser(null);
        setSavedIdeas([]);
        return;
      }

      const parsed = JSON.parse(userRaw);
      setUser(parsed);

      if (!parsed.is_guest) {
        const res = await axios.get(`${API_URL}/api/saved-ideas/${parsed.id}`, { timeout: 12000 });
        setSavedIdeas(Array.isArray(res.data) ? res.data : []);
      } else {
        setSavedIdeas([]);
      }
    } catch {
      setSavedIdeas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const total = savedIdeas.length;
    const completed = savedIdeas.filter((i) => (i.progress_percentage || 0) >= 100).length;
    const active = savedIdeas.filter((i) => {
      const p = i.progress_percentage || 0;
      return p > 0 && p < 100;
    }).length;
    const starter = total - completed - active;
    const avgProgress = total ? Math.round(savedIdeas.reduce((sum, i) => sum + (i.progress_percentage || 0), 0) / total) : 0;
    return { total, completed, active, starter, avgProgress };
  }, [savedIdeas]);

  const activePlans = useMemo(() => {
    return [...savedIdeas]
      .sort((a, b) => (b.progress_percentage || 0) - (a.progress_percentage || 0))
      .slice(0, 8);
  }, [savedIdeas]);

  const nextMilestone = useMemo(() => {
    const candidate = activePlans.find((p) => (p.progress_percentage || 0) < 100);
    if (!candidate) {
      return {
        label: 'Log your next win',
        detail: 'All tracked blueprints are complete. Time to post a victory and stack momentum.',
        ideaId: null as string | null,
      };
    }

    const p = Number(candidate.progress_percentage || 0);
    if (p < 30) {
      return {
        label: 'Complete your first action block',
        detail: `${candidate.title} is at ${p}%. Finish the setup phase to unlock momentum.`,
        ideaId: candidate.id as string,
      };
    }
    if (p < 70) {
      return {
        label: 'Push to execution milestone',
        detail: `${candidate.title} is at ${p}%. One focused session can move this into high-conviction range.`,
        ideaId: candidate.id as string,
      };
    }
    return {
      label: 'Finalize and launch payout step',
      detail: `${candidate.title} is at ${p}%. You are close to completion and first monetization events.`,
      ideaId: candidate.id as string,
    };
  }, [activePlans]);

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: theme.bg }]}> 
        <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
        <ActivityIndicator size="large" color="#00D95F" />
      </View>
    );
  }

  if (!user || user.is_guest) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}> 
        <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
        <View style={styles.gateWrap}>
          <Ionicons name="lock-closed" size={44} color={theme.textMuted} />
          <Text style={[styles.gateTitle, { color: theme.text }]}>Sign in to view your Architect Dashboard</Text>
          <Text style={[styles.gateSub, { color: theme.textSub }]}>Track active blueprints, completion velocity, and payout momentum in one place.</Text>
          <View style={[styles.previewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.previewTitle, { color: theme.text }]}>Preview: Momentum Snapshot</Text>
            <View style={[styles.previewTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.previewFill, { width: '68%' }]} />
            </View>
            <Text style={[styles.previewMeta, { color: theme.textSub }]}>Blueprint Velocity: 68% this week</Text>
          </View>
          <TouchableOpacity style={styles.cta} onPress={() => router.push('/onboarding/auth')}>
            <Text style={styles.ctaText}>Create Free Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!user.is_architect) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}> 
        <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
        <View style={styles.gateWrap}>
          <View style={styles.architectPill}>
            <Ionicons name="flash" size={14} color="#000" />
            <Text style={styles.architectPillText}>ARCHITECT DASHBOARD</Text>
          </View>
          <Text style={[styles.gateTitle, { color: theme.text }]}>Unlock your command center</Text>
          <Text style={[styles.gateSub, { color: theme.textSub }]}>See blueprint progress, earnings telemetry, and completion trends across all saved plans.</Text>
          <View style={[styles.previewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.previewTitle, { color: theme.text }]}>Architect Preview</Text>
            <Text style={[styles.previewMeta, { color: theme.textSub }]}>Earnings telemetry, milestone coaching, and live completion analytics are waiting.</Text>
          </View>
          <TouchableOpacity style={styles.cta} onPress={() => router.push('/architect-upgrade')}>
            <Text style={styles.ctaText}>Upgrade to Architect</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}> 
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
      <FlatList
        data={activePlans}
        keyExtractor={(item, index) => `${item.id || 'plan'}-${index}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D95F" />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <View style={styles.architectPill}>
                  <Ionicons name="flash" size={12} color="#000" />
                  <Text style={styles.architectPillText}>ARCHITECT DASHBOARD</Text>
                </View>
                <Text style={[styles.title, { color: theme.text }]}>Execution Command Center</Text>
                <Text style={[styles.subtitle, { color: theme.textSub }]}>Monitor unlocks, momentum, and completion rates.</Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                <Text style={[styles.metricValue, { color: '#00D95F' }]}>{stats.total}</Text>
                <Text style={[styles.metricLabel, { color: theme.textSub }]}>Tracked</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                <Text style={[styles.metricValue, { color: '#3B82F6' }]}>{stats.active}</Text>
                <Text style={[styles.metricLabel, { color: theme.textSub }]}>In Progress</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{stats.avgProgress}%</Text>
                <Text style={[styles.metricLabel, { color: theme.textSub }]}>Avg Completion</Text>
              </View>
            </View>

            <EarningsCommandCenter userId={user.id} />

            <TouchableOpacity
              style={[styles.milestoneCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => {
                if (nextMilestone.ideaId) {
                  router.push({ pathname: '/idea-detail', params: { id: nextMilestone.ideaId } });
                } else {
                  router.push('/submit-win');
                }
              }}
              activeOpacity={0.85}
            >
              <View style={styles.milestoneTop}>
                <Text style={[styles.milestoneLabel, { color: theme.textSub }]}>Next Step</Text>
                <Ionicons name="arrow-forward-circle" size={18} color="#00D95F" />
              </View>
              <Text style={[styles.milestoneTitle, { color: theme.text }]}>{nextMilestone.label}</Text>
              <Text style={[styles.milestoneDesc, { color: theme.textSub }]}>{nextMilestone.detail}</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Unlocked Blueprints</Text>
          </View>
        }
        renderItem={({ item }) => {
          const p = Math.max(0, Math.min(100, Number(item.progress_percentage || 0)));
          return (
            <TouchableOpacity
              style={[styles.planCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push({ pathname: '/idea-detail', params: { id: item.id } })}
              activeOpacity={0.8}
            >
              <View style={styles.planTop}>
                <Text style={[styles.planTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.planPct, { color: progressColor(p) }]}>{p}%</Text>
              </View>

              <Text style={[styles.planMeta, { color: theme.textSub }]} numberOfLines={1}>
                {item.category || 'Blueprint'} · {item.potential_earnings || 'Earnings in progress'}
              </Text>

              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}> 
                <View style={[styles.progressFill, { width: `${p}%`, backgroundColor: progressColor(p) }]} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="library-outline" size={42} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No unlocked blueprints yet</Text>
            <Text style={[styles.emptySub, { color: theme.textSub }]}>Start from Discover, save a blueprint, and your dashboard will populate automatically.</Text>
            <TouchableOpacity style={styles.cta} onPress={() => router.push('/(tabs)/discover')}>
              <Text style={styles.ctaText}>Browse Blueprints</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32 },
  header: { marginBottom: 14 },
  architectPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00D95F',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  architectPillText: { fontSize: 10, fontWeight: '800', color: '#000', letterSpacing: 0.9 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 5 },
  metricRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  planCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTitle: { flex: 1, fontSize: 14, fontWeight: '700', marginRight: 8 },
  planPct: { fontSize: 13, fontWeight: '800' },
  planMeta: { fontSize: 12, marginTop: 6, marginBottom: 10 },
  progressTrack: { height: 6, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  gateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  gateTitle: { marginTop: 16, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  gateSub: { marginTop: 10, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  cta: {
    marginTop: 20,
    backgroundColor: '#00D95F',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ctaText: { color: '#000', fontWeight: '800' },
  emptyWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700' },
  emptySub: { marginTop: 8, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  previewCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    opacity: 0.9,
  },
  previewTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  previewTrack: { height: 6, borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  previewFill: { height: '100%', borderRadius: 999, backgroundColor: '#00D95F' },
  previewMeta: { fontSize: 12, lineHeight: 18 },
  milestoneCard: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  milestoneTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  milestoneLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  milestoneTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  milestoneDesc: { fontSize: 13, lineHeight: 19 },
});