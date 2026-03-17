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
  const { isDark, toggleTheme } = useTheme();
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Guest'}</Text>
          {!user?.is_guest && <Text style={styles.email}>{user?.email}</Text>}
          {user?.is_guest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>Preview Mode</Text>
            </View>
          )}
        </View>

        {/* ARC Credits Section — only for logged-in non-guest users */}
        {!user?.is_guest && user?.id && arcLoaded && (() => {
          const lvl = getArcLevel(arcBalance);
          const nextM = getNextMilestone(arcBalance);
          const progressPct = Math.min(100, Math.round((arcBalance / nextM) * 100));
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Architect Credits (ARC)</Text>
              {/* Balance card */}
              <View style={styles.arcCard} data-testid="arc-balance-card">
                <View style={styles.arcLeft}>
                  <View style={[styles.arcCoin, { backgroundColor: lvl.color }]}>
                    <Text style={styles.arcCoinLetter}>A</Text>
                  </View>
                  <View>
                    <Text style={styles.arcBalance}>{arcBalance.toLocaleString()} ARC</Text>
                    <View style={[styles.arcLevelBadge, { backgroundColor: lvl.color + '20', borderColor: lvl.color + '50' }]}>
                      <Text style={[styles.arcLevelText, { color: lvl.color }]}>{lvl.label}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.arcRight}>
                  <Text style={styles.arcNextLabel}>Next: {nextM} ARC</Text>
                  <View style={styles.arcProgressBar}>
                    <View style={[styles.arcProgressFill, { width: `${progressPct}%` as any, backgroundColor: lvl.color }]} />
                  </View>
                </View>
              </View>

              {/* How to earn */}
              <View style={styles.arcEarnCard}>
                <Text style={styles.arcEarnTitle}>How to earn ARC</Text>
                <View style={styles.arcEarnRow}>
                  <View style={styles.arcEarnDot} />
                  <Text style={styles.arcEarnItem}>+10 ARC · Complete a step</Text>
                </View>
                <View style={styles.arcEarnRow}>
                  <View style={styles.arcEarnDot} />
                  <Text style={styles.arcEarnItem}>+100 ARC · Finish a blueprint</Text>
                </View>
                <View style={styles.arcEarnRow}>
                  <View style={styles.arcEarnDot} />
                  <Text style={styles.arcEarnItem}>+25 ARC · Share your win</Text>
                </View>
                <View style={styles.arcEarnRow}>
                  <View style={styles.arcEarnDot} />
                  <Text style={styles.arcEarnItem}>+5 ARC · Daily check-in</Text>
                </View>
              </View>

              {/* Teaser Store */}
              <Text style={styles.storeTitle}>Architect Store</Text>
              {ARC_STORE_ITEMS.map((item, i) => (
                <View key={i} style={styles.storeItem} data-testid={`arc-store-item-${i}`}>
                  <View style={styles.storeItemLeft}>
                    <View style={styles.storeIconBox}>
                      <Ionicons name={item.icon as any} size={18} color="#4A4A4A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.storeItemTitle}>{item.title}</Text>
                      <Text style={styles.storeItemSub}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <View style={styles.storeArcTag}>
                    <Ionicons name="lock-closed" size={10} color="#4A4A4A" />
                    <Text style={styles.storeArcCost}>{item.arc} ARC</Text>
                  </View>
                </View>
              ))}
              <Text style={styles.storeComingSoon}>Store unlocks when you reach 300 ARC</Text>
            </View>
          );
        })()}

        {/* Blueprint Profile */}
        {!user?.is_guest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Blueprint Profile</Text>

            {profile.environment && (
              <View style={styles.infoCard}>
                <View style={styles.infoIcon}><Ionicons name="home" size={18} color="#00D95F" /></View>
                <View>
                  <Text style={styles.infoLabel}>Work Environment</Text>
                  <Text style={styles.infoValue}>{ENV_LABELS[profile.environment] || profile.environment}</Text>
                </View>
              </View>
            )}

            {profile.social_preference && (
              <View style={styles.infoCard}>
                <View style={styles.infoIcon}><Ionicons name="people" size={18} color="#00D95F" /></View>
                <View>
                  <Text style={styles.infoLabel}>Work Style</Text>
                  <Text style={styles.infoValue}>{SOCIAL_LABELS[profile.social_preference] || profile.social_preference}</Text>
                </View>
              </View>
            )}

            {profile.assets?.length > 0 && (
              <View style={styles.infoCard}>
                <View style={styles.infoIcon}><Ionicons name="briefcase" size={18} color="#00D95F" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>My Assets</Text>
                  <View style={styles.tagsRow}>
                    {profile.assets.map((a: string, i: number) => (
                      <View key={i} style={styles.tag}><Text style={styles.tagText}>{a}</Text></View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {profile.questionnaire_interests?.length > 0 && (
              <View style={styles.infoCard}>
                <View style={styles.infoIcon}><Ionicons name="star" size={18} color="#00D95F" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Interests</Text>
                  <View style={styles.tagsRow}>
                    {profile.questionnaire_interests.map((t: string, i: number) => (
                      <View key={i} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {!profile.environment && (
              <TouchableOpacity style={styles.retakeCard} onPress={() => router.push('/onboarding/questionnaire')}>
                <Ionicons name="compass" size={20} color="#00D95F" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.retakeTitle}>Complete Your Blueprint Profile</Text>
                  <Text style={styles.retakeDesc}>Get personalized match scores for every idea</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#00D95F" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          {!user?.is_guest && (
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/onboarding/questionnaire')}>
              <View style={styles.menuLeft}>
                <Ionicons name="create-outline" size={22} color="#8E8E8E" />
                <Text style={styles.menuText}>Retake Blueprint Quiz</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#2A2C35" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="notifications-outline" size={22} color="#8E8E8E" />
              <Text style={styles.menuText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#2A2C35" />
          </TouchableOpacity>

          {/* Sprint 6: Theme Toggle */}
          <View style={styles.menuItem} data-testid="theme-toggle-row">
            <View style={styles.menuLeft}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={isDark ? '#8E8E8E' : '#F59E0B'} />
              <View>
                <Text style={styles.menuText}>Architect {isDark ? 'Dark' : 'Light'} Mode</Text>
                <Text style={styles.menuSubtext}>{isDark ? 'Classic electric mint on black' : 'Clean white — great for daylight'}</Text>
              </View>
            </View>
            <Switch
              value={!isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#2A2C35', true: '#00D95F40' }}
              thumbColor={isDark ? '#4A4A4A' : '#00D95F'}
              data-testid="theme-switch"
            />
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="information-circle-outline" size={22} color="#8E8E8E" />
              <Text style={styles.menuText}>About Blueprint</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#2A2C35" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#FF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {user?.is_guest && (
          <View style={[styles.section, { paddingBottom: 8 }]}>
            <TouchableOpacity style={styles.upgradeCard} onPress={() => router.push('/onboarding/auth')}>
              <View style={styles.upgradeCardLeft}>
                <Ionicons name="grid" size={20} color="#00D95F" />
                <View>
                  <Text style={styles.upgradeCardTitle}>Upgrade to Blueprint</Text>
                  <Text style={styles.upgradeCardDesc}>Unlock match scores & progress tracking</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#00D95F" />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.version}>Blueprint v1.0 · Architect Your Income</Text>
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
