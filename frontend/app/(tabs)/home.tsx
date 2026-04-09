import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, TextInput, Alert, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { StreakBadge } from '../../components/StreakBadge';
import { DailyBlueprintWidget } from '../../components/DailyBlueprintWidget';
import { LocalMarketPulseWidget } from '../../components/LocalMarketPulseWidget';
import { QuickWinsBanner } from '../../components/QuickWinsBanner';
import { BrandLogoStrip } from '../../components/BrandLogoStrip';
import { useTheme } from '../../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

type TrackerAction = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'completed';
  potential_revenue?: number;
  created_at?: string;
  completed_at?: string | null;
};

const sortTrackerActions = (items: TrackerAction[]) => {
  return [...items].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === 'pending' ? -1 : 1;
    }

    const leftTime = new Date(left.created_at || 0).getTime();
    const rightTime = new Date(right.created_at || 0).getTime();
    return rightTime - leftTime;
  });
};

const getMatchColor = (score: number) => {
  if (score >= 75) return '#00D95F';
  if (score >= 50) return '#F59E0B';
  return '#FF6B6B';
};

const getDifficultyColor = (d: string) => {
  if (d === 'beginner') return '#00D95F';
  if (d === 'intermediate') return '#F59E0B';
  return '#FF6B6B';
};

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const elevatedCard = theme.isDark ? null : {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  };
  const [user, setUser] = useState<any>(null);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [trackerActions, setTrackerActions] = useState<TrackerAction[]>([]);
  const [revenueGoal, setRevenueGoal] = useState(0);
  const [goalDraft, setGoalDraft] = useState('0');
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionRevenue, setNewActionRevenue] = useState('');
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isTrackerExpanded, setIsTrackerExpanded] = useState(false);
  const [dailyChallengeStreak, setDailyChallengeStreak] = useState(0);
  const [weeklyBlueprint, setWeeklyBlueprint] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const challengeRingPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadData(); }, []);

  const pickWeeklyBlueprint = (pool: any[], seed: string = 'guest') => {
    if (!pool || pool.length === 0) return null;
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.floor((now.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const seedValue = seed.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    const idx = (weekNumber + seedValue) % pool.length;
    return pool[idx];
  };

  const loadData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const u = JSON.parse(userData);
        setUser(u);

        const streakKey = `daily_challenge_streak_${u.id || 'guest'}`;
        const streakRaw = await AsyncStorage.getItem(streakKey);
        const streakData = streakRaw ? JSON.parse(streakRaw) : null;
        setDailyChallengeStreak(Number(streakData?.count || 0));

        // Use a timeout so the app doesn't hang forever
        const config = { timeout: 8000 };

        if (u.is_guest) {
          const res = await axios.get(`${API_URL}/api/ideas`, config);
          const allIdeas = res.data.ideas || [];
          setIdeas(allIdeas.slice(0, 6));
          setWeeklyBlueprint(pickWeeklyBlueprint(allIdeas, new Date().toDateString()));
          setTrackerActions([]);
          setRevenueGoal(0);
          setGoalDraft('0');
        } else {
          // Wrap in try/catch so one failure doesn't kill the whole screen
          try {
            const [ideasRes, actionsRes, goalRes, streakRes] = await Promise.all([
              axios.get(`${API_URL}/api/ideas/personalized/${u.id}`, config),
              axios.get(`${API_URL}/api/actions/${u.id}`, config).catch(() => ({ data: [] })),
              axios.get(`${API_URL}/api/actions/${u.id}/goal`, config).catch(() => ({ data: { daily_revenue_goal: 0 } })),
              axios.post(`${API_URL}/api/users/${u.id}/streak/checkin`).catch(() => ({ data: { streak_current: 0 } })),
            ]);
            const personalizedIdeas = ideasRes.data.ideas || ideasRes.data || [];
            let feedIdeas = Array.isArray(personalizedIdeas) ? personalizedIdeas : [];
            if (feedIdeas.length === 0) {
              const fallbackIdeasRes = await axios.get(`${API_URL}/api/ideas`, config).catch(() => ({ data: { ideas: [] } }));
              feedIdeas = fallbackIdeasRes.data?.ideas || [];
            }

            setIdeas(feedIdeas.slice(0, 6));
            setWeeklyBlueprint(pickWeeklyBlueprint(feedIdeas, u.id));
            setTrackerActions(sortTrackerActions(actionsRes.data || []));
            const goalValue = Number(goalRes.data?.daily_revenue_goal || 0);
            setRevenueGoal(goalValue);
            setGoalDraft(String(goalValue));
            setStreak(streakRes.data?.streak_current || 0);
          } catch (e) {
            console.log('Non-blocking error: Personalized ideas failed');
            const fallbackIdeasRes = await axios.get(`${API_URL}/api/ideas`, config).catch(() => ({ data: { ideas: [] } }));
            const fallbackIdeas = fallbackIdeasRes.data?.ideas || [];
            setIdeas(fallbackIdeas.slice(0, 6));
            setWeeklyBlueprint(pickWeeklyBlueprint(fallbackIdeas, u.id));
          }
        }
      }
    } catch (error) {
      // This is the "Armor" - we log it to the console, not a red screen
      console.log('Silent Error: Home data failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const incrementDailyChallengeStreak = async () => {
    if (!user?.id) return;

    const streakKey = `daily_challenge_streak_${user.id}`;
    const today = new Date();
    const todayStamp = today.toISOString().slice(0, 10);

    try {
      const streakRaw = await AsyncStorage.getItem(streakKey);
      const streakData = streakRaw ? JSON.parse(streakRaw) : null;
      const lastStamp: string | null = streakData?.last_completed_date || null;
      const prevCount: number = Number(streakData?.count || 0);

      if (lastStamp === todayStamp) {
        return;
      }

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStamp = yesterday.toISOString().slice(0, 10);
      const nextCount = lastStamp === yesterdayStamp ? prevCount + 1 : 1;

      await AsyncStorage.setItem(streakKey, JSON.stringify({
        count: nextCount,
        last_completed_date: todayStamp,
      }));
      setDailyChallengeStreak(nextCount);
    } catch (error) {
      console.log('Silent Error: Daily streak update failed');
    }
  };

  const handleAddAction = async () => {
    const title = newActionTitle.trim();
    if (!user?.id || !title) {
      Alert.alert('Add a task', 'Enter a task title first.');
      return;
    }

    setIsAddingAction(true);
    try {
      const potentialRevenue = Math.max(0, Number.parseFloat(newActionRevenue || '0') || 0);
      const response = await axios.post(`${API_URL}/api/actions`, {
        user_id: user.id,
        title,
        potential_revenue: potentialRevenue,
      });
      setTrackerActions(prev => sortTrackerActions([response.data, ...prev]));
      setNewActionTitle('');
      setNewActionRevenue('');
    } catch (error) {
      console.log('Silent Error: Action add failed');
      Alert.alert('Task not saved', 'Try again in a moment.');
    } finally {
      setIsAddingAction(false);
    }
  };

  const handleToggleAction = async (action: TrackerAction) => {
    const nextStatus = action.status === 'completed' ? 'pending' : 'completed';
    const isDailyChallengeTask = action.id === nextPendingAction?.id;

    try {
      const response = await axios.patch(`${API_URL}/api/actions/item/${action.id}`, {
        status: nextStatus,
      });
      setTrackerActions(prev => sortTrackerActions(prev.map(item => (
        item.id === action.id ? response.data : item
      ))));
      if (nextStatus === 'completed' && isDailyChallengeTask) {
        await incrementDailyChallengeStreak();
      }
    } catch (error) {
      console.log('Silent Error: Action toggle failed');
      Alert.alert('Update failed', 'Could not update that task.');
    }
  };

  const handleSaveGoal = async () => {
    if (!user?.id) return;

    setIsSavingGoal(true);
    try {
      const response = await axios.put(`${API_URL}/api/actions/${user.id}/goal`, {
        daily_revenue_goal: Math.max(0, Number.parseFloat(goalDraft || '0') || 0),
      });
      const goalValue = Number(response.data?.daily_revenue_goal || 0);
      setRevenueGoal(goalValue);
      setGoalDraft(String(goalValue));
    } catch (error) {
      console.log('Silent Error: Goal save failed');
      Alert.alert('Goal not saved', 'Could not save your goal right now.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || (user?.is_guest ? 'Explorer' : 'there');
  const completedActionCount = trackerActions.filter((action) => action.status === 'completed').length;
  const completedRevenue = trackerActions
    .filter((action) => action.status === 'completed')
    .reduce((sum, action) => sum + Number(action.potential_revenue || 0), 0);
  const pendingRevenue = trackerActions
    .filter((action) => action.status === 'pending')
    .reduce((sum, action) => sum + Number(action.potential_revenue || 0), 0);
  const nextPendingAction = trackerActions.find((action) => action.status === 'pending');
  const dailyChallengeTitle = nextPendingAction?.title || ideas[0]?.title || 'Explore your top match today';
  const dailyChallengeHint = user?.is_guest
    ? 'Unlock your personalized daily challenge by creating a free account.'
    : nextPendingAction
      ? `Potential: $${Number(nextPendingAction.potential_revenue || 0).toFixed(0)} · Tap Track My Progress to manage tasks.`
      : 'Start with one small step from your best match to build momentum.';
  const trackerSurface = theme.isDark ? '#0E1A34' : '#F7FAFF';
  const trackerBorder = theme.isDark ? '#1F3761' : '#C7D6EA';
  const trackerInnerSurface = theme.isDark ? '#0A1731' : '#FFFFFF';
  const trackerMuted = theme.isDark ? '#8EA6C9' : '#5F7698';
  const trackerCardText = theme.isDark ? '#F4F8FF' : '#1A2E4A';
  const trackerShadow = theme.isDark ? null : {
    shadowColor: '#0B1B34',
    shadowOpacity: 0.035,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
  const challengeCompletionPercent = trackerActions.length > 0
    ? Math.round((completedActionCount / trackerActions.length) * 100)
    : 0;
  const pulseScale = challengeRingPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.45],
  });
  const pulseOpacity = challengeRingPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;

    if (challengeCompletionPercent >= 100) {
      challengeRingPulse.setValue(0);
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(challengeRingPulse, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(challengeRingPulse, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
    } else {
      challengeRingPulse.stopAnimation();
      challengeRingPulse.setValue(0);
    }

    return () => {
      if (pulseLoop) {
        pulseLoop.stop();
      }
      challengeRingPulse.stopAnimation();
    };
  }, [challengeCompletionPercent, challengeRingPulse]);

  const weeklyCandidate = weeklyBlueprint || pickWeeklyBlueprint(ideas, user?.id || 'guest');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#00D95F" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D95F" />}
      >
        {React.Children.toArray(
          <>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.bg }]}>
          <View>
            <View style={styles.logoRow}>
              <Ionicons name="grid" size={18} color="#00D95F" />
              <Text style={styles.appTag}>Blueprint</Text>
            </View>
            <Text style={[styles.greeting, { color: theme.text }]}>Hey, {firstName} 👋</Text>
            <Text style={[styles.headerSub, { color: theme.textMuted }]}>
              {user?.is_guest ? 'Preview mode — create an account for matches' : "Here's your personalized income roadmap."}
            </Text>
          </View>
          <TouchableOpacity style={[styles.notifBtn, { backgroundColor: theme.surfaceAlt }]} data-testid="notif-btn">
            {streak > 0 && !user?.is_guest
              ? <StreakBadge streak={streak} isToday={true} />
              : <Ionicons name="notifications-outline" size={22} color={theme.textMuted} />
            }
          </TouchableOpacity>
        </View>

        {/* Guest upgrade banner */}
        {user?.is_guest && (
          <TouchableOpacity style={[styles.upgradeBanner, { backgroundColor: theme.accentLight, borderColor: theme.accent + '40' }]} onPress={() => router.push('/onboarding/auth')}>
            <Ionicons name="lock-open" size={18} color="#00D95F" />
            <Text style={styles.upgradeText}>Unlock match scores — Create free account</Text>
            <Ionicons name="chevron-forward" size={16} color="#00D95F" />
          </TouchableOpacity>
        )}

        {/* Architect upgrade banner (logged in, not architect) */}
        {!user?.is_guest && !user?.is_architect && (
          <TouchableOpacity
            style={[styles.architectBanner, { backgroundColor: theme.surface, borderColor: theme.accent + '40' }]}
            onPress={() => router.push('/architect-upgrade')}
            data-testid="architect-banner"
          >
            <View style={styles.architectBannerLeft}>
              <View style={styles.architectBannerBadge}>
                <Ionicons name="flash" size={12} color="#000" />
              </View>
              <View>
                <Text style={[styles.architectBannerTitle, { color: theme.text }]}>Architect Tier Available</Text>
                <Text style={[styles.architectBannerSub, { color: theme.textSub }]}>AI coaching · Workarounds · $14.99/mo</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#00D95F" />
          </TouchableOpacity>
        )}

        {/* Daily Blueprint Widget (logged-in only) */}
        {user && !user.is_guest && (
          <DailyBlueprintWidget userId={user.id} profile={user.profile} />
        )}

        {/* Local Market Pulse Widget (if user has location) */}
        {user && !user.is_guest && user.profile?.city && (
          <LocalMarketPulseWidget
            userId={user.id}
            city={user.profile.city}
            countryCode={user.profile.country_code || 'US'}
          />
        )}

        {/* ========== QUICK WINS HERO BANNER (Sprint 8) ========== */}
        <QuickWinsBanner
          userState={user?.profile?.state || ''}
          userId={user?.id || ''}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily Challenge</Text>
          </View>

          <View style={[styles.dailyChallengeCard, { backgroundColor: theme.isDark ? '#0B1630' : '#F6FAFF', borderColor: theme.isDark ? '#1D355E' : '#C4D5EC' }, elevatedCard]}>
            <View style={[styles.dailyAccentOrb, { backgroundColor: theme.isDark ? '#27CFA047' : '#7FA8E92E' }]} />
            <View style={[styles.dailyAccentStripe, { backgroundColor: theme.isDark ? '#3CC89A5A' : '#8FB4EA66' }]} />
            <View style={styles.dailyChallengeTop}>
              <View style={[styles.dailyBadge, { backgroundColor: theme.isDark ? '#123F39' : '#D9F0E4' }]}>
                <Text style={[styles.dailyBadgeText, { color: theme.isDark ? '#1BF58A' : '#0BBE66' }]}>TODAY</Text>
              </View>
              <View style={styles.dailyChallengeTopRight}>
                {!user?.is_guest && (
                  <View style={[styles.dailyStreakPill, { backgroundColor: theme.isDark ? '#153451' : '#E8F0FC' }]}>
                    <Ionicons name="flame" size={12} color={theme.isDark ? '#FFAE3D' : '#F18A1E'} />
                    <Text style={[styles.dailyStreakText, { color: theme.isDark ? '#FFD18C' : '#A45C10' }]}>
                      {dailyChallengeStreak} Day Streak
                    </Text>
                  </View>
                )}
                  <View style={[styles.challengeRingOuter, { borderColor: theme.isDark ? '#315A8D' : '#BCD0E8', backgroundColor: theme.isDark ? '#0C203E' : '#EDF4FD' }]}>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.challengeRingPulse,
                        {
                          borderColor: theme.isDark ? '#69C8FF' : '#6FA7E8',
                          opacity: pulseOpacity,
                          transform: [{ scale: pulseScale }],
                        },
                      ]}
                    />
                  <View style={[styles.challengeRingInner, { backgroundColor: theme.isDark ? '#102A4A' : '#FFFFFF' }]}>
                    <Text style={[styles.challengeRingText, { color: theme.text }]}>{challengeCompletionPercent}%</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={[styles.dailyChallengeTitle, { color: theme.text }]}>{dailyChallengeTitle}</Text>
            <Text style={[styles.dailyChallengeHint, { color: theme.textSub }]}>{dailyChallengeHint}</Text>

            <View style={styles.dailyChallengeActions}>
              <TouchableOpacity
                style={[styles.dailyPrimaryButton, { backgroundColor: theme.isDark ? '#18E872' : '#06D865' }]}
                onPress={() => router.push('/(tabs)/discover')}
              >
                <Text style={styles.dailyPrimaryButtonText}>Explore Matches</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dailySecondaryButton, { borderColor: theme.isDark ? '#24416F' : '#C0D1E8', backgroundColor: theme.isDark ? '#0D1A33' : '#FFFFFF' }]}
                onPress={() => setIsTrackerExpanded((current) => !current)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.dailySecondaryButtonText, { color: theme.text }]}>Track My Progress</Text>
                <Ionicons name={isTrackerExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Blueprint of the Week */}
        {weeklyCandidate && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Blueprint of the Week</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/discover')}>
                <Text style={[styles.seeAll, { color: theme.accent }]}>Browse</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.weeklyCard, { backgroundColor: theme.surface, borderColor: theme.accent + '40' }, elevatedCard]}
              onPress={() => router.push({ pathname: '/idea-detail', params: { id: weeklyCandidate.id } })}
              activeOpacity={0.78}
            >
              <View style={styles.weeklyTop}>
                <View style={styles.weeklyBadge}>
                  <Text style={styles.weeklyBadgeText}>WEEKLY PICK</Text>
                </View>
                <Text style={[styles.weeklyEarnings, { color: theme.accent }]}>{weeklyCandidate.potential_earnings}</Text>
              </View>
              <Text style={[styles.weeklyTitle, { color: theme.text }]}>{weeklyCandidate.title}</Text>
              <Text style={[styles.weeklyDesc, { color: theme.textSub }]} numberOfLines={2}>{weeklyCandidate.description}</Text>
              <BrandLogoStrip item={weeklyCandidate} theme={theme} />
            </TouchableOpacity>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard]}> 
            <Text style={[styles.statNum, { color: theme.text }]}>{ideas.length}</Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>Matched Ideas</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard]}> 
            <Text style={[styles.statNum, { color: theme.text }]}>99+</Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>Blueprints</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard]}> 
            <Text style={[styles.statNum, { color: theme.text }]}>8</Text>
            <Text style={[styles.statLabel, { color: theme.text }]}>Categories</Text>
          </View>
        </View>

        {/* Ideas section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {user?.is_guest ? 'Top Ideas' : 'Your Top Matches'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/discover')}>
              <Text style={[styles.seeAll, { color: theme.accent }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {ideas.map((idea) => (
            <TouchableOpacity
              key={idea.id}
              style={[styles.ideaCard, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard]}
              onPress={() => router.push({ pathname: '/idea-detail', params: { id: idea.id } })}
              activeOpacity={0.75}
            >
              <View style={styles.ideaCardTop}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{idea.category}</Text>
                </View>
                {idea.match_score !== undefined && !user?.is_guest && (
                  <View style={[styles.matchBadge, { borderColor: getMatchColor(idea.match_score) + '40' }]}>
                    <View style={[styles.matchDot, { backgroundColor: getMatchColor(idea.match_score) }]} />
                    <Text style={[styles.matchText, { color: getMatchColor(idea.match_score) }]}>
                      {idea.match_score}% Match
                    </Text>
                  </View>
                )}
                {user?.is_guest && (
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed" size={11} color="#4A4A4A" />
                    <Text style={styles.lockedText}>Match</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.ideaTitle, { color: theme.text }]}>{idea.title}</Text>
              <Text style={[styles.ideaDesc, { color: theme.textSub }]} numberOfLines={2}>{idea.description}</Text>
              <BrandLogoStrip item={idea} theme={theme} />

              <View style={styles.ideaFooter}>
                <View style={styles.ideaMeta}>
                  <View style={[styles.pill, { backgroundColor: getDifficultyColor(idea.difficulty) + '18' }]}>
                    <Text style={[styles.pillText, { color: getDifficultyColor(idea.difficulty) }]}>{idea.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.earningsText}>{idea.potential_earnings}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard]} onPress={() => router.push('/(tabs)/discover')}>
              <Ionicons name="compass" size={28} color="#00D95F" />
              <Text style={[styles.actionLabel, { color: theme.text }]}>Discover</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard]} onPress={() => router.push('/(tabs)/saved')}>
              <Ionicons name="bookmark" size={28} color="#00D95F" />
              <Text style={[styles.actionLabel, { color: theme.text }]}>My Plans</Text>
            </TouchableOpacity>
            {user?.is_guest && (
              <TouchableOpacity style={[styles.actionCard, styles.actionCardMint]} onPress={() => router.push('/onboarding/auth')}>
                <Ionicons name="person-add" size={28} color="#00D95F" />
                <Text style={styles.actionLabel}>Sign Up</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Action Tracker</Text>
            {!user?.is_guest && (
              <Text style={[styles.trackerHeaderMeta, { color: theme.textSub }]}>
                {completedActionCount}/{trackerActions.length} done
              </Text>
            )}
          </View>

          {isTrackerExpanded ? (
            <View
              style={[
                styles.trackerCard,
                {
                  backgroundColor: trackerSurface,
                  borderColor: theme.isDark ? trackerBorder : 'transparent',
                  borderWidth: theme.isDark ? 1 : 0,
                },
                trackerShadow,
                elevatedCard,
              ]}
            >
              <View style={styles.trackerCardTopRow}>
                <Text style={[styles.trackerCardLabel, { color: trackerMuted }]}>MOMENTUM BOARD</Text>
                <TouchableOpacity
                  style={[styles.trackerMinimizeButton, { borderColor: theme.isDark ? trackerBorder : '#D3E0F1', backgroundColor: trackerInnerSurface }]}
                  onPress={() => setIsTrackerExpanded(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-up" size={14} color={theme.accent} />
                  <Text style={[styles.trackerMinimizeText, { color: trackerCardText }]}>Minimize</Text>
                </TouchableOpacity>
              </View>

              {user?.is_guest ? (
                <View style={styles.trackerGuestState}>
                  <Ionicons name="lock-closed" size={18} color="#00D95F" />
                  <Text style={[styles.trackerGuestTitle, { color: theme.text }]}>Create an account to track real work</Text>
                  <Text style={[styles.trackerGuestBody, { color: theme.textSub }]}>Save today tasks, set a revenue target, and check wins off as you go.</Text>
                  <TouchableOpacity style={styles.trackerGuestButton} onPress={() => router.push('/onboarding/auth')}>
                    <Text style={styles.trackerGuestButtonText}>Unlock Tracker</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.trackerMetricsRow}>
                    <View style={[styles.trackerMetricTile, { backgroundColor: trackerInnerSurface, borderColor: theme.isDark ? trackerBorder : 'transparent', borderWidth: theme.isDark ? 1 : 0 }, trackerShadow] }>
                      <Text style={[styles.trackerMetricLabel, { color: trackerMuted }]}>Daily Goal</Text>
                      <Text style={[styles.trackerMetricValue, { color: trackerCardText }]}>${revenueGoal.toFixed(0)}</Text>
                    </View>
                    <View style={[styles.trackerMetricTile, { backgroundColor: trackerInnerSurface, borderColor: theme.isDark ? trackerBorder : 'transparent', borderWidth: theme.isDark ? 1 : 0 }, trackerShadow] }>
                      <Text style={[styles.trackerMetricLabel, { color: trackerMuted }]}>Completed</Text>
                      <Text style={[styles.trackerMetricValue, { color: trackerCardText }]}>${completedRevenue.toFixed(0)}</Text>
                    </View>
                    <View style={[styles.trackerMetricTile, { backgroundColor: trackerInnerSurface, borderColor: theme.isDark ? trackerBorder : 'transparent', borderWidth: theme.isDark ? 1 : 0 }, trackerShadow] }>
                      <Text style={[styles.trackerMetricLabel, { color: trackerMuted }]}>Queued</Text>
                      <Text style={[styles.trackerMetricValue, { color: trackerCardText }]}>${pendingRevenue.toFixed(0)}</Text>
                    </View>
                  </View>

                  <View style={styles.goalEditorRow}>
                    <View style={[styles.goalInputShell, { backgroundColor: trackerInnerSurface, borderColor: theme.isDark ? trackerBorder : 'transparent', borderWidth: theme.isDark ? 1 : 0 }, trackerShadow]}>
                      <Text style={styles.goalCurrency}>$</Text>
                      <TextInput
                        value={goalDraft}
                        onChangeText={setGoalDraft}
                        placeholder="0"
                        placeholderTextColor={trackerMuted}
                        keyboardType="decimal-pad"
                        style={[styles.goalInput, { color: trackerCardText }]}
                      />
                    </View>
                    <TouchableOpacity style={styles.goalSaveButton} onPress={handleSaveGoal} disabled={isSavingGoal}>
                      {isSavingGoal ? <ActivityIndicator size="small" color="#06130B" /> : <Text style={styles.goalSaveButtonText}>Save Goal</Text>}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.addActionRow}>
                    <TextInput
                      value={newActionTitle}
                      onChangeText={setNewActionTitle}
                      placeholder="Add the next money task"
                      placeholderTextColor={trackerMuted}
                      style={[styles.addActionInput, { backgroundColor: trackerInnerSurface, borderColor: theme.isDark ? trackerBorder : 'transparent', borderWidth: theme.isDark ? 1 : 0, color: trackerCardText }, trackerShadow]}
                    />
                    <View style={[styles.revenueInputShell, { backgroundColor: trackerInnerSurface, borderColor: theme.isDark ? trackerBorder : 'transparent', borderWidth: theme.isDark ? 1 : 0 }, trackerShadow]}>
                      <Text style={styles.goalCurrency}>$</Text>
                      <TextInput
                        value={newActionRevenue}
                        onChangeText={setNewActionRevenue}
                        placeholder="0"
                        placeholderTextColor={trackerMuted}
                        keyboardType="decimal-pad"
                        style={[styles.revenueInput, { color: trackerCardText }]}
                      />
                    </View>
                    <TouchableOpacity style={styles.addActionButton} onPress={handleAddAction} disabled={isAddingAction}>
                      {isAddingAction ? <ActivityIndicator size="small" color="#06130B" /> : <Ionicons name="add" size={18} color="#06130B" />}
                    </TouchableOpacity>
                  </View>

                  {trackerActions.length === 0 ? (
                    <View style={[styles.emptyTrackerState, { backgroundColor: trackerInnerSurface, borderColor: theme.isDark ? trackerBorder : 'transparent', borderWidth: theme.isDark ? 1 : 0 }, trackerShadow]}>
                      <Text style={[styles.emptyTrackerTitle, { color: theme.text }]}>No tasks yet</Text>
                      <Text style={[styles.emptyTrackerBody, { color: theme.textSub }]}>Start with one concrete task you can finish today.</Text>
                    </View>
                  ) : (
                    <View style={styles.trackerList}>
                      {trackerActions.slice(0, 6).map((action) => (
                        <TouchableOpacity
                          key={action.id}
                          style={[styles.trackerRow, { backgroundColor: trackerInnerSurface, borderColor: theme.isDark ? trackerBorder : 'transparent', borderWidth: theme.isDark ? 1 : 0 }, trackerShadow]}
                          onPress={() => handleToggleAction(action)}
                          activeOpacity={0.78}
                        >
                          <View style={[styles.checkCircle, action.status === 'completed' && styles.checkCircleDone]}>
                            {action.status === 'completed' && <Ionicons name="checkmark" size={14} color="#06130B" />}
                          </View>
                          <View style={styles.trackerRowContent}>
                            <Text style={[styles.trackerRowTitle, { color: theme.text }, action.status === 'completed' && styles.trackerRowTitleDone]}>
                              {action.title}
                            </Text>
                            <Text style={[styles.trackerRowMeta, { color: theme.textSub }]}>
                              {action.status === 'completed' ? 'Completed' : 'Tap to mark complete'}
                            </Text>
                          </View>
                          <View style={[styles.trackerRevenuePill, { backgroundColor: theme.isDark ? '#00D95F1F' : '#DCF8EA' }]}>
                            <Text style={styles.trackerRevenueText}>${Number(action.potential_revenue || 0).toFixed(0)}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.trackerCollapsedCard,
                {
                  backgroundColor: trackerSurface,
                  borderColor: theme.isDark ? trackerBorder : 'transparent',
                  borderWidth: theme.isDark ? 1 : 0,
                },
                trackerShadow,
                elevatedCard,
              ]}
              onPress={() => setIsTrackerExpanded(true)}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            >
              <View style={styles.trackerCollapsedLeft}>
                <Ionicons name="analytics" size={16} color="#00D95F" />
                <Text style={[styles.trackerCollapsedTitle, { color: theme.text }]}>Tap to open your full tracker</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={theme.textSub} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 24 }} />
          </>
        ).filter((child) => typeof child !== 'string')}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 60 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  appTag: { fontSize: 12, color: '#00D95F', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  greeting: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  headerSub: { fontSize: 14, color: '#8E8E8E' },
  notifBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center' },
  upgradeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 24, marginBottom: 16, padding: 14,
    backgroundColor: '#00D95F0A', borderRadius: 12, borderWidth: 1, borderColor: '#00D95F30',
  },
  upgradeText: { flex: 1, fontSize: 13, color: '#00D95F', fontWeight: '600' },
  architectBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 24, marginBottom: 16, padding: 14,
    backgroundColor: '#1A1C23', borderRadius: 12, borderWidth: 1, borderColor: '#00D95F30',
  },
  architectBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  architectBannerBadge: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#00D95F',
    justifyContent: 'center', alignItems: 'center',
  },
  architectBannerTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  architectBannerSub: { fontSize: 11, color: '#4A4A4A', marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: '#1A1C23', borderRadius: 12, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#8E8E8E', textAlign: 'center' },
  section: { paddingHorizontal: 24, marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  dailyChallengeCard: { borderRadius: 18, borderWidth: 1, padding: 16, overflow: 'hidden', position: 'relative' },
  dailyAccentOrb: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    right: -42,
    top: -58,
  },
  dailyAccentStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 5,
  },
  dailyChallengeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dailyBadge: { backgroundColor: '#00D95F1C', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dailyBadgeText: { color: '#00D95F', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  dailyProgressMeta: { fontSize: 12, fontWeight: '700' },
  dailyChallengeTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dailyStreakPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  dailyStreakText: { fontSize: 11, fontWeight: '800' },
  challengeRingOuter: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'visible' },
  challengeRingPulse: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  challengeRingInner: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  challengeRingText: { fontSize: 10, fontWeight: '800' },
  dailyChallengeTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', marginBottom: 6 },
  dailyChallengeHint: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  dailyChallengeActions: { flexDirection: 'row', gap: 10 },
  dailyPrimaryButton: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  dailyPrimaryButtonText: { color: '#06130B', fontSize: 13, fontWeight: '800' },
  dailySecondaryButton: { borderRadius: 12, borderWidth: 1, paddingVertical: 13, paddingHorizontal: 12, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dailySecondaryButtonText: { fontSize: 13, fontWeight: '700' },
  trackerHeaderMeta: { fontSize: 12, fontWeight: '700' },
  seeAll: { fontSize: 13, color: '#00D95F', fontWeight: '600' },
  trackerCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  trackerCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  trackerCardLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  trackerMinimizeButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  trackerMinimizeText: { fontSize: 12, fontWeight: '700' },
  trackerCollapsedCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackerCollapsedLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trackerCollapsedTitle: { fontSize: 13, fontWeight: '700' },
  trackerGuestState: { alignItems: 'flex-start' },
  trackerGuestTitle: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  trackerGuestBody: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  trackerGuestButton: { backgroundColor: '#00D95F', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  trackerGuestButtonText: { color: '#06130B', fontSize: 13, fontWeight: '800' },
  trackerMetricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  trackerMetricTile: { flex: 1, backgroundColor: '#0F172A', borderRadius: 14, padding: 12, borderWidth: 1 },
  trackerMetricLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  trackerMetricValue: { color: '#F8FAFC', fontSize: 22, fontWeight: '800' },
  goalEditorRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  goalInputShell: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#1E293B' },
  goalCurrency: { color: '#00D95F', fontSize: 16, fontWeight: '800', marginRight: 4 },
  goalInput: { flex: 1, color: '#F8FAFC', fontSize: 16, fontWeight: '700', paddingVertical: 12 },
  goalSaveButton: { backgroundColor: '#00D95F', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  goalSaveButtonText: { color: '#06130B', fontSize: 13, fontWeight: '800' },
  addActionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  addActionInput: { flex: 1, backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', color: '#F8FAFC', fontSize: 14, paddingHorizontal: 12, paddingVertical: 12 },
  revenueInputShell: { width: 86, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', paddingHorizontal: 10 },
  revenueInput: { flex: 1, color: '#F8FAFC', fontSize: 14, fontWeight: '700', paddingVertical: 12 },
  addActionButton: { width: 46, borderRadius: 12, backgroundColor: '#00D95F', alignItems: 'center', justifyContent: 'center' },
  emptyTrackerState: { borderRadius: 14, borderWidth: 1, borderColor: '#1E293B', backgroundColor: '#0B1220', padding: 14 },
  emptyTrackerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptyTrackerBody: { fontSize: 13, lineHeight: 18 },
  trackerList: { gap: 10 },
  trackerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B1220', borderRadius: 14, borderWidth: 1, borderColor: '#1E293B', padding: 12, gap: 12 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  checkCircleDone: { borderColor: '#00D95F', backgroundColor: '#00D95F' },
  trackerRowContent: { flex: 1 },
  trackerRowTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  trackerRowTitleDone: { textDecorationLine: 'line-through', opacity: 0.7 },
  trackerRowMeta: { fontSize: 12, fontWeight: '500' },
  trackerRevenuePill: { backgroundColor: '#00D95F14', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  trackerRevenueText: { color: '#00D95F', fontSize: 12, fontWeight: '800' },
  weeklyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  weeklyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weeklyBadge: { backgroundColor: '#00D95F22', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  weeklyBadgeText: { color: '#00D95F', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  weeklyEarnings: { fontSize: 14, fontWeight: '800' },
  weeklyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  weeklyDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  ideaCard: { backgroundColor: '#111827', borderRadius: 18, padding: 18, marginBottom: 10, borderWidth: 1, borderColor: '#1F2A44' },
  ideaCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryBadge: { backgroundColor: '#00D95F12', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 11, color: '#00D95F', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1A1C23', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  matchDot: { width: 7, height: 7, borderRadius: 4 },
  matchText: { fontSize: 12, fontWeight: '700' },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A1C23', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#2A2C35' },
  lockedText: { fontSize: 11, color: '#4A4A4A', fontWeight: '600' },
  ideaTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  ideaDesc: { fontSize: 13, color: '#8E8E8E', lineHeight: 18, marginBottom: 12 },
  ideaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ideaMeta: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  earningsText: { fontSize: 18, fontWeight: '800', color: '#00D95F', textShadowColor: 'rgba(0, 217, 95, 0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, backgroundColor: '#1A1C23', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#2A2C35' },
  actionCardMint: { borderColor: '#00D95F30', backgroundColor: '#00D95F08' },
  actionLabel: { fontSize: 13, color: '#FFFFFF', fontWeight: '600', marginTop: 8 },
});
