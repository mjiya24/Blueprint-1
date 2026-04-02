import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  StatusBar, Alert, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type Stage = 'phone' | 'otp' | 'success';

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [stage, setStage] = useState<Stage>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const confirmationRef = useRef<any>(null);
  const recaptchaContainerRef = useRef<View>(null);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      setError('Enter a valid phone number with country code (e.g. +12025551234)');
      return;
    }
    if (Platform.OS !== 'web') {
      Alert.alert('Web Only', 'Phone verification is currently available on web. Open the app in a browser to verify.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { getFirebaseAuth } = await import('../lib/firebase');
      const { signInWithPhoneNumber, RecaptchaVerifier } = await import('firebase/auth');
      const auth = getFirebaseAuth();

      // Create invisible reCAPTCHA container and attach to DOM
      const container = document.createElement('div');
      container.id = 'recaptcha-container-' + Date.now();
      document.body.appendChild(container);

      const recaptchaVerifier = new RecaptchaVerifier(auth, container, {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.');
        },
      });

      const confirmation = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
      confirmationRef.current = confirmation;
      setStage('otp');
    } catch (e: any) {
      console.error('Send OTP error:', e);
      let msg = 'Failed to send code. ';
      if (e.code === 'auth/invalid-phone-number') msg += 'Invalid phone number format.';
      else if (e.code === 'auth/too-many-requests') msg += 'Too many attempts. Wait a few minutes.';
      else if (e.code === 'auth/unauthorized-domain') {
        msg = 'This domain is not authorized in Firebase. Add it to Firebase Console → Authentication → Settings → Authorized domains.';
      } else msg += e.message || 'Check your phone number and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Enter the 6-digit code sent to your phone');
      return;
    }
    if (!confirmationRef.current) {
      setError('Session expired. Go back and try again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const credential = await confirmationRef.current.confirm(otp);
      const idToken = await credential.user.getIdToken();

      // Get current user from AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (!userData) throw new Error('Not logged in');
      const user = JSON.parse(userData);

      // Call backend to mark phone as verified
      const res = await axios.post(`${API_URL}/api/auth/verify-phone`, {
        user_id: user.id,
        firebase_id_token: idToken,
      });

      // Update local user state
      const updatedUser = {
        ...user,
        phone_number: res.data.phone,
        phone_verified: true,
      };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setStage('success');
    } catch (e: any) {
      console.error('Verify OTP error:', e);
      let msg = 'Verification failed. ';
      if (e.code === 'auth/invalid-verification-code') msg += 'Wrong code. Try again.';
      else if (e.code === 'auth/code-expired') msg += 'Code expired. Request a new one.';
      else msg += e.response?.data?.detail || e.message || 'Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))} style={[styles.backBtn, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.iconBox}>
          <Ionicons name="shield-checkmark" size={40} color="#00D95F" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Verify Your Identity</Text>
        <Text style={[styles.subtitle, { color: theme.textSub }]}>
          A verified phone number unlocks Blueprint Squads — the community of verified Architects helping each other win.
        </Text>

        {stage === 'phone' && (
          <View style={styles.form}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <Text style={styles.hint}>Include your country code (e.g. +1 for USA)</Text>
            <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="call" size={18} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 555 123 4567"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                autoFocus
                data-testid="phone-input"
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
              data-testid="send-otp-btn"
            >
              {loading
                ? <ActivityIndicator size="small" color="#000" />
                : <>
                    <Ionicons name="paper-plane" size={18} color="#000" />
                    <Text style={styles.btnText}>Send Verification Code</Text>
                  </>
              }
            </TouchableOpacity>

            <View style={styles.securityNote}>
              <Ionicons name="lock-closed" size={12} color="#4A4A4A" />
              <Text style={styles.securityText}>Secured by Firebase. We never share your number.</Text>
            </View>
          </View>
        )}

        {stage === 'otp' && (
          <View style={styles.form}>
            <View style={styles.sentBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#00D95F" />
              <Text style={styles.sentText}>Code sent to {phone}</Text>
            </View>
            <Text style={styles.label}>VERIFICATION CODE</Text>
            <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="keypad" size={18} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={otp}
                onChangeText={setOtp}
                placeholder="6-digit code"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                data-testid="otp-input"
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
              data-testid="verify-otp-btn"
            >
              {loading
                ? <ActivityIndicator size="small" color="#000" />
                : <>
                    <Ionicons name="shield-checkmark" size={18} color="#000" />
                    <Text style={styles.btnText}>Verify My Identity</Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendLink} onPress={() => setStage('phone')}>
              <Text style={styles.resendText}>Back to phone number</Text>
            </TouchableOpacity>
          </View>
        )}

        {stage === 'success' && (
          <View style={styles.form}>
            <View style={styles.successCard}>
              <View style={styles.successIconRing}>
                <Ionicons name="checkmark-circle" size={60} color="#00D95F" />
              </View>
              <Text style={styles.successTitle}>Identity Verified!</Text>
              <Text style={styles.successSub}>
                You are now a verified Architect. Blueprint Squads will be available in the next sprint.
              </Text>
              <View style={styles.unlockedBadge}>
                <Ionicons name="people" size={14} color="#00D95F" />
                <Text style={styles.unlockedText}>Blueprint Squads — Unlocked</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
              data-testid="verification-done-btn"
            >
              <Text style={styles.btnText}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  navBar: {
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center',
  },
  content: { paddingHorizontal: 24, paddingBottom: 60, alignItems: 'center' },
  iconBox: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: '#00D95F12', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#00D95F30', marginBottom: 20, marginTop: 16,
  },
  title: {
    fontSize: 28, fontWeight: '900', color: '#FFFFFF',
    textAlign: 'center', marginBottom: 12,
  },
  subtitle: {
    fontSize: 14, color: '#8E8E8E', textAlign: 'center',
    lineHeight: 20, marginBottom: 32, paddingHorizontal: 8,
  },
  form: { width: '100%' },
  label: {
    fontSize: 11, fontWeight: '700', color: '#4A4A4A',
    letterSpacing: 1.5, marginBottom: 4,
  },
  hint: { fontSize: 12, color: '#4A4A4A', marginBottom: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1C23', borderRadius: 12, borderWidth: 1,
    borderColor: '#2A2C35', paddingHorizontal: 14, marginBottom: 16, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontSize: 16, color: '#FFFFFF', height: '100%',
    outlineStyle: 'none',
  } as any,
  errorText: {
    fontSize: 13, color: '#EF4444', marginBottom: 12,
    backgroundColor: '#EF444410', padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#EF444430',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00D95F', borderRadius: 14, paddingVertical: 15,
    marginBottom: 12, width: '100%',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  securityNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    justifyContent: 'center', marginTop: 8,
  },
  securityText: { fontSize: 11, color: '#4A4A4A' },
  sentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#00D95F10', borderRadius: 10, padding: 12,
    marginBottom: 20, borderWidth: 1, borderColor: '#00D95F30',
  },
  sentText: { fontSize: 14, color: '#00D95F', fontWeight: '500' },
  resendLink: { alignItems: 'center', paddingVertical: 8 },
  resendText: { fontSize: 13, color: '#4A4A4A' },
  successCard: { alignItems: 'center', paddingVertical: 20, marginBottom: 24 },
  successIconRing: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: '#00D95F12', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#00D95F30', marginBottom: 20,
  },
  successTitle: {
    fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 12,
  },
  successSub: {
    fontSize: 14, color: '#8E8E8E', textAlign: 'center', lineHeight: 20, marginBottom: 20,
  },
  unlockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#00D95F10', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#00D95F30',
  },
  unlockedText: { fontSize: 13, fontWeight: '600', color: '#00D95F' },
});
