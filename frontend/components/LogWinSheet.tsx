import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Haptics from 'expo-haptics';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onWinLogged?: (amount: number, arcAwarded: number) => void;
  userId: string;
  ideaId: string;
  platformName: string;
}

export function LogWinSheet({ visible, onClose, onWinLogged, userId, ideaId, platformName }: Props) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [arcAwarded, setArcAwarded] = useState(0);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setAmount('');
      setSuccess(false);
      setArcAwarded(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSkip = () => {
    onClose();
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/quick-wins/log`, {
        user_id: userId,
        idea_id: ideaId,
        platform_name: platformName,
        amount_earned: amountNum,
      });
      setArcAwarded(res.data.arc_awarded || 0);
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Play success animation
      Animated.spring(successScale, {
        toValue: 1, useNativeDriver: true,
        tension: 80, friction: 8,
      }).start();
      // Auto-close after 2.5s
      setTimeout(() => {
        if (onWinLogged) onWinLogged(amountNum, res.data.arc_awarded || 0);
        onClose();
      }, 2400);
    } catch (e) {
      console.error('Log win error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleSkip} activeOpacity={1} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.avoidView}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />

          {success ? (
            /* Success state */
            <View style={styles.successState}>
              <Animated.View style={[styles.successIcon, { transform: [{ scale: successScale }] }]}>
                <Ionicons name="trophy" size={40} color="#000" />
              </Animated.View>
              <Text style={styles.successTitle}>Win Logged! 🎉</Text>
              <Text style={styles.successSub}>+{arcAwarded} ARC credits earned</Text>
              <View style={styles.successAmountRow}>
                <Text style={styles.successAmount}>${parseFloat(amount).toFixed(2)}</Text>
                <Text style={styles.successAmountLabel}>added to your earnings</Text>
              </View>
            </View>
          ) : (
            /* Input state */
            <View style={styles.content}>
              <View style={styles.emojiRow}>
                <Text style={styles.emoji}>💰</Text>
              </View>
              <Text style={styles.title}>Did you win?</Text>
              <Text style={styles.subtitle}>
                Log how much you made on {platformName} to earn ARC credits and track your progress.
              </Text>

              {/* Amount input */}
              <View style={styles.inputRow}>
                <View style={styles.currencyIcon}>
                  <Text style={styles.currencySymbol}>$</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#2A2C35"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus
                />
              </View>

              {/* Quick amounts */}
              <View style={styles.quickAmounts}>
                {['5', '10', '25', '50'].map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.quickBtn, amount === a && styles.quickBtnActive]}
                    onPress={() => setAmount(a)}
                  >
                    <Text style={[styles.quickBtnText, amount === a && styles.quickBtnTextActive]}>
                      ${a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Buttons */}
              <TouchableOpacity
                style={[styles.logBtn, (!amount || parseFloat(amount) <= 0) && styles.logBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting || !amount || parseFloat(amount) <= 0}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.logBtnText}>Log My Win</Text>
                    <Ionicons name="flash" size={18} color="#000" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  avoidView: {
    flex: 1, justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#0D0E14',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: 1, borderColor: '#2A2C35',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#2A2C35', alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  emojiRow: { alignItems: 'center', marginBottom: 12 },
  emoji: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#4A4A4A', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1C23', borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#00D95F40', overflow: 'hidden',
  },
  currencyIcon: {
    width: 52, height: 64, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#00D95F15',
  },
  currencySymbol: { fontSize: 26, fontWeight: '800', color: '#00D95F' },
  input: {
    flex: 1, height: 64, fontSize: 32, fontWeight: '800',
    color: '#FFFFFF', paddingHorizontal: 16,
  },
  quickAmounts: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickBtn: {
    flex: 1, backgroundColor: '#1A1C23', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#2A2C35',
  },
  quickBtnActive: { backgroundColor: '#00D95F15', borderColor: '#00D95F' },
  quickBtnText: { fontSize: 16, fontWeight: '700', color: '#8E8E8E' },
  quickBtnTextActive: { color: '#00D95F' },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00D95F', borderRadius: 14, paddingVertical: 18, marginBottom: 12,
  },
  logBtnDisabled: { opacity: 0.4 },
  logBtnText: { fontSize: 17, fontWeight: '700', color: '#000' },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipBtnText: { fontSize: 14, color: '#4A4A4A' },
  // Success state
  successState: {
    paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center', gap: 12,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#00D95F', justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  successSub: { fontSize: 14, color: '#00D95F', fontWeight: '600' },
  successAmountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1A1C23', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
    marginTop: 4,
  },
  successAmount: { fontSize: 28, fontWeight: '800', color: '#00D95F' },
  successAmountLabel: { fontSize: 13, color: '#4A4A4A' },
});
