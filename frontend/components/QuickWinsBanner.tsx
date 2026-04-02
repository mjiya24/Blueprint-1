import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { BrandLogoStrip } from './BrandLogoStrip';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'VERIFIED': { bg: '#00D95F15', text: '#00D95F' },
  'TOP RATED': { bg: '#6366F115', text: '#818CF8' },
  'POPULAR': { bg: '#3B82F615', text: '#60A5FA' },
  'QUICK $100': { bg: '#F59E0B15', text: '#F59E0B' },
  'SAME-DAY PAY': { bg: '#10B98115', text: '#34D399' },
  'STATE GATED': { bg: '#F9731615', text: '#FB923C' },
  '100% RISK-FREE': { bg: '#00D95F15', text: '#00D95F' },
  'SKILL-BASED': { bg: '#8B5CF615', text: '#A78BFA' },
  'RECURRING INCOME': { bg: '#10B98115', text: '#34D399' },
  'DEFAULT': { bg: '#2A2C3515', text: '#8E8E8E' },
};

const PLATFORM_ICONS: Record<string, { icon: string; color: string }> = {
  'qw-001': { icon: 'flash-outline', color: '#6366F1' },        // DataAnnotation - AI training
  'qw-002': { icon: 'people-outline', color: '#3B82F6' },        // UserInterviews
  'qw-003': { icon: 'game-controller-outline', color: '#00D95F' }, // Freecash - gaming
  'qw-004': { icon: 'phone-portrait-outline', color: '#F59E0B' }, // Mistplay - mobile
  'qw-005': { icon: 'card-outline', color: '#8B5CF6' },           // Solitaire Cash
  'qw-006': { icon: 'bicycle-outline', color: '#F97316' },        // Campus Courier
  'qw-007': { icon: 'paw-outline', color: '#10B981' },            // Pet Partner / Rover
  'qw-008': { icon: 'heart-outline', color: '#EF4444' },          // BioLife plasma
  'qw-009': { icon: 'football-outline', color: '#F59E0B' },       // FanDuel
  'qw-010': { icon: 'cash-outline', color: '#06B6D4' },           // Bank bonuses
  'qw-011': { icon: 'clipboard-outline', color: '#EC4899' },      // Survey Junkie
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

  useEffect(() => {
    loadWins();
    // Pulsing animation on the hero badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadWins = async () => {
    try {
      const params: any = {};
      if (userState) params.user_state = userState;
      if (userId) params.user_id = userId;
      const res = await axios.get(`${API_URL}/api/quick-wins`, { params });
      setWins(res.data || []);
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

  return (
    <View style={styles.container}>
      {/* Hero header */}
      <View style={styles.heroHeader}>
        <View style={styles.heroLeft}>
          <Animated.View style={[styles.heroBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="flash" size={12} color="#000" />
            <Text style={styles.heroBadgeText}>QUICK WINS</Text>
          </Animated.View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>$25 in 60 Minutes</Text>
          <Text style={[styles.heroSubtitle, { color: theme.textMuted }]}>$0 to start · Verified · Instant payouts</Text>
        </View>
        <View style={styles.heroRight}>
          <View style={[styles.heroStat, { backgroundColor: theme.surface }]}>
            <Text style={styles.heroStatNum}>{wins.length}</Text>
            <Text style={[styles.heroStatLabel, { color: theme.textMuted }]}>Paths</Text>
          </View>
        </View>
      </View>

      {/* Scrollable cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {wins.map((win) => {
          const config = platformConfig(win.id);
          const badgeStyle = BADGE_COLORS[win.badge || 'DEFAULT'] || BADGE_COLORS['DEFAULT'];
          const isStateGated = win.badge === 'STATE GATED';

          return (
            <TouchableOpacity
              key={win.id}
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => handleCardPress(win)}
              activeOpacity={0.8}
            >
              {/* Card icon */}
              <View style={[styles.cardIcon, { backgroundColor: config.color + '18' }]}>
                <Ionicons name={config.icon as any} size={26} color={config.color} />
              </View>

              {/* Badge */}
              {win.badge && (
                <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
                  {isStateGated && <Ionicons name="shield-checkmark" size={9} color={badgeStyle.text} />}
                  <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{win.badge}</Text>
                </View>
              )}

              {/* Title */}
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{win.title}</Text>

              {/* Earnings */}
              <Text style={styles.cardEarnings}>{win.potential_earnings}</Text>

              {/* Time to first $ */}
              {win.time_to_first_dollar && (
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={11} color="#4A4A4A" />
                  <Text style={[styles.timeText, { color: theme.textMuted }]}>{win.time_to_first_dollar}</Text>
                </View>
              )}

              {/* Brand / Category badge */}
              <BrandLogoStrip item={win} theme={theme} />

              {/* CTA */}
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => handleCardPress(win)}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>Start Now</Text>
                <Ionicons name="arrow-forward" size={13} color="#000" />
              </TouchableOpacity>
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
            <Ionicons name="grid" size={28} color="#00D95F" />
          </View>
          <Text style={styles.seeAllText}>See All{'\n'}Quick Wins</Text>
          <Ionicons name="chevron-forward" size={18} color="#00D95F" />
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
    marginBottom: 24,
  },
  heroHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14,
  },
  heroLeft: { flex: 1 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00D95F', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8,
  },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#000', letterSpacing: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', lineHeight: 28, marginBottom: 4 },
  heroSubtitle: { fontSize: 12, color: '#4A4A4A' },
  heroRight: { marginLeft: 12 },
  heroStat: {
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#00D95F25',
    minWidth: 60,
  },
  heroStatNum: { fontSize: 20, fontWeight: '800', color: '#00D95F' },
  heroStatLabel: { fontSize: 10, color: '#4A4A4A', marginTop: 2 },
  scrollContent: { paddingLeft: 20, paddingRight: 12, gap: 10 },
  card: {
    width: 160,
    backgroundColor: '#1A1C23',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  cardIcon: {
    width: 50, height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, marginBottom: 8,
  },
  badgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', lineHeight: 18, marginBottom: 6 },
  cardEarnings: { fontSize: 15, fontWeight: '800', color: '#00D95F', marginBottom: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  timeText: { fontSize: 10, color: '#4A4A4A' },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#00D95F', borderRadius: 10, paddingVertical: 9,
  },
  ctaText: { fontSize: 12, fontWeight: '700', color: '#000' },
  seeAllCard: {
    width: 120, backgroundColor: '#0D0E14',
    borderRadius: 16, padding: 16, borderWidth: 1,
    borderColor: '#00D95F20', alignItems: 'center',
    justifyContent: 'center', gap: 10,
  },
  seeAllIcon: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: '#00D95F10', justifyContent: 'center', alignItems: 'center',
  },
  seeAllText: { fontSize: 12, color: '#00D95F', fontWeight: '700', textAlign: 'center', lineHeight: 16 },
});
