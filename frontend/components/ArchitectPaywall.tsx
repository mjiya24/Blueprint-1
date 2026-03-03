import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Props {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

export function ArchitectPaywall({ visible, onClose, feature = 'this feature' }: Props) {
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.badgeRow}>
          <View style={styles.architectBadge}>
            <Ionicons name="flash" size={14} color="#000" />
            <Text style={styles.architectBadgeText}>ARCHITECT TIER</Text>
          </View>
        </View>

        <Text style={styles.title}>Unlock {feature}</Text>
        <Text style={styles.subtitle}>
          Get the full Blueprint execution stack — AI coaching, troubleshooting,
          and high-ticket income blueprints.
        </Text>

        {/* Feature list */}
        {[
          'Blueprint Guide AI accountability coach',
          'Troubleshooting Matrix for every stuck step',
          'Top 5 high-ticket income blueprints',
          'Priority support & early access features',
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#00D95F" />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}

        {/* Plans */}
        <View style={styles.plansRow}>
          <View style={styles.planCard}>
            <Text style={styles.planLabel}>Monthly</Text>
            <Text style={styles.planPrice}>$14.99</Text>
            <Text style={styles.planPer}>/month</Text>
          </View>
          <View style={[styles.planCard, styles.planCardBest]}>
            <View style={styles.bestBadge}>
              <Text style={styles.bestText}>BEST VALUE</Text>
            </View>
            <Text style={[styles.planLabel, { color: '#00D95F' }]}>Annual</Text>
            <Text style={[styles.planPrice, { color: '#00D95F' }]}>$99</Text>
            <Text style={styles.planPer}>/year · save 45%</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          data-testid="architect-upgrade-cta"
          onPress={() => { onClose(); router.push('/architect-upgrade'); }}
        >
          <Ionicons name="flash" size={18} color="#000" />
          <Text style={styles.ctaText}>Become an Architect</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    backgroundColor: '#0D0E14', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#2A2C35',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2C35',
    alignSelf: 'center', marginBottom: 20,
  },
  badgeRow: { alignItems: 'center', marginBottom: 16 },
  architectBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#00D95F', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
  },
  architectBadgeText: { fontSize: 11, fontWeight: '800', color: '#000', letterSpacing: 1.5 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8E8E8E', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  featureText: { fontSize: 14, color: '#FFFFFF', flex: 1 },
  plansRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 20 },
  planCard: {
    flex: 1, backgroundColor: '#1A1C23', borderRadius: 14,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2A2C35',
  },
  planCardBest: { borderColor: '#00D95F40', backgroundColor: '#00D95F08' },
  bestBadge: {
    backgroundColor: '#00D95F', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, marginBottom: 8,
  },
  bestText: { fontSize: 9, fontWeight: '800', color: '#000', letterSpacing: 1 },
  planLabel: { fontSize: 13, color: '#8E8E8E', fontWeight: '600', marginBottom: 4 },
  planPrice: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  planPer: { fontSize: 11, color: '#4A4A4A', marginTop: 2 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#00D95F', borderRadius: 14, padding: 18,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#000' },
  dismissBtn: { alignItems: 'center', marginTop: 14 },
  dismissText: { fontSize: 14, color: '#4A4A4A' },
});
