import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Props {
  streak: number;
  isToday?: boolean;
}

export function StreakBadge({ streak, isToday = false }: Props) {
  const router = useRouter();
  if (streak === 0) return null;

  const isHot = streak >= 7;
  const isOnFire = streak >= 30;
  const color = isOnFire ? '#FF6B35' : isHot ? '#F59E0B' : '#4A4A4A';
  const bgColor = isOnFire ? '#FF6B3518' : isHot ? '#F59E0B18' : '#1A1C23';
  const borderColor = isOnFire ? '#FF6B3540' : isHot ? '#F59E0B40' : '#2A2C35';

  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: bgColor, borderColor }]}
      onPress={() => router.push('/streak')}
      data-testid="streak-badge"
    >
      <Ionicons
        name={streak > 0 ? "flame" : "flame-outline"}
        size={16}
        color={color}
      />
      <Text style={[styles.count, { color }]}>{streak}</Text>
      <Text style={styles.label}>day{streak !== 1 ? 's' : ''}</Text>
      {!isToday && (
        <View style={styles.alertDot} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, position: 'relative',
  },
  count: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 11, color: '#4A4A4A', fontWeight: '600' },
  alertDot: {
    position: 'absolute', top: -2, right: -2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FF6B35', borderWidth: 1.5, borderColor: '#000',
  },
});
