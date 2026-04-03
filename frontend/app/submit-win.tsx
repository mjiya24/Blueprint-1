import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

const EARNING_PERIODS = ['per week', 'per month', 'total so far', 'per project'];

export default function SubmitWinScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [blueprintTitle, setBlueprintTitle] = useState('');
  const [category, setCategory] = useState('');
  const [earningsAmount, setEarningsAmount] = useState('');
  const [earningsPeriod, setEarningsPeriod] = useState('per month');
  const [weeksToEarn, setWeeksToEarn] = useState('');
  const [quote, setQuote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentBlueprints, setRecentBlueprints] = useState<any[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('user').then(d => {
      if (d) {
        const u = JSON.parse(d);
        if (!u.is_architect) {
          router.replace('/architect-upgrade');
          return;
        }
        setUser(u);
        loadRecentBlueprints(u.id);
      } else {
        router.replace('/onboarding/auth');
      }
    });
  }, []);

  const loadRecentBlueprints = async (userId: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/saved-ideas/${userId}`);
      setRecentBlueprints(res.data.slice(0, 5));
    } catch {}
  };

  const handleSubmit = async () => {
    if (!blueprintTitle.trim()) {
      Alert.alert('Missing info', 'Please enter your Blueprint name.');
      return;
    }
    if (!earningsAmount || isNaN(Number(earningsAmount))) {
      Alert.alert('Missing info', 'Please enter a valid earnings amount.');
      return;
    }
    if (!quote.trim() || quote.length < 20) {
      Alert.alert('Too short', 'Share at least 20 characters about your experience!');
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/wins`, {
        user_id: user.id,
        blueprint_title: blueprintTitle.trim(),
        category: category || 'General',
        earnings_amount: Number(earningsAmount),
        earnings_period: earningsPeriod,
        weeks_to_earn: Number(weeksToEarn) || 0,
        quote: quote.trim(),
      });
      Alert.alert('Win Posted!', 'Your success story is now live in the Community Wins feed.', [
        { text: 'View Feed', onPress: () => router.replace('/(tabs)/wins') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to post win. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
      <View style={styles.navBar}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surfaceAlt }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>Share Your Win</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.hero}>
          <View style={styles.trophyIcon}>
            <Ionicons name="trophy" size={32} color="#F59E0B" />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>You earned it — prove it.</Text>
          <Text style={[styles.heroSub, { color: theme.textSub }]}>Your win inspires the next Architect. Post it to the community feed.</Text>
        </View>

        {/* Quick fill from saved blueprints */}
        {recentBlueprints.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>QUICK FILL FROM YOUR BLUEPRINTS</Text>
            {recentBlueprints.map((bp: any) => (
              <TouchableOpacity
                key={bp.idea_id}
                style={[styles.bpChip, { backgroundColor: theme.surface, borderColor: theme.border }, blueprintTitle === bp.title && styles.bpChipActive]}
                onPress={() => { setBlueprintTitle(bp.title || ''); setCategory(bp.category || ''); }}
              >
                <Text style={[styles.bpChipText, { color: theme.text }, blueprintTitle === bp.title && { color: '#00D95F' }]}>{bp.title}</Text>
                {blueprintTitle === bp.title && <Ionicons name="checkmark-circle" size={16} color="#00D95F" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>WHICH BLUEPRINT DID YOU WIN WITH?</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={blueprintTitle}
            onChangeText={setBlueprintTitle}
            placeholder="e.g. AI Automation Agency, Pressure Washing..."
            placeholderTextColor={theme.textMuted}
            data-testid="blueprint-title-input"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>HOW MUCH DID YOU EARN?</Text>
          <View style={styles.earningsRow}>
            <View style={[styles.dollarInput, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.dollarSign, { color: theme.textMuted }]}>$</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                value={earningsAmount}
                onChangeText={setEarningsAmount}
                placeholder="2500"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                data-testid="earnings-amount-input"
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
              <View style={styles.periodsRow}>
                {EARNING_PERIODS.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }, earningsPeriod === p && styles.periodChipActive]}
                    onPress={() => setEarningsPeriod(p)}
                  >
                    <Text style={[styles.periodText, earningsPeriod === p && { color: '#00D95F' }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>HOW MANY WEEKS DID IT TAKE?</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={weeksToEarn}
            onChangeText={setWeeksToEarn}
            placeholder="e.g. 6"
            placeholderTextColor={theme.textMuted}
            keyboardType="numeric"
            data-testid="weeks-input"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>YOUR WIN STORY (min 20 chars)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={quote}
            onChangeText={setQuote}
            placeholder="What was the key breakthrough? What would you tell someone starting today?"
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={280}
            data-testid="win-quote-input"
          />
          <Text style={styles.charCount}>{quote.length}/280</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          data-testid="submit-win-confirm-btn"
        >
          {isSubmitting
            ? <ActivityIndicator color="#000" />
            : <>
                <Ionicons name="trophy" size={20} color="#000" />
                <Text style={styles.submitText}>Post to Community Feed</Text>
              </>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center' },
  navTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  content: { paddingHorizontal: 20 },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  trophyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#F59E0B18', justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 14, color: '#8E8E8E', textAlign: 'center', lineHeight: 20 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 10, color: '#4A4A4A', fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  bpChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1C23', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#2A2C35' },
  bpChipActive: { borderColor: '#00D95F40', backgroundColor: '#00D95F08' },
  bpChipText: { fontSize: 13, color: '#FFFFFF', flex: 1 },
  input: { backgroundColor: '#1A1C23', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2A2C35' },
  textArea: { height: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#4A4A4A', textAlign: 'right', marginTop: 4 },
  earningsRow: { gap: 8 },
  dollarInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1C23', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2C35' },
  dollarSign: { fontSize: 18, fontWeight: '700', color: '#00D95F', marginRight: 4 },
  amountInput: { fontSize: 18, color: '#FFFFFF', fontWeight: '700', flex: 1 },
  periodScroll: { maxHeight: 40 },
  periodsRow: { flexDirection: 'row', gap: 8 },
  periodChip: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#1A1C23', borderRadius: 20, borderWidth: 1, borderColor: '#2A2C35' },
  periodChipActive: { borderColor: '#00D95F', backgroundColor: '#00D95F12' },
  periodText: { fontSize: 12, color: '#4A4A4A', fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#00D95F', borderRadius: 14, padding: 18 },
  submitText: { fontSize: 17, fontWeight: '700', color: '#000' },
});
