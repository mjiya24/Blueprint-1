import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ArchitectPaywall } from '../components/ArchitectPaywall';
import { BrandLogoStrip } from '../components/BrandLogoStrip';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CATEGORY_COLORS: Record<string, string> = {
  'AI & Automation': '#6366F1',
  'No-Code & SaaS': '#8B5CF6',
  'Digital & Content': '#EC4899',
  'Agency & B2B': '#3B82F6',
  'Local & Service': '#10B981',
  'Passive & Investment': '#F59E0B',
};

const DIFF_COLORS: Record<string, string> = { easy: '#00D95F', medium: '#F59E0B', hard: '#FF6B6B' };

export default function BlueprintDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const [blueprint, setBlueprint] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [viability, setViability] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('user').then(d => { if (d) setUser(JSON.parse(d)); }),
      axios.get(`${API_URL}/api/blueprints/${id}`).then(r => setBlueprint(r.data)),
    ]).finally(() => setIsLoading(false));
  }, [id]);

  // Load viability when both blueprint and user location are available
  useEffect(() => {
    if (blueprint && user && user.profile?.city && !user.is_guest) {
      axios.get(`${API_URL}/api/blueprints/${blueprint.id}/viability`, {
        params: { city: user.profile.city, country_code: user.profile.country_code || 'US', country: user.profile.country || '' }
      }).then(r => setViability(r.data)).catch(() => {});
    }
  }, [blueprint, user]);

  if (isLoading) return (
    <View style={[styles.loading, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
      <ActivityIndicator size="large" color="#00D95F" />
    </View>
  );

  if (!blueprint) return (
    <View style={[styles.loading, { backgroundColor: theme.bg }]}>
      <Text style={{ color: '#FF6B6B' }}>Blueprint not found</Text>
    </View>
  );

  const catColor = CATEGORY_COLORS[blueprint.category] || '#00D95F';
  const steps: any[] = blueprint.action_steps || [];
  const freeSteps = steps.filter((s: any) => !s.is_locked);
  const lockedSteps = steps.filter((s: any) => s.is_locked);
  const isArchitect = user?.is_architect;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />

      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surfaceAlt }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={[styles.v2Badge, { backgroundColor: catColor + '18', borderColor: catColor + '40' }]}>
          <Text style={[styles.v2Text, { color: catColor }]}>v2.0 · 17 STEPS</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={[styles.categoryBadge, { backgroundColor: catColor + '18' }]}>
              <Text style={[styles.categoryText, { color: catColor }]}>{blueprint.category}</Text>
            </View>
            {blueprint.match_score && (
              <View style={styles.matchBadge}>
                <Text style={styles.matchText}>{blueprint.match_score}% Match</Text>
              </View>
            )}
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{blueprint.title}</Text>
          <Text style={[styles.description, { color: theme.textSub }]}>{blueprint.description}</Text>
          <BrandLogoStrip item={blueprint} theme={theme} />

          {/* Local Market Signal — Sprint 5 */}
          {viability && (
            <View style={[styles.viabilityCard, {
              backgroundColor: theme.surface,
              borderColor: viability.demand_level === 'High' ? '#00D95F30' :
                viability.demand_level === 'Medium' ? '#F59E0B30' : '#FF6B6B30'
            }]} data-testid="viability-badge">
              <View style={styles.viabilityHeader}>
                <Ionicons name="location" size={13} color="#00D95F" />
                <Text style={[styles.viabilityHeaderText, { color: theme.textMuted }]}>LOCAL MARKET — {user?.profile?.city?.toUpperCase()}</Text>
                <View style={[styles.demandBadge, {
                  backgroundColor: viability.demand_level === 'High' ? '#00D95F18' :
                    viability.demand_level === 'Medium' ? '#F59E0B18' : '#FF6B6B18'
                }]}>
                  <Text style={[styles.demandText, {
                    color: viability.demand_level === 'High' ? '#00D95F' :
                      viability.demand_level === 'Medium' ? '#F59E0B' : '#FF6B6B'
                  }]}>{viability.demand_level}</Text>
                </View>
              </View>
              <View style={styles.viabilityBody}>
                <Text style={[styles.viabilityScore, {
                  color: viability.score >= 75 ? '#00D95F' : viability.score >= 50 ? '#F59E0B' : '#FF6B6B'
                }]}>{viability.score}%</Text>
                <Text style={[styles.viabilityReason, { color: theme.textSub }]} numberOfLines={3}>{viability.reason}</Text>
              </View>
              {viability.local_tip && (
                <View style={styles.localTip}>
                  <Ionicons name="flash" size={11} color="#F59E0B" />
                  <Text style={styles.localTipText}>{viability.local_tip}</Text>
                </View>
              )}
            </View>
          )}

          {/* Stats row */}
          <View style={[styles.statsRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.statBox}>
              <Ionicons name="cash-outline" size={18} color="#00D95F" />
              <Text style={[styles.statVal, { color: theme.text }]}>{blueprint.potential_earnings}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Potential</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statBox}>
              <Ionicons name="time-outline" size={18} color="#F59E0B" />
              <Text style={[styles.statVal, { color: theme.text }]}>{blueprint.time_to_first_dollar}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>First Dollar</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statBox}>
              <Ionicons name="wallet-outline" size={18} color="#6366F1" />
              <Text style={[styles.statVal, { color: theme.text }]}>{blueprint.startup_cost_range || blueprint.startup_cost}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Startup Cost</Text>
            </View>
          </View>

          {/* Difficulty */}
          <View style={styles.metaRow}>
            <View style={[styles.diffBadge, { backgroundColor: DIFF_COLORS[blueprint.difficulty] + '18' }]}>
              <View style={[styles.diffDot, { backgroundColor: DIFF_COLORS[blueprint.difficulty] }]} />
              <Text style={[styles.diffText, { color: DIFF_COLORS[blueprint.difficulty] }]}>{blueprint.difficulty}</Text>
            </View>
            {(blueprint.tags || []).slice(0, 3).map((t: string, i: number) => (
              <View key={i} style={[styles.tagPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}><Text style={[styles.tagText, { color: theme.textMuted }]}>#{t}</Text></View>
            ))}
          </View>
        </View>

        {/* Steps */}
        <View style={styles.stepsSection}>
          <View style={styles.stepsSectionHeader}>
            <Text style={[styles.stepsTitle, { color: theme.text }]}>The 17-Step Blueprint</Text>
            <View style={styles.stepsLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#00D95F' }]} />
              <Text style={[styles.legendText, { color: theme.textMuted }]}>5 Free</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#00D95F44' }]} />
              <Text style={[styles.legendText, { color: theme.textMuted }]}>12 Architect</Text>
              </View>
            </View>
          </View>

          {/* Free Steps */}
          {freeSteps.map((step: any) => (
            <View key={step.step_number} style={[styles.stepRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.stepNumBadge, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.stepNumText, { color: theme.text }]}>{step.step_number}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepText, { color: theme.text }]}>{step.text}</Text>
                {step.common_wall && (
                  <View style={styles.wallNote}>
                    <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
                    <Text style={styles.wallText}>{step.common_wall}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Locked Steps */}
          {lockedSteps.length > 0 && (
            <View style={styles.lockedSection}>
              {!isArchitect && (
                <View style={styles.unlockCta}>
                  <View style={styles.unlockCtaContent}>
                    <Ionicons name="flash" size={20} color="#000" />
                    <View>
                      <Text style={styles.unlockCtaTitle}>Unlock 12 Architect Steps</Text>
                      <Text style={styles.unlockCtaSub}>Deep execution, scaling, legal setup & more</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.unlockBtn}
                    onPress={() => setShowPaywall(true)}
                    data-testid="unlock-architect-btn"
                  >
                    <Text style={styles.unlockBtnText}>Unlock — $14.99/mo</Text>
                  </TouchableOpacity>
                </View>
              )}

              {lockedSteps.map((step: any) => (
                <View key={step.step_number} style={styles.lockedStepWrapper}>
                  {!isArchitect ? (
                    <View style={styles.lockedStepBlurred}>
                      <BlurView intensity={8} tint="dark" style={StyleSheet.absoluteFillObject} />
                      <View style={styles.lockedStepInner}>
                        <View style={[styles.stepNumBadge, styles.stepNumLocked]}>
                          <Text style={[styles.stepNumText, { color: '#2A2C35' }]}>{step.step_number}</Text>
                        </View>
                        <View style={styles.stepContent}>
                          <Text style={styles.lockedStepText}>{step.text}</Text>
                          {step.workaround_hint && (
                            <View style={styles.hintRow}>
                              <Ionicons name="lock-closed" size={11} color="#2A2C35" />
                              <Text style={styles.hintText}>Architect hint hidden</Text>
                            </View>
                          )}
                        </View>
                        <Ionicons name="lock-closed" size={14} color="#2A2C35" style={{ flexShrink: 0 }} />
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.stepRow, styles.stepRowArchitect, { backgroundColor: theme.surface, borderColor: '#00D95F30' }]}>
                      <View style={[styles.stepNumBadge, { backgroundColor: '#00D95F18', borderColor: '#00D95F30' }]}>
                        <Text style={[styles.stepNumText, { color: '#00D95F' }]}>{step.step_number}</Text>
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={[styles.stepText, { color: theme.text }]}>{step.text}</Text>
                        {step.common_wall && (
                          <View style={styles.wallNote}>
                            <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
                            <Text style={styles.wallText}>{step.common_wall}</Text>
                          </View>
                        )}
                        {step.workaround_hint && (
                          <View style={styles.workaroundHint}>
                            <Ionicons name="flash" size={11} color="#00D95F" />
                            <Text style={styles.workaroundText}>{step.workaround_hint}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Blueprint Guide CTA for Architects */}
          {isArchitect && (
            <TouchableOpacity
              style={styles.guideBtn}
              onPress={() => router.push({ pathname: '/blueprint-guide', params: { idea_id: blueprint.id, idea_title: blueprint.title } })}
              data-testid="blueprint-guide-cta"
            >
              <View style={styles.guideBtnLeft}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#000" />
                <View>
                  <Text style={styles.guideBtnTitle}>Ask Blueprint Guide</Text>
                  <Text style={styles.guideBtnSub}>AI coaching for this blueprint</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <ArchitectPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="12 Architect Steps"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loading: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center' },
  v2Badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  v2Text: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  hero: { padding: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  categoryText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  matchBadge: { backgroundColor: '#00D95F18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  matchText: { fontSize: 11, color: '#00D95F', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', lineHeight: 32, marginBottom: 10 },
  description: { fontSize: 14, color: '#8E8E8E', lineHeight: 22, marginBottom: 20 },
  statsRow: { flexDirection: 'row', backgroundColor: '#1A1C23', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#2A2C35' },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#4A4A4A', fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#2A2C35', marginHorizontal: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  diffBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  diffDot: { width: 6, height: 6, borderRadius: 3 },
  diffText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  tagPill: { backgroundColor: '#1A1C23', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#2A2C35' },
  tagText: { fontSize: 10, color: '#4A4A4A', fontWeight: '600' },
  stepsSection: { paddingHorizontal: 16 },
  stepsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  stepsTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  stepsLegend: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#4A4A4A', fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#1A1C23', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2A2C35' },
  stepRowArchitect: { borderColor: '#00D95F20', backgroundColor: '#00D95F05' },
  stepNumBadge: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#2A2C35', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  stepNumLocked: { backgroundColor: '#1A1C23' },
  stepNumText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  stepContent: { flex: 1 },
  stepText: { fontSize: 13, color: '#FFFFFF', lineHeight: 19 },
  wallNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, backgroundColor: '#F59E0B10', borderRadius: 6, padding: 6 },
  wallText: { fontSize: 11, color: '#F59E0B', flex: 1, lineHeight: 16 },
  workaroundHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  workaroundText: { fontSize: 11, color: '#00D95F', flex: 1, lineHeight: 15, fontStyle: 'italic' },
  lockedSection: { marginTop: 4 },
  unlockCta: { backgroundColor: '#00D95F', borderRadius: 14, padding: 16, marginBottom: 10 },
  unlockCtaContent: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  unlockCtaTitle: { fontSize: 15, fontWeight: '800', color: '#000' },
  unlockCtaSub: { fontSize: 11, color: '#000', opacity: 0.7 },
  unlockBtn: { backgroundColor: '#000', borderRadius: 10, padding: 12, alignItems: 'center' },
  unlockBtnText: { fontSize: 14, fontWeight: '700', color: '#00D95F' },
  lockedStepWrapper: { borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: '#2A2C35' },
  lockedStepBlurred: { position: 'relative', backgroundColor: '#1A1C23', borderRadius: 12 },
  lockedStepInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12 },
  lockedStepText: { fontSize: 13, color: '#4A4A4A', lineHeight: 19 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  hintText: { fontSize: 10, color: '#2A2C35' },
  guideBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#00D95F', borderRadius: 14, padding: 16, marginTop: 16,
  },
  guideBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guideBtnTitle: { fontSize: 15, fontWeight: '700', color: '#000' },
  guideBtnSub: { fontSize: 11, color: '#000', opacity: 0.7 },
  // Sprint 5: Viability badge
  viabilityCard: {
    backgroundColor: '#1A1C23', borderRadius: 16, padding: 14,
    marginBottom: 14, borderWidth: 1,
  },
  viabilityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  viabilityHeaderText: {
    fontSize: 10, color: '#4A4A4A', fontWeight: '700',
    letterSpacing: 0.8, flex: 1,
  },
  demandBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  demandText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  viabilityBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  viabilityScore: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  viabilityReason: { flex: 1, fontSize: 12, color: '#8E8E8E', lineHeight: 17 },
  localTip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F59E0B0A', borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: '#F59E0B20',
  },
  localTipText: { flex: 1, fontSize: 11, color: '#F59E0B', lineHeight: 15 },
});
