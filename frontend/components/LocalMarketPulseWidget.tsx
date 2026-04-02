import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Blueprint {
  id: string;
  title: string;
  category: string;
  potential_earnings: string;
  match_score?: number;
}

interface Props {
  userId: string;
  city: string;
  countryCode: string;
}

const CAT_COLORS: Record<string, string> = {
  'AI & Automation': '#6366F1', 'Agency & B2B': '#3B82F6',
  'Digital & Content': '#EC4899', 'Passive & Investment': '#10B981',
  'Local & Service': '#EF4444', 'No-Code & SaaS': '#8B5CF6',
};

export function LocalMarketPulseWidget({ userId, city, countryCode }: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrending();
  }, [city, countryCode]);

  const loadTrending = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/blueprints/local-trending`, {
        params: { city, country_code: countryCode, user_id: userId },
      });
      setBlueprints(res.data.blueprints || []);
    } catch (e) {
      console.error('Local trending error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ActivityIndicator color="#00D95F" size="small" />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Finding top earners near {city}...</Text>
      </View>
    );
  }

  if (!blueprints.length) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <View style={styles.locPin}>
            <Ionicons name="location" size={12} color="#00D95F" />
          </View>
          <View>
            <Text style={styles.label}>TRENDING IN {city.toUpperCase()}</Text>
            <Text style={[styles.sublabel, { color: theme.textMuted }]}>Top earners for your market</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/discover')}
          data-testid="local-pulse-see-all"
        >
          <Text style={styles.seeAll}>View all</Text>
        </TouchableOpacity>
      </View>

      {/* Blueprint rows */}
      {blueprints.map((bp, i) => {
        const color = CAT_COLORS[bp.category] || '#00D95F';
        return (
          <TouchableOpacity
            key={bp.id}
            style={[styles.row, { borderBottomColor: theme.border }]}
            onPress={() => router.push({ pathname: '/blueprint-detail', params: { id: bp.id } })}
            activeOpacity={0.75}
            data-testid={`local-trending-${bp.id}`}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.rankNum, { color: theme.border }]}>{i + 1}</Text>
              <View>
                <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>{bp.title}</Text>
                <View style={[styles.catPill, { backgroundColor: color + '18' }]}>
                  <Text style={[styles.catText, { color }]}>{bp.category}</Text>
                </View>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowEarnings}>{bp.potential_earnings}</Text>
              {bp.match_score && (
                <Text style={[styles.matchScore, { color: bp.match_score >= 75 ? '#00D95F' : '#F59E0B' }]}>
                  {bp.match_score}%
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#1A1C23', borderRadius: 18,
    borderWidth: 1, borderColor: '#00D95F20', overflow: 'hidden',
  },
  loadingCard: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#1A1C23', borderRadius: 18, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#2A2C35',
  },
  loadingText: { fontSize: 13, color: '#4A4A4A' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2A2C35',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locPin: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#00D95F18', justifyContent: 'center', alignItems: 'center',
  },
  label: { fontSize: 11, color: '#00D95F', fontWeight: '800', letterSpacing: 1 },
  sublabel: { fontSize: 10, color: '#4A4A4A', marginTop: 1 },
  seeAll: { fontSize: 12, color: '#00D95F', fontWeight: '600' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1A1C23',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  rankNum: { fontSize: 15, fontWeight: '800', color: '#2A2C35', width: 20, textAlign: 'center' },
  rowTitle: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 4, maxWidth: 200 },
  catPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, alignSelf: 'flex-start' },
  catText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  rowRight: { alignItems: 'flex-end' },
  rowEarnings: { fontSize: 12, fontWeight: '700', color: '#00D95F' },
  matchScore: { fontSize: 10, fontWeight: '700', marginTop: 3 },
});
