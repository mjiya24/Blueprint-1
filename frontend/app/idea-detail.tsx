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
import { ArchitectPaywall } from '../components/ArchitectPaywall';
import { TroubleshootModal } from '../components/TroubleshootModal';
import { TacticalAIPanel } from '../components/TacticalAIPanel';
import { LogWinSheet } from '../components/LogWinSheet';
import { RewardedAdGate } from '../components/RewardedAdGate';
import { useLocalSearchParams } from 'expo-router';
import { VictoryLapModal } from '../components/VictoryLapModal';
import { RescueModeModal } from '../components/RescueModeModal';
import { BrandLogoStrip } from '../components/BrandLogoStrip';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const HIGH_TICKET_IDS = new Set(['digital-001', 'digital-005', 'passive-002', 'passive-003', 'passive-004']);

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
  const { theme } = useTheme();
  const [idea, setIdea] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [savedIdea, setSavedIdea] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [celebrationTier, setCelebrationTier] = useState<'first' | 'momentum' | 'complete' | null>(null);
  const [shownMilestones, setShownMilestones] = useState(new Set<string>());
  const [matchScore, setMatchScore] = useState(50);
  // Sprint 2 state
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [troubleshootStep, setTroubleshootStep] = useState<{ number: number; text: string } | null>(null);
  // Sprint 6: Rescue Mode
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  // Sprint 6: Victory Lap
  const [showVictoryLap, setShowVictoryLap] = useState(false);
  const [victoryData, setVictoryData] = useState<any>(null);
  const [completionDays, setCompletionDays] = useState(0);
  // Sprint 8: Tactical AI Panel
  const [showTactical, setShowTactical] = useState(false);
  const [tacticalStep, setTacticalStep] = useState<{ number: number; text: string } | null>(null);
  // Sprint 8: Log a Win sheet (for Quick Win ideas)
  const [showLogWin, setShowLogWin] = useState(false);
  // Sprint 9: Rewarded Ad Gate (for free users wanting Go Deeper)
  const [showAdGate, setShowAdGate] = useState(false);
  const [pendingTacticalStep, setPendingTacticalStep] = useState<{ number: number; text: string } | null>(null);

  const checkIfStuck = (saved: any) => {
    if (!saved) return false;
    const steps = saved.action_steps || [];
    const completedTimes = steps
      .filter((s: any) => s.completed && s.completed_at)
      .map((s: any) => new Date(s.completed_at).getTime());
    const savedAtTime = new Date(saved.saved_at).getTime();
    const lastActivity = Math.max(savedAtTime, ...(completedTimes.length ? completedTimes : [0]));
    const hoursSince = (Date.now() - lastActivity) / (1000 * 60 * 60);
    const hasUncompletedSteps = steps.some((s: any) => !s.completed);
    return hoursSince >= 72 && hasUncompletedSteps && steps.length > 0;
  };

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
          setIsStuck(checkIfStuck(savedRes.data));
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
        // Award 10 ARC silently on step completion
        axios.post(`${API_URL}/api/arc/award`, { user_id: user.id, event: 'step_complete' }).catch(() => {});
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
          // Sprint 6: Trigger Victory Lap after a short delay
          const savedAt = savedIdea?.saved_at ? new Date(savedIdea.saved_at) : new Date();
          const days = Math.max(1, Math.round((Date.now() - savedAt.getTime()) / (1000 * 60 * 60 * 24)));
          setCompletionDays(days);
          setTimeout(async () => {
            try {
              const res = await axios.get(`${API_URL}/api/completions/percentile/${id}?days=${days}`);
              setVictoryData({ ...res.data, idea_title: idea?.title || '' });
            } catch {}
            setShowVictoryLap(true);
          }, 2000);
        }
      }
    } catch (e) {
      setSavedIdea(savedIdea); // revert
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
        <ActivityIndicator size="large" color="#00D95F" />
      </View>
    );
  }

  if (!idea) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <Text style={{ color: '#8E8E8E' }}>Blueprint not found</Text>
      </View>
    );
  }

  const progress = savedIdea?.progress_percentage ?? 0;
  const earningsUnlocked = savedIdea?.earnings_unlocked ?? false;
  const actionSteps = savedIdea?.action_steps || [];
  const isStarted = !!savedIdea;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />

      {/* Celebration overlay */}
      <CelebrationAnimation tier={celebrationTier} onDone={() => setCelebrationTier(null)} />

      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: theme.surfaceAlt }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.navActions}>
          {idea.affiliate_link ? (
            <TouchableOpacity style={[styles.navBtn, { backgroundColor: theme.surfaceAlt }]} onPress={() => Linking.openURL(idea.affiliate_link)}>
              <Ionicons name="open-outline" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: theme.surfaceAlt }]} onPress={handleSaveToggle}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isSaved ? '#00D95F' : theme.textMuted}
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
            <Text style={[styles.matchBannerSub, { color: theme.textSub }]}>based on your profile</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.guestMatchBanner} onPress={() => router.push('/onboarding/auth')}>
            <Ionicons name="lock-closed" size={16} color="#8E8E8E" />
            <Text style={styles.guestMatchText}>Create account to see your Match Score</Text>
            <Ionicons name="chevron-forward" size={14} color="#00D95F" />
          </TouchableOpacity>
        )}

        <View style={styles.mainContent}>
          {/* Quick Win Hero Banner — shown for Quick Win category ideas */}
          {idea.category === 'Quick Wins' && (
            <View style={styles.quickWinHero}>
              <View style={styles.quickWinHeroLeft}>
                <View style={styles.quickWinBadge}>
                  <Ionicons name="flash" size={11} color="#000" />
                  <Text style={styles.quickWinBadgeText}>QUICK WIN</Text>
                </View>
                <Text style={styles.quickWinHeroTitle}>
                  {idea.time_to_first_dollar || 'Fast Cash'}
                </Text>
                <Text style={styles.quickWinHeroSub}>to your first dollar</Text>
              </View>
              <View style={styles.quickWinHeroRight}>
                {idea.affiliate_link ? (
                  <TouchableOpacity
                    style={styles.quickWinLaunchBtn}
                    onPress={() => {
                      Linking.openURL(idea.affiliate_link);
                      // Show Log Win sheet after delay
                      setTimeout(() => setShowLogWin(true), 3000);
                    }}
                  >
                    <Text style={styles.quickWinLaunchText}>Open Platform</Text>
                    <Ionicons name="open-outline" size={14} color="#000" />
                  </TouchableOpacity>
                ) : null}
                {isStarted && (
                  <TouchableOpacity
                    style={styles.logWinBtn}
                    onPress={() => setShowLogWin(true)}
                  >
                    <Ionicons name="trophy-outline" size={14} color="#00D95F" />
                    <Text style={styles.logWinBtnText}>Log a Win</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Category + Title */}
          <View style={styles.ideaHeader}>
            <View style={[styles.ideaIconShell, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <IdeaIcon ideaId={id as string} size={44} />
            </View>
            <View style={styles.ideaHeaderText}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{idea.category}</Text>
              </View>
              <Text style={[styles.ideaTitle, { color: theme.text }]}>{idea.title}</Text>
            </View>
          </View>
          <Text style={[styles.ideaDesc, { color: theme.textSub }]}>{idea.description}</Text>
          <BrandLogoStrip item={idea} theme={theme} />

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
          <View style={[styles.earningsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
            <Text style={[styles.stepsTitle, { color: theme.text }]}>
              {isStarted ? 'Your Action Plan' : 'Action Plan'}
            </Text>
            <Text style={[styles.stepsSubtitle, { color: theme.textSub }]}>
              {isStarted
                ? `${actionSteps.filter((s: any) => s.completed).length} of ${actionSteps.length} steps completed`
                : `${idea.action_steps?.length || 0} steps to launch`
              }
            </Text>

            {/* Interactive steps (started) */}
            {isStarted && actionSteps.map((step: any, idx: number) => (
              <View key={step.step_number}>
                <TouchableOpacity
                  style={[styles.stepRow, { backgroundColor: theme.surface, borderColor: theme.border }, step.completed && styles.stepRowCompleted]}
                  onPress={() => handleStepToggle(step.step_number, step.completed)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.stepCheckbox, step.completed && styles.stepCheckboxCompleted]}>
                    {step.completed && <Ionicons name="checkmark" size={14} color="#000" />}
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepNum, { color: theme.textMuted }]}>Step {step.step_number}</Text>
                    <Text style={[styles.stepText, { color: theme.text }, step.completed && styles.stepTextCompleted]}>
                      {step.text}
                    </Text>
                  </View>
                  {step.is_scary_step && !step.completed && (
                    <View style={styles.keyStepBadge}>
                      <Ionicons name="key" size={12} color="#F59E0B" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Action buttons row — below each step */}
                {!user?.is_guest && (
                  <View style={styles.stepActionRow}>
                    {/* Go Deeper (Sprint 8 — ALL steps, ALL users) */}
                    <TouchableOpacity
                      style={styles.goDeepBtn}
                      onPress={() => {
                        // Architect users go straight in; Free users see ad gate first
                        if (user?.is_architect) {
                          setTacticalStep({ number: step.step_number, text: step.text });
                          setShowTactical(true);
                        } else {
                          setPendingTacticalStep({ number: step.step_number, text: step.text });
                          setShowAdGate(true);
                        }
                      }}
                      data-testid={`go-deeper-btn-${step.step_number}`}
                    >
                      <Ionicons name="flash" size={12} color="#00D95F" />
                      <Text style={styles.goDeepBtnText}>Go Deeper ⚡</Text>
                    </TouchableOpacity>

                    {/* Stuck? (Architect-only troubleshoot) */}
                    {!step.completed && (
                      <TouchableOpacity
                        style={styles.stuckBtn}
                        onPress={() => {
                          if (user?.is_architect) {
                            setTroubleshootStep({ number: step.step_number, text: step.text });
                            setShowTroubleshoot(true);
                          } else {
                            setShowPaywall(true);
                          }
                        }}
                        data-testid={`stuck-btn-${step.step_number}`}
                      >
                        <Ionicons name="construct-outline" size={12} color="#F59E0B" />
                        <Text style={styles.stuckBtnText}>Stuck?</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}

            {/* Preview steps (not started) */}
            {!isStarted && idea.action_steps?.map((text: string, idx: number) => {
              const isLocked = user?.is_guest && idx >= 2;
              return (
                <View
                  key={idx}
                  style={[
                    styles.previewStep,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    isLocked && [styles.previewStepLocked, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }],
                  ]}
                >
                  <View style={[styles.previewStepNum, { backgroundColor: theme.surfaceAlt }]}>
                    <Text style={[styles.previewStepNumText, { color: theme.textMuted }]}>{idx + 1}</Text>
                  </View>
                  {isLocked ? (
                    <View style={styles.lockedStepContent}>
                      <Ionicons name="lock-closed" size={16} color={theme.textMuted} />
                      <Text style={[styles.lockedStepText, { color: theme.textMuted }]}>Unlock with free account</Text>
                    </View>
                  ) : (
                    <Text style={[styles.previewStepText, { color: theme.text }]}>{text}</Text>
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

          {/* Architect Feature Section */}
          {!user?.is_guest && isStarted && (
            <View style={[styles.architectSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.architectHeader}>
                <View style={styles.architectBadge}>
                  <Ionicons name="flash" size={13} color="#000" />
                  <Text style={styles.architectBadgeText}>ARCHITECT TOOLS</Text>
                </View>
              </View>
              {/* Rescue Mode CTA — shown when stuck >72h */}
              {isStuck && (
                <TouchableOpacity
                  style={[styles.architectCard, styles.rescueCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                  onPress={() => setShowRescueModal(true)}
                  data-testid="rescue-mode-btn"
                >
                  <View style={[styles.architectCardIcon, { backgroundColor: '#00D95F18' }]}>
                    <Ionicons name="flash" size={22} color="#00D95F" />
                  </View>
                  <View style={styles.architectCardText}>
                    <Text style={[styles.architectCardTitle, { color: theme.text }]}>Quick-Cash Rescue</Text>
                    <Text style={[styles.architectCardDesc, { color: theme.textSub }]}>3 tasks to earn $50-$200 in 48h</Text>
                  </View>
                  <View style={styles.rescuePulseBadge}>
                    <Text style={styles.rescuePulseText}>STUCK</Text>
                  </View>
                </TouchableOpacity>
              )}
              {/* Blueprint Guide CTA */}
              <TouchableOpacity
                style={[styles.architectCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                onPress={() => {
                  if (user?.is_architect) {
                    router.push({ pathname: '/blueprint-guide', params: { idea_id: id, idea_title: idea.title } });
                  } else {
                    setShowPaywall(true);
                  }
                }}
                data-testid="blueprint-guide-btn"
              >
                <View style={[styles.architectCardIcon, { backgroundColor: '#00D95F18' }]}>
                  <Ionicons name="chatbubble-ellipses" size={22} color="#00D95F" />
                </View>
                <View style={styles.architectCardText}>
                  <Text style={[styles.architectCardTitle, { color: theme.text }]}>Blueprint Guide</Text>
                  <Text style={[styles.architectCardDesc, { color: theme.textSub }]}>Ask your AI accountability coach anything</Text>
                </View>
                {user?.is_architect
                  ? <Ionicons name="arrow-forward" size={18} color="#00D95F" />
                  : <View style={styles.lockBadge}><Ionicons name="lock-closed" size={12} color="#4A4A4A" /></View>
                }
              </TouchableOpacity>
              {/* Troubleshooting Matrix CTA */}
              <TouchableOpacity
                  style={[styles.architectCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                  onPress={() => user?.is_architect ? null : setShowPaywall(true)}
                  data-testid="troubleshoot-matrix-btn"
                >
                  <View style={[styles.architectCardIcon, { backgroundColor: '#F59E0B18' }]}>
                    <Ionicons name="construct" size={22} color="#F59E0B" />
                  </View>
                  <View style={styles.architectCardText}>
                    <Text style={[styles.architectCardTitle, { color: theme.text }]}>Troubleshooting Matrix</Text>
                    <Text style={[styles.architectCardDesc, { color: theme.textSub }]}>Tap "Stuck?" on any step above to generate workarounds</Text>
                </View>
                {user?.is_architect
                  ? <Ionicons name="checkmark-circle" size={18} color="#00D95F" />
                  : <View style={styles.lockBadge}><Ionicons name="lock-closed" size={12} color="#4A4A4A" /></View>
                }
              </TouchableOpacity>
              {!user?.is_architect && (
                <TouchableOpacity
                  style={styles.upgradePrompt}
                  onPress={() => router.push('/architect-upgrade')}
                  data-testid="upgrade-to-architect-btn"
                >
                  <Text style={styles.upgradePromptText}>Unlock Architect Tier — $14.99/mo</Text>
                  <Ionicons name="arrow-forward" size={14} color="#000" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sprint 2 Modals */}
      <ArchitectPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Architect Tools"
      />
      {troubleshootStep && (
        <TroubleshootModal
          visible={showTroubleshoot}
          onClose={() => { setShowTroubleshoot(false); setTroubleshootStep(null); }}
          userId={user?.id || ''}
          ideaId={id as string}
          ideaTitle={idea.title}
          stepNumber={troubleshootStep.number}
          stepText={troubleshootStep.text}
        />
      )}

      {/* Sprint 8: Tactical AI Panel */}
      {tacticalStep && (
        <TacticalAIPanel
          visible={showTactical}
          onClose={() => { setShowTactical(false); setTacticalStep(null); }}
          userId={user?.id || ''}
          ideaId={id as string}
          ideaTitle={idea?.title || ''}
          stepText={tacticalStep.text}
          stepNumber={tacticalStep.number}
          city={user?.profile?.city || ''}
          state={user?.profile?.state || ''}
          country={user?.profile?.country || ''}
        />
      )}

      {/* Sprint 9: Rewarded Ad Gate — for free users to unlock Go Deeper */}
      {pendingTacticalStep && (
        <RewardedAdGate
          visible={showAdGate}
          onClose={() => { setShowAdGate(false); setPendingTacticalStep(null); }}
          onUnlocked={() => {
            setShowAdGate(false);
            setTacticalStep(pendingTacticalStep);
            setShowTactical(true);
            setPendingTacticalStep(null);
          }}
          userId={user?.id || ''}
          featureId={`go-deeper-${id}-step-${pendingTacticalStep.number}`}
          featureName="Go Deeper"
        />
      )}
      <LogWinSheet
        visible={showLogWin}
        onClose={() => setShowLogWin(false)}
        onWinLogged={(amount, arc) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        userId={user?.id || ''}
        ideaId={id as string}
        platformName={idea?.title || ''}
      />

      {/* Sprint 6: Victory Lap Modal */}
      <VictoryLapModal
        visible={showVictoryLap}
        onClose={() => setShowVictoryLap(false)}
        userId={user?.id || ''}
        ideaId={id as string}
        ideaTitle={idea?.title || ''}
        completionDays={completionDays}
        victoryData={victoryData}
        city={user?.profile?.city || ''}
      />

      {/* Sprint 5: Rescue Mode Modal */}
      <RescueModeModal
        visible={showRescueModal}
        onClose={() => setShowRescueModal(false)}
        userId={user?.id || ''}
        ideaId={id as string}
        isArchitect={user?.is_architect || false}
        onUpgrade={() => router.push('/architect-upgrade')}
      />

      {/* Bottom CTA */}
      {!isStarted && (
        <View style={[styles.ctaContainer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
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
        <View style={[styles.ctaContainer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
          <View style={styles.progressCta}>
            <Ionicons name="checkmark-circle" size={20} color="#00D95F" />
            <Text style={styles.progressCtaText}>
              Blueprint Active — {progress}% complete
            </Text>
          </View>
        </View>
      )}

      {isStarted && progress === 100 && (
        <View style={[styles.ctaContainer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
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
  ideaHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 12 },
  ideaIconShell: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ideaHeaderText: { flex: 1 },
  categoryBadge: { backgroundColor: '#00D95F12', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6 },
  categoryText: { fontSize: 12, color: '#00D95F', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  ideaTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', lineHeight: 30 },
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
  stuckBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginLeft: 8, marginTop: 2, marginBottom: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#F59E0B08', borderRadius: 8,
    borderWidth: 1, borderColor: '#F59E0B25', alignSelf: 'flex-start',
  },
  stuckBtnText: { fontSize: 11, color: '#F59E0B', fontWeight: '600' },
  // Sprint 8: Go Deeper button
  stepActionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginLeft: 46, marginTop: 2, marginBottom: 8,
  },
  goDeepBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#00D95F08', borderRadius: 8,
    borderWidth: 1, borderColor: '#00D95F30', alignSelf: 'flex-start',
  },
  goDeepBtnText: { fontSize: 11, color: '#00D95F', fontWeight: '700' },
  // Sprint 8: Quick Win hero
  quickWinHero: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#00D95F0A', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#00D95F30',
  },
  quickWinHeroLeft: { flex: 1 },
  quickWinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#00D95F', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6,
  },
  quickWinBadgeText: { fontSize: 9, fontWeight: '800', color: '#000', letterSpacing: 1 },
  quickWinHeroTitle: { fontSize: 20, fontWeight: '800', color: '#00D95F' },
  quickWinHeroSub: { fontSize: 12, color: '#4A4A4A', marginTop: 2 },
  quickWinHeroRight: { gap: 8, alignItems: 'flex-end' },
  quickWinLaunchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00D95F', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  quickWinLaunchText: { fontSize: 13, fontWeight: '700', color: '#000' },
  logWinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00D95F10', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#00D95F30',
  },
  logWinBtnText: { fontSize: 12, fontWeight: '600', color: '#00D95F' },
  architectSection: { marginBottom: 20, backgroundColor: '#0D0E14', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2A2C35' },
  architectHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  architectBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00D95F', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  architectBadgeText: { fontSize: 10, fontWeight: '800', color: '#000', letterSpacing: 1 },
  architectCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#2A2C35',
  },
  architectCardIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  architectCardText: { flex: 1 },
  architectCardTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  architectCardDesc: { fontSize: 12, color: '#4A4A4A' },
  // Sprint 5: Rescue Card styles
  rescueCard: {
    borderWidth: 1, borderColor: '#00D95F40',
    backgroundColor: '#00D95F06',
  },
  rescuePulseBadge: {
    backgroundColor: '#00D95F', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  rescuePulseText: { fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 0.8 },
  lockBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#1A1C23', borderWidth: 1, borderColor: '#2A2C35', justifyContent: 'center', alignItems: 'center' },
  upgradePrompt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00D95F', borderRadius: 12, padding: 14, marginTop: 4,
  },
  upgradePromptText: { fontSize: 14, fontWeight: '700', color: '#000' },
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
