import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { recordPaymentTelemetry, resolveCreatorPath } from '../../../src/services/api';
import { SoftAuthModal } from '../../../components/auth/SoftAuthModal';
import { PaywallGateModal } from '../../../components/PaywallGateModal';
import { StepCard } from '../../../components/interactive/StepCard';
import { useTheme } from '../../../contexts/ThemeContext';

const localPracticePath = (handle: string, slug: string) => {
  const paths: Record<string, any> = {
    'fitness-overload-suite': {
      title: 'Progressive Overload Suite', category: 'Fitness', summary: 'RPE-based load planning and workout fuel allocation.',
      steps: [
        { id: 'fitness-day-1', day: 1, type: 'fitness', title: 'Progressive Overload Planner: Leg Day RPE', instructions: 'Set your 1RM and fatigue rating to generate today\'s working load.', widget_data: { widget_type: 'progressive_overload_rpe', hook: true, one_rep_max: 315, rpe: 8, sets: 4, reps: 8, split: 'Leg day' } },
        { id: 'fitness-day-2', day: 2, type: 'fitness', title: 'Nutrient Timing Allocator', instructions: 'Tune pre-, intra-, and post-workout fuel to match session intensity.', widget_data: { widget_type: 'nutrient_timing_allocator', workout_intensity: 8, protein_grams: 42, carbs_grams: 65, timing_window_minutes: 90 }, locked: true },
      ],
    },
    'finance-valuation-suite': {
      title: 'Finance Valuation Suite', category: 'Finance', summary: 'Intrinsic value and risk-aware decision tools.',
      steps: [
        { id: 'finance-day-1', day: 1, type: 'trading', title: 'DCF Moat Evaluator: Find Intrinsic Value', instructions: 'Adjust assumptions to estimate a margin-of-safety entry range.', widget_data: { widget_type: 'dcf_moat_evaluator', hook: true, ticker: 'AAPL', starting_revenue: 100000000, discount_rate_pct: 9, terminal_growth_pct: 3, margin_of_safety_pct: 25, output_label: 'Estimated intrinsic value' } },
        { id: 'finance-day-2', day: 2, type: 'trading', title: 'Position Sizing & Drawdown Simulator', instructions: 'Model your risk budget before entering a position.', widget_data: { widget_type: 'position_sizing_simulator', capital: 25000, risk_per_trade_pct: 1, stop_loss_pct: 2, leverage_cap: 3 }, locked: true },
      ],
    },
  };
  const path = paths[slug];
  if (!path) return null;
  return {
    creator: { name: handle.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()), handle, verified: true, total_members: 1824 },
    path: { id: `local-${slug}`, slug, description: path.summary, days_count: 7, ...path },
    steps: path.steps,
    has_access: false,
  };
};

