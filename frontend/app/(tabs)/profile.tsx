import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';
import { EarningsCommandCenter } from '../../components/EarningsCommandCenter';
import { ReferralCard } from '../../components/ReferralCard';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const ENV_LABELS: Record<string, string> = {
  home: 'Work From Home', office: 'In an Office', outdoor: 'Outdoors'
};
const SOCIAL_LABELS: Record<string, string> = {
  solo: 'Solo', 'small-team': 'Small Team', 'customer-facing': 'Customer-Facing'
};

const ARC_LEVELS = [
  { min: 0, max: 99, label: 'Apprentice', color: '#8E8E8E' },
  { min: 100, max: 299, label: 'Builder', color: '#3B82F6' },
  { min: 300, max: 599, label: 'Strategist', color: '#8B5CF6' },
  { min: 600, max: 999, label: 'Architect', color: '#00D95F' },
  { min: 1000, max: Infinity, label: 'Legend', color: '#F59E0B' },
];

const ARC_STORE_ITEMS = [
  { title: 'Legal Contract Template', subtitle: 'High-converting freelance contract', arc: 500, icon: 'document-text' },
  { title: 'Marketing Email Swipe File', subtitle: '30 proven cold outreach templates', arc: 300, icon: 'mail' },
  { title: 'High-Ticket Pitch Deck', subtitle: 'Close $2K+ clients on first call', arc: 750, icon: 'briefcase' },
  { title: 'Local Market Report', subtitle: 'Demand analysis for your city', arc: 1000, icon: 'bar-chart' },
];

function getArcLevel(balance: number) {
  return ARC_LEVELS.find(l => balance >= l.min && balance <= l.max) || ARC_LEVELS[0];
}

