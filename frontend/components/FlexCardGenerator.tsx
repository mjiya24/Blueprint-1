import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

interface Props {
  blueprintTitle: string;
  topPercent: number;
  earnings: number;
  completionDays: number;
  city?: string;
  percentileLabel: string;
  onShared?: () => void;
}

export function FlexCardGenerator({
  blueprintTitle, topPercent, earnings, completionDays, city, percentileLabel, onShared,
}: Props) {
  const cardRef = useRef<View>(null);

  const handleShare = async () => {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'file' });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Blueprint Win!',
        });
        onShared?.();
      } else {
        Alert.alert('Saved!', 'Screenshot saved. Share it on TikTok, Instagram, or LinkedIn!');
      }
    } catch (e) {
      console.error('Share error:', e);
      Alert.alert('Share', `Blueprint Achievement:\n\nCompleted: ${blueprintTitle}\nRank: Top ${topPercent}% of Architects${earnings > 0 ? `\nEarned: $${earnings}` : ''}\nTime: ${completionDays} days\n\n#Blueprint #ArchitectYourIncome`);
    }
  };

  const earningsDisplay = earnings >= 1000
    ? `$${(earnings / 1000).toFixed(1)}K`
    : `$${earnings}`;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionLabel}>YOUR ACHIEVEMENT CARD</Text>
      <Text style={styles.sectionSub}>Tap share to post — your users are your marketing</Text>

      {/* Capturable card */}
      <View ref={cardRef} style={styles.card} collapsable={false}>
        {/* Mint accent bar */}
        <View style={styles.accentBar} />

        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.brand}>
            <Ionicons name="grid" size={12} color="#000" />
            <Text style={styles.brandText}>BLUEPRINT</Text>
          </View>
          <View style={styles.verifiedPill}>
            <Ionicons name="checkmark-circle" size={12} color="#00D95F" />
            <Text style={styles.verifiedText}>VERIFIED WIN</Text>
          </View>
        </View>

        {/* Rank hero */}
        <View style={styles.rankBlock}>
          <Text style={styles.rankLabel}>ARCHITECT RANK</Text>
          <Text style={styles.rankNum}>
            Top <Text style={styles.rankAccent}>{topPercent < 1 ? '<1' : topPercent}%</Text>
          </Text>
          <View style={[styles.levelPill]}>
            <Text style={styles.levelText}>{percentileLabel.toUpperCase()}</Text>
          </View>
        </View>

        {/* Blueprint name */}
        <View style={styles.blueprintBox}>
          <Text style={styles.blueprintTitle} numberOfLines={2}>{blueprintTitle}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {earnings > 0 && (
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{earningsDisplay}</Text>
              <Text style={styles.statLabel}>EARNED</Text>
            </View>
          )}
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{completionDays}d</Text>
            <Text style={styles.statLabel}>COMPLETED</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerCity}>{city || 'Architect Network'}</Text>
          <Text style={styles.footerBrand}>blueprint.app</Text>
        </View>
      </View>

      {/* Share CTA */}
      <TouchableOpacity
        style={styles.shareBtn}
        onPress={handleShare}
        data-testid="flex-share-btn"
        activeOpacity={0.85}
      >
        <Ionicons name="share-social" size={18} color="#000" />
        <Text style={styles.shareBtnText}>Share My Win</Text>
      </TouchableOpacity>
      <Text style={styles.shareHint}>TikTok · Instagram · LinkedIn</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: '#00D95F', letterSpacing: 1.5,
    marginBottom: 4, alignSelf: 'flex-start',
  },
  sectionSub: { fontSize: 12, color: '#4A4A4A', marginBottom: 16, alignSelf: 'flex-start' },

  card: {
    width: '100%', backgroundColor: '#080A10', borderRadius: 20,
    overflow: 'hidden', borderWidth: 1, borderColor: '#00D95F25',
    paddingBottom: 16,
  },
  accentBar: { height: 3, backgroundColor: '#00D95F', width: '100%', marginBottom: 16 },

  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, marginBottom: 4,
  },
  brand: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#00D95F', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
  },
  brandText: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 1 },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#00D95F15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: '#00D95F30',
  },
  verifiedText: { fontSize: 9, fontWeight: '700', color: '#00D95F', letterSpacing: 0.8 },

  rankBlock: { paddingHorizontal: 18, marginTop: 12, marginBottom: 8 },
  rankLabel: { fontSize: 9, color: '#4A4A4A', fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  rankNum: { fontSize: 44, fontWeight: '900', color: '#FFFFFF', lineHeight: 48 },
  rankAccent: { color: '#00D95F' },
  levelPill: {
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: '#00D95F20', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#00D95F50',
  },
  levelText: { fontSize: 10, fontWeight: '800', color: '#00D95F', letterSpacing: 1.5 },

  blueprintBox: {
    marginHorizontal: 18, backgroundColor: '#0F1019', borderRadius: 10,
    padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#1E2030',
  },
  blueprintTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', lineHeight: 20 },

  statsRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 18, marginBottom: 16,
  },
  statCard: {
    flex: 1, backgroundColor: '#0F1019', borderRadius: 10, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#1E2030',
  },
  statNum: { fontSize: 22, fontWeight: '900', color: '#00D95F' },
  statLabel: { fontSize: 9, color: '#4A4A4A', fontWeight: '700', letterSpacing: 1, marginTop: 2 },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 18, alignItems: 'center',
  },
  footerCity: { fontSize: 11, color: '#4A4A4A', fontWeight: '500' },
  footerBrand: { fontSize: 11, color: '#2A2C35', fontWeight: '600', letterSpacing: 0.5 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#00D95F', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
    marginTop: 16, width: '100%',
  },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  shareHint: { fontSize: 11, color: '#4A4A4A', marginTop: 8, marginBottom: 4 },
});
