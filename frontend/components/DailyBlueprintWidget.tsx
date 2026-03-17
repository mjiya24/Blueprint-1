import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Props {
  userId: string;
  profile: any;
}

export function DailyBlueprintWidget({ userId, profile }: Props) {
  const router = useRouter();
  const [blueprint, setBlueprint] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) loadDaily();
  }, [userId]);

  const loadDaily = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/blueprints/daily/${userId}`);
      setBlueprint(res.data);
    } catch {
      // No v2 blueprints yet — hide widget
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return null;
  if (!blueprint) return null;

  const score = blueprint.match_score || 78;
  const scoreColor = score >= 80 ? '#00D95F' : score >= 60 ? '#F59E0B' : '#8E8E8E';

  return (
    <TouchableOpacity
      style={styles.widget}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/blueprint-detail', params: { id: blueprint.id } })}
      data-testid="daily-blueprint-widget"
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.dayBadge}>
          <Ionicons name="calendar" size={11} color="#00D95F" />
          <Text style={styles.dayBadgeText}>TODAY'S BLUEPRINT</Text>
        </View>
        <View style={[styles.rarityBadge, { backgroundColor: scoreColor + '18', borderColor: scoreColor + '40' }]}>
          <View style={[styles.rarityDot, { backgroundColor: scoreColor }]} />
          <Text style={[styles.rarityText, { color: scoreColor }]}>CURATED FOR YOU</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.body}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}%</Text>
          <Text style={styles.scoreLabel}>Match</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.categoryRow}>
            <Text style={styles.category}>{blueprint.category}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>{blueprint.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="cash-outline" size={11} color="#00D95F" />
              <Text style={styles.metaText}>{blueprint.potential_earnings}</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="time-outline" size={11} color="#8E8E8E" />
              <Text style={styles.metaText}>{blueprint.time_to_first_dollar}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>17-step blueprint · Tap to explore</Text>
        <Ionicons name="arrow-forward" size={14} color="#00D95F" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  widget: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#0D0E14', borderRadius: 18,
    padding: 16, borderWidth: 1.5, borderColor: '#00D95F30',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  dayBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dayBadgeText: { fontSize: 10, color: '#00D95F', fontWeight: '800', letterSpacing: 1.5 },
  rarityBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  rarityDot: { width: 6, height: 6, borderRadius: 3 },
  rarityText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  body: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  scoreCircle: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#2A2C35', flexShrink: 0,
  },
  scoreNum: { fontSize: 17, fontWeight: '800', lineHeight: 20 },
  scoreLabel: { fontSize: 9, color: '#4A4A4A', fontWeight: '600' },
  info: { flex: 1 },
  categoryRow: { marginBottom: 4 },
  category: { fontSize: 10, color: '#4A4A4A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', lineHeight: 20, marginBottom: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1A1C23', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  metaText: { fontSize: 10, color: '#8E8E8E', fontWeight: '500' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1A1C23' },
  footerText: { fontSize: 11, color: '#4A4A4A' },
});
