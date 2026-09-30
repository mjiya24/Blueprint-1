import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FitnessStepCard } from './FitnessStepCard';
import { TradingStepCard } from './TradingStepCard';
import { CourseStepCard } from './CourseStepCard';
import { CreatorStepCard } from './CreatorStepCard';
import { InteractiveEngineCard } from './InteractiveEngineCard';

export type InteractiveStep = {
  id?: string;
  title?: string;
  description?: string;
  type?: string;
  category?: string;
  duration_minutes?: number;
  checklist?: string[];
  resources?: string[];
  notes?: string;
  [key: string]: any;
};

export function StepCard({
  step,
  pathCategory,
  pathId,
  onUnlock,
}: {
  step: InteractiveStep;
  pathCategory?: string;
  pathId?: string;
  onUnlock?: () => void;
}) {
  const source = String(step?.type || step?.category || pathCategory || '').toLowerCase();

  const paramStep = { ...step, path_id: pathId || step.path_id || step?.pathId || 'path-default' };

  if (step?.locked) {
    return (
      <View style={styles.lockedCard}>
        <View style={styles.lockedPreview}><Text style={styles.previewText}>INTERACTIVE ENGINE PREVIEW</Text><Text style={styles.previewTitle}>{step.title}</Text><Text style={styles.previewCopy}>{step.description}</Text></View>
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={20} color="#FBBF24" />
          <Text style={styles.lockTitle}>Unlock Days 2–7 & All AI Engines</Text>
          <Text style={styles.lockSub}>Continue your path with the full member toolkit.</Text>
          <TouchableOpacity style={styles.unlockButton} onPress={onUnlock}><Text style={styles.unlockText}>Unlock Full Access · $49</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step?.widget_data?.widget_type) {
    return <InteractiveEngineCard step={paramStep} />;
  }

  if (source.includes('fitness') || source.includes('routine') || source.includes('workout') || source.includes('exercise')) {
    return <FitnessStepCard step={paramStep} />;
  }

  if (source.includes('trade') || source.includes('finance') || source.includes('market') || source.includes('risk')) {
    return <TradingStepCard step={paramStep} />;
  }

  if (source.includes('course') || source.includes('ai') || source.includes('tech') || source.includes('business') || source.includes('education')) {
    return <CourseStepCard step={paramStep} />;
  }

  if (source.includes('creator') || source.includes('marketing') || source.includes('content') || source.includes('social')) {
    return <CreatorStepCard step={paramStep} />;
  }

  const keywords = (step?.title || step?.description || '').toLowerCase();
  if (keywords.includes('workout') || keywords.includes('rep') || keywords.includes('exercise')) {
    return <FitnessStepCard step={paramStep} />;
  }
  if (keywords.includes('stop loss') || keywords.includes('trade') || keywords.includes('pnl') || keywords.includes('risk')) {
    return <TradingStepCard step={paramStep} />;
  }
  if (keywords.includes('code') || keywords.includes('prompt') || keywords.includes('project') || keywords.includes('lesson')) {
    return <CourseStepCard step={paramStep} />;
  }
  if (keywords.includes('reel') || keywords.includes('tiktok') || keywords.includes('instagram') || keywords.includes('post')) {
    return <CreatorStepCard step={paramStep} />;
  }

  return (
    <View>
      <Text>{step.title || 'Step'} </Text>
      {step.description ? <Text>{step.description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lockedCard: { backgroundColor: '#0F141D', borderRadius: 20, borderWidth: 1, borderColor: '#F59E0B44', overflow: 'hidden', marginBottom: 12 },
  lockedPreview: { padding: 18, opacity: 0.42, minHeight: 130 },
  previewText: { color: '#FBBF24', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  previewTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900', marginTop: 10 },
  previewCopy: { color: '#CBD5E1', fontSize: 13, lineHeight: 19, marginTop: 6 },
  lockOverlay: { backgroundColor: '#0F141DEE', borderTopWidth: 1, borderColor: '#F59E0B33', padding: 16, alignItems: 'center' },
  lockTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  lockSub: { color: '#94A3B8', fontSize: 12, marginTop: 5, textAlign: 'center' },
  unlockButton: { backgroundColor: '#35E4A1', borderRadius: 11, paddingHorizontal: 16, paddingVertical: 11, marginTop: 12 },
  unlockText: { color: '#000', fontSize: 12, fontWeight: '900' },
});

export default StepCard;
