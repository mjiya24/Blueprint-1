import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { BrandLogoStrip } from './BrandLogoStrip';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

// Speed-to-first-dollar sort order (lower = faster = shown first)
const SPEED_ORDER: Record<string, number> = {
  'Same day': 0,
  'Instant': 0,
  'Same-day': 0,
  '24-48 hours': 1,
  '1-3 days': 2,
  '3-7 days': 3,
  '4-8 weeks': 4,
};

// Speed chip config — shown on every card
const SPEED_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  'Same day':    { label: 'TODAY',     color: '#00D95F', icon: 'flash' },
  'Instant':     { label: 'INSTANT',   color: '#00D95F', icon: 'flash' },
  'Same-day':    { label: 'TODAY',     color: '#00D95F', icon: 'flash' },
  '24-48 hours': { label: '24-48 HRS', color: '#F59E0B', icon: 'time-outline' },
  '1-3 days':    { label: '1-3 DAYS',  color: '#60A5FA', icon: 'calendar-outline' },
  '3-7 days':    { label: '3-7 DAYS',  color: '#A78BFA', icon: 'calendar-outline' },
  '4-8 weeks':   { label: 'WEEKS',     color: '#9CA3AF', icon: 'calendar-outline' },
};

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'VERIFIED':        { bg: '#00D95F18', text: '#00D95F' },
  'TOP RATED':       { bg: '#6366F118', text: '#818CF8' },
  'POPULAR':         { bg: '#3B82F618', text: '#60A5FA' },
  'QUICK $100':      { bg: '#F59E0B18', text: '#F59E0B' },
  'SAME-DAY PAY':    { bg: '#10B98118', text: '#34D399' },
  'STATE GATED':     { bg: '#F9731618', text: '#FB923C' },
  '100% RISK-FREE':  { bg: '#00D95F18', text: '#00D95F' },
  'SKILL-BASED':     { bg: '#8B5CF618', text: '#A78BFA' },
  'RECURRING INCOME':{ bg: '#10B98118', text: '#34D399' },
  'DEFAULT':         { bg: '#2A2C3520', text: '#8E8E8E' },
};

const PLATFORM_ICONS: Record<string, { icon: string; color: string }> = {
  'qw-001': { icon: 'hardware-chip-outline', color: '#6366F1' },   // DataAnnotation – AI
  'qw-002': { icon: 'people-outline',        color: '#3B82F6' },   // UserInterviews
  'qw-003': { icon: 'game-controller-outline',color: '#00D95F' }, // Freecash
  'qw-004': { icon: 'phone-portrait-outline', color: '#7C3AED' }, // Mistplay
  'qw-005': { icon: 'card-outline',           color: '#2563EB' }, // Solitaire Cash
  'qw-006': { icon: 'bicycle-outline',        color: '#F97316' }, // DoorDash/UberEats
  'qw-007': { icon: 'paw-outline',            color: '#10B981' }, // Rover
  'qw-008': { icon: 'heart-circle-outline',   color: '#EF4444' }, // BioLife
  'qw-009': { icon: 'football-outline',       color: '#F59E0B' }, // FanDuel
  'qw-010': { icon: 'wallet-outline',         color: '#06B6D4' }, // Bank bonuses
  'qw-011': { icon: 'bar-chart-outline',      color: '#EC4899' }, // Survey Junkie
};

interface QuickWin {
  id: string;
  title: string;
  potential_earnings: string;
  affiliate_link: string;
  badge?: string;
  time_to_first_dollar?: string;
  description: string;
}

interface Props {
  userState?: string;
  userId?: string;
  onPressCard?: (idea: QuickWin) => void;
}

