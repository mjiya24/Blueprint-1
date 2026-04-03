import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const AD_DURATION = 30; // seconds

interface Props {
  visible: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  userId: string;
  featureId: string;
  featureName?: string;
}

export function RewardedAdGate({ visible, onClose, onUnlocked, userId, featureId, featureName = 'Go Deeper' }: Props) {
  const [phase, setPhase] = useState<'prompt' | 'watching' | 'success'>('prompt');
  const [countdown, setCountdown] = useState(AD_DURATION);
  const [canSkip, setCanSkip] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setPhase('prompt');
      setCountdown(AD_DURATION);
      setCanSkip(false);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      clearInterval(timerRef.current);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const startWatchingAd = () => {
    setPhase('watching');
    setCountdown(AD_DURATION);
    progressAnim.setValue(0);
    // Animate progress bar over AD_DURATION seconds
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: AD_DURATION * 1000,
      useNativeDriver: false,
    }).start();
    // Countdown timer
    let remaining = AD_DURATION;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= AD_DURATION - 5) setCanSkip(true);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        handleAdComplete();
      }
    }, 1000);
  };

  const handleAdComplete = async () => {
    setPhase('success');
    try {
      await axios.post(`${API_URL}/api/ads/reward-verify`, {
        user_id: userId,
        feature_id: featureId,
        ad_type: 'rewarded_video',
      });
    } catch (e) {
      console.error('Ad verify error:', e);
    }
    setTimeout(() => {
      onUnlocked();
    }, 1500);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={phase === 'prompt' ? onClose : undefined} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        {phase === 'prompt' && (
          <View style={styles.content}>
            <View style={styles.iconBox}>
              <Ionicons name="play-circle" size={48} color="#00D95F" />
            </View>
            <Text style={styles.title}>Unlock {featureName}</Text>
            <Text style={styles.subtitle}>
              Watch a 30-second ad to unlock Gemini AI tactical analysis for this step — for free.
            </Text>

            <View style={styles.perksRow}>
              <View style={styles.perk}>
                <Ionicons name="flash" size={14} color="#00D95F" />
                <Text style={styles.perkText}>5 Local Leads</Text>
              </View>
              <View style={styles.perk}>
                <Ionicons name="copy-outline" size={14} color="#00D95F" />
                <Text style={styles.perkText}>DM Script</Text>
              </View>
              <View style={styles.perk}>
                <Ionicons name="shield" size={14} color="#00D95F" />
                <Text style={styles.perkText}>Objection Guide</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.watchBtn} onPress={startWatchingAd}>
              <Ionicons name="play" size={16} color="#000" />
              <Text style={styles.watchBtnText}>Watch 30s Ad to Unlock</Text>
            </TouchableOpacity>

            <Text style={styles.orText}>— or —</Text>

            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={onClose}
            >
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.upgradeBtnText}>Upgrade to Architect — $14.99/mo</Text>
            </TouchableOpacity>

            <Text style={styles.fine}>Unlock valid for 24 hours · +5 ARC for watching</Text>
          </View>
        )}

        {phase === 'watching' && (
          <View style={styles.content}>
            <View style={styles.adPreview}>
              {/* Simulated ad placeholder */}
              <View style={styles.adMockup}>
                <Ionicons name="play-circle-outline" size={40} color="#4A4A4A" />
                <Text style={styles.adMockupText}>Advertisement</Text>
                <Text style={styles.adMockupSub}>Your ad would play here</Text>
                <Text style={[styles.adMockupSub, { fontSize: 10, color: '#2A2C35', marginTop: 4 }]}>
                  ca-pub-7453043458871233
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <Animated.View style={[styles.progressBar, {
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            </View>

            <View style={styles.watchingFooter}>
              <Text style={styles.countdownText}>
                {countdown > 0 ? `${countdown}s remaining` : 'Almost done!'}
              </Text>
              {canSkip && (
                <TouchableOpacity style={styles.skipBtn} onPress={handleAdComplete}>
                  <Text style={styles.skipBtnText}>Skip →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {phase === 'success' && (
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={56} color="#00D95F" />
            </View>
            <Text style={styles.successTitle}>Unlocked!</Text>
            <Text style={styles.successSub}>+5 ARC earned · Go Deeper is ready</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  panel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#0D0E14',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: 1, borderColor: '#2A2C35',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#2A2C35', alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8, gap: 14 },
  iconBox: { alignItems: 'center', paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#4A4A4A', textAlign: 'center', lineHeight: 20 },
  perksRow: { flexDirection: 'row', justifyContent: 'space-around' },
  perk: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00D95F08', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#00D95F20',
  },
  perkText: { fontSize: 11, color: '#00D95F', fontWeight: '600' },
  watchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00D95F', borderRadius: 14, paddingVertical: 16,
  },
  watchBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  orText: { textAlign: 'center', color: '#4A4A4A', fontSize: 12 },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F59E0B10', borderRadius: 12, paddingVertical: 13,
    borderWidth: 1, borderColor: '#F59E0B30',
  },
  upgradeBtnText: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  fine: { fontSize: 11, color: '#4A4A4A', textAlign: 'center' },
  // Watching phase
  adPreview: { marginTop: 8 },
  adMockup: {
    backgroundColor: '#1A1C23', borderRadius: 14,
    height: 160, justifyContent: 'center', alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: '#2A2C35', borderStyle: 'dashed',
  },
  adMockupText: { fontSize: 14, color: '#4A4A4A', fontWeight: '600' },
  adMockupSub: { fontSize: 11, color: '#2A2C35' },
  progressContainer: {
    height: 5, backgroundColor: '#1A1C23', borderRadius: 3, overflow: 'hidden',
  },
  progressBar: { height: 5, backgroundColor: '#00D95F', borderRadius: 3 },
  watchingFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  countdownText: { fontSize: 13, color: '#4A4A4A' },
  skipBtn: {
    backgroundColor: '#1A1C23', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8,
  },
  skipBtnText: { fontSize: 13, color: '#00D95F', fontWeight: '600' },
  // Success
  successContent: {
    paddingVertical: 32, alignItems: 'center', gap: 12,
  },
  successIcon: { marginBottom: 4 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  successSub: { fontSize: 14, color: '#00D95F' },
});
