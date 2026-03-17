import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Blueprint {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  potential_earnings: string;
  time_to_first_dollar: string;
  match_score?: number;
  startup_cost?: string;
}

interface Carousel {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  blueprints: Blueprint[];
}

interface Props {
  carousel: Carousel;
}

const getMatchColor = (score: number) =>
  score >= 75 ? '#00D95F' : score >= 55 ? '#F59E0B' : '#8E8E8E';

const DIFF_COLORS: Record<string, string> = {
  easy: '#00D95F', medium: '#F59E0B', hard: '#FF6B6B',
  beginner: '#00D95F', intermediate: '#F59E0B', advanced: '#FF6B6B',
};

export function CategoryCarousel({ carousel }: Props) {
  const router = useRouter();

  if (!carousel.blueprints?.length) return null;

  return (
    <View style={styles.section} data-testid={`carousel-${carousel.id}`}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBadge, { backgroundColor: carousel.color + '18' }]}>
            <Ionicons name={carousel.icon as any} size={14} color={carousel.color} />
          </View>
          <View>
            <Text style={styles.title}>{carousel.title}</Text>
            <Text style={styles.subtitle}>{carousel.subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(tabs)/discover', params: { category: carousel.id } })}
          data-testid={`carousel-see-all-${carousel.id}`}
        >
          <Text style={[styles.seeAll, { color: carousel.color }]}>See all</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {carousel.blueprints.map((bp) => {
          const diffColor = DIFF_COLORS[bp.difficulty] || '#8E8E8E';
          const matchColor = bp.match_score ? getMatchColor(bp.match_score) : null;
          return (
            <TouchableOpacity
              key={bp.id}
              style={[styles.card, { borderColor: carousel.color + '25' }]}
              onPress={() => router.push({ pathname: '/blueprint-detail', params: { id: bp.id } })}
              activeOpacity={0.75}
              data-testid={`carousel-card-${bp.id}`}
            >
              {/* Category + match */}
              <View style={styles.cardTop}>
                <View style={[styles.catBadge, { backgroundColor: carousel.color + '15' }]}>
                  <Text style={[styles.catText, { color: carousel.color }]} numberOfLines={1}>
                    {bp.category}
                  </Text>
                </View>
                {matchColor && bp.match_score && (
                  <View style={[styles.matchPill, { borderColor: matchColor + '40' }]}>
                    <View style={[styles.matchDot, { backgroundColor: matchColor }]} />
                    <Text style={[styles.matchText, { color: matchColor }]}>{bp.match_score}%</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardTitle} numberOfLines={2}>{bp.title}</Text>

              {/* Earnings */}
              <Text style={[styles.earnings, { color: carousel.color }]} numberOfLines={1}>
                {bp.potential_earnings}
              </Text>

              {/* Footer pills */}
              <View style={styles.cardFooter}>
                <View style={[styles.diffPill, { backgroundColor: diffColor + '15' }]}>
                  <Text style={[styles.diffText, { color: diffColor }]}>{bp.difficulty}</Text>
                </View>
                {bp.time_to_first_dollar && (
                  <View style={styles.timePill}>
                    <Ionicons name="time-outline" size={9} color="#4A4A4A" />
                    <Text style={styles.timeText} numberOfLines={1}>{bp.time_to_first_dollar}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconBadge: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 11, color: '#4A4A4A', marginTop: 1 },
  seeAll: { fontSize: 12, fontWeight: '600' },
  scroll: { paddingHorizontal: 20, gap: 10 },
  card: {
    width: 180,
    backgroundColor: '#0D0E14',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 6 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flex: 1 },
  catText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  matchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
    backgroundColor: 'transparent',
  },
  matchDot: { width: 5, height: 5, borderRadius: 3 },
  matchText: { fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', lineHeight: 18, marginBottom: 8 },
  earnings: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  diffPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  diffText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 10, color: '#4A4A4A', maxWidth: 80 },
});
