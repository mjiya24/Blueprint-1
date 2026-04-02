import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface Win {
  id: string;
  user_name: string;
  user_initials: string;
  user_color: string;
  blueprint_title: string;
  category: string;
  earnings_amount: number;
  earnings_period: string;
  quote: string;
  weeks_to_earn: number;
  verified: boolean;
  upvotes: number;
  created_at: string;
}

interface Props {
  win: Win;
  onUpvote: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI & Automation': '#6366F1',
  'Digital & Content': '#EC4899',
  'Agency & B2B': '#3B82F6',
  'No-Code & SaaS': '#8B5CF6',
  'Local & Service': '#10B981',
  'Passive & Investment': '#F59E0B',
  'Gig Economy': '#EF4444',
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function WinCard({ win, onUpvote }: Props) {
  const { theme } = useTheme();
  const catColor = CATEGORY_COLORS[win.category] || '#00D95F';
  const earnings = win.earnings_amount >= 1000
    ? `$${(win.earnings_amount / 1000).toFixed(1)}K`
    : `$${win.earnings_amount}`;
  const elevatedCard = theme.isDark ? null : {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCard]} data-testid={`win-card-${win.id}`}>
      {/* Accent stripe */}
      <View style={[styles.accentStripe, { backgroundColor: catColor }]} />

      <View style={styles.body}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={[styles.avatar, { backgroundColor: win.user_color + '22', borderColor: win.user_color + '55' }]}>
            <Text style={[styles.avatarText, { color: win.user_color }]}>{win.user_initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{win.user_name}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
                <Text style={[styles.catText, { color: catColor }]}>{win.category}</Text>
              </View>
              <Text style={[styles.timeAgo, { color: theme.textMuted }]}>{timeAgo(win.created_at)}</Text>
            </View>
          </View>
          {win.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#00D95F" />
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          )}
        </View>

        {/* Blueprint + Earnings */}
        <View style={[styles.earningsRow, { backgroundColor: theme.surfaceAlt }]}>
          <View style={styles.earningsLeft}>
            <Text style={styles.earningsAmount}>{earnings}</Text>
            <Text style={[styles.earningsPeriod, { color: theme.textSub }]}>{win.earnings_period}</Text>
          </View>
          <View style={styles.earningsMeta}>
            <Text style={[styles.blueprintLabel, { color: theme.textMuted }]}>via Blueprint</Text>
            <Text style={[styles.blueprintTitle, { color: theme.text }]} numberOfLines={2}>{win.blueprint_title}</Text>
            <Text style={[styles.weeksText, { color: theme.textSub }]}>in {win.weeks_to_earn} weeks</Text>
          </View>
        </View>

        {/* Quote */}
        <Text style={[styles.quote, { color: theme.textSub }]}>"{win.quote}"</Text>

        {/* Footer */}
        <TouchableOpacity style={styles.upvoteRow} onPress={onUpvote}>
          <Ionicons name="arrow-up-circle-outline" size={18} color={theme.textMuted} />
          <Text style={[styles.upvoteCount, { color: theme.textSub }]}>{win.upvotes || 0}</Text>
          <Text style={[styles.upvoteLabel, { color: theme.textMuted }]}>inspiring</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#1A1C23', borderRadius: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#2A2C35', overflow: 'hidden',
  },
  accentStripe: { width: 4, flexShrink: 0 },
  body: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, flexShrink: 0 },
  avatarText: { fontSize: 13, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  catText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  timeAgo: { fontSize: 11, color: '#4A4A4A' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { fontSize: 9, color: '#00D95F', fontWeight: '800', letterSpacing: 0.5 },
  earningsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10, backgroundColor: '#0D0E14', borderRadius: 10, padding: 12 },
  earningsLeft: { alignItems: 'center' },
  earningsAmount: { fontSize: 28, fontWeight: '800', color: '#00D95F', lineHeight: 32 },
  earningsPeriod: { fontSize: 10, color: '#4A4A4A', fontWeight: '600' },
  earningsMeta: { flex: 1 },
  blueprintLabel: { fontSize: 10, color: '#4A4A4A', fontWeight: '600', letterSpacing: 0.5, marginBottom: 3 },
  blueprintTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', lineHeight: 18, marginBottom: 3 },
  weeksText: { fontSize: 11, color: '#8E8E8E' },
  quote: { fontSize: 13, color: '#8E8E8E', lineHeight: 18, fontStyle: 'italic', marginBottom: 10 },
  upvoteRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  upvoteCount: { fontSize: 13, color: '#4A4A4A', fontWeight: '700' },
  upvoteLabel: { fontSize: 11, color: '#4A4A4A' },
});
