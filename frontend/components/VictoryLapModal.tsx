import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { FlexCardGenerator } from './FlexCardGenerator';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

interface VictoryData {
  percentile: number;
  completion_days: number;
  total_completions: number;
  idea_title: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  ideaId: string;
  ideaTitle: string;
  completionDays: number;
  victoryData: VictoryData | null;
  city?: string;
}

type Stage = 'score' | 'earnings' | 'strategy' | 'celebrate';

export function VictoryLapModal({ visible, onClose, userId, ideaId, ideaTitle, completionDays, victoryData, city }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('score');
  const [earnings, setEarnings] = useState('');
  const [strategy, setStrategy] = useState('');
  const [trickyStep, setTrickyStep] = useState('');
  const [tip, setTip] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCompletion = async () => {
    if (!userId || !ideaId) { setStage('celebrate'); return; }
    setIsSaving(true);
    try {
      await axios.post(`${API_URL}/api/completions/${userId}/${ideaId}`, {
        earnings: parseFloat(earnings) || 0,
        strategy,
        tricky_step: trickyStep,
        improvement_tip: tip,
        completion_days: completionDays,
      });
      // Award 100 ARC for blueprint completion
      axios.post(`${API_URL}/api/arc/award`, { user_id: userId, event: 'blueprint_complete' }).catch(() => {});
    } catch (e) {
      console.error('Save completion error:', e);
    } finally {
      setIsSaving(false);
      setStage('celebrate');
    }
  };

  const percentile = victoryData?.percentile ?? 0;
  const topPercent = 100 - percentile;
  const days = completionDays || victoryData?.completion_days || 0;

  const getPercentileColor = () => topPercent <= 10 ? '#F59E0B' : topPercent <= 25 ? '#00D95F' : '#3B82F6';
  const getPercentileLabel = () => topPercent <= 5 ? 'LEGENDARY' : topPercent <= 10 ? 'ELITE' : topPercent <= 25 ? 'TOP TIER' : 'GREAT';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* STAGE: SCORE */}
          {stage === 'score' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stageContent}>
              <View style={styles.trophyWrap}>
                <View style={styles.trophyRing}>
                  <Ionicons name="trophy" size={48} color="#F59E0B" />
                </View>
                <View style={[styles.labelBadge, { backgroundColor: getPercentileColor() + '20', borderColor: getPercentileColor() + '50' }]}>
                  <Text style={[styles.labelText, { color: getPercentileColor() }]}>{getPercentileLabel()}</Text>
                </View>
              </View>
              <Text style={styles.victoryHeadline}>Blueprint Complete!</Text>
              <Text style={styles.victoryIdea} numberOfLines={2}>{ideaTitle}</Text>

              {/* Percentile card */}
              <View style={styles.percentileCard}>
                <Text style={styles.percentileNum}>Top {topPercent < 1 ? '<1' : topPercent}%</Text>
                <Text style={styles.percentileSub}>
                  You completed this in {days} day{days !== 1 ? 's' : ''}.{'\n'}
                  Faster than {percentile}% of all Architects.
                </Text>
                {victoryData?.total_completions ? (
                  <View style={styles.communityCount}>
                    <Ionicons name="people" size={12} color="#4A4A4A" />
                    <Text style={styles.communityText}>{victoryData.total_completions} Architects have completed this</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setStage('earnings')}
                data-testid="victory-score-next"
              >
                <Text style={styles.primaryBtnText}>Log My Earnings</Text>
                <Ionicons name="arrow-forward" size={16} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipLink} onPress={() => setStage('celebrate')}>
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* STAGE: EARNINGS */}
          {stage === 'earnings' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stageContent}>
              <View style={styles.stageIcon}>
                <Ionicons name="cash" size={32} color="#00D95F" />
              </View>
              <Text style={styles.stageTitle}>How much did you earn?</Text>
              <Text style={styles.stageSub}>Your first run. This feeds our global earnings database and improves blueprint accuracy.</Text>
              <View style={styles.earningsInputRow}>
                <View style={styles.currencyTag}>
                  <Text style={styles.currencySymbol}>$</Text>
                </View>
                <TextInput
                  style={styles.earningsInput}
                  placeholder="0"
                  placeholderTextColor="#4A4A4A"
                  keyboardType="numeric"
                  value={earnings}
                  onChangeText={setEarnings}
                  data-testid="victory-earnings-input"
                />
              </View>
              <View style={styles.earningsHints}>
                {['50', '200', '500', '1000'].map(amt => (
                  <TouchableOpacity key={amt} style={styles.hintChip} onPress={() => setEarnings(amt)}>
                    <Text style={styles.hintChipText}>${amt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, !earnings && styles.primaryBtnDisabled]}
                onPress={() => setStage('strategy')}
                data-testid="victory-earnings-next"
              >
                <Text style={styles.primaryBtnText}>{earnings ? `I earned $${earnings}` : 'Skip'}</Text>
                <Ionicons name="arrow-forward" size={16} color="#000" />
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* STAGE: STRATEGY */}
          {stage === 'strategy' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stageContent}>
              <View style={styles.stageIcon}>
                <Ionicons name="bulb" size={32} color="#F59E0B" />
              </View>
              <Text style={styles.stageTitle}>Your unique edge</Text>
              <Text style={styles.stageSub}>Help fellow Architects win faster. Your insight improves the blueprint.</Text>

              <Text style={styles.inputLabel}>What was your winning strategy?</Text>
              <TextInput
                style={styles.textArea}
                placeholder="How did you approach this blueprint differently? What worked best?"
                placeholderTextColor="#4A4A4A"
                multiline
                value={strategy}
                onChangeText={setStrategy}
                textAlignVertical="top"
                data-testid="victory-strategy-input"
              />
              <Text style={styles.inputLabel}>Which step was trickiest? (e.g. "Step 9")</Text>
              <TextInput
                style={styles.singleInput}
                placeholder="Step 9 — Finding the first client"
                placeholderTextColor="#4A4A4A"
                value={trickyStep}
                onChangeText={setTrickyStep}
                data-testid="victory-tricky-input"
              />
              <Text style={styles.inputLabel}>Any tool or shortcut we should add?</Text>
              <TextInput
                style={styles.singleInput}
                placeholder="e.g. Use Apollo.io instead of cold email"
                placeholderTextColor="#4A4A4A"
                value={tip}
                onChangeText={setTip}
                data-testid="victory-tip-input"
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSaveCompletion}
                disabled={isSaving}
                data-testid="victory-strategy-submit"
              >
                {isSaving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Submit My Win</Text>
                    <Ionicons name="checkmark" size={16} color="#000" />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* STAGE: CELEBRATE */}
          {stage === 'celebrate' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.celebrateCenter}>
                <View style={styles.celebrateRing}>
                  <Ionicons name="checkmark-circle" size={56} color="#00D95F" />
                </View>
                <Text style={styles.celebrateTitle}>You're an Architect.</Text>
                <Text style={styles.celebrateSub}>
                  Your victory has been logged.{'\n'}
                  Your insights will help the next Architect win faster.
                </Text>
                {earnings ? (
                  <View style={styles.earningsBanner}>
                    <Text style={styles.earningsBannerLabel}>First run earnings</Text>
                    <Text style={styles.earningsBannerAmt}>${parseFloat(earnings).toLocaleString()}</Text>
                  </View>
                ) : null}

                {/* ARC Award Banner */}
                <View style={styles.arcBanner}>
                  <View style={styles.arcCoin}>
                    <Text style={styles.arcCoinText}>A</Text>
                  </View>
                  <View>
                    <Text style={styles.arcBannerTitle}>+100 ARC Earned!</Text>
                    <Text style={styles.arcBannerSub}>Architect Credits added to your balance</Text>
                  </View>
                </View>
              </View>

              {/* Flex Card */}
              <FlexCardGenerator
                blueprintTitle={ideaTitle}
                topPercent={100 - (victoryData?.percentile ?? 0)}
                earnings={parseFloat(earnings) || 0}
                completionDays={completionDays || victoryData?.completion_days || 1}
                city={city}
                percentileLabel={getPercentileLabel()}
                onShared={() => {
                  // Award 25 ARC for sharing
                  axios.post(`${API_URL}/api/arc/award`, { user_id: userId, event: 'share_flex' }).catch(() => {});
                }}
              />

              <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => { onClose(); router.push('/(tabs)/discover'); }}
                  data-testid="victory-discover-next"
                >
                  <Ionicons name="compass" size={16} color="#000" />
                  <Text style={styles.primaryBtnText}>Find My Next Blueprint</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.skipLink} onPress={onClose}>
                  <Text style={styles.skipText}>Back to Dashboard</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0D0E14', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%', borderWidth: 1, borderColor: '#2A2C35',
  },
  handle: {
    width: 36, height: 4, backgroundColor: '#2A2C35',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  stageContent: { padding: 24, paddingBottom: 40 },
  // Score stage
  trophyWrap: { alignItems: 'center', marginBottom: 8 },
  trophyRing: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: '#F59E0B15', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#F59E0B40', marginBottom: 12,
  },
  labelBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  labelText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  victoryHeadline: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginTop: 16 },
  victoryIdea: { fontSize: 14, color: '#8E8E8E', textAlign: 'center', marginTop: 4, marginBottom: 20, lineHeight: 20 },
  percentileCard: {
    backgroundColor: '#1A1C23', borderRadius: 18, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#2A2C35', marginBottom: 24,
  },
  percentileNum: { fontSize: 48, fontWeight: '900', color: '#00D95F', lineHeight: 54 },
  percentileSub: { fontSize: 14, color: '#8E8E8E', textAlign: 'center', lineHeight: 20, marginTop: 8 },
  communityCount: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10,
  },
  communityText: { fontSize: 11, color: '#4A4A4A' },
  // Earnings stage
  stageIcon: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: '#00D95F12', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#00D95F25', alignSelf: 'center', marginBottom: 16,
  },
  stageTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  stageSub: { fontSize: 13, color: '#8E8E8E', textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  earningsInputRow: {
    flexDirection: 'row', backgroundColor: '#1A1C23',
    borderRadius: 14, borderWidth: 1, borderColor: '#2A2C35',
    marginBottom: 12, overflow: 'hidden',
  },
  currencyTag: {
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#2A2C35',
  },
  currencySymbol: { fontSize: 20, color: '#00D95F', fontWeight: '700' },
  earningsInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 16, color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  earningsHints: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  hintChip: {
    backgroundColor: '#1A1C23', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#2A2C35',
  },
  hintChipText: { fontSize: 14, color: '#8E8E8E', fontWeight: '600' },
  // Strategy stage
  inputLabel: { fontSize: 12, color: '#4A4A4A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  textArea: {
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 14,
    color: '#FFFFFF', fontSize: 13, minHeight: 80, borderWidth: 1, borderColor: '#2A2C35',
    marginBottom: 16,
  },
  singleInput: {
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 14,
    color: '#FFFFFF', fontSize: 13, height: 48, borderWidth: 1, borderColor: '#2A2C35',
    marginBottom: 16,
  },
  // Celebrate stage
  celebrateCenter: { padding: 24, alignItems: 'center', paddingBottom: 8 },
  celebrateRing: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: '#00D95F12', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#00D95F30', marginBottom: 20,
  },
  celebrateTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 10 },
  celebrateSub: { fontSize: 14, color: '#8E8E8E', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  earningsBanner: {
    backgroundColor: '#00D95F10', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#00D95F30',
    width: '100%', marginBottom: 16,
  },
  earningsBannerLabel: { fontSize: 11, color: '#00D95F', fontWeight: '700', letterSpacing: 0.8 },
  earningsBannerAmt: { fontSize: 36, fontWeight: '900', color: '#00D95F', marginTop: 4 },
  arcBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F59E0B12', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#F59E0B30', width: '100%', marginBottom: 8,
  },
  arcCoin: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F59E0B',
    justifyContent: 'center', alignItems: 'center',
  },
  arcCoinText: { fontSize: 16, fontWeight: '900', color: '#000' },
  arcBannerTitle: { fontSize: 15, fontWeight: '700', color: '#F59E0B' },
  arcBannerSub: { fontSize: 12, color: '#8E8E8E', marginTop: 1 },
  // Shared
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00D95F', paddingVertical: 15, borderRadius: 14, marginBottom: 12, width: '100%',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  skipLink: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 13, color: '#4A4A4A' },
});
