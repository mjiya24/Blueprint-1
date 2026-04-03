import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

interface Props {
  userId: string;
  userName?: string;
}

export function ReferralCard({ userId, userName = '' }: Props) {
  const { theme } = useTheme();
  const [refData, setRefData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const elevatedCard = theme.isDark ? null : {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  };

  useEffect(() => {
    loadReferral();
  }, [userId]);

  const loadReferral = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/referrals/${userId}`);
      setRefData(res.data);
    } catch (e) {
      console.error('Referral load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!refData?.referral_code) return;
    await Clipboard.setStringAsync(refData.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!refData?.referral_link) return;
    try {
      const result = await Share.share({
        message: `I'm making money with Blueprint! Use my code ${refData.referral_code} to get a bonus when you sign up: ${refData.referral_link}`,
        url: refData.referral_link,
      });

      // User cancellation is expected and should not be treated as an error.
      if (result?.action === Share.dismissedAction) return;
    } catch (e) {
      const err = e as { name?: string; message?: string };
      const message = String(err?.message || '').toLowerCase();
      const isCanceled = err?.name === 'AbortError' || message.includes('cancellation of share');
      if (isCanceled) return;

      console.error('Share error:', e);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#00D95F" size="small" />
      </View>
    );
  }

  if (!refData) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.accent + '20' }, elevatedCard]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="people-outline" size={18} color="#00D95F" />
          <Text style={[styles.title, { color: theme.text }]}>Referral Engine</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+100 ARC / REFERRAL</Text>
        </View>
      </View>

      {/* Referral code box */}
      <View style={[styles.codeBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <View style={styles.codeLeft}>
          <Text style={[styles.codeLabel, { color: theme.textSub }]}>YOUR CODE</Text>
          <Text style={[styles.code, { color: theme.text }]}>{refData.referral_code}</Text>
        </View>
        <TouchableOpacity style={[styles.copyBtn, { backgroundColor: theme.surface }]} onPress={handleCopyCode}>
          <Ionicons
            name={copied ? 'checkmark-circle' : 'copy-outline'}
            size={16}
            color={copied ? '#00D95F' : theme.textSub}
          />
          <Text style={[styles.copyBtnText, { color: theme.textSub }, copied && { color: '#00D95F' }]}> 
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: theme.surfaceAlt }]}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{refData.referred_count}</Text>
          <Text style={[styles.statLabel, { color: theme.textSub }]}>Friends Invited</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#6366F1' }]}>{refData.arc_from_referrals}</Text>
          <Text style={[styles.statLabel, { color: theme.textSub }]}>ARC Earned</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>$0</Text>
          <Text style={[styles.statLabel, { color: theme.textSub }]}>Cash Earned</Text>
        </View>
      </View>

      {/* Share button */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Ionicons name="share-social-outline" size={16} color="#000" />
        <Text style={styles.shareBtnText}>Share My Blueprint Link</Text>
      </TouchableOpacity>

      <Text style={[styles.fine, { color: theme.textSub }]}> 
        You earn 100 ARC for every friend who signs up. They get 25 ARC free.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { height: 60, justifyContent: 'center', alignItems: 'center' },
  container: {
    backgroundColor: '#0D0E14',
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#00D95F20',
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  badge: {
    backgroundColor: '#6366F115', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#6366F130',
  },
  badgeText: { fontSize: 9, color: '#818CF8', fontWeight: '800', letterSpacing: 0.5 },
  codeBox: {
    backgroundColor: '#1A1C23', borderRadius: 14,
    padding: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#2A2C35',
  },
  codeLeft: { gap: 2 },
  codeLabel: { fontSize: 9, color: '#4A4A4A', fontWeight: '700', letterSpacing: 1 },
  code: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#2A2C35', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: { fontSize: 12, color: '#8E8E8E', fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1C23', borderRadius: 14, padding: 14,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: '#2A2C35' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#00D95F', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#4A4A4A' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00D95F', borderRadius: 14, paddingVertical: 16,
  },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  fine: { fontSize: 11, color: '#4A4A4A', textAlign: 'center', lineHeight: 16 },
});
