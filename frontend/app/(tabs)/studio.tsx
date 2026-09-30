import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { generatePathFromSource } from '../../src/services/api';
import { useRouter } from 'expo-router';

const templates = [
  { label: '7-Day Challenge', value: '7-day-challenge' as const, days: 7 },
  { label: '3-Day Onboarding', value: '3-day-onboarding' as const, days: 3 },
  { label: '30-Day Masterclass', value: '30-day-masterclass' as const, days: 30 },
  { label: 'Pre-Market Checklist', value: 'pre-market-checklist' as const, days: 5 },
];

function inferBriefDomain(brief: string) {
  const value = brief.toLowerCase();
  if (/fitness|workout|macro|hypertrophy|coach/.test(value)) return 'Fitness';
  if (/trading|stock|invest|risk|market/.test(value)) return 'Trading';
  if (/real estate|brrrr|property|rehab|arv/.test(value)) return 'Real Estate';
  if (/sales|closing|retainer|agency|client acquisition/.test(value)) return 'Sales';
  if (/viral|content|creator|youtube|tiktok|instagram/.test(value)) return 'Content';
  if (/saas|api|automation|software|no.code|ai/.test(value)) return 'AI & Tech';
  return 'Creator';
}

type GeneratedPath = NonNullable<Awaited<ReturnType<typeof generatePathFromSource>>>;

function buildFallbackPath(domain: string, template: (typeof templates)[number], attachments: { name: string; type: string }[]): GeneratedPath {
  const domainKey = domain.toLowerCase();
  const type = domainKey.includes('trad') || domainKey.includes('finance') ? 'trading' : domainKey.includes('fit') ? 'fitness' : domainKey.includes('sales') || domainKey.includes('content') ? 'creator' : domainKey.includes('creator') ? 'creator' : 'course';
  const presets = domainKey.includes('finance') || domainKey.includes('trad')
    ? [['DCF Moat Evaluator: Find Intrinsic Value', 'dcf_moat_evaluator', 'Adjust discount rate and terminal growth to find your margin-of-safety range.'], ['Position Sizing & Drawdown Simulator', 'position_sizing_simulator', 'Set capital and stop distance to calculate your risk budget.'], ['PnL Proof Engine', 'proof_engine', 'Upload your trade journal result for verification.'], ['TradingView Strategy Sandbox', 'video_prompt_lab', 'Test the creator strategy against a live market scenario.'], ['Prop Firm Readiness Score', 'diagnostic_calculator', 'Review your final risk and consistency score.']]
    : domainKey.includes('fit')
      ? [['RPE Target Sizer', 'progressive_overload_rpe', 'Set your 1RM and fatigue rating to generate today\'s working load.'], ['Macro Sculptor', 'nutrient_timing_allocator', 'Allocate protein and carbs around your training intensity.'], ['Overload Proof Log', 'proof_engine', 'Submit your completed sets and recovery proof.'], ['Recovery Timer Lab', 'video_prompt_lab', 'Run the recovery protocol for your current split.'], ['Transformation Scorecard', 'diagnostic_calculator', 'Review your final volume, recovery, and consistency score.']]
      : domainKey.includes('sales')
        ? [['Objection Roleplay Matrix', 'objection_roleplay_matrix', 'Practice frame control against a skeptical buyer persona.'], ['Deal Closing Calculator', 'deal_velocity_calculator', 'Model close rate, payback period, and commission upside.'], ['Call Script Sandbox', 'video_prompt_lab', 'Run your call script through a live prompt rehearsal.'], ['Proof of Pipeline', 'proof_engine', 'Submit a qualified opportunity for verification.'], ['Closer Scorecard', 'diagnostic_calculator', 'Review your final value stacking and close score.']]
        : domainKey.includes('real estate')
          ? [['MAO Calculator', 'mao_calculator', 'Calculate your maximum allowable offer from ARV and rehab costs.'], ['BRRRR Rehab Estimator', 'diagnostic_calculator', 'Model rehab scope, refinance value, and cash-out potential.'], ['Deal Pitch Proof', 'proof_engine', 'Submit your property analysis for verification.'], ['Investor Pitch Sandbox', 'video_prompt_lab', 'Rehearse the investor conversation with your deal numbers.'], ['Acquisition Scorecard', 'diagnostic_calculator', 'Review your final margin and risk score.']]
          : domainKey.includes('content')
            ? [['Viral Hook Score', 'hook_diagnostic', 'Test curiosity, authority, and scroll-stop potential in the first three seconds.'], ['Format & B-Roll Matrix', 'video_prompt_lab', 'Pair the winning hook with a shoot-ready format.'], ['Publish Proof Log', 'proof_engine', 'Submit your live post and early performance proof.'], ['Audience Signal Lab', 'diagnostic_calculator', 'Interpret retention and response signals.'], ['Creator Growth Scorecard', 'diagnostic_calculator', 'Review your final reach and conversion score.']]
            : [['Interactive Diagnostic', 'diagnostic_calculator', 'Run the baseline diagnostic and capture your instant win.'], ['Strategy Simulator', 'ai_pitch_simulator', 'Apply the creator framework to your own scenario.'], ['Execution Sandbox', 'video_prompt_lab', 'Test the workflow against a real input.'], ['Proof Verification', 'proof_engine', 'Submit your completed artifact for verification.'], ['Outcome Scorecard', 'diagnostic_calculator', 'Review the final result and next action.']];
  return {
    title: `${template.label} ${domain} Sprint`,
    category: domain,
    description: `Demo-ready ${template.label.toLowerCase()} generated locally${attachments.length ? ` from ${attachments.length} attachment${attachments.length === 1 ? '' : 's'}` : ''}.`,
    creator_handle: 'miamitrader',
    steps: Array.from({ length: template.days }, (_, index) => {
      const phase = presets[index] || presets[presets.length - 1];
      return ({
      id: `demo-step-${index + 1}`,
      day: index + 1,
      title: phase[0],
      type,
      instructions: phase[2],
      widget_data: {
        widget_type: phase[1],
        hook: index === 0,
        specialty: true,
        buyer_personas: ['Price-Sensitive CFO', 'Skeptical Agency Owner'],
        one_rep_max: 315,
        rpe: 8,
        sets: 4,
        reps: 8,
        split: 'Leg day',
        capital: 25000,
        risk_per_trade_pct: 1,
        stop_loss_pct: 2,
        leverage_cap: 3,
        arv: 350000,
        rehab_cost: 60000,
        target_margin_pct: 20,
        scoring_dimensions: ['curiosity_gap', 'authority_signal', 'scroll_stop'],
        proof_type: 'verified_submission',
      },
      });
    }),
  };
}