function getNextMilestone(balance: number): number {
  for (const m of [100, 300, 600, 1000]) {
    if (balance < m) return m;
  }
  return 1000;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { theme, isDark, toggleTheme } = useTheme();
  const [arcBalance, setArcBalance] = useState(0);
  const [arcLoaded, setArcLoaded] = useState(false);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const u = JSON.parse(userData);
      setUser(u);
      if (u?.id && !u?.is_guest) {
        try {
          const res = await axios.get(`${API_URL}/api/arc/${u.id}`);
          setArcBalance(res.data.arc_balance || 0);
        } catch {}
        setArcLoaded(true);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await AsyncStorage.removeItem('user');
        router.replace('/');
      }},
    ]);
  };

  const profile = user?.profile || {};
  const firstName = user?.name?.split(' ')[0] || 'User';
  const iconTone = isDark ? '#8E8E8E' : theme.textSub;
  const subtleBg = isDark ? '#1A1C23' : theme.surfaceAlt;
  const subtleBorder = isDark ? '#2A2C35' : theme.border;
  const surfaceCard = isDark ? theme.surface : '#FFFFFF';
  const elevatedCard = isDark ? null : {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }] }>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatarRing, { backgroundColor: surfaceCard, borderColor: theme.accent }, elevatedCard] }>
            <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{user?.name || 'Guest'}</Text>
          {!user?.is_guest && <Text style={[styles.email, { color: theme.textSub }]}>{user?.email}</Text>}
          {user?.is_guest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>Preview Mode</Text>
            </View>
          )}
        </View>

        {/* ======= SPRINT 9: EARNINGS COMMAND CENTER ======= */}
        {!user?.is_guest && user?.id && (
          <View style={styles.section}>
            <EarningsCommandCenter userId={user.id} />
          </View>
        )}

        {/* ======= SPRINT 9: REFERRAL ENGINE ======= */}
        {!user?.is_guest && user?.id && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Referral Engine</Text>
            <ReferralCard userId={user.id} userName={user.name} />
          </View>
        )}

        {/* Identity Verification Section */}
        {!user?.is_guest && user?.id && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Identity Verification</Text>
            {user?.phone_verified ? (
              <View style={[styles.verifiedCard, elevatedCard]} data-testid="phone-verified-badge">
                <View style={styles.verifiedLeft}>
                  <View style={styles.verifiedIconBox}>
                    <Ionicons name="shield-checkmark" size={22} color="#00D95F" />
                  </View>
                  <View>
                    <Text style={styles.verifiedTitle}>Identity Verified</Text>
                    <Text style={styles.verifiedPhone}>{user.phone_number}</Text>
                  </View>
                </View>
                <View style={styles.verifiedBadgePill}>
                  <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                </View>
              </View>
            ) : (
              <View>
                <View style={[styles.unverifiedCard, elevatedCard]}>
                  <Ionicons name="shield-outline" size={20} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.unverifiedTitle}>Phone Not Verified</Text>
                    <Text style={styles.unverifiedSub}>
                      Verify your phone to access Blueprint Squads — the community of verified Architects helping each other win.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.verifyBtn}
                  onPress={() => router.push('/verify-phone')}
                  data-testid="verify-phone-btn"
                >
                  <Ionicons name="shield-checkmark" size={16} color="#000" />
                  <Text style={styles.verifyBtnText}>Verify My Identity</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ARC Credits Section — only for logged-in non-guest users */}
        {!user?.is_guest && user?.id && arcLoaded && (() => {
          const lvl = getArcLevel(arcBalance);
          const nextM = getNextMilestone(arcBalance);
          const progressPct = Math.min(100, Math.round((arcBalance / nextM) * 100));
          return (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Architect Credits (ARC)</Text>
              {/* Balance card */}
              <View style={[styles.arcCard, { backgroundColor: surfaceCard, borderColor: '#F59E0B30' }, elevatedCard]} data-testid="arc-balance-card">
                <View style={styles.arcLeft}>
                  <View style={[styles.arcCoin, { backgroundColor: lvl.color }]}>
                    <Text style={styles.arcCoinLetter}>A</Text>
                  </View>
                  <View>
                    <Text style={[styles.arcBalance, { color: theme.text }]}>{arcBalance.toLocaleString()} ARC</Text>
                    <View style={[styles.arcLevelBadge, { backgroundColor: lvl.color + '20', borderColor: lvl.color + '50' }]}>
                      <Text style={[styles.arcLevelText, { color: lvl.color }]}>{lvl.label}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.arcRight}>
                  <Text style={[styles.arcNextLabel, { color: theme.textSub }]}>Next: {nextM} ARC</Text>
                  <View style={[styles.arcProgressBar, { backgroundColor: subtleBorder }]}>
                    <View style={[styles.arcProgressFill, { width: `${progressPct}%` as any, backgroundColor: lvl.color }]} />
                  </View>
                </View>
              </View>

              {/* How to earn */}
              <View style={[styles.arcEarnCard, { backgroundColor: surfaceCard, borderColor: subtleBorder }, elevatedCard]}>
                <Text style={[styles.arcEarnTitle, { color: theme.textSub }]}>How to earn ARC</Text>
                <View style={styles.arcEarnRow}>
                  <View style={styles.arcEarnDot} />
                  <Text style={[styles.arcEarnItem, { color: theme.text }]}>+10 ARC · Complete a step</Text>
                </View>
                <View style={styles.arcEarnRow}>
                  <View style={styles.arcEarnDot} />
                  <Text style={[styles.arcEarnItem, { color: theme.text }]}>+100 ARC · Finish a blueprint</Text>
                </View>
                <View style={styles.arcEarnRow}>
                  <View style={styles.arcEarnDot} />
                  <Text style={[styles.arcEarnItem, { color: theme.text }]}>+25 ARC · Share your win</Text>
                </View>
                <View style={styles.arcEarnRow}>
                  <View style={styles.arcEarnDot} />
                  <Text style={[styles.arcEarnItem, { color: theme.text }]}>+5 ARC · Daily check-in</Text>
                </View>
              </View>

              {/* Teaser Store */}
              <Text style={[styles.storeTitle, { color: theme.textSub }]}>Architect Store</Text>
              {ARC_STORE_ITEMS.map((item, i) => (
                <View key={i} style={[styles.storeItem, { backgroundColor: surfaceCard, borderColor: subtleBorder }, elevatedCard]} data-testid={`arc-store-item-${i}`}>
                  <View style={styles.storeItemLeft}>
                    <View style={[styles.storeIconBox, { backgroundColor: subtleBg }]}>
                      <Ionicons name={item.icon as any} size={18} color={theme.textSub} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.storeItemTitle, { color: theme.text }]}>{item.title}</Text>
                      <Text style={[styles.storeItemSub, { color: theme.textSub }]}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <View style={[styles.storeArcTag, { backgroundColor: subtleBg }]}>
                    <Ionicons name="lock-closed" size={10} color={theme.textSub} />
                    <Text style={[styles.storeArcCost, { color: theme.textSub }]}>{item.arc} ARC</Text>
                  </View>
                </View>
              ))}
              <Text style={[styles.storeComingSoon, { color: theme.textMuted }]}>Store unlocks when you reach 300 ARC</Text>
            </View>
          );
        })()}

        {/* Blueprint Profile */}
        {!user?.is_guest && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Blueprint Profile</Text>

            {profile.environment && (
              <View style={[styles.infoCard, { backgroundColor: surfaceCard, borderColor: subtleBorder }, elevatedCard]}>
                <View style={styles.infoIcon}><Ionicons name="home" size={18} color="#00D95F" /></View>
                <View>
                  <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Work Environment</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{ENV_LABELS[profile.environment] || profile.environment}</Text>
                </View>
              </View>
            )}

            {profile.social_preference && (
              <View style={[styles.infoCard, { backgroundColor: surfaceCard, borderColor: subtleBorder }, elevatedCard]}>
                <View style={styles.infoIcon}><Ionicons name="people" size={18} color="#00D95F" /></View>
                <View>
                  <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Work Style</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{SOCIAL_LABELS[profile.social_preference] || profile.social_preference}</Text>
                </View>
              </View>
            )}

            {profile.assets?.length > 0 && (
              <View style={[styles.infoCard, { backgroundColor: surfaceCard, borderColor: subtleBorder }, elevatedCard]}>
                <View style={styles.infoIcon}><Ionicons name="briefcase" size={18} color="#00D95F" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: theme.textMuted }]}>My Assets</Text>
                  <View style={styles.tagsRow}>
                    {profile.assets.map((a: string, i: number) => (
                      <View key={i} style={styles.tag}><Text style={styles.tagText}>{a}</Text></View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {profile.questionnaire_interests?.length > 0 && (
              <View style={[styles.infoCard, { backgroundColor: surfaceCard, borderColor: subtleBorder }, elevatedCard]}>
                <View style={styles.infoIcon}><Ionicons name="star" size={18} color="#00D95F" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Interests</Text>
                  <View style={styles.tagsRow}>
                    {profile.questionnaire_interests.map((t: string, i: number) => (
                      <View key={i} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {!profile.environment && (
              <TouchableOpacity style={[styles.retakeCard, { backgroundColor: theme.accentLight, borderColor: theme.accent + '40' }, elevatedCard]} onPress={() => router.push('/onboarding/questionnaire')}>
                <Ionicons name="compass" size={20} color="#00D95F" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.retakeTitle, { color: theme.text }]}>Complete Your Blueprint Profile</Text>
                  <Text style={[styles.retakeDesc, { color: theme.textSub }]}>Get personalized match scores for every idea</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#00D95F" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>

          {!user?.is_guest && (
            <TouchableOpacity style={[styles.menuItem, { backgroundColor: surfaceCard, borderColor: subtleBorder }, elevatedCard]} onPress={() => router.push('/onboarding/questionnaire')}>
              <View style={styles.menuLeft}>
                <Ionicons name="create-outline" size={22} color={iconTone} />
                <Text style={[styles.menuText, { color: theme.text }]}>Retake Blueprint Quiz</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: surfaceCard, borderColor: subtleBorder }, elevatedCard]}>
            <View style={styles.menuLeft}>
              <Ionicons name="notifications-outline" size={22} color={iconTone} />
              <Text style={[styles.menuText, { color: theme.text }]}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Sprint 6: Theme Toggle */}
          <View style={[styles.menuItem, { backgroundColor: surfaceCard, borderColor: subtleBorder }, elevatedCard]} data-testid="theme-toggle-row">
            <View style={styles.menuLeft}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={isDark ? '#8E8E8E' : '#F59E0B'} />
              <View>
                <Text style={[styles.menuText, { color: theme.text }]}>Architect {isDark ? 'Dark' : 'Light'} Mode</Text>
                <Text style={[styles.menuSubtext, { color: theme.textSub }]}>{isDark ? 'Classic electric mint on black' : 'Fluent Light+ for clean focus and readability'}</Text>
              </View>
            </View>
            <Switch
              value={!isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: subtleBorder, true: theme.accent + '40' }}
              thumbColor={isDark ? '#4A4A4A' : theme.accent}
              data-testid="theme-switch"
            />
          </View>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: surfaceCard, borderColor: subtleBorder }, elevatedCard]} onPress={() => router.push('/about-blueprint')}>
            <View style={styles.menuLeft}>
              <Ionicons name="information-circle-outline" size={22} color={iconTone} />
              <Text style={[styles.menuText, { color: theme.text }]}>About Blueprint</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: surfaceCard, borderColor: theme.danger + '33' }, elevatedCard]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={theme.danger} />
            <Text style={[styles.logoutText, { color: theme.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {user?.is_guest && (
          <View style={[styles.section, { paddingBottom: 8 }]}>
            <TouchableOpacity style={[styles.upgradeCard, { backgroundColor: theme.accentLight, borderColor: theme.accent + '40' }, elevatedCard]} onPress={() => router.push('/onboarding/auth')}>
              <View style={styles.upgradeCardLeft}>
                <Ionicons name="grid" size={20} color="#00D95F" />
                <View>
                  <Text style={[styles.upgradeCardTitle, { color: theme.text }]}>Upgrade to Blueprint</Text>
                  <Text style={[styles.upgradeCardDesc, { color: theme.textSub }]}>Unlock match scores & progress tracking</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#00D95F" />
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.version, { color: theme.textMuted }]}>Blueprint v1.0 · Architect Your Income</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { alignItems: 'center', paddingTop: 64, paddingBottom: 32, paddingHorizontal: 24 },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: '#00D95F',
  },
  avatarInitial: { fontSize: 34, fontWeight: '700', color: '#00D95F' },
  name: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  email: { fontSize: 13, color: '#8E8E8E' },
  guestBadge: { backgroundColor: '#F59E0B18', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
  guestBadgeText: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  section: { paddingHorizontal: 24, marginBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1C23',
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2A2C35',
  },
  infoIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#00D95F10', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLabel: { fontSize: 11, color: '#4A4A4A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { backgroundColor: '#00D95F12', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, color: '#00D95F', fontWeight: '500', textTransform: 'capitalize' },
  retakeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#00D95F0A', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#00D95F25',
  },
  retakeTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  retakeDesc: { fontSize: 12, color: '#8E8E8E' },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1A1C23', padding: 16, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#2A2C35',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontSize: 15, color: '#FFFFFF' },
  menuSubtext: { fontSize: 11, color: '#4A4A4A', marginTop: 1 },
  logoutButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    backgroundColor: '#1A1C23', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#FF444420',
  },
  logoutText: { fontSize: 15, color: '#FF4444', fontWeight: '600' },
  upgradeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#00D95F0A', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#00D95F25',
  },
  upgradeCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upgradeCardTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  upgradeCardDesc: { fontSize: 12, color: '#8E8E8E' },
  version: { fontSize: 12, color: '#2A2C35', textAlign: 'center', marginBottom: 40 },
  // Identity Verification Styles
  verifiedCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#00D95F10', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#00D95F30',
  },
  verifiedLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verifiedIconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#00D95F15',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#00D95F30',
  },
  verifiedTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  verifiedPhone: { fontSize: 12, color: '#8E8E8E' },
  verifiedBadgePill: {
    backgroundColor: '#00D95F', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  verifiedBadgeText: { fontSize: 10, fontWeight: '800', color: '#000', letterSpacing: 1 },
  unverifiedCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#F59E0B10', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#F59E0B30', marginBottom: 12,
  },
  unverifiedTitle: { fontSize: 14, fontWeight: '700', color: '#F59E0B', marginBottom: 3 },
  unverifiedSub: { fontSize: 12, color: '#8E8E8E', lineHeight: 17 },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00D95F', borderRadius: 12, paddingVertical: 13,
  },
  verifyBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  // ARC Credits Styles
  arcCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1A1C23', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#F59E0B30', marginBottom: 8,
  },
  arcLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  arcCoin: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  arcCoinLetter: { fontSize: 18, fontWeight: '900', color: '#000' },
  arcBalance: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  arcLevelBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  arcLevelText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  arcRight: { alignItems: 'flex-end', gap: 6 },
  arcNextLabel: { fontSize: 11, color: '#4A4A4A' },
  arcProgressBar: {
    width: 80, height: 4, backgroundColor: '#2A2C35',
    borderRadius: 2, overflow: 'hidden',
  },
  arcProgressFill: { height: '100%', borderRadius: 2 },
  arcEarnCard: {
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#2A2C35',
  },
  arcEarnTitle: { fontSize: 12, fontWeight: '700', color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  arcEarnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  arcEarnDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#00D95F' },
  arcEarnItem: { fontSize: 13, color: '#FFFFFF' },
  storeTitle: { fontSize: 14, fontWeight: '700', color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  storeItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#2A2C35',
  },
  storeItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  storeIconBox: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#2A2C35',
    justifyContent: 'center', alignItems: 'center',
  },
  storeItemTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E8E', marginBottom: 1 },
  storeItemSub: { fontSize: 11, color: '#4A4A4A' },
  storeArcTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#2A2C35', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  storeArcCost: { fontSize: 12, fontWeight: '700', color: '#4A4A4A' },
  storeComingSoon: { fontSize: 11, color: '#2A2C35', textAlign: 'center', marginTop: 4, marginBottom: 4 },
});
