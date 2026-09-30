import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { generatePathFromSource, publishGeneratedPath } from '../../src/services/api';
import { StepCard } from '../../components/interactive/StepCard';
import { useRouter } from 'expo-router';

const domains = ['Finance', 'Fitness', 'Sales', 'Trading', 'Real Estate', 'Content', 'AI & Tech', 'Creator'];
const sourceTypes = [
  { label: 'Text', value: 'text' as const },
  { label: 'YouTube', value: 'youtube' as const },
  { label: 'Notion', value: 'notion' as const },
  { label: 'PDF', value: 'pdf' as const },
];
const templates = [
  { label: '7-Day Challenge', value: '7-day-challenge' as const, days: 7 },
  { label: '3-Day Onboarding', value: '3-day-onboarding' as const, days: 3 },
  { label: '30-Day Masterclass', value: '30-day-masterclass' as const, days: 30 },
  { label: 'Pre-Market Checklist', value: 'pre-market-checklist' as const, days: 5 },
];

type GeneratedPath = NonNullable<Awaited<ReturnType<typeof generatePathFromSource>>>;

function buildFallbackPath(domain: string, template: (typeof templates)[number], attachments: Array<{ name: string; type: string }>): GeneratedPath {
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
  const [title, setTitle] = useState('AI Sales Sprint');
  const [prompt, setPrompt] = useState('Turn my coaching notes into a 5-day launch roadmap for creators.');
  const [selectedDomain, setSelectedDomain] = useState('Creator');
  const [sourceType, setSourceType] = useState<'youtube' | 'notion' | 'text' | 'pdf'>('text');
  const [template, setTemplate] = useState<(typeof templates)[number]>(templates[0]);
  const [attachments, setAttachments] = useState<Array<{ name: string; type: string; uri?: string }>>([]);
  const [generatedPath, setGeneratedPath] = useState<GeneratedPath | null>(null);
  const [pricingTier, setPricingTier] = useState<'free' | 'plus' | 'premium'>('plus');
  const [accessLimit, setAccessLimit] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [publishedLink, setPublishedLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAttach = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'video/*', 'audio/*', 'text/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      setAttachments((current) => [...current, ...result.assets.map((asset) => ({ name: asset.name, type: asset.mimeType || 'file', uri: asset.uri }))]);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedPath(buildFallbackPath(selectedDomain, template, attachments));

    const result = await generatePathFromSource({
      source_type: sourceType,
      source_input: prompt,
      domain: selectedDomain,
      template: template.value,
      attachments,
    });

    setIsGenerating(false);

    const draft = result || buildFallbackPath(selectedDomain, template, attachments);
    const draftId = `draft-${Date.now()}`;
    await AsyncStorage.setItem(`path_draft_${draftId}`, JSON.stringify(draft));
    router.push({ pathname: '/studio/editor/[pathId]', params: { pathId: draftId } });
    if (!result) return;

    setTitle(draft.title);
    setGeneratedPath(draft);
  };

  const handlePublish = async () => {
    if (!generatedPath) return;
    const result = await publishGeneratedPath({
      title: generatedPath.title,
      description: generatedPath.description,
      category: generatedPath.category,
      creator_handle: generatedPath.creator_handle,
      steps: generatedPath.steps,
      pricing_tiers: [{
        name: pricingTier === 'free' ? 'Free' : pricingTier === 'plus' ? 'Plus' : 'Premium',
        price: pricingTier === 'free' ? 0 : pricingTier === 'plus' ? 29 : 79,
        description: pricingTier === 'free' ? 'Preview access' : pricingTier === 'plus' ? 'Full path access' : 'Full access plus creator support',
      }],
      access_limit: accessLimit ? Number(accessLimit) : null,
      visibility,
    });

    if (!result) {
      Alert.alert('Publish unavailable', 'Your draft is ready, but the publishing service is offline.');
      return;
    }

    setPublishedLink(result.public_bio_link);
    Alert.alert('Path published', `Your public bio-link is ${result.public_bio_link}`);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
      <View style={[styles.ambientGlow, { backgroundColor: theme.accent + '12' }]} />

      <Text style={[styles.eyebrow, { color: theme.accent }]}>CREATOR STUDIO</Text>
      <Text style={[styles.title, { color: theme.text }]}>Build a high-conversion path</Text>
      <Text style={[styles.subtitle, { color: theme.textSub }]}>Ingest your raw content, shape the learning arc, and publish a proof-driven roadmap.</Text>

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
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Path title</Text>
        <TextInput value={title} onChangeText={setTitle} style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]} />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Target domain</Text>
        <View style={styles.chipsWrap}>
          {domains.map((domain) => (
            <TouchableOpacity
              key={domain}
              onPress={() => setSelectedDomain(domain)}
              style={[styles.chip, { backgroundColor: selectedDomain === domain ? theme.accentLight : theme.bg, borderColor: theme.border }]}
            >
              <Text style={[styles.chipText, { color: selectedDomain === domain ? theme.accent : theme.textSub }]}>{domain}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Source type</Text>
        <View style={styles.chipsWrap}>
          {sourceTypes.map((source) => (
            <TouchableOpacity
              key={source.value}
              onPress={() => setSourceType(source.value)}
              style={[styles.chip, { backgroundColor: sourceType === source.value ? theme.accentLight : theme.bg, borderColor: theme.border }]}
            >
              <Text style={[styles.chipText, { color: sourceType === source.value ? theme.accent : theme.textSub }]}>{source.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Starter framework</Text>
        <View style={styles.chipsWrap}>
          {templates.map((item) => (
            <TouchableOpacity key={item.value} onPress={() => setTemplate(item)} style={[styles.chip, { backgroundColor: template.value === item.value ? theme.accentLight : theme.bg, borderColor: theme.border }]}>
              <Text style={[styles.chipText, { color: template.value === item.value ? theme.accent : theme.textSub }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.dropzone, { backgroundColor: theme.bg, borderColor: theme.border }]} onPress={handleAttach}>
          <Ionicons name="cloud-upload-outline" size={22} color={theme.accent} />
          <View style={styles.dropzoneCopy}>
            <Text style={[styles.dropzoneTitle, { color: theme.text }]}>Attach playbooks, video, audio, or documents</Text>
            <Text style={[styles.dropzoneSub, { color: theme.textSub }]}>PDFs and media become source context for the generated steps.</Text>
          </View>
        </TouchableOpacity>
        {attachments.map((attachment) => <Text key={`${attachment.name}-${attachment.uri}`} style={[styles.attachment, { color: theme.textSub }]}>{attachment.name}</Text>)}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Ingestion prompt</Text>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          multiline
          style={[styles.textArea, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]} 
        />

        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.accent }]} onPress={handleGenerate} disabled={isGenerating}> 
          {isGenerating ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="rocket" size={16} color="#000" />}
          <Text style={styles.primaryText}>{isGenerating ? 'Generating...' : 'Generate Path'}</Text>
        </TouchableOpacity>
      </View>

      {false && generatedPath ? (
        <View style={[styles.editor, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.editorEyebrow, { color: theme.accent }]}>GENERATED PATH EDITOR</Text>
          <Text style={[styles.editorTitle, { color: theme.text }]}>Review your interactive route</Text>
          <TextInput
            value={generatedPath!.title}
            onChangeText={(value) => setGeneratedPath((current) => current ? { ...current, title: value } : current)}
            style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
          />
          <TextInput
            value={generatedPath!.description}
            onChangeText={(value) => setGeneratedPath((current) => current ? { ...current, description: value } : current)}
            multiline
            style={[styles.textArea, styles.editorDescription, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
          />
          {generatedPath!.steps.map((step, index) => (
            <View key={step.id} style={[styles.stepEditor, { backgroundColor: theme.bg, borderColor: theme.border }]}> 
              <Text style={[styles.stepMeta, { color: theme.accent }]}>DAY {step.day} · {step.type.toUpperCase()}</Text>
              <TextInput
                value={step.title}
                onChangeText={(value) => setGeneratedPath((current) => {
                  if (!current) return current;
                  const steps = [...current.steps];
                  steps[index] = { ...steps[index], title: value };
                  return { ...current, steps };
                })}
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              />
              <TextInput
                value={step.instructions}
                onChangeText={(value) => setGeneratedPath((current) => {
                  if (!current) return current;
                  const steps = [...current.steps];
                  steps[index] = { ...steps[index], instructions: value };
                  return { ...current, steps };
                })}
                multiline
                style={[styles.stepInstructions, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              />
            </View>
          ))}

          <Text style={[styles.previewHeading, { color: theme.text }]}>Live interactive preview</Text>
          {generatedPath!.steps.slice(0, 4).map((step) => (
            <StepCard key={`preview-${step.id}`} step={{ ...step, description: step.instructions }} pathCategory={generatedPath!.category} pathId="studio-preview" />
          ))}

          <View style={[styles.publishPanel, { borderColor: theme.border }]}> 
            <Text style={[styles.publishTitle, { color: theme.text }]}>Publishing</Text>
            <Text style={[styles.publishLabel, { color: theme.textSub }]}>Pricing tier</Text>
            <View style={styles.chipsWrap}>
              {(['free', 'plus', 'premium'] as const).map((tier) => (
                <TouchableOpacity key={tier} onPress={() => setPricingTier(tier)} style={[styles.chip, { backgroundColor: pricingTier === tier ? theme.accentLight : theme.bg, borderColor: theme.border }]}> 
                  <Text style={[styles.chipText, { color: pricingTier === tier ? theme.accent : theme.textSub }]}>{tier === 'free' ? 'Free' : tier === 'plus' ? '$29 Plus' : '$79 Premium'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.publishLabel, { color: theme.textSub }]}>Member access limit</Text>
            <TextInput value={accessLimit} onChangeText={setAccessLimit} keyboardType="numeric" placeholder="Unlimited" placeholderTextColor={theme.textMuted} style={[styles.input, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]} />
            <Text style={[styles.publishLabel, { color: theme.textSub }]}>Link visibility</Text>
            <View style={styles.chipsWrap}>
              {(['public', 'unlisted', 'private'] as const).map((option) => (
                <TouchableOpacity key={option} onPress={() => setVisibility(option)} style={[styles.chip, { backgroundColor: visibility === option ? theme.accentLight : theme.bg, borderColor: theme.border }]}> 
                  <Text style={[styles.chipText, { color: visibility === option ? theme.accent : theme.textSub }]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.publishButton, { backgroundColor: theme.accent }]} onPress={handlePublish}>
              <Ionicons name="globe-outline" size={16} color="#000" />
              <Text style={styles.primaryText}>Publish Path</Text>
            </TouchableOpacity>
            {publishedLink ? <Text selectable style={[styles.publishedLink, { color: theme.accent }]}>{publishedLink}</Text> : null}
          </View>
        </View>
      ) : null}
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
