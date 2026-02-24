import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NewsItem {
  headline: string;
  source: string;
  time: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

const MARKET_DATA: Record<string, NewsItem[]> = {
  'gig-001': [
    { headline: 'DoorDash Q4 earnings beat Wall St. expectations by 12%', source: 'Bloomberg', time: '2h ago', sentiment: 'positive' },
    { headline: "Dasher tips up 18% in Q1 — 'tipping culture' on the rise", source: 'TechCrunch', time: '5h ago', sentiment: 'positive' },
  ],
  'gig-002': [
    { headline: 'Uber surges to record rider activity as commuting rebounds', source: 'Reuters', time: '3h ago', sentiment: 'positive' },
    { headline: 'Lyft driver earnings rise 22% with new bonus structures', source: 'Forbes', time: '1d ago', sentiment: 'positive' },
  ],
  'gig-003': [
    { headline: 'Instacart grocery delivery demand up 31% post-pandemic', source: 'WSJ', time: '4h ago', sentiment: 'positive' },
    { headline: 'Shoppers earn average $23/hr on Instacart, survey finds', source: 'Business Insider', time: '2d ago', sentiment: 'positive' },
  ],
  'gig-004': [
    { headline: 'TaskRabbit sees record holiday-season bookings across 50 cities', source: 'CNBC', time: '6h ago', sentiment: 'positive' },
    { headline: 'Demand for furniture assembly services grows 44% with IKEA expansion', source: 'MarketWatch', time: '1d ago', sentiment: 'positive' },
  ],
  'gig-005': [
    { headline: 'Amazon Flex rolls out higher pay tiers in 30+ new markets', source: 'The Verge', time: '8h ago', sentiment: 'positive' },
    { headline: 'Amazon same-day delivery demand hits record high in metro areas', source: 'Reuters', time: '2d ago', sentiment: 'positive' },
  ],
  'local-001': [
    { headline: 'Personal training market to reach $50B by 2028 — IBISWorld', source: 'IBISWorld', time: '1d ago', sentiment: 'positive' },
    { headline: "Outdoor & park-based fitness booming — 'gyms going where clients are'", source: 'Entrepreneur', time: '3d ago', sentiment: 'positive' },
  ],
  'local-002': [
    { headline: 'Rover reports 40% YoY booking surge as pet ownership peaks', source: 'Pet Business', time: '4h ago', sentiment: 'positive' },
    { headline: '72% of dog owners would pay premium for GPS-tracked walks', source: 'Rover Blog', time: '2d ago', sentiment: 'positive' },
  ],
  'local-003': [
    { headline: 'Mobile car detailing projected to grow 8.3% annually through 2030', source: 'IBISWorld', time: '5h ago', sentiment: 'positive' },
    { headline: "Car detailing TikToks driving 'dramatic reveal' trend — bookings up", source: 'Inc.', time: '3d ago', sentiment: 'positive' },
  ],
  'local-004': [
    { headline: 'TrustedHousesitters reports 65% growth in verified sitter applications', source: 'Bloomberg', time: '6h ago', sentiment: 'positive' },
    { headline: "Remote work boom fuels 'slow travel' — house sitting demand doubles", source: 'NYT', time: '2d ago', sentiment: 'positive' },
  ],
  'local-005': [
    { headline: 'Lawn care services revenue climbs 11% as suburban migration continues', source: 'MarketWatch', time: '4h ago', sentiment: 'positive' },
    { headline: 'Nextdoor sees 3x increase in lawn care service requests in 2025', source: 'Nextdoor Blog', time: '1d ago', sentiment: 'positive' },
  ],
  'digital-001': [
    { headline: 'Fiverr Pro web design gigs average $2,400 per project in Q1 2026', source: 'Fiverr Blog', time: '3h ago', sentiment: 'positive' },
    { headline: 'Small businesses increase web design budgets 34% following AI wave', source: 'HubSpot', time: '1d ago', sentiment: 'positive' },
  ],
  'digital-002': [
    { headline: 'VA demand surges 55% as founders outsource ops to focus on growth', source: 'Entrepreneur', time: '5h ago', sentiment: 'positive' },
    { headline: 'Top VAs earn $6K+/month — specialization is the new gold standard', source: 'Forbes', time: '2d ago', sentiment: 'positive' },
  ],
  'digital-003': [
    { headline: 'UGC creator rates climb 60% as brands shift from influencer to raw content', source: 'Adweek', time: '2h ago', sentiment: 'positive' },
    { headline: 'Meta allocates $2B more to UGC-style ad spend in 2026', source: 'Business Insider', time: '1d ago', sentiment: 'positive' },
  ],
  'digital-004': [
    { headline: 'Instagram and TikTok SMB ad revenue up 28% — managers in demand', source: 'Social Media Today', time: '4h ago', sentiment: 'positive' },
    { headline: 'LinkedIn reports 71% of SMBs plan to hire social managers in 2026', source: 'LinkedIn News', time: '2d ago', sentiment: 'positive' },
  ],
  'digital-005': [
    { headline: 'AI copywriters command 2x freelance rates, Upwork data shows', source: 'Upwork Blog', time: '3h ago', sentiment: 'positive' },
    { headline: 'Email marketing ROI hits $42 for every $1 spent — demand soars', source: 'Campaign Monitor', time: '1d ago', sentiment: 'positive' },
  ],
  'passive-001': [
    { headline: 'Etsy print-on-demand market hits $10.2B — fastest growing segment', source: 'eMarketer', time: '6h ago', sentiment: 'positive' },
    { headline: 'Printify partners with TikTok Shop — direct product tagging live', source: 'Printify Blog', time: '2d ago', sentiment: 'positive' },
  ],
  'passive-002': [
    { headline: 'AI startup wave driving surge in brandable domain valuations', source: 'Sedo', time: '5h ago', sentiment: 'positive' },
    { headline: 'Single-word .com domains sell for avg $14,000 in Q4 2025', source: 'DNJournal', time: '3d ago', sentiment: 'positive' },
  ],
  'passive-003': [
    { headline: 'US vending machine industry exceeds $23B — operators report record margins', source: 'IBISWorld', time: '4h ago', sentiment: 'positive' },
    { headline: 'Healthy snack vending sees 3x revenue vs. traditional machines', source: 'NAMA', time: '2d ago', sentiment: 'positive' },
  ],
  'passive-004': [
    { headline: 'Online course market to reach $370B by 2026 — Gumroad creators thriving', source: 'Gumroad Blog', time: '3h ago', sentiment: 'positive' },
    { headline: 'AI-skills courses see 400% demand spike — creators cashing in', source: 'TechCrunch', time: '1d ago', sentiment: 'positive' },
  ],
  'passive-005': [
    { headline: 'Amazon FBA retail arbitrage sellers report avg 58% profit margins', source: 'Jungle Scout', time: '5h ago', sentiment: 'positive' },
    { headline: 'Q4 clearance season creates peak opportunity — sellers prep now', source: 'Seller Central Blog', time: '2d ago', sentiment: 'positive' },
  ],
};

const DEFAULT_PULSE: NewsItem[] = [
  { headline: 'Gig economy grows 12% — more income streams than ever available', source: 'Forbes', time: '1d ago', sentiment: 'positive' },
  { headline: 'Side income hits record adoption: 45% of Americans have multiple streams', source: 'Bankrate', time: '2d ago', sentiment: 'positive' },
];

const SENTIMENT_COLORS = {
  positive: '#00D95F',
  neutral: '#F59E0B',
  negative: '#FF6B6B',
};

interface MarketPulseProps {
  ideaId: string;
}

export function MarketPulse({ ideaId }: MarketPulseProps) {
  const items = MARKET_DATA[ideaId] || DEFAULT_PULSE;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.pulseDot} />
        <Text style={styles.sectionTitle}>Market Pulse</Text>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <Text style={styles.sectionSubtitle}>What's happening in this space right now</Text>

      {items.map((item, idx) => (
        <View key={idx} style={styles.newsCard}>
          <View style={[styles.sentimentBar, { backgroundColor: SENTIMENT_COLORS[item.sentiment] }]} />
          <View style={styles.newsContent}>
            <Text style={styles.newsHeadline}>{item.headline}</Text>
            <View style={styles.newsMeta}>
              <Ionicons name="newspaper-outline" size={11} color="#4A4A4A" />
              <Text style={styles.newsSource}>{item.source}</Text>
              <Text style={styles.newsDot}>·</Text>
              <Text style={styles.newsTime}>{item.time}</Text>
            </View>
          </View>
          <Ionicons name="trending-up" size={16} color={SENTIMENT_COLORS[item.sentiment]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  pulseDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D95F',
    shadowColor: '#00D95F', shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  liveBadge: {
    backgroundColor: '#00D95F18', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: '#00D95F40',
  },
  liveText: { fontSize: 9, color: '#00D95F', fontWeight: '800', letterSpacing: 1 },
  sectionSubtitle: { fontSize: 12, color: '#4A4A4A', marginBottom: 12 },
  newsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#2A2C35', gap: 10,
  },
  sentimentBar: { width: 3, height: '100%', borderRadius: 2, alignSelf: 'stretch', minHeight: 36 },
  newsContent: { flex: 1 },
  newsHeadline: { fontSize: 13, color: '#FFFFFF', fontWeight: '500', lineHeight: 18, marginBottom: 5 },
  newsMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  newsSource: { fontSize: 11, color: '#4A4A4A', fontWeight: '600' },
  newsDot: { fontSize: 11, color: '#2A2C35' },
  newsTime: { fontSize: 11, color: '#4A4A4A' },
});
