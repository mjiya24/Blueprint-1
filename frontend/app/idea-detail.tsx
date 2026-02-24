import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import EarningsProgressBar from '../components/EarningsProgressBar';
import CelebrationAnimation from '../components/CelebrationAnimation';
import { MarketPulse } from '../components/MarketPulse';
import { BlueprintVeterans } from '../components/BlueprintVeterans';
import { IdeaIcon } from '../components/icons';
import { useLocalSearchParams } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const calcMatchScore = (profile: any, idea: any): number => {
  if (!profile?.environment && !profile?.social_preference &&
    !profile?.assets?.length && !profile?.questionnaire_interests?.length) return 50;
  let score = 0;
  const envFit = idea.environment_fit || ['any'];
  if (envFit.includes('any') || !envFit.length || (profile.environment && envFit.includes(profile.environment))) score += 25;
  const socialFit = idea.social_fit || [];
  if (!socialFit.length || (profile.social_preference && socialFit.includes(profile.social_preference))) score += 25;
  const reqAssets = (idea.asset_requirements || []).filter((a: string) => a !== 'none');
  const userAssets = new Set(profile.assets || []);
  if (!reqAssets.length || reqAssets.every((a: string) => userAssets.has(a))) score += 25;
  else if (reqAssets.some((a: string) => userAssets.has(a))) score += 12;
  const ideaInterests = new Set(idea.interest_tags || []);
  const userInterests = new Set(profile.questionnaire_interests || []);
  if (!ideaInterests.size) score += 25;
  else if ((userInterests as any).size > 0) {
    const overlap = [...(userInterests as any)].filter((i: string) => (ideaInterests as any).has(i)).length;
    if (overlap > 0) score += Math.min(25, Math.round(25 * overlap / (ideaInterests as any).size));
  }
  return Math.min(99, Math.max(30, Math.round(30 + score * 0.69)));
};

const getMatchColor = (score: number) => score >= 75 ? '#00D95F' : score >= 50 ? '#F59E0B' : '#FF6B6B';

