import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';
const { height: screenHeight } = Dimensions.get('window');

interface Props {
  visible: boolean;
  blueprint: any;
  onClose: () => void;
  onUpgradeSuccess: () => void;
  user: any;
}

const ARCHITECT_BENEFITS = [
  {
    icon: 'lock-open',
    title: 'Unlimited High-Value Blueprints',
    desc: 'Access all 500+ premium blueprints worth $3K–$25K/month',
  },
  {
    icon: 'book',
    title: 'Step-by-Step Implementation Guides',
    desc: 'Detailed playbooks for execution, not just ideas',
  },
  {
    icon: 'chatbubbles',
    title: 'Priority AI Support',
    desc: '24/7 personalized advice from Architect mentors',
  },
  {
    icon: 'trending-up',
    title: 'Income Roadmap Builder',
    desc: 'AI maps your path to your first $1K in 30 days',
  },
  {
    icon: 'checkmark-circle',
    title: 'Verification & Due Diligence',
    desc: 'Every blueprint is source-verified with legal checks',
  },
  {
    icon: 'people',
    title: 'Community & Accountability',
    desc: 'Join the Architect cohort for peer support',
  },
];

export function PaywallModal({ visible, blueprint, onClose, onUpgradeSuccess, user }: Props) {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/users/${user.id}/upgrade`,
        { tier: 'architect' }
      );

      if (response.status === 200) {
        Alert.alert('🎉 Welcome to Architect Tier!', 'All premium blueprints are now unlocked.');
        onUpgradeSuccess();
        onClose();
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Upgrade failed. Please try again.';
      Alert.alert('Upgrade Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.headerwrap}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <View style={styles.crownBadge}>
                <Ionicons name="star" size={20} color="#FFD700" />
              </View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Architect Tier</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>Unlock premium blueprints</Text>
            </View>
          </View>

          {/* Blueprint Preview */}
          {blueprint && (
            <View style={[styles.blueprintPreview, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <Ionicons name="lock-closed" size={28} color="#FFD700" />
              <Text style={[styles.blueprintTitle, { color: theme.text }]} numberOfLines={2}>
                {blueprint.title}
              </Text>
              <Text style={[styles.blueprintEarnings, { color: '#00D95F' }]}>
                {blueprint.potential_earnings}
              </Text>
            </View>
          )}

          {/* Benefits Scroll */}
          <ScrollView style={styles.benefitsScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.benefitsTitle, { color: theme.text }]}>What's Included:</Text>
            {ARCHITECT_BENEFITS.map((benefit, idx) => (
              <View key={idx} style={styles.benefitRow}>
                <View style={[styles.benefitIcon, { backgroundColor: '#FFD70018' }]}>
                  <Ionicons name={benefit.icon as any} size={18} color="#FFD700" />
                </View>
                <View style={styles.benefitText}>
                  <Text style={[styles.benefitName, { color: theme.text }]}>{benefit.title}</Text>
                  <Text style={[styles.benefitDesc, { color: theme.textMuted }]}>{benefit.desc}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* CTA */}
          <View style={styles.ctaWrap}>
            <TouchableOpacity
              style={[styles.upgradeBtn, { opacity: isLoading ? 0.6 : 1 }]}
              onPress={handleUpgrade}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Ionicons name="star" size={16} color="#000" />
                  <Text style={styles.upgradeBtnText}>Upgrade to Architect ($9.99/mo)</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: screenHeight * 0.78,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  headerwrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  headerContent: {
    alignItems: 'center',
  },
  crownBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFD70018',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFD70040',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  blueprintPreview: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
  },
  blueprintTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  blueprintEarnings: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  benefitsScroll: {
    maxHeight: screenHeight * 0.35,
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
  },
  benefitName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  ctaWrap: {
    gap: 12,
  },
  upgradeBtn: {
    flexDirection: 'row',
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  upgradeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
