import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, ImageBackground, Linking, LayoutAnimation, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchCreatorShop, recordPaymentTelemetry, resolveCreatorPath } from '../../../src/services/api';
import { SoftAuthModal } from '../../../components/auth/SoftAuthModal';
import { PaywallGateModal } from '../../../components/PaywallGateModal';
import { StepCard } from '../../../components/interactive/StepCard';
import { PhaseAccordionItem } from '../../../components/interactive/PhaseAccordionItem';

const localPracticePath = (handle: string, slug: string) => {
  const paths: Record<string, any> = {
    'fitness-overload-suite': {
      title: 'Progressive Overload Suite', category: 'Fitness', summary: 'RPE-based load planning and workout fuel allocation.', banner_wallpaper: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1600&q=85',
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
    'ecommerce-roas-suite': {
      title: 'E-Commerce Profit Suite', category: 'Business', summary: 'Forecast ad-driven sales and keep acquisition economics in view.',
      steps: [
        { id: 'ecommerce-roas-day-1', day: 1, type: 'business', title: 'Funnel & ROAS Allocator', instructions: 'Tune monthly spend, conversion, and order value to estimate campaign economics.', widget_data: { widget_type: 'roas_profit_allocator', specialty: true, monthly_ad_spend: 5000, conversion_rate_pct: 3, average_order_value: 100 } },
      ],
    },
    'real-estate-yield-suite': {
      title: 'Real Estate Deal Suite', category: 'Real Estate', summary: 'Model purchase price, capital stack, and monthly cash flow.',
      steps: [
        { id: 'real-estate-yield-day-1', day: 1, type: 'real_estate', title: 'Cash-on-Cash Return Engine', instructions: 'Adjust acquisition price and down payment to model the deal yield.', widget_data: { widget_type: 'cash_on_cash_return_engine', specialty: true, purchase_price: 500000, down_payment_pct: 20 } },
      ],
    },
    'creator-ltv-suite': {
      title: 'Creator Growth Economics', category: 'SaaS & Creator', summary: 'Connect audience monetization, ARPU, and churn to lifetime value.',
      steps: [
        { id: 'creator-ltv-day-1', day: 1, type: 'creator', title: 'LTV & Churn Calculator', instructions: 'Model active audience, monthly revenue per member, and churn.', widget_data: { widget_type: 'ltv_churn_calculator', specialty: true, monthly_active_users: 2500, arpu: 85, churn_pct: 5, cac: 160 } },
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
  const [path, setPath] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [creatorShop, setCreatorShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSoftAuth, setShowSoftAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isConsumerView, setIsConsumerView] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
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
      const [payload, shopPayload] = await Promise.all([
        resolveCreatorPath(handle, slug, storedUserId || 'usr_guest_8832'),
        fetchCreatorShop(handle),
      ]);
      if (shopPayload) setCreatorShop(shopPayload);
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

  const handleBack = () => {
    const creatorHandle = String(params.creatorHandle || creator?.handle || '');
    if (router.canGoBack()) router.back();
    else if (creatorHandle) router.replace(`/shop/${creatorHandle}` as any);
    else router.replace('/(tabs)' as any);
  };

  const togglePhase = (phaseKey: string) => {
    setExpandedPhases((current) => ({ ...current, [phaseKey]: !(current[phaseKey] ?? phaseKey === 'phase-1') }));
  };

  const setAllPhasesExpanded = (expanded: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next: Record<string, boolean> = {};
    (path?.steps || []).forEach((step: any, index: number) => { next[`phase-${index + 1}`] = expanded; });
    setExpandedPhases(next);
  };

  const updateStep = (index: number, updates: Record<string, any>) => {
    setPath((current: any) => {
      if (!current) return current;
      const steps = [...(current.steps || [])];
      steps[index] = { ...steps[index], ...updates };
      return { ...current, steps };
    });
  };

  const updateStepWidget = (index: number, key: string, value: number) => {
    setPath((current: any) => {
      if (!current) return current;
      const steps = [...(current.steps || [])];
      const step = steps[index];
      steps[index] = { ...step, widget_data: { ...(step.widget_data || {}), [key]: value } };
      return { ...current, steps };
    });
  };

  const heroWallpaper = creatorShop?.banner_wallpaper || path?.banner_wallpaper || creator?.banner_wallpaper || creator?.avatar;
  const hookVideo = path?.hook_video_url || path?.steps?.[0]?.video_url || path?.steps?.[0]?.widget_data?.video_url;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      <ActivityIndicator size="large" color="#35E4A1" />
      <Text style={styles.loadingText}>Loading creator roadmap...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <ImageBackground source={{ uri: heroWallpaper }} resizeMode="cover" imageStyle={styles.heroImage} style={styles.hero}>
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{creatorDisplayName.slice(0, 1)}</Text>
            </View>
            <View style={styles.headerMeta}>
              <View style={styles.verifiedRow}>
                <Text style={styles.creatorHandle}>{`@${creator?.handle || String(params.creatorHandle || 'creator')}`}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={10} color="#020817" />
                </View>
                <Text style={styles.verifiedText}>Verified creator</Text>
              </View>
              <Text style={styles.pathTitle}>{path?.title || 'Featured Roadmap'}</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>ACTIVE MEMBERS</Text>
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

          <Text style={styles.summary}>{path?.summary || 'Join this path in guest mode and preview the full roadmap experience.'}</Text>

          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.primaryAction} onPress={handlePersistentAction}>
              <Text style={styles.primaryActionText}>Save My Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAction} onPress={handlePersistentAction}>
              <Text style={styles.secondaryActionText}>Preview Path</Text>
            </TouchableOpacity>
          </View>
          </View>
        </ImageBackground>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Roadmap Preview</Text>
          <Text style={styles.sectionHint}>Guest preview</Text>
        </View>

        <View style={styles.phaseToolbar}>
          <View style={styles.modeSegment}>
            <TouchableOpacity onPress={() => setIsConsumerView(true)} style={[styles.modeButton, isConsumerView && styles.modeButtonActive]}><Ionicons name="eye-outline" size={13} color={isConsumerView ? '#06110D' : '#94A3B8'} /><Text style={[styles.modeText, isConsumerView && styles.modeTextActive]}>Consumer View</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setIsConsumerView(false)} style={[styles.modeButton, !isConsumerView && styles.modeButtonActive]}><Ionicons name="settings-outline" size={13} color={!isConsumerView ? '#06110D' : '#94A3B8'} /><Text style={[styles.modeText, !isConsumerView && styles.modeTextActive]}>Creator Edit Mode</Text></TouchableOpacity>
          </View>
          <View style={styles.expandActions}><TouchableOpacity onPress={() => setAllPhasesExpanded(true)} style={styles.expandButton}><Text style={styles.expandText}>Expand All</Text></TouchableOpacity><TouchableOpacity onPress={() => setAllPhasesExpanded(false)} style={styles.expandButton}><Text style={styles.expandText}>Collapse All</Text></TouchableOpacity></View>
        </View>

        <View style={styles.dayOneBanner}>
          <View style={styles.dayOneBadge}><Text style={styles.dayOneBadgeText}>FREE HOOK</Text></View>
          <Text style={styles.dayOneTitle}>Step 1: Calculate your baseline</Text>
          <Text style={styles.dayOneCopy}>Get one useful result now. The rest of the execution engine unlocks after Day 1.</Text>
          {hookVideo ? <TouchableOpacity style={styles.videoPreview} onPress={() => Linking.openURL(hookVideo)}><ImageBackground source={{ uri: heroWallpaper }} resizeMode="cover" imageStyle={styles.videoPreviewImage} style={styles.videoPreviewMedia}><View style={styles.videoPlay}><Ionicons name="play" size={18} color="#06110D" /></View><View style={styles.videoPreviewMeta}><Text style={styles.videoPreviewTitle}>Form & baseline video guide</Text><Text style={styles.videoPreviewDuration}>{path?.hook_video_duration || '0:45'} MIN GUIDE</Text></View></ImageBackground></TouchableOpacity> : null}
        </View>

        {(path?.steps || []).map((step: any, index: number) => {
          const phaseKey = `phase-${index + 1}`;
          const widget = step.widget_data || {};
          const editorControls = <>
            <Text style={styles.editorFieldLabel}>STEP TITLE</Text>
            <TextInput value={step.title || ''} onChangeText={(title) => updateStep(index, { title })} style={styles.editorInput} />
            <Text style={styles.editorFieldLabel}>INSTRUCTIONS</Text>
            <TextInput value={step.instructions || step.description || ''} onChangeText={(instructions) => updateStep(index, { instructions, description: instructions })} multiline style={[styles.editorInput, styles.editorMultiline]} />
            {widget.widget_type === 'progressive_overload_rpe' ? <><Text style={styles.editorFieldLabel}>DEFAULT 1RM · LB</Text><TextInput value={String(widget.one_rep_max ?? 315)} keyboardType="numeric" onChangeText={(value) => updateStepWidget(index, 'one_rep_max', Math.min(500, Math.max(100, Number(value) || 100)))} style={styles.editorInput} /></> : null}
            {widget.widget_type === 'dcf_moat_evaluator' ? <><Text style={styles.editorFieldLabel}>DEFAULT DISCOUNT RATE · %</Text><TextInput value={String(widget.discount_rate_pct ?? 9)} keyboardType="numeric" onChangeText={(value) => updateStepWidget(index, 'discount_rate_pct', Math.min(20, Math.max(5, Number(value) || 5)))} style={styles.editorInput} /><Text style={styles.editorFieldLabel}>DEFAULT MARGIN OF SAFETY · %</Text><TextInput value={String(widget.margin_of_safety_pct ?? 25)} keyboardType="numeric" onChangeText={(value) => updateStepWidget(index, 'margin_of_safety_pct', Math.min(30, Math.max(10, Number(value) || 10)))} style={styles.editorInput} /></> : null}
            <View style={styles.editorAccessRow}><Text style={styles.editorFieldLabel}>ACCESS RULE</Text><View style={styles.accessChips}>{[false, true].map((locked) => <TouchableOpacity key={String(locked)} onPress={() => updateStep(index, { locked })} style={[styles.accessChip, Boolean(step.locked) === locked && styles.accessChipActive]}><Text style={[styles.accessChipText, Boolean(step.locked) === locked && styles.accessChipTextActive]}>{locked ? 'Member Access' : 'Free Hook'}</Text></TouchableOpacity>)}</View></View>
          </>;
          return <PhaseAccordionItem key={step.id || phaseKey} phaseNumber={index + 1} title={step.title || `Step ${index + 1}`} category={String(path?.category || 'Creator').toUpperCase()} accessTier={step.locked ? 'MEMBER_ACCESS' : 'FREE_HOOK'} isConsumerView={isConsumerView} expanded={expandedPhases[phaseKey] ?? index === 0} onToggle={() => togglePhase(phaseKey)} editorControls={editorControls}>
            <StepCard step={step} pathCategory={path?.category} pathId={path?.id} onUnlock={() => setShowPaywall(true)} />
          </PhaseAccordionItem>;
        })}
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
  container: { flex: 1, backgroundColor: '#0B0F19' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFFFFF', marginTop: 12, fontSize: 15, fontWeight: '600' },
  content: { padding: 18, paddingBottom: 40 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: '#FFFFFF14',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  hero: {
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: '#FFFFFF14',
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 18,
  },
  heroImage: {},
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0B0F19BB' },
  heroContent: { padding: 18 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#35E4A122',
    borderWidth: 1,
    borderColor: '#35E4A155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#6EE7B7', fontWeight: '900', fontSize: 22 },
  headerMeta: { flex: 1 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  creatorHandle: { color: '#CBD5E1', fontSize: 13, fontWeight: '700' },
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
  pathTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900' },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricPill: {
    flex: 1,
    backgroundColor: '#0B0F19CC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF14',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  metricValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  summary: { color: '#CBD5E1', fontSize: 14, lineHeight: 21 },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryAction: {
    flex: 1,
    backgroundColor: '#35E4A1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionText: { color: '#06110D', fontWeight: '900' },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#131B2E',
    borderColor: '#FFFFFF18',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryActionText: { color: '#FFFFFF', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  sectionHint: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  phaseToolbar: { gap: 9, marginBottom: 12 },
  modeSegment: { flexDirection: 'row', backgroundColor: '#131B2E', borderWidth: 1, borderColor: '#FFFFFF14', borderRadius: 10, padding: 3 },
  modeButton: { flex: 1, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 7, paddingHorizontal: 6 },
  modeButtonActive: { backgroundColor: '#35E4A1' },
  modeText: { color: '#94A3B8', fontSize: 9, fontWeight: '800' },
  modeTextActive: { color: '#06110D' },
  expandActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 7 },
  expandButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: '#FFFFFF18', backgroundColor: '#131B2E' },
  expandText: { color: '#CBD5E1', fontSize: 9, fontWeight: '800' },
  editorFieldLabel: { color: '#6EE7B7', fontSize: 8, fontWeight: '900', letterSpacing: 0.7, marginBottom: 5, marginTop: 8 },
  editorInput: { minHeight: 38, color: '#F8FAFC', backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  editorMultiline: { minHeight: 68, textAlignVertical: 'top' },
  editorAccessRow: { marginTop: 4 },
  accessChips: { flexDirection: 'row', gap: 7 },
  accessChip: { borderWidth: 1, borderColor: '#FFFFFF1A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  accessChipActive: { borderColor: '#35E4A1', backgroundColor: '#35E4A11A' },
  accessChipText: { color: '#94A3B8', fontSize: 9, fontWeight: '800' },
  accessChipTextActive: { color: '#6EE7B7' },
  stepWrap: { marginBottom: 14 },
  dayOneBanner: { backgroundColor: '#131B2E', borderColor: '#FFFFFF14', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
  dayOneBadge: { alignSelf: 'flex-start', backgroundColor: '#35E4A122', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  dayOneBadgeText: { color: '#6EE7B7', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  dayOneTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 9 },
  dayOneCopy: { color: '#94A3B8', fontSize: 12, lineHeight: 18, marginTop: 4 },
  videoPreview: { height: 132, borderRadius: 13, overflow: 'hidden', marginTop: 12, borderWidth: 1, borderColor: '#35E4A155' },
  videoPreviewImage: { opacity: 0.7 },
  videoPreviewMedia: { flex: 1, justifyContent: 'center', padding: 13, backgroundColor: '#0B0F19' },
  videoPlay: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#35E4A1', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  videoPreviewMeta: { position: 'absolute', left: 13, right: 13, bottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  videoPreviewTitle: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  videoPreviewDuration: { color: '#6EE7B7', fontSize: 8, fontWeight: '900' },
});
