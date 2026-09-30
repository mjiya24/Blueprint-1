import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  role: 'customer' | 'creator';
  profile: Record<string, any>;
  theme: { surface: string; border: string; text: string; textSub: string; textMuted: string; accent: string };
};

const memberAttributes = [
  ['time', 'Daily Focus Time', '15 mins/day'],
  ['school', 'Primary Learning Mode', 'Interactive Widgets, Video, Micro-Checklists'],
  ['layers', 'Active Focus Domains', 'Trading, Fitness, AI'],
] as const;

const creatorAttributes = [
  ['bulb', 'Niche / Expertise', 'Practical execution systems'],
  ['megaphone', 'Primary Distribution Channel', 'Instagram, TikTok, YouTube, Newsletter'],
  ['cash', 'Monetization Model', 'Paid paths and memberships'],
  ['people', 'Active Community Size', '1,824 members'],
] as const;

export function PathfinderProfileCard({ role, profile, theme }: Props) {
  const attributes = role === 'creator' ? creatorAttributes : memberAttributes;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {attributes.map(([icon, label, fallback]) => (
        <View key={label} style={styles.row}>
          <View style={[styles.icon, { backgroundColor: `${theme.accent}18` }]}>
            <Ionicons name={icon as any} size={17} color={theme.accent} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
            <Text style={[styles.value, { color: theme.text }]}>{profile[label] || fallback}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  rowLast: { marginBottom: 0 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  copy: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 3 },
  value: { fontSize: 13, fontWeight: '800' },
});