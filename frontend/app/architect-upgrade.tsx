import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../lib/config';
import { useTheme } from '../contexts/ThemeContext';

type Plan = 'monthly' | 'annual';

export default function ArchitectUpgradeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user').then(d => d && setUser(JSON.parse(d)));
    // Check if returning from Stripe
    const sessionId = params.session_id as string;
    const payment = params.payment as string;
    if (sessionId && payment === 'success') {
      pollPaymentStatus(sessionId);
    }
  }, []);

  const pollPaymentStatus = async (sessionId: string, attempts = 0) => {
    if (attempts >= 8) {
      setPaymentStatus('failed');
      return;
    }
    setPaymentStatus('checking');
    try {
      const res = await axios.get(`${API_URL}/api/payments/status/${sessionId}`);
      if (res.data.payment_status === 'paid') {
        // Update local user
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const u = JSON.parse(userData);
          u.is_architect = true;
          await AsyncStorage.setItem('user', JSON.stringify(u));
        }
        setPaymentStatus('success');
        return;
      }
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
    } catch {
      setPaymentStatus('failed');
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      router.push('/onboarding/auth');
      return;
    }
    setIsLoading(true);
    setCheckoutError('');
    try {
      if (!API_URL) {
        setCheckoutError('Backend URL is missing. Please check app environment settings.');
        return;
      }

      const origin = Platform.OS === 'web'
        ? (window as any).location.origin
        : API_URL;
      const successPath = Platform.OS === 'web'
        ? `${origin}/architect-upgrade`
        : `${origin}/architect-upgrade`;
      const res = await axios.post(`${API_URL}/api/payments/checkout`, {
        plan_type: selectedPlan,
        user_id: user.id,
        origin_url: successPath,
      });
      if (!res?.data?.url) {
        setCheckoutError('Checkout is unavailable right now. Please try again in a moment.');
        return;
      }
      await Linking.openURL(res.data.url);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const detail = (e.response?.data as any)?.detail;
        setCheckoutError(
          typeof detail === 'string'
            ? `Checkout failed: ${detail}`
            : 'Checkout failed. Please try again in a minute.'
        );
      } else {
        setCheckoutError('Checkout failed. Please check your connection and try again.');
      }
      console.warn('Checkout warning:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/home');
  };

  if (paymentStatus === 'checking') {
    return (
      <View style={[styles.statusScreen, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
        <ActivityIndicator size="large" color="#00D95F" />
        <Text style={[styles.statusTitle, { color: theme.text }]}>Confirming your payment...</Text>
        <Text style={[styles.statusSub, { color: theme.textSub }]}>This takes just a moment.</Text>
      </View>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <View style={[styles.statusScreen, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
        <View style={styles.successIcon}>
          <Ionicons name="flash" size={48} color="#000" />
        </View>
        <Text style={[styles.statusTitle, { color: theme.text }]}>Welcome, Architect!</Text>
        <Text style={[styles.statusSub, { color: theme.textSub }]}>Your AI coaching and troubleshooting tools are now unlocked.</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.doneBtnText}>Start Building →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
      <View style={styles.navBar}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surfaceAlt }]} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.architectBadge}>
            <Ionicons name="flash" size={14} color="#000" />
            <Text style={styles.architectBadgeText}>ARCHITECT TIER</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Execute Smarter.{'\n'}Earn Faster.</Text>
          <Text style={[styles.heroSub, { color: theme.textSub }]}>
            Stop guessing. Get an AI coach, troubleshooting tools, and exclusive high-ticket blueprints.
          </Text>
        </View>

        {/* ROI Clock — Risk Reversal */}
        <View style={styles.roiSection}>
          <View style={styles.roiHeader}>
            <View style={styles.roiIconBox}>
              <Ionicons name="timer" size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roiTitle}>Pays for itself in 2 hours</Text>
              <Text style={styles.roiSub}>
                {user?.profile?.city
                  ? `Based on Quick-Cash rates in ${user.profile.city}`
                  : 'Based on Quick-Cash blueprint averages'}
              </Text>
            </View>
          </View>
            <View style={[styles.roiCalcRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.roiCalcItem}>
              <Text style={[styles.roiCalcNum, { color: theme.text }]}>$14.99</Text>
              <Text style={[styles.roiCalcLabel, { color: theme.textMuted }]}>Monthly cost</Text>
            </View>
            <Ionicons name="remove" size={18} color={theme.border} />
            <View style={styles.roiCalcItem}>
              <Text style={[styles.roiCalcNum, { color: theme.text }]}>÷ $8/hr</Text>
              <Text style={[styles.roiCalcLabel, { color: theme.textMuted }]}>Quick-Cash floor</Text>
            </View>
            <Ionicons name="remove" size={18} color={theme.border} />
            <View style={styles.roiCalcItem}>
              <Text style={[styles.roiCalcNum, { color: '#00D95F' }]}>~2 hrs</Text>
              <Text style={[styles.roiCalcLabel, { color: theme.textMuted }]}>To break even</Text>
            </View>
          </View>
          <View style={styles.guaranteeBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#00D95F" />
            <Text style={styles.guaranteeText}>
              30-Day ROI Guarantee: Earn $14.99+ in your first month using Rescue Mode, or your next month is free.
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {[
            { icon: 'chatbubble-ellipses', title: 'Blueprint Guide AI', desc: 'Your personal accountability coach — answers based on your active blueprints and progress.' },
            { icon: 'construct', title: 'Troubleshooting Matrix', desc: 'Stuck on a step? Get 3 AI-generated workarounds instantly. Never be blocked again.' },
            { icon: 'diamond', title: 'High-Ticket Blueprints', desc: 'Unlock 5 exclusive high-earning blueprints that free users can\'t access.' },
            { icon: 'flash', title: 'Priority Access', desc: 'Get early access to new blueprints, categories, and features as we launch them.' },
          ].map((f, i) => (
            <View key={i} style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.featureIconBox}>
                <Ionicons name={f.icon as any} size={22} color="#00D95F" />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: theme.textSub }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plan Selection */}
        <View style={styles.plansSection}>
          <Text style={styles.plansLabel}>CHOOSE YOUR PLAN</Text>
          <TouchableOpacity
            style={[styles.planOption, { backgroundColor: theme.surface, borderColor: theme.border }, selectedPlan === 'monthly' && styles.planOptionSelected]}
            onPress={() => setSelectedPlan('monthly')}
            data-testid="plan-monthly"
          >
            <View style={styles.planLeft}>
              <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioSelected]} />
              <View>
                <Text style={[styles.planName, { color: theme.text }]}>Monthly</Text>
                <Text style={[styles.planBill, { color: theme.textSub }]}>Billed every month</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, { color: theme.text }]}>$14.99<Text style={styles.planPer}>/mo</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planOption, styles.planOptionAnnual, { backgroundColor: theme.surface, borderColor: theme.border }, selectedPlan === 'annual' && styles.planOptionSelected]}
            onPress={() => setSelectedPlan('annual')}
            data-testid="plan-annual"
          >
            <View style={styles.savingBadge}>
              <Text style={styles.savingText}>SAVE 45%</Text>
            </View>
            <View style={styles.planLeft}>
              <View style={[styles.radio, selectedPlan === 'annual' && styles.radioSelected]} />
              <View>
                <Text style={[styles.planName, { color: theme.text }, selectedPlan === 'annual' && { color: '#00D95F' }]}>Annual</Text>
                <Text style={[styles.planBill, { color: theme.textSub }]}>$8.25/mo · billed as $99/year</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, { color: theme.text }, selectedPlan === 'annual' && { color: '#00D95F' }]}>
              $99<Text style={styles.planPer}>/yr</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={[styles.ctaButton, isLoading && { opacity: 0.6 }]}
            onPress={handleCheckout}
            disabled={isLoading}
            data-testid="checkout-button"
          >
            {isLoading
              ? <ActivityIndicator color="#000" />
              : <>
                  <Ionicons name="flash" size={20} color="#000" />
                  <Text style={styles.ctaText}>Unlock Architect — {selectedPlan === 'monthly' ? '$14.99/mo' : '$99/yr'}</Text>
                </>
            }
          </TouchableOpacity>
          {!!checkoutError && <Text style={styles.errorText}>{checkoutError}</Text>}
          <Text style={[styles.guarantee, { color: theme.textMuted }]}>Cancel anytime · Secure checkout via Stripe</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  statusScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  successIcon: { width: 96, height: 96, borderRadius: 24, backgroundColor: '#00D95F', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statusTitle: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  statusSub: { fontSize: 15, color: '#8E8E8E', textAlign: 'center', lineHeight: 22 },
  doneBtn: { backgroundColor: '#00D95F', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  doneBtnText: { fontSize: 17, fontWeight: '700', color: '#000' },
  navBar: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center' },
  hero: { padding: 24, paddingTop: 16, alignItems: 'center' },
  architectBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#00D95F', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, marginBottom: 20,
  },
  architectBadgeText: { fontSize: 11, fontWeight: '800', color: '#000', letterSpacing: 1.5 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', lineHeight: 42, marginBottom: 12 },
  heroSub: { fontSize: 16, color: '#8E8E8E', textAlign: 'center', lineHeight: 24 },
  featuresSection: { paddingHorizontal: 20, marginBottom: 8 },
  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#1A1C23', borderRadius: 14, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#2A2C35',
  },
  featureIconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#00D95F12', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  featureDesc: { fontSize: 13, color: '#8E8E8E', lineHeight: 18 },
  plansSection: { paddingHorizontal: 20, marginBottom: 20 },
  plansLabel: { fontSize: 11, color: '#4A4A4A', fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  planOption: {
    backgroundColor: '#1A1C23', borderRadius: 14, padding: 18,
    marginBottom: 10, borderWidth: 1.5, borderColor: '#2A2C35',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  planOptionAnnual: { paddingTop: 24 },
  planOptionSelected: { borderColor: '#00D95F', backgroundColor: '#00D95F08' },
  savingBadge: {
    position: 'absolute', top: -10, right: 16,
    backgroundColor: '#00D95F', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  savingText: { fontSize: 9, fontWeight: '800', color: '#000', letterSpacing: 1 },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#2A2C35' },
  radioSelected: { borderColor: '#00D95F', backgroundColor: '#00D95F' },
  planName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  planBill: { fontSize: 12, color: '#4A4A4A' },
  planPrice: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  planPer: { fontSize: 13, fontWeight: '500', color: '#4A4A4A' },
  ctaSection: { paddingHorizontal: 20 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#00D95F', borderRadius: 14, padding: 18, marginBottom: 12,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#000' },
  errorText: { fontSize: 13, color: '#FF6B6B', textAlign: 'center', marginBottom: 10 },
  guarantee: { fontSize: 12, color: '#4A4A4A', textAlign: 'center' },
  // ROI Clock Section
  roiSection: {
    marginHorizontal: 20, marginBottom: 20, backgroundColor: '#0F1019',
    borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#F59E0B30',
  },
  roiHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  roiIconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#F59E0B12',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B30',
  },
  roiTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  roiSub: { fontSize: 11, color: '#4A4A4A' },
  roiCalcRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 14, marginBottom: 14,
  },
  roiCalcItem: { alignItems: 'center', flex: 1 },
  roiCalcNum: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 3 },
  roiCalcLabel: { fontSize: 9, color: '#4A4A4A', textAlign: 'center', letterSpacing: 0.5 },
  guaranteeBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#00D95F08', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#00D95F20',
  },
  guaranteeText: { fontSize: 12, color: '#8E8E8E', flex: 1, lineHeight: 17 },
});
