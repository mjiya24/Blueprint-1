import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const CATEGORY_COLORS: Record<string, string> = {
  'AI & Automation': '#6366F1',
  'No-Code & SaaS': '#8B5CF6',
  'Digital & Content': '#EC4899',
  'Agency & B2B': '#3B82F6',
  'Local & Service': '#10B981',
  'Passive & Investment': '#F59E0B',
};

interface Props {
  blueprint: any;
  showMatch?: boolean;
}

export function BlueprintCard({ blueprint, showMatch = true }: Props) {
  const router = useRouter();
  const catColor = CATEGORY_COLORS[blueprint.category] || '#00D95F';
  const score = blueprint.match_score;
  const scoreColor = score >= 80 ? '#00D95F' : score >= 60 ? '#F59E0B' : '#4A4A4A';
  const diffIcon = blueprint.difficulty === 'easy' ? 'battery-charging' : blueprint.difficulty === 'hard' ? 'flame' : 'remove';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/blueprint-detail', params: { id: blueprint.id } })}
      activeOpacity={0.75}
      data-testid={`blueprint-card-${blueprint.id}`}
    >
      {/* Category stripe */}
      <View style={[styles.catStripe, { backgroundColor: catColor }]} />

      <View style={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.catDot, { backgroundColor: catColor + '20', borderColor: catColor + '50' }]}>
            <Ionicons name="grid" size={14} color={catColor} />
          </View>
          {showMatch && score !== undefined && (
            <View style={[styles.matchBadge, { backgroundColor: scoreColor + '18' }]}>
              <Text style={[styles.matchText, { color: scoreColor }]}>{score}%</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={3}>{blueprint.title}</Text>

        {/* Earnings */}
        <Text style={styles.earnings} numberOfLines={1}>{blueprint.potential_earnings}</Text>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Ionicons name={diffIcon as any} size={12} color={catColor} />
            <Text style={[styles.diffText, { color: catColor }]}>{blueprint.difficulty}</Text>
          </View>
          <View style={styles.stepsTag}>
            <Text style={styles.stepsText}>17 steps</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200, backgroundColor: '#1A1C23', borderRadius: 16,
    borderWidth: 1, borderColor: '#2A2C35', overflow: 'hidden', marginRight: 10,
  },
  catStripe: { height: 3, width: '100%' },
  body: { padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  catDot: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  matchBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  matchText: { fontSize: 11, fontWeight: '800' },
  title: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', lineHeight: 18, marginBottom: 8, minHeight: 54 },
  earnings: { fontSize: 12, color: '#00D95F', fontWeight: '600', marginBottom: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  diffText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  stepsTag: { backgroundColor: '#0D0E14', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  stepsText: { fontSize: 9, color: '#4A4A4A', fontWeight: '600' },
});
