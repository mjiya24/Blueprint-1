import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator,
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
  const [weeklyBlueprint, setWeeklyBlueprint] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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
        if (u.is_guest) {
          const res = await axios.get(`${API_URL}/api/ideas`, { params: { limit: 60 }, timeout: 12000 });
          const allIdeas = res.data.ideas || [];
          setIdeas(allIdeas.slice(0, 6));
          setWeeklyBlueprint(pickWeeklyBlueprint(allIdeas, 'guest'));
        } else {
          const ideasRes = await axios.get(`${API_URL}/api/ideas/personalized/${u.id}`, { timeout: 12000 });
          const personalized = ideasRes.data || [];
          setIdeas(personalized.slice(0, 6));
          setWeeklyBlueprint(pickWeeklyBlueprint(personalized, u.id || 'user'));

          // Do not block initial paint on streak check-in.
          axios.post(`${API_URL}/api/users/${u.id}/streak/checkin`, undefined, { timeout: 8000 })
            .then((streakRes) => setStreak(streakRes.data?.streak_current || 0))
            .catch(() => setStreak(0));
        }
      }
    } catch (e) {
      setIdeas([]);
      setWeeklyBlueprint(null);
      if (__DEV__) {
        console.log('Home data unavailable, showing fallback UI.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const firstName = user?.name?.split(' ')[0] || (user?.is_guest ? 'Explorer' : 'there');

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

        {/* Blueprint of the Week */}
        {weeklyBlueprint && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Blueprint of the Week</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/discover')}>
                <Text style={[styles.seeAll, { color: theme.accent }]}>Browse</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.weeklyCard, { backgroundColor: theme.surface, borderColor: theme.accent + '40' }, elevatedCard]}
              onPress={() => router.push({ pathname: '/idea-detail', params: { id: weeklyBlueprint.id } })}
              activeOpacity={0.78}
            >
              <View style={styles.weeklyTop}>
                <View style={styles.weeklyBadge}>
                  <Text style={styles.weeklyBadgeText}>WEEKLY PICK</Text>
                </View>
                <Text style={[styles.weeklyEarnings, { color: theme.accent }]}>{weeklyBlueprint.potential_earnings}</Text>
              </View>
              <Text style={[styles.weeklyTitle, { color: theme.text }]}>{weeklyBlueprint.title}</Text>
              <Text style={[styles.weeklyDesc, { color: theme.textSub }]} numberOfLines={2}>{weeklyBlueprint.description}</Text>
              <BrandLogoStrip item={weeklyBlueprint} theme={theme} />
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
  seeAll: { fontSize: 13, color: '#00D95F', fontWeight: '600' },
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