export default function IdeaDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [idea, setIdea] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [savedIdea, setSavedIdea] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [celebrationTier, setCelebrationTier] = useState<'first' | 'momentum' | 'complete' | null>(null);
  const [shownMilestones, setShownMilestones] = useState(new Set<string>());
  const [matchScore, setMatchScore] = useState(50);

  useEffect(() => { if (id) loadData(); }, [id]);

  const loadData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const u = userData ? JSON.parse(userData) : null;
      setUser(u);

      const ideaRes = await axios.get(`${API_URL}/api/ideas/${id}`);
      const ideaData = ideaRes.data;
      setIdea(ideaData);

      if (u && !u.is_guest) {
        setMatchScore(calcMatchScore(u.profile || {}, ideaData));
        const savedRes = await axios.get(`${API_URL}/api/saved-ideas/${u.id}/${id}`);
        if (savedRes.data) {
          setSavedIdea(savedRes.data);
          setIsSaved(true);
          // Restore shown milestones
          const progress = savedRes.data.progress_percentage || 0;
          const shown = new Set<string>();
          if (progress > 0) shown.add('first');
          if (progress >= 50) shown.add('momentum');
          if (progress === 100) shown.add('complete');
          setShownMilestones(shown);
        }
      } else if (u?.is_guest) {
        setMatchScore(0);
      }
    } catch (e) {
      console.error('Error loading idea:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!user || user.is_guest) {
      router.push('/onboarding/auth');
      return;
    }
    try {
      if (isSaved) {
        await axios.delete(`${API_URL}/api/saved-ideas/${user.id}/${id}`);
        setIsSaved(false);
        setSavedIdea(null);
      } else {
        await axios.post(`${API_URL}/api/saved-ideas`, { user_id: user.id, idea_id: id, status: 'saved' });
        const res = await axios.get(`${API_URL}/api/saved-ideas/${user.id}/${id}`);
        if (res.data) { setSavedIdea(res.data); setIsSaved(true); }
      }
    } catch (e) {
      console.error('Save toggle error:', e);
    }
  };

  const handleStartBlueprint = async () => {
    if (!user) { router.push('/onboarding/auth'); return; }
    if (user.is_guest) {
      Alert.alert(
        'Account Required',
        'Create a free account to track your Blueprint progress and unlock full action plans.',
        [{ text: 'Cancel', style: 'cancel' },
          { text: 'Create Account', onPress: () => router.push('/onboarding/auth') }]
      );
      return;
    }
    setIsStarting(true);
    try {
      await axios.post(`${API_URL}/api/saved-ideas`, { user_id: user.id, idea_id: id, status: 'saved' });
      const res = await axios.get(`${API_URL}/api/saved-ideas/${user.id}/${id}`);
      if (res.data) { setSavedIdea(res.data); setIsSaved(true); }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (e.response?.status === 400) {
        const res = await axios.get(`${API_URL}/api/saved-ideas/${user.id}/${id}`);
        if (res.data) { setSavedIdea(res.data); setIsSaved(true); }
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleStepToggle = async (stepNumber: number, isCompleted: boolean) => {
    if (!user || !savedIdea) return;
    const endpoint = isCompleted ? 'uncomplete-step' : 'complete-step';
    // Optimistic update
    const updatedSteps = savedIdea.action_steps.map((s: any) =>
      s.step_number === stepNumber ? { ...s, completed: !isCompleted } : s
    );
    const newCompleted = updatedSteps.filter((s: any) => s.completed).length;
    const newProgress = Math.round((newCompleted / updatedSteps.length) * 100);
    setSavedIdea({ ...savedIdea, action_steps: updatedSteps, progress_percentage: newProgress });

    try {
      await axios.post(
        `${API_URL}/api/saved-ideas/${user.id}/${id}/${endpoint}`,
        { step_number: stepNumber }
      );
      if (!isCompleted) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (newCompleted === 1 && !shownMilestones.has('first')) {
          setCelebrationTier('first');
          setShownMilestones(prev => new Set([...prev, 'first']));
        } else if (newProgress >= 50 && !shownMilestones.has('momentum')) {
          setCelebrationTier('momentum');
          setShownMilestones(prev => new Set([...prev, 'momentum']));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (newProgress === 100 && !shownMilestones.has('complete')) {
          setCelebrationTier('complete');
          setShownMilestones(prev => new Set([...prev, 'complete']));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (e) {
      setSavedIdea(savedIdea); // revert
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#00D95F" />
      </View>
    );
  }

  if (!idea) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#8E8E8E' }}>Blueprint not found</Text>
      </View>
    );
  }

  const progress = savedIdea?.progress_percentage ?? 0;
  const earningsUnlocked = savedIdea?.earnings_unlocked ?? false;
  const actionSteps = savedIdea?.action_steps || [];
  const isStarted = !!savedIdea;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Celebration overlay */}
      <CelebrationAnimation tier={celebrationTier} onDone={() => setCelebrationTier(null)} />

      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.navActions}>
          {idea.affiliate_link ? (
            <TouchableOpacity style={styles.navBtn} onPress={() => Linking.openURL(idea.affiliate_link)}>
              <Ionicons name="open-outline" size={20} color="#8E8E8E" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.navBtn} onPress={handleSaveToggle}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isSaved ? '#00D95F' : '#8E8E8E'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Match Score Banner */}
        {(user && !user.is_guest) ? (
          <View style={[styles.matchBanner, { borderColor: getMatchColor(matchScore) + '40' }]}>
            <View style={[styles.matchDot, { backgroundColor: getMatchColor(matchScore) }]} />
            <Text style={[styles.matchBannerText, { color: getMatchColor(matchScore) }]}>
              {matchScore}% Match
            </Text>
            <Text style={styles.matchBannerSub}>based on your profile</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.guestMatchBanner} onPress={() => router.push('/onboarding/auth')}>
            <Ionicons name="lock-closed" size={16} color="#8E8E8E" />
            <Text style={styles.guestMatchText}>Create account to see your Match Score</Text>
            <Ionicons name="chevron-forward" size={14} color="#00D95F" />
          </TouchableOpacity>
        )}

        <View style={styles.mainContent}>
          {/* Category + Title */}
          <View style={styles.ideaHeader}>
            <IdeaIcon ideaId={id as string} size={52} />
            <View style={styles.ideaHeaderText}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{idea.category}</Text>
              </View>
              <Text style={styles.ideaTitle}>{idea.title}</Text>
            </View>
          </View>
          <Text style={styles.ideaDesc}>{idea.description}</Text>

          {/* Meta badges */}
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Ionicons name="cash-outline" size={14} color="#8E8E8E" />
              <Text style={styles.metaText}>{idea.startup_cost} cost</Text>
            </View>
            <View style={styles.metaBadge}>
              <Ionicons name="bar-chart-outline" size={14} color="#8E8E8E" />
              <Text style={styles.metaText}>{idea.difficulty}</Text>
            </View>
            {idea.time_needed && (
              <View style={styles.metaBadge}>
                <Ionicons name="time-outline" size={14} color="#8E8E8E" />
                <Text style={styles.metaText}>{idea.time_needed}</Text>
              </View>
            )}
          </View>

          {/* Earnings card */}
          <View style={styles.earningsCard}>
            <View>
              <Text style={styles.earningsLabel}>Earnings Potential</Text>
              <Text style={styles.earningsValue}>{idea.potential_earnings}</Text>
            </View>
            <View style={styles.earningsIcon}>
              <Ionicons name="trending-up" size={24} color="#00D95F" />
            </View>
          </View>

          {/* Progress section */}
          {isStarted && (
            <View style={styles.progressSection}>
              <EarningsProgressBar
                progress={progress}
                earningsUnlocked={earningsUnlocked}
              />
            </View>
          )}

          {/* Action Steps */}
          <View style={styles.stepsSection}>
            <Text style={styles.stepsTitle}>
              {isStarted ? 'Your Action Plan' : 'Action Plan'}
            </Text>
            <Text style={styles.stepsSubtitle}>
              {isStarted
                ? `${actionSteps.filter((s: any) => s.completed).length} of ${actionSteps.length} steps completed`
                : `${idea.action_steps?.length || 0} steps to launch`
              }
            </Text>

            {/* Interactive steps (started) */}
            {isStarted && actionSteps.map((step: any, idx: number) => (
              <TouchableOpacity
                key={step.step_number}
                style={[styles.stepRow, step.completed && styles.stepRowCompleted]}
                onPress={() => handleStepToggle(step.step_number, step.completed)}
                activeOpacity={0.7}
              >
                <View style={[styles.stepCheckbox, step.completed && styles.stepCheckboxCompleted]}>
                  {step.completed && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepNum]}>Step {step.step_number}</Text>
                  <Text style={[styles.stepText, step.completed && styles.stepTextCompleted]}>
                    {step.text}
                  </Text>
                </View>
                {step.is_scary_step && !step.completed && (
                  <View style={styles.keyStepBadge}>
                    <Ionicons name="key" size={12} color="#F59E0B" />
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Preview steps (not started) */}
            {!isStarted && idea.action_steps?.map((text: string, idx: number) => {
              const isLocked = user?.is_guest && idx >= 2;
              return (
                <View
                  key={idx}
                  style={[styles.previewStep, isLocked && styles.previewStepLocked]}
                >
                  <View style={styles.previewStepNum}>
                    <Text style={styles.previewStepNumText}>{idx + 1}</Text>
                  </View>
                  {isLocked ? (
                    <View style={styles.lockedStepContent}>
                      <Ionicons name="lock-closed" size={16} color="#4A4A4A" />
                      <Text style={styles.lockedStepText}>Unlock with free account</Text>
                    </View>
                  ) : (
                    <Text style={styles.previewStepText}>{text}</Text>
                  )}
                </View>
              );
            })}

            {/* Guest unlock prompt */}
            {!isStarted && user?.is_guest && (
              <TouchableOpacity
                style={styles.unlockCard}
                onPress={() => router.push('/onboarding/auth')}
              >
                <Ionicons name="lock-open" size={24} color="#00D95F" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.unlockTitle}>Unlock Full Blueprint</Text>
                  <Text style={styles.unlockDesc}>Create a free account to start tracking your progress</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#00D95F" />
              </TouchableOpacity>
            )}
          </View>

          {/* Skills */}
          {idea.required_skills?.length > 0 && (
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Required Skills</Text>
              <View style={styles.tagsRow}>
                {idea.required_skills.map((skill: string, i: number) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Tags */}
          {idea.tags?.length > 0 && (
            <View style={styles.infoSection}>
              <View style={styles.tagsRow}>
                {idea.tags.map((tag: string, i: number) => (
                  <View key={i} style={styles.tagMuted}>
                    <Text style={styles.tagMutedText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Market Pulse */}
          <MarketPulse ideaId={id as string} />

          {/* Blueprint Veterans */}
          <BlueprintVeterans ideaId={id as string} />

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      {!isStarted && (
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaButton, isStarting && styles.ctaButtonDisabled]}
            onPress={handleStartBlueprint}
            disabled={isStarting}
          >
            {isStarting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#000" />
                <Text style={styles.ctaButtonText}>
                  {user?.is_guest ? 'Create Account to Start' : 'Start My Blueprint'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isStarted && progress < 100 && (
        <View style={styles.ctaContainer}>
          <View style={styles.progressCta}>
            <Ionicons name="checkmark-circle" size={20} color="#00D95F" />
            <Text style={styles.progressCtaText}>
              Blueprint Active — {progress}% complete
            </Text>
          </View>
        </View>
      )}

      {isStarted && progress === 100 && (
        <View style={styles.ctaContainer}>
          <View style={[styles.progressCta, styles.progressCtaComplete]}>
            <Ionicons name="trophy" size={20} color="#000" />
            <Text style={[styles.progressCtaText, { color: '#000' }]}>Blueprint Complete — Time to Earn! 💰</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  navBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#2A2C35',
  },
  navActions: { flexDirection: 'row', gap: 10 },
  matchBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#00D95F0A', borderRadius: 12, borderWidth: 1,
  },
  matchDot: { width: 8, height: 8, borderRadius: 4 },
  matchBannerText: { fontSize: 15, fontWeight: '700' },
  matchBannerSub: { fontSize: 12, color: '#4A4A4A', marginLeft: 'auto' },
  guestMatchBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#1A1C23', borderRadius: 12, borderWidth: 1, borderColor: '#2A2C35',
  },
  guestMatchText: { flex: 1, fontSize: 13, color: '#8E8E8E' },
  mainContent: { padding: 20 },
  categoryBadge: { backgroundColor: '#00D95F12', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  categoryText: { fontSize: 12, color: '#00D95F', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  ideaTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', lineHeight: 32, marginBottom: 10 },
  ideaDesc: { fontSize: 15, color: '#8E8E8E', lineHeight: 22, marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1A1C23', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2A2C35' },
  metaText: { fontSize: 12, color: '#8E8E8E', fontWeight: '500', textTransform: 'capitalize' },
  earningsCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#00D95F0A', borderRadius: 14, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: '#00D95F25',
  },
  earningsLabel: { fontSize: 12, color: '#8E8E8E', marginBottom: 4 },
  earningsValue: { fontSize: 22, fontWeight: '700', color: '#00D95F' },
  earningsIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#00D95F15', justifyContent: 'center', alignItems: 'center' },
  progressSection: { marginBottom: 16 },
  stepsSection: { marginBottom: 20 },
  stepsTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  stepsSubtitle: { fontSize: 13, color: '#8E8E8E', marginBottom: 14 },
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#2A2C35',
  },
  stepRowCompleted: { backgroundColor: '#00D95F08', borderColor: '#00D95F25' },
  stepCheckbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: '#2A2C35', justifyContent: 'center', alignItems: 'center',
    marginRight: 12, marginTop: 1, flexShrink: 0,
  },
  stepCheckboxCompleted: { backgroundColor: '#00D95F', borderColor: '#00D95F' },
  stepContent: { flex: 1 },
  stepNum: { fontSize: 11, color: '#4A4A4A', fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  stepText: { fontSize: 14, color: '#FFFFFF', lineHeight: 20 },
  stepTextCompleted: { color: '#4A4A4A', textDecorationLine: 'line-through' },
  keyStepBadge: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#F59E0B15', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  previewStep: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1A1C23', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2A2C35' },
  previewStepLocked: { backgroundColor: '#0D0D0D', borderColor: '#1A1C23' },
  previewStepNum: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#2A2C35', justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
  previewStepNumText: { fontSize: 12, color: '#8E8E8E', fontWeight: '700' },
  previewStepText: { flex: 1, fontSize: 14, color: '#8E8E8E', lineHeight: 20 },
  lockedStepContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockedStepText: { fontSize: 14, color: '#2A2C35', fontStyle: 'italic' },
  unlockCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#00D95F0A', borderRadius: 14, padding: 16, marginTop: 8,
    borderWidth: 1, borderColor: '#00D95F25',
  },
  unlockTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  unlockDesc: { fontSize: 12, color: '#8E8E8E' },
  infoSection: { marginBottom: 16 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#8E8E8E', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#1A1C23', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2A2C35' },
  tagText: { fontSize: 12, color: '#8E8E8E', fontWeight: '500' },
  tagMuted: { backgroundColor: '#1A1C23', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagMutedText: { fontSize: 11, color: '#4A4A4A', fontWeight: '500' },
  ctaContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 32, backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#1A1C23' },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00D95F', borderRadius: 14, padding: 18,
  },
  ctaButtonDisabled: { opacity: 0.5 },
  ctaButtonText: { fontSize: 17, fontWeight: '700', color: '#000' },
  progressCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1A1C23', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#00D95F30',
  },
  progressCtaComplete: { backgroundColor: '#00D95F' },
  progressCtaText: { fontSize: 15, fontWeight: '600', color: '#00D95F' },
});
