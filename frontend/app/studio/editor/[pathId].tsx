import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { publishGeneratedPath } from '../../../src/services/api';
import { StepCard } from '../../../components/interactive/StepCard';

export default function StudioEditorScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { pathId } = useLocalSearchParams<{ pathId?: string }>();
  const [draft, setDraft] = useState<any>(null);
  const [pricingTier, setPricingTier] = useState<'free' | 'plus' | 'premium'>('plus');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [liveLink, setLiveLink] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(`path_draft_${String(pathId || '')}`).then((raw) => raw && setDraft(JSON.parse(raw)));
  }, [pathId]);

  const updateStep = (index: number, key: 'title' | 'instructions', value: string) => {
    setDraft((current: any) => {
      if (!current) return current;
      const steps = [...current.steps];
      steps[index] = { ...steps[index], [key]: value };
      return { ...current, steps };
    });
  };

  const handlePublishPath = async () => {
    if (!draft) return;
    const result = await publishGeneratedPath({
      title: draft.title,
      description: draft.description,
      category: draft.category,
      creator_handle: draft.creator_handle,
      steps: draft.steps,
      pricing_tiers: [{ name: pricingTier === 'free' ? 'Free' : pricingTier === 'plus' ? 'Plus' : 'Premium', price: pricingTier === 'free' ? 0 : pricingTier === 'plus' ? 29 : 79, description: 'Interactive path access' }],
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
        <View style={styles.phaseGrid}>
          {draft.steps.map((step: any, index: number) => <View key={step.id} style={styles.phase}><Text style={styles.phaseLabel}>PHASE {index + 1} · {step.type.toUpperCase()}</Text><TextInput value={step.title} onChangeText={(value) => updateStep(index, 'title', value)} style={styles.phaseTitle} /><TextInput value={step.instructions} onChangeText={(value) => updateStep(index, 'instructions', value)} multiline style={styles.phaseCopy} /><StepCard step={{ ...step, description: step.instructions }} pathCategory={draft.category} pathId={draft.id} /></View>)}
        </View>
        <View style={styles.publish}><Text style={styles.sectionTitle}>Launch settings</Text><View style={styles.row}>{(['free', 'plus', 'premium'] as const).map((tier) => <TouchableOpacity key={tier} onPress={() => setPricingTier(tier)} style={[styles.pill, pricingTier === tier && styles.activePill]}><Text style={styles.pillText}>{tier === 'free' ? 'Free' : tier === 'plus' ? '$29 Plus' : '$79 Premium'}</Text></TouchableOpacity>)}</View><View style={styles.row}>{(['public', 'unlisted', 'private'] as const).map((option) => <TouchableOpacity key={option} onPress={() => setVisibility(option)} style={[styles.pill, visibility === option && styles.activePill]}><Text style={styles.pillText}>{option}</Text></TouchableOpacity>)}</View><TouchableOpacity style={styles.publishButton} onPress={handlePublishPath}><Text style={styles.publishText}>Publish Path</Text></TouchableOpacity>{liveLink ? <View style={styles.success}><Text style={styles.successTitle}>Your Blueprint is Live!</Text><Text selectable style={styles.link}>{liveLink}</Text><View style={styles.row}><TouchableOpacity style={styles.pill} onPress={() => Clipboard.setStringAsync(liveLink)}><Text style={styles.pillText}>Copy Link</Text></TouchableOpacity><TouchableOpacity style={styles.pill} onPress={() => router.push(liveLink.replace('http://localhost:8081', '') as any)}><Text style={styles.pillText}>View Live Blueprint</Text></TouchableOpacity></View></View> : null}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: 18, paddingBottom: 50 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }, eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, titleInput: { fontSize: 28, fontWeight: '900', marginTop: 5 }, status: { fontSize: 12, marginTop: 5 }, back: { borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }, backText: { color: '#CBD5E1', fontWeight: '800' }, phaseGrid: { gap: 12 }, phase: { backgroundColor: '#0D111A', borderWidth: 1, borderColor: '#FFFFFF14', borderRadius: 18, padding: 15 }, phaseLabel: { color: '#35E4A1', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, phaseTitle: { color: '#F8FAFC', fontSize: 19, fontWeight: '900', marginTop: 8 }, phaseCopy: { color: '#CBD5E1', borderBottomWidth: 1, borderColor: '#FFFFFF14', paddingVertical: 8, minHeight: 48 }, publish: { backgroundColor: '#0D111A', borderWidth: 1, borderColor: '#FFFFFF14', borderRadius: 18, padding: 16, marginTop: 18 }, sectionTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900', marginBottom: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }, pill: { borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 }, activePill: { borderColor: '#35E4A1', backgroundColor: '#35E4A122' }, pillText: { color: '#CBD5E1', fontSize: 12, fontWeight: '800' }, publishButton: { backgroundColor: '#35E4A1', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 6 }, publishText: { color: '#000', fontWeight: '900' }, success: { borderTopWidth: 1, borderColor: '#35E4A144', marginTop: 16, paddingTop: 16 }, successTitle: { color: '#6EE7B7', fontSize: 20, fontWeight: '900' }, link: { color: '#67E8F9', marginVertical: 10 },
});