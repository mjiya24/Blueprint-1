import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const ENV_LABELS: Record<string, string> = {
  home: 'Work From Home', office: 'In an Office', outdoor: 'Outdoors'
};
const SOCIAL_LABELS: Record<string, string> = {
  solo: 'Solo', 'small-team': 'Small Team', 'customer-facing': 'Customer-Facing'
};

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
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
});
