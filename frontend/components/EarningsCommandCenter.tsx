import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

interface WinEntry {
  id: string;
  platform_name: string;
  amount_earned: number;
  logged_at: string;
}

interface EarningsData {
  total_earned: number;
  earned_30d: number;
  projected_potential: number;
  total_wins_logged: number;
  active_plans_count: number;
  active_plans: { title: string; potential: string; progress_pct: number; steps_done: number; total_steps: number }[];
  win_history: WinEntry[];
  lifetime_arc: number;
  arc_balance: number;
}

interface Props {
  userId: string;
}

function AnimatedCounter({ target, prefix = '$', duration = 1200 }: { target: number; prefix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<any>(null);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * ease * 100) / 100);
      if (progress < 1) startRef.current = requestAnimationFrame(tick);
    };
    startRef.current = requestAnimationFrame(tick);
    return () => { if (startRef.current) cancelAnimationFrame(startRef.current); };
  }, [target]);

  return (
    <Text style={counterStyles.value}>
      {prefix}{display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </Text>
  );
}

const counterStyles = StyleSheet.create({
  value: { fontSize: 42, fontWeight: '900', color: '#00D95F', letterSpacing: -1 },
});

export function EarningsCommandCenter({ userId }: Props) {
  const { theme } = useTheme();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setData(null);
      return;
    }
    loadEarnings();
  }, [userId]);

  const loadEarnings = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_URL}/api/earnings/dashboard/${userId}`, { timeout: 10000 });
      setData(res.data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (e) {
      setData(null);
      if (__DEV__) {
        console.log('Earnings dashboard unavailable, showing zero state.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return iso; }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#00D95F" />
      </View>
    );
  }

  const d = data || { total_earned: 0, earned_30d: 0, projected_potential: 0, total_wins_logged: 0, active_plans_count: 0, active_plans: [], win_history: [], lifetime_arc: 0, arc_balance: 0 };
  const grandTotal = d.total_earned + d.projected_potential;
  const elevatedCard = theme.isDark ? null : {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Hero "Total Earned" counter */}
      <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.accent + '30' }, elevatedCard]}>
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="trending-up" size={12} color="#000" />
            <Text style={styles.heroBadgeText}>EARNINGS COMMAND CENTER</Text>
          </View>
          <TouchableOpacity onPress={loadEarnings}>
            <Ionicons name="refresh-outline" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.heroLabel, { color: theme.textSub }]}>Total Earned (Logged)</Text>
        <Text style={[counterStyles.value, { color: '#00D95F' }]}>${d.total_earned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>

        {/* 3-column stats */}
        <View style={[styles.statsRow, { backgroundColor: theme.surfaceAlt }] }>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>${d.earned_30d.toFixed(2)}</Text>
            <Text style={[styles.statLabel, { color: theme.textSub }]}>Last 30 Days</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{d.total_wins_logged}</Text>
            <Text style={[styles.statLabel, { color: theme.textSub }]}>Wins Logged</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#6366F1' }]}>{d.arc_balance.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: theme.textSub }]}>ARC Balance</Text>
          </View>
        </View>
      </View>

      {/* In-Progress Potential (Option B) */}
      {d.active_plans_count > 0 && (
        <View style={[styles.potentialCard, elevatedCard]}>
          <View style={styles.potentialHeader}>
            <View style={styles.potentialLeft}>
              <Ionicons name="flash-outline" size={16} color="#F59E0B" />
              <Text style={styles.potentialTitle}>In-Progress Potential</Text>
            </View>
            <View style={styles.potentialBadge}>
              <Text style={styles.potentialBadgeText}>PROJECTED</Text>
            </View>
          </View>
          <Text style={styles.potentialAmount}>
            ${(d.total_earned + d.projected_potential).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={[styles.potentialSub, { color: theme.textSub }]}>
            ${d.total_earned.toFixed(2)} earned + ${d.projected_potential.toFixed(0)} potential from {d.active_plans_count} active blueprint{d.active_plans_count > 1 ? 's' : ''}
          </Text>

          {/* Active blueprints list */}
          {d.active_plans.map((plan, i) => (
            <View key={i} style={[styles.planItem, { backgroundColor: theme.surface }] }>
              <View style={styles.planInfo}>
                <Text style={[styles.planTitle, { color: theme.text }]} numberOfLines={1}>{plan.title}</Text>
                <Text style={styles.planPotential}>{plan.potential}</Text>
              </View>
              <View style={styles.planProgress}>
                <View style={[styles.planProgressBar, { backgroundColor: theme.border }]}>
                  <View style={[styles.planProgressFill, { width: `${plan.progress_pct}%` as any }]} />
                </View>
                <Text style={[styles.planProgressText, { color: theme.textMuted }]}>{plan.steps_done}/{plan.total_steps}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Win History */}
      {d.win_history.length > 0 && (
        <View style={[styles.historyCard, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard]}>
          <TouchableOpacity
            style={styles.historyHeader}
            onPress={() => setShowHistory(!showHistory)}
          >
            <View style={styles.historyLeft}>
              <Ionicons name="trophy-outline" size={16} color="#00D95F" />
              <Text style={[styles.historyTitle, { color: theme.text }]}>Win History</Text>
            </View>
            <View style={styles.historyRight}>
              <Text style={[styles.historyCount, { color: theme.textSub }]}>{d.win_history.length} wins</Text>
              <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textMuted} />
            </View>
          </TouchableOpacity>

          {showHistory && (
            <View style={[styles.historyList, { borderTopColor: theme.border }]}>
              {d.win_history.map((win, i) => (
                <View key={i} style={[styles.winRow, { borderBottomColor: theme.border }]}>
                  <View style={styles.winIcon}>
                    <Ionicons name="cash-outline" size={14} color="#00D95F" />
                  </View>
                  <View style={styles.winInfo}>
                    <Text style={[styles.winPlatform, { color: theme.text }]}>{win.platform_name}</Text>
                    <Text style={[styles.winDate, { color: theme.textSub }]}>{formatDate(win.logged_at)}</Text>
                  </View>
                  <Text style={styles.winAmount}>+${win.amount_earned.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Empty state */}
      {d.total_wins_logged === 0 && (
        <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard]}>
          <Text style={styles.emptyEmoji}>💰</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No wins logged yet</Text>
            <Text style={[styles.emptySub, { color: theme.textSub }]}>Start a Quick Win blueprint and tap &quot;Log a Win&quot; when you get your first payout!</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { height: 100, justifyContent: 'center', alignItems: 'center' },
  container: { gap: 12 },
  // Hero card
  heroCard: {
    backgroundColor: '#0D0E14',
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#00D95F30',
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00D95F', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
  },
  heroBadgeText: { fontSize: 9, fontWeight: '800', color: '#000', letterSpacing: 1 },
  heroLabel: { fontSize: 12, color: '#4A4A4A', marginBottom: 4 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1C23', borderRadius: 14,
    padding: 14, marginTop: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: '#2A2C35' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 3 },
  statLabel: { fontSize: 10, color: '#4A4A4A' },
  // Potential card
  potentialCard: {
    backgroundColor: '#F59E0B08',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F59E0B25',
    gap: 8,
  },
  potentialHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  potentialLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  potentialTitle: { fontSize: 13, color: '#F59E0B', fontWeight: '700' },
  potentialBadge: {
    backgroundColor: '#F59E0B15', paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6,
  },
  potentialBadgeText: { fontSize: 8, color: '#F59E0B', fontWeight: '800', letterSpacing: 0.5 },
  potentialAmount: { fontSize: 28, fontWeight: '900', color: '#F59E0B', letterSpacing: -0.5 },
  potentialSub: { fontSize: 11, color: '#4A4A4A', lineHeight: 16 },
  planItem: {
    backgroundColor: '#1A1C23', borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  planInfo: { flex: 1, marginRight: 12 },
  planTitle: { fontSize: 13, color: '#FFFFFF', fontWeight: '600', marginBottom: 2 },
  planPotential: { fontSize: 11, color: '#F59E0B' },
  planProgress: { alignItems: 'flex-end', gap: 4 },
  planProgressBar: { width: 60, height: 4, backgroundColor: '#2A2C35', borderRadius: 2 },
  planProgressFill: { height: 4, backgroundColor: '#F59E0B', borderRadius: 2 },
  planProgressText: { fontSize: 10, color: '#4A4A4A' },
  // History
  historyCard: {
    backgroundColor: '#1A1C23', borderRadius: 16,
    borderWidth: 1, borderColor: '#2A2C35', overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyTitle: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyCount: { fontSize: 12, color: '#4A4A4A' },
  historyList: { borderTopWidth: 1, borderTopColor: '#2A2C35' },
  winRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#2A2C35',
  },
  winIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#00D95F10', justifyContent: 'center', alignItems: 'center',
  },
  winInfo: { flex: 1 },
  winPlatform: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  winDate: { fontSize: 11, color: '#4A4A4A' },
  winAmount: { fontSize: 16, fontWeight: '800', color: '#00D95F' },
  // Empty
  emptyState: {
    backgroundColor: '#1A1C23', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
  emptySub: { fontSize: 13, color: '#4A4A4A', textAlign: 'center', lineHeight: 19 },
});