export function QuickWinsBanner({ userState = '', userId = '', onPressCard }: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const [wins, setWins] = useState<QuickWin[]>([]);
  const [loading, setLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadWins();
    // Pulsing badge animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.07, duration: 850, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 850, useNativeDriver: true }),
      ])
    ).start();
    // Subtle glow on the earnings stat
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadWins = async () => {
    try {
      const params: any = {};
      if (userState) params.user_state = userState;
      if (userId) params.user_id = userId;
      const res = await axios.get(`${API_URL}/api/quick-wins`, { params });
      // Sort by speed-to-first-dollar so fastest payouts appear first
      const sorted = (res.data || []).sort((a: QuickWin, b: QuickWin) => {
        const aScore = SPEED_ORDER[a.time_to_first_dollar || ''] ?? 99;
        const bScore = SPEED_ORDER[b.time_to_first_dollar || ''] ?? 99;
        return aScore - bScore;
      });
      setWins(sorted);
    } catch (e) {
      console.error('QuickWins load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = (win: QuickWin) => {
    if (onPressCard) {
      onPressCard(win);
    } else {
      router.push({ pathname: '/idea-detail', params: { id: win.id } });
    }
  };

  const platformConfig = (id: string) => PLATFORM_ICONS[id] || { icon: 'flash', color: '#00D95F' };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#00D95F" size="small" />
      </View>
    );
  }

  if (!wins.length) return null;

  const todayCount = wins.filter(w => (SPEED_ORDER[w.time_to_first_dollar || ''] ?? 99) === 0).length;

  return (
    <View style={styles.container}>
      {/* ── Hero Header ── */}
      <View style={styles.heroHeader}>
        <View style={styles.heroLeft}>
          {/* Animated quick-wins badge */}
          <Animated.View style={[styles.heroBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="flash" size={11} color="#000" />
            <Text style={styles.heroBadgeText}>QUICK WINS</Text>
          </Animated.View>

          <Text style={[styles.heroTitle, { color: theme.text }]}>
            Make Your First{'\n'}$50 Today
          </Text>
          <View style={styles.heroMeta}>
            <View style={styles.metaPill}>
              <Ionicons name="shield-checkmark" size={10} color="#00D95F" />
              <Text style={styles.metaPillText}>Verified</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="flash" size={10} color="#F59E0B" />
              <Text style={styles.metaPillText}>{todayCount} pay today</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="lock-closed" size={10} color="#60A5FA" />
              <Text style={styles.metaPillText}>$0 to start</Text>
            </View>
          </View>
        </View>

        {/* Paths counter */}
        <View style={styles.heroStatWrap}>
          <Animated.View
            style={[
              styles.heroStat,
              {
                borderColor: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#00D95F25', '#00D95F70'],
                }),
              },
            ]}
          >
            <Text style={styles.heroStatNum}>{wins.length}</Text>
            <Text style={[styles.heroStatLabel, { color: theme.textMuted }]}>Paths</Text>
          </Animated.View>
        </View>
      </View>

      {/* ── Scrollable cards ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={182}
        snapToAlignment="start"
      >
        {wins.map((win, idx) => {
          const config = platformConfig(win.id);
          const badgeStyle = BADGE_COLORS[win.badge || 'DEFAULT'] || BADGE_COLORS['DEFAULT'];
          const isStateGated = win.badge === 'STATE GATED';
          const speedCfg = SPEED_CONFIG[win.time_to_first_dollar || ''] || {
            label: win.time_to_first_dollar || '',
            color: '#8E8E8E',
            icon: 'time-outline',
          };
          // First card gets a green accent to make it pop
          const isHero = idx === 0;

          return (
            <TouchableOpacity
              key={win.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: isHero ? '#00D95F40' : theme.border,
                  borderTopColor: config.color,
                  borderTopWidth: 2,
                },
              ]}
              onPress={() => handleCardPress(win)}
              activeOpacity={0.82}
            >
              {/* Top row: icon + speed chip */}
              <View style={styles.cardTopRow}>
                <View style={[styles.cardIcon, { backgroundColor: config.color + '1A' }]}>
                  <Ionicons name={config.icon as any} size={22} color={config.color} />
                </View>
                <View style={[styles.speedChip, { backgroundColor: speedCfg.color + '1A' }]}>
                  <Ionicons name={speedCfg.icon as any} size={9} color={speedCfg.color} />
                  <Text style={[styles.speedChipText, { color: speedCfg.color }]}>{speedCfg.label}</Text>
                </View>
              </View>

              {/* Platform badge */}
              {win.badge && (
                <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
                  {isStateGated && <Ionicons name="shield-checkmark" size={8} color={badgeStyle.text} />}
                  <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{win.badge}</Text>
                </View>
              )}

              {/* Title */}
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                {win.title}
              </Text>

              {/* Earnings — hero number */}
              <Text style={styles.cardEarnings}>{win.potential_earnings}</Text>

              {/* Spacer + brand badge */}
              <View style={styles.cardFooter}>
                <BrandLogoStrip item={win} theme={theme} />

                {/* CTA */}
                <TouchableOpacity
                  style={[styles.ctaButton, isHero && styles.ctaButtonHero]}
                  onPress={() => handleCardPress(win)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ctaText}>Start Now</Text>
                  <Ionicons name="arrow-forward" size={12} color="#000" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* See all card */}
        <TouchableOpacity
          style={[styles.seeAllCard, { backgroundColor: theme.surface }]}
          onPress={() => router.push({ pathname: '/(tabs)/discover', params: { quickwins: '1' } })}
          activeOpacity={0.8}
        >
          <View style={styles.seeAllIcon}>
            <Ionicons name="grid" size={26} color="#00D95F" />
          </View>
          <Text style={styles.seeAllText}>See All{'\n'}Quick Wins</Text>
          <Ionicons name="chevron-forward" size={16} color="#00D95F" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    height: 80, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginBottom: 16,
  },
  container: {
    marginBottom: 28,
  },

  // ── Hero header ──
  heroHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, marginBottom: 16,
  },
  heroLeft: { flex: 1, paddingRight: 12 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00D95F', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10,
  },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#000', letterSpacing: 1.2 },
  heroTitle: {
    fontSize: 24, fontWeight: '800', lineHeight: 30, marginBottom: 10,
    letterSpacing: -0.3,
  },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1E2030', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#2A2C3A',
  },
  metaPillText: { fontSize: 10, fontWeight: '600', color: '#A0A0B0' },

  // ── Stat counter ──
  heroStatWrap: { paddingTop: 2 },
  heroStat: {
    borderRadius: 14, padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: '#111420',
    minWidth: 62,
  },
  heroStatNum: { fontSize: 22, fontWeight: '800', color: '#00D95F' },
  heroStatLabel: { fontSize: 10, marginTop: 2, fontWeight: '600' },

  // ── Scroll list ──
  scrollContent: { paddingLeft: 20, paddingRight: 12, gap: 10 },

  // ── Card ──
  card: {
    width: 172,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    // borderTopWidth overridden inline per card
  },
  cardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  speedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20,
  },
  speedChipText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 5, marginBottom: 8,
  },
  badgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  cardTitle: {
    fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 6,
  },
  cardEarnings: {
    fontSize: 17, fontWeight: '800', color: '#00D95F', marginBottom: 10,
    letterSpacing: -0.2,
  },
  cardFooter: { gap: 10 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#00D95F', borderRadius: 10, paddingVertical: 9,
    marginTop: 2,
  },
  ctaButtonHero: {
    shadowColor: '#00D95F',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  ctaText: { fontSize: 12, fontWeight: '800', color: '#000' },

  // ── See all ──
  seeAllCard: {
    width: 110, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#00D95F20',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  seeAllIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#00D95F12',
    justifyContent: 'center', alignItems: 'center',
  },
  seeAllText: { fontSize: 11, color: '#00D95F', fontWeight: '700', textAlign: 'center', lineHeight: 16 },
});
