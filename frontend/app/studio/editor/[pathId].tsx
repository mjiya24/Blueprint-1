import React, { useEffect, useState } from 'react';
import { Alert, LayoutAnimation, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { publishGeneratedPath } from '../../../src/services/api';
import { StepCard } from '../../../components/interactive/StepCard';
import { PhaseAccordionItem } from '../../../components/interactive/PhaseAccordionItem';
import { PathLaunchSettings, PathPricingSettings } from '../../../components/interactive/PathLaunchSettings';

export default function StudioEditorScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { pathId } = useLocalSearchParams<{ pathId?: string }>();
  const [draft, setDraft] = useState<any>(null);
  const [pricing, setPricing] = useState<PathPricingSettings>({ accessType: 'custom', price: '49', frequency: 'per_month' });
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [liveLink, setLiveLink] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(`path_draft_${String(pathId || '')}`).then((raw) => raw && setDraft(JSON.parse(raw)));
  }, [pathId]);

  useEffect(() => {
    if (draft) AsyncStorage.setItem(`path_draft_${String(pathId || '')}`, JSON.stringify(draft)).catch(() => undefined);
  }, [draft, pathId]);

  const updateStep = (index: number, key: 'title' | 'instructions', value: string) => {
    setDraft((current: any) => {
      if (!current) return current;
      const steps = [...current.steps];
      steps[index] = { ...steps[index], [key]: value };
      return { ...current, steps };
    });
  };

  const togglePhase = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPhases((current) => {
      const willExpand = !(current[key] ?? key === 'phase-1');
      const next: Record<string, boolean> = {};
      (draft?.steps || []).forEach((_: any, index: number) => { next[`phase-${index + 1}`] = willExpand && `phase-${index + 1}` === key; });
      return next;
    });
  };

  const setAllPhases = (expanded: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next: Record<string, boolean> = {};
    (draft?.steps || []).forEach((_: any, index: number) => { next[`phase-${index + 1}`] = expanded; });
    setExpandedPhases(next);
  };

  const handlePublishPath = async () => {
    if (!draft) return;
    const result = await publishGeneratedPath({
      title: draft.title,
      description: draft.description,
      category: draft.category,
      creator_handle: draft.creator_handle,
      steps: draft.steps,
      pricing_tiers: [{ name: pricing.accessType === 'free' ? 'Free' : 'Custom Paid', price: pricing.accessType === 'free' ? 0 : Number(pricing.price) || 0, currency: 'USD', billing_frequency: pricing.frequency, frequency_label: pricing.frequency === 'per_week' ? '/ wk' : pricing.frequency === 'per_month' ? '/ mo' : pricing.frequency === 'per_year' ? '/ yr' : 'one-time', description: pricing.accessType === 'free' ? 'Free path access' : 'Interactive path access' }],
      price: pricing.accessType === 'free' ? 0 : Number(pricing.price) || 0,
      currency: 'USD',
      billing_frequency: pricing.frequency,
      visibility,
    });
    if (!result) {
      Alert.alert('Publish unavailable', 'The publishing service is offline.');
      return;
    }
    const link = `http://localhost:8081${result.public_bio_link}`;
    setLiveLink(link);
  };

  if (!draft) return <View style={[styles.center, { backgroundColor: theme.bg }]}><Text style={{ color: theme.text }}>Loading workspace...</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><View><Text style={[styles.eyebrow, { color: theme.accent }]}>CREATOR WORKSPACE</Text><TextInput value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} style={[styles.titleInput, { color: theme.text }]} /><Text style={[styles.status, { color: theme.textMuted }]}>Draft saved locally · {draft.steps.length} phases</Text></View><TouchableOpacity style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>Back</Text></TouchableOpacity></View>
        <View style={styles.canvasControls}><Text style={styles.canvasLabel}>PATHWAY CANVAS · {draft.steps.length} PHASES</Text><View style={styles.row}><TouchableOpacity style={styles.pill} onPress={() => setAllPhases(true)}><Text style={styles.pillText}>Expand All</Text></TouchableOpacity><TouchableOpacity style={styles.pill} onPress={() => setAllPhases(false)}><Text style={styles.pillText}>Collapse All</Text></TouchableOpacity></View></View>
        <View style={styles.phaseGrid}>
          {draft.steps.map((step: any, index: number) => { const key = `phase-${index + 1}`; const expanded = expandedPhases[key] ?? index === 0; const tier = step.locked ? 'MEMBER_ACCESS' : 'FREE_HOOK'; return <PhaseAccordionItem key={step.id || key} phaseNumber={index + 1} title={step.title || `Phase ${index + 1}`} category={String(step.type || draft.category).toUpperCase()} accessTier={tier} isConsumerView={false} expanded={expanded} onToggle={() => togglePhase(key)} editorControls={<><Text style={styles.phaseFieldLabel}>PHASE TITLE</Text><TextInput value={step.title} onChangeText={(value) => updateStep(index, 'title', value)} style={styles.phaseCopy} /><Text style={styles.phaseFieldLabel}>STEP INSTRUCTIONS</Text><TextInput value={step.instructions} onChangeText={(value) => updateStep(index, 'instructions', value)} multiline style={[styles.phaseCopy, styles.phaseInstructions]} /></>}><StepCard step={{ ...step, description: step.instructions }} pathCategory={draft.category} pathId={draft.id} /></PhaseAccordionItem>; })}
        </View>
        <View style={styles.publish}><PathLaunchSettings initialAccessType={pricing.accessType} initialPrice={pricing.price} initialFrequency={pricing.frequency} onSettingsChange={setPricing} /><Text style={styles.sectionTitle}>Visibility</Text><View style={styles.row}>{(['public', 'unlisted', 'private'] as const).map((option) => <TouchableOpacity key={option} onPress={() => setVisibility(option)} style={[styles.pill, visibility === option && styles.activePill]}><Text style={styles.pillText}>{option}</Text></TouchableOpacity>)}</View><TouchableOpacity style={styles.publishButton} onPress={handlePublishPath}><Text style={styles.publishText}>Publish Path</Text></TouchableOpacity>{liveLink ? <View style={styles.success}><Text style={styles.successTitle}>Your Blueprint is Live!</Text><Text selectable style={styles.link}>{liveLink}</Text><View style={styles.row}><TouchableOpacity style={styles.pill} onPress={() => Clipboard.setStringAsync(liveLink)}><Text style={styles.pillText}>Copy Link</Text></TouchableOpacity><TouchableOpacity style={styles.pill} onPress={() => router.push(liveLink.replace('http://localhost:8081', '') as any)}><Text style={styles.pillText}>View Live Blueprint</Text></TouchableOpacity></View></View> : null}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: 18, paddingBottom: 50 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }, eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, titleInput: { fontSize: 28, fontWeight: '900', marginTop: 5 }, status: { fontSize: 12, marginTop: 5 }, back: { borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }, backText: { color: '#CBD5E1', fontWeight: '800' }, phaseGrid: { gap: 4 }, phaseFieldLabel: { color: '#6EE7B7', fontSize: 9, fontWeight: '900', marginTop: 8 }, phaseCopy: { color: '#CBD5E1', backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 8, padding: 9, minHeight: 40 }, phaseInstructions: { minHeight: 70, textAlignVertical: 'top' }, canvasControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 9 }, canvasLabel: { color: '#6EE7B7', fontSize: 9, fontWeight: '900' }, publish: { backgroundColor: '#0D111A', borderWidth: 1, borderColor: '#FFFFFF14', borderRadius: 18, padding: 16, marginTop: 18 }, sectionTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900', marginBottom: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }, pill: { borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 }, activePill: { borderColor: '#35E4A1', backgroundColor: '#35E4A122' }, pillText: { color: '#CBD5E1', fontSize: 12, fontWeight: '800' }, publishButton: { backgroundColor: '#35E4A1', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 6 }, publishText: { color: '#000', fontWeight: '900' }, success: { borderTopWidth: 1, borderColor: '#35E4A144', marginTop: 16, paddingTop: 16 }, successTitle: { color: '#6EE7B7', fontSize: 20, fontWeight: '900' }, link: { color: '#67E8F9', marginVertical: 10 },
});