export default function CreatorPathDeepLinkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ creatorHandle?: string; pathSlug?: string; source?: string }>();
  const { theme } = useTheme();
  const [path, setPath] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSoftAuth, setShowSoftAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [userId, setUserId] = useState('usr_guest_8832');

  useEffect(() => {
    const initGuestSession = async () => {
      await AsyncStorage.setItem('userRole', 'member');
      await AsyncStorage.setItem('isGuest', 'true');
    };

    initGuestSession();
  }, []);

  useEffect(() => {
    const loadPath = async () => {
      const slug = String(params.pathSlug || '').trim();
      const handle = String(params.creatorHandle || '').trim();
      if (!slug || !handle) {
        setLoading(false);
        return;
      }

      const storedUser = await AsyncStorage.getItem('user');
      const storedUserId = storedUser ? JSON.parse(storedUser)?.id : null;
      if (storedUserId) setUserId(storedUserId);
      const localPayload = localPracticePath(handle, slug);
      if (localPayload) {
        setCreator(localPayload.creator);
        setPath(localPayload.path);
        setLoading(false);
      }
      const payload = await resolveCreatorPath(handle, slug, storedUserId || 'usr_guest_8832');
      if (payload) {
        setCreator(payload.creator);
        setPath(payload.path);
        if (payload.has_access === false && payload.steps.some((step: any) => step.locked)) {
          await recordPaymentTelemetry({ event_name: 'paywall_impression', path_slug: slug, user_id: storedUserId || 'usr_guest_8832' });
        }
      } else if (!localPayload) {
        setCreator({
          name: handle.replace(/[-_]/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase()),
          handle,
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
          verified: true,
          total_members: 1824,
        });
        setPath({
          id: slug,
          title: '7-Day Momentum Sprint',
          summary: 'Preview this roadmap in guest mode before signing up to save your streak.',
          category: 'Trading',
          description: 'Preview this roadmap in guest mode before signing up to save your streak.',
          days_count: 7,
          steps: [
            { id: 'step-1', title: 'Set up your dashboard', description: 'Choose one market and define your checklist.', type: 'trading', category: 'Trading' },
            { id: 'step-2', title: 'Define the risk guardrail', description: 'Set your stop rules before entering a trade.', type: 'trading', category: 'Trading' },
            { id: 'step-3', title: 'Log a proof checkpoint', description: 'Capture your trade entry and review.', type: 'creator', category: 'Creator' },
          ],
        });
      }
      setLoading(false);
    };

    loadPath();
  }, [params.creatorHandle, params.pathSlug]);

  const refreshAfterUnlock = async () => {
    const slug = String(params.pathSlug || '').trim();
    const handle = String(params.creatorHandle || '').trim();
    const payload = await resolveCreatorPath(handle, slug, userId);
    if (payload) {
      setCreator(payload.creator);
      setPath(payload.path);
    }
    setShowPaywall(false);
  };

  const creatorDisplayName = useMemo(() => {
    const handle = creator?.handle || String(params.creatorHandle || 'creator');
    return handle.replace(/[-_]/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase());
  }, [creator, params.creatorHandle]);

  const onCreateAccount = () => {
    setShowSoftAuth(false);
    router.push('/onboarding/auth?role=member');
  };

  const handlePersistentAction = () => {
    setShowSoftAuth(true);
  };

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: theme.bg }]}> 
        <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading creator roadmap...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}> 
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <View style={styles.heroTopRow}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{creatorDisplayName.slice(0, 1)}</Text>
            </View>
            <View style={styles.headerMeta}>
              <View style={styles.verifiedRow}>
                <Text style={[styles.creatorHandle, { color: theme.textSub }]}>{`@${creator?.handle || String(params.creatorHandle || 'creator')}`}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={10} color="#020817" />
                </View>
                <Text style={styles.verifiedText}>Verified creator</Text>
              </View>
              <Text style={[styles.pathTitle, { color: theme.text }]}>{path?.title || 'Featured Roadmap'}</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>Members</Text>
              <Text style={styles.metricValue}>{creator?.total_members ? creator.total_members.toLocaleString() : '1.8k'}</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>Category</Text>
              <Text style={styles.metricValue}>{path?.category || 'Performance'}</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>Rating</Text>
              <Text style={styles.metricValue}>4.9 / 5</Text>
            </View>
          </View>

          <Text style={[styles.summary, { color: theme.textSub }]}>{path?.summary || 'Join this path in guest mode and preview the full roadmap experience.'}</Text>

          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.primaryAction} onPress={handlePersistentAction}>
              <Text style={styles.primaryActionText}>Save My Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryAction, { backgroundColor: theme.bg, borderColor: theme.border }]} onPress={handlePersistentAction}>
              <Text style={[styles.secondaryActionText, { color: theme.text }]}>Preview Path</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Roadmap Preview</Text>
          <Text style={[styles.sectionHint, { color: theme.textSub }]}>Guest preview</Text>
        </View>

        <View style={[styles.dayOneBanner, { backgroundColor: theme.accentLight, borderColor: theme.accent + '55' }]}> 
          <View style={styles.dayOneBadge}><Text style={styles.dayOneBadgeText}>FREE HOOK</Text></View>
          <Text style={[styles.dayOneTitle, { color: theme.text }]}>Step 1: Calculate your baseline</Text>
          <Text style={[styles.dayOneCopy, { color: theme.textSub }]}>Get one useful result now. The rest of the execution engine unlocks after Day 1.</Text>
        </View>

        {(path?.steps || []).map((step: any, index: number) => (
          <View key={step.id || index} style={styles.stepWrap}>
            <StepCard step={step} pathCategory={path?.category} pathId={path?.id} onUnlock={() => setShowPaywall(true)} />
          </View>
        ))}
      </ScrollView>

      <PaywallGateModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUnlocked={refreshAfterUnlock}
        pathSlug={String(params.pathSlug || '')}
        creatorHandle={String(params.creatorHandle || '')}
        userId={userId}
      />

      <SoftAuthModal
        visible={showSoftAuth}
        onClose={() => setShowSoftAuth(false)}
        onCreateAccount={onCreateAccount}
        pathTitle={path?.title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080A0F' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, fontWeight: '600' },
  content: { padding: 18, paddingBottom: 40 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0F141D',
    borderWidth: 1,
    borderColor: '#FFFFFF18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#35E4A122',
    borderWidth: 1,
    borderColor: '#35E4A188',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#6EE7B7', fontWeight: '900', fontSize: 22 },
  headerMeta: { flex: 1 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  creatorHandle: { fontSize: 13, fontWeight: '700' },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#35E4A1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  verifiedText: { color: '#6EE7B7', fontSize: 10, fontWeight: '800', marginLeft: 6 },
  pathTitle: { fontSize: 23, fontWeight: '900', letterSpacing: -0.3 },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricPill: {
    flex: 1,
    backgroundColor: '#FFFFFF08',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF14',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  metricValue: { color: '#F8FAFC', fontSize: 13, fontWeight: '900' },
  summary: { color: '#CBD5E1', fontSize: 14, lineHeight: 21 },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryAction: {
    flex: 1,
    backgroundColor: '#35E4A1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionText: { color: '#020817', fontWeight: '800' },
  secondaryAction: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryActionText: { fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  sectionHint: { fontSize: 12, fontWeight: '700' },
  stepWrap: { marginBottom: 14 },
  dayOneBanner: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
  dayOneBadge: { alignSelf: 'flex-start', backgroundColor: '#35E4A133', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  dayOneBadgeText: { color: '#6EE7B7', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  dayOneTitle: { fontSize: 16, fontWeight: '900', marginTop: 9 },
  dayOneCopy: { fontSize: 12, lineHeight: 18, marginTop: 4 },
});