export default function StudioScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [brief, setBrief] = useState('I teach fitness coaches to grow with organic content. Build practical tools and a paid program for my audience.');
  const [isGenerating, setIsGenerating] = useState(false);

  const openShopWizard = async () => {
    await AsyncStorage.setItem('shop_wizard_seed', JSON.stringify({ category: inferBriefDomain(brief), description: brief, handle: 'creator' }));
    router.push('/studio/shop-wizard');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const domain = inferBriefDomain(brief);
    const template = templates[0];
    const fallback = buildFallbackPath(domain, template, []);

    const result = await generatePathFromSource({
      source_type: 'text',
      source_input: brief,
      domain,
      template: template.value,
    });

    setIsGenerating(false);

    const draft = result || fallback;
    const draftId = `draft-${Date.now()}`;
    await AsyncStorage.setItem(`path_draft_${draftId}`, JSON.stringify(draft));
    router.push({ pathname: '/studio/editor/[pathId]', params: { pathId: draftId } });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
      <View style={[styles.ambientGlow, { backgroundColor: theme.accent + '12' }]} />

      <Text style={[styles.eyebrow, { color: theme.accent }]}>CREATOR STUDIO</Text>
      <Text style={[styles.title, { color: theme.text }]}>Build your creator business</Text>
      <Text style={[styles.subtitle, { color: theme.textSub }]}>Start with one clear brief. Build an interactive path or open the full storefront wizard.</Text>

      <View style={[styles.modeSwitch, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: theme.accent }]}><Text style={[styles.modeText, { color: '#000' }]}>Single Path</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, { backgroundColor: theme.surfaceAlt }]} onPress={openShopWizard}><Text style={[styles.modeText, { color: theme.textSub }]}>Full Shop</Text></TouchableOpacity>
      </View>

      <View style={[styles.customerPreview, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <View style={styles.customerPreviewHeader}>
          <View>
            <Text style={[styles.previewEyebrow, { color: theme.accent }]}>CUSTOMER VIEW</Text>
            <Text style={[styles.customerPreviewTitle, { color: theme.text }]}>See the member experience</Text>
          </View>
          <Ionicons name="eye-outline" size={22} color={theme.accent} />
        </View>
        <Text style={[styles.customerPreviewCopy, { color: theme.textSub }]}>Open two live demo pathways as @miamitrader to inspect the Day 1 hook and Day 2 tool unlock.</Text>
        <View style={styles.previewButtonRow}>
          <TouchableOpacity style={[styles.previewButton, { backgroundColor: theme.accentLight, borderColor: theme.accent }]} onPress={() => router.push('/c/miamitrader/finance-valuation-suite')}>
            <Ionicons name="trending-up" size={15} color={theme.accent} />
            <Text style={[styles.previewButtonText, { color: theme.accent }]}>Finance Suite</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.previewButton, { backgroundColor: theme.accentLight, borderColor: theme.accent }]} onPress={() => router.push('/c/miamitrader/fitness-overload-suite')}>
            <Ionicons name="barbell-outline" size={15} color={theme.accent} />
            <Text style={[styles.previewButtonText, { color: theme.accent }]}>Fitness Suite</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Creator Vision & Store Brief</Text>
        <TextInput value={brief} onChangeText={setBrief} multiline placeholder="Describe your background, audience, offer goals, and the outcome you help people achieve..." placeholderTextColor={theme.textMuted} style={[styles.textArea, { backgroundColor: '#080A0F', borderColor: '#FFFFFF18', color: '#F8FAFC' }]} />

        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.accent }]} onPress={handleGenerate} disabled={isGenerating}> 
          {isGenerating ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="rocket" size={16} color="#000" />}
          <Text style={styles.primaryText}>{isGenerating ? 'Generating...' : 'Generate Single Path'}</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  ambientGlow: { position: 'absolute', top: -90, right: -80, width: 260, height: 260, borderRadius: 130 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 8, marginBottom: 18, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  modeSwitch: { borderWidth: 1, borderRadius: 12, padding: 4, flexDirection: 'row', marginBottom: 16 },
  modeButton: { flex: 1, borderRadius: 9, paddingVertical: 10, alignItems: 'center' },
  modeText: { fontSize: 12, fontWeight: '900' },
  sectionTitle: { fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 12, fontWeight: '700' },
  textArea: { borderWidth: 1, borderRadius: 12, minHeight: 120, paddingHorizontal: 12, paddingVertical: 12, textAlignVertical: 'top' },
  primaryButton: { marginTop: 16, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#000', fontWeight: '800' },
  editor: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 16 },
  editorEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  editorTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  editorDescription: { minHeight: 82, marginTop: 10 },
  stepEditor: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  stepMeta: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  stepInstructions: { borderWidth: 1, borderRadius: 12, minHeight: 78, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, textAlignVertical: 'top' },
  dropzone: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  dropzoneCopy: { flex: 1, marginLeft: 10 },
  dropzoneTitle: { fontSize: 13, fontWeight: '800' },
  dropzoneSub: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  attachment: { fontSize: 11, marginTop: 6, paddingLeft: 6 },
  publishPanel: { borderTopWidth: 1, marginTop: 18, paddingTop: 16 },
  publishTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  publishLabel: { fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 7 },
  publishButton: { marginTop: 14, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  publishedLink: { fontSize: 12, fontWeight: '800', marginTop: 12 },
  previewHeading: { fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 2 },
  customerPreview: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 16 },
  customerPreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  customerPreviewTitle: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  customerPreviewCopy: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  previewButtonRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  previewButton: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  previewButtonText: { fontSize: 12, fontWeight: '800' },
});
