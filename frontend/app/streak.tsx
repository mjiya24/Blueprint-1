import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MILESTONES = [
  { days: 3, label: '3-Day Start', icon: 'flame-outline', color: '#4A4A4A' },
  { days: 7, label: '7-Day Habit', icon: 'flame', color: '#F59E0B' },
  { days: 14, label: '14-Day Momentum', icon: 'flash', color: '#F97316' },
  { days: 30, label: '30-Day Architect', icon: 'diamond', color: '#FF6B35' },
  { days: 60, label: '60-Day Legend', icon: 'trophy', color: '#00D95F' },
];

export default function StreakScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [streakData, setStreakData] = useState<any>({ streak_current: 0, streak_longest: 0 });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('user').then(d => {
      if (d) {
        const u = JSON.parse(d);
        setUser(u);
        loadStreak(u.id);
      }
    });
  }, []);

  const loadStreak = async (userId: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/users/${userId}/streak`);
      setStreakData(res.data);
    } catch {}
  };

  const streak = streakData.streak_current || 0;
  const longest = streakData.streak_longest || 0;
  const streakColor = streak >= 30 ? '#FF6B35' : streak >= 7 ? '#F59E0B' : '#00D95F';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />

      <View style={styles.navBar}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surfaceAlt }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>Daily Streak</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.flameCircle, { borderColor: streakColor + '40', backgroundColor: streakColor + '12' }]}>
            <Ionicons name={streak >= 7 ? 'flame' : 'flame-outline'} size={64} color={streakColor} />
          </View>
          <Text style={[styles.streakCount, { color: streakColor }]}>{streak}</Text>
          <Text style={[styles.streakLabel, { color: theme.textSub }]}>day streak</Text>
          {streak === 0 && (
            <Text style={styles.startMsg}>Open the app every day to build your streak.</Text>
          )}
          {streak >= 7 && streak < 30 && (
            <Text style={styles.startMsg}>You're on fire. Keep showing up daily.</Text>
          )}
          {streak >= 30 && (
            <Text style={[styles.startMsg, { color: '#FF6B35' }]}>Architect mode. You're unstoppable.</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="flame" size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: theme.text }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Current</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="trophy" size={20} color="#00D95F" />
            <Text style={[styles.statValue, { color: theme.text }]}>{longest}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Longest</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="calendar" size={20} color="#6366F1" />
            <Text style={[styles.statValue, { color: theme.text }]}>{streakData.streak_last_action || '—'}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Last Action</Text>
          </View>
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>STREAK MILESTONES</Text>
          {MILESTONES.map((m) => {
            const achieved = streak >= m.days;
            return (
              <View key={m.days} style={[styles.milestoneRow, { backgroundColor: theme.surface, borderColor: theme.border }, achieved && styles.milestoneRowAchieved]}>
                <View style={[styles.milestoneIcon, { backgroundColor: achieved ? m.color + '20' : theme.surfaceAlt, borderColor: achieved ? m.color + '50' : theme.border }]}>
                  <Ionicons name={m.icon as any} size={20} color={achieved ? m.color : theme.textMuted} />
                </View>
                <View style={styles.milestoneInfo}>
                  <Text style={[styles.milestoneName, { color: theme.text }, achieved && { color: theme.text }]}>{m.label}</Text>
                  <Text style={[styles.milestoneDays, { color: theme.textMuted }]}>{m.days} consecutive days</Text>
                </View>
                {achieved
                  ? <Ionicons name="checkmark-circle" size={20} color="#00D95F" />
                  : <Text style={styles.milestoneDiff}>{m.days - streak} more</Text>
                }
              </View>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.discoverBtn} onPress={() => router.replace('/(tabs)/discover')}>
          <Ionicons name="grid-outline" size={18} color="#000" />
          <Text style={styles.discoverBtnText}>Explore Blueprints to keep streak alive</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center' },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  hero: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  flameCircle: { width: 120, height: 120, borderRadius: 36, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  streakCount: { fontSize: 72, fontWeight: '800', lineHeight: 80 },
  streakLabel: { fontSize: 16, color: '#8E8E8E', fontWeight: '600' },
  startMsg: { fontSize: 14, color: '#4A4A4A', textAlign: 'center', paddingHorizontal: 40, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: '#1A1C23', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#2A2C35' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: '#4A4A4A', fontWeight: '600' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionLabel: { fontSize: 10, color: '#4A4A4A', fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1C23', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2A2C35' },
  milestoneRowAchieved: { borderColor: '#00D95F30', backgroundColor: '#00D95F06' },
  milestoneIcon: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  milestoneInfo: { flex: 1 },
  milestoneName: { fontSize: 14, fontWeight: '700', color: '#4A4A4A', marginBottom: 3 },
  milestoneDays: { fontSize: 11, color: '#2A2C35' },
  milestoneDiff: { fontSize: 11, color: '#4A4A4A', fontWeight: '600' },
  discoverBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00D95F', borderRadius: 14, padding: 18, marginHorizontal: 20 },
  discoverBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
});
