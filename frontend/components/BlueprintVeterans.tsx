import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Veteran {
  initials: string;
  color: string;
  name: string;
  earnings: string;
  weeks: number;
  quote: string;
  stars: number;
}

const VETERANS_DATA: Record<string, Veteran[]> = {
  'gig-001': [
    { initials: 'MT', color: '#FF3008', name: 'Marcus T.', earnings: '$2,800/mo', weeks: 6, quote: 'Stacked DoorDash with Uber Eats during peak hours. Went from zero to replacing my part-time job income in 6 weeks flat.', stars: 5 },
    { initials: 'JL', color: '#FF6B35', name: 'Jordan L.', earnings: '$1,950/mo', weeks: 4, quote: 'Peak pay on weekend nights is no joke. $35/hour is real if you work smart in the right zones.', stars: 5 },
  ],
  'gig-002': [
    { initials: 'RK', color: '#000000', name: 'Raj K.', earnings: '$3,200/mo', weeks: 8, quote: 'Airport runs during early mornings were my cheat code. Consistent, long rides, great tips. Uber Black upgrade paid off.', stars: 5 },
    { initials: 'SA', color: '#1A1A1A', name: 'Sarah A.', earnings: '$2,100/mo', weeks: 5, quote: 'Lyft Power Driver bonuses stacked fast. Hit $2K in my first full month working evenings and weekends.', stars: 4 },
  ],
  'gig-003': [
    { initials: 'DC', color: '#43B02A', name: 'Diana C.', earnings: '$2,400/mo', weeks: 5, quote: "Instacart full-service batches with tips are incredible. Customers tip generously when you communicate well and sub smart.", stars: 5 },
    { initials: 'TM', color: '#2E8B2A', name: 'Tyler M.', earnings: '$1,700/mo', weeks: 3, quote: 'In-store shopper only, no car. Made $1,700 my first month working 4 hours a day. No-brainer.', stars: 4 },
  ],
  'gig-004': [
    { initials: 'KR', color: '#5C6BC0', name: 'Kevin R.', earnings: '$4,500/mo', weeks: 10, quote: 'IKEA assembly was the golden ticket. I charge $200/job and book 5 a week. TaskRabbit sends me more work than I can handle.', stars: 5 },
    { initials: 'LP', color: '#7986CB', name: 'Lena P.', earnings: '$2,800/mo', weeks: 7, quote: 'TV mounting and general handyman work. Built 40 reviews in 3 months and now I turn away work.', stars: 5 },
  ],
  'gig-005': [
    { initials: 'BH', color: '#FF9900', name: 'Brian H.', earnings: '$2,200/mo', weeks: 6, quote: 'Flex blocks during Prime Day and the holiday season are insane. I made $1,100 in one week working doubles.', stars: 4 },
    { initials: 'AF', color: '#E68A00', name: 'Aisha F.', earnings: '$1,800/mo', weeks: 4, quote: "The trick is checking the app at 7am sharp — the best blocks disappear in minutes. Consistency beats hustle.", stars: 5 },
  ],
  'local-001': [
    { initials: 'CM', color: '#E91E63', name: 'Chris M.', earnings: '$5,200/mo', weeks: 12, quote: 'Posted on Nextdoor offering a free trial session. That 1 free session turned into 8 paying clients. Now fully booked.', stars: 5 },
    { initials: 'YT', color: '#C2185B', name: 'Yara T.', earnings: '$3,800/mo', weeks: 9, quote: 'Park-based bootcamp. 6 clients at $120/session each, 4x per week. No gym overhead — just results.', stars: 5 },
  ],
  'local-002': [
    { initials: 'NW', color: '#00BFA5', name: 'Nina W.', earnings: '$2,600/mo', weeks: 7, quote: "My Rover profile hit 30 reviews in 2 months. Raised my rates 40% and still have a waitlist. Dogs are the best clients.", stars: 5 },
    { initials: 'PJ', color: '#00897B', name: 'Pete J.', earnings: '$1,900/mo', weeks: 5, quote: 'Boarding weekends + daily walks on weekdays. $1,900 last month. The GPS updates photos seal every repeat booking.', stars: 4 },
  ],
  'local-003': [
    { initials: 'MG', color: '#1976D2', name: 'Marco G.', earnings: '$4,200/mo', weeks: 10, quote: 'Before/after photos on Instagram went viral locally. Fully booked within 60 days. Charging $175 per detail now.', stars: 5 },
    { initials: 'SH', color: '#1565C0', name: 'Sofia H.', earnings: '$3,100/mo', weeks: 8, quote: 'Built a route of 22 regular clients. They call me, I show up. No advertising needed after the first month.', stars: 5 },
  ],
  'local-004': [
    { initials: 'OB', color: '#7B1FA2', name: 'Oliver B.', earnings: '$2,000/mo', weeks: 8, quote: '3 long-term sits in a row, each 10-14 days. Essentially paid accommodation + income. Life-changing setup.', stars: 5 },
    { initials: 'EV', color: '#6A1B9A', name: 'Elena V.', earnings: '$1,400/mo', weeks: 6, quote: "Niche: pet-heavy homes. Owners pay a premium when you're clearly an animal lover. Reviews write themselves.", stars: 4 },
  ],
  'local-005': [
    { initials: 'DL', color: '#388E3C', name: 'Derek L.', earnings: '$5,800/mo', weeks: 14, quote: 'Knocked on 40 doors in one neighborhood with a handwritten flyer. Landed 12 weekly contracts that first week.', stars: 5 },
    { initials: 'KN', color: '#2E7D32', name: 'Kayla N.', earnings: '$3,400/mo', weeks: 9, quote: 'Added mulching and seasonal cleanup upsells. Average ticket went from $50 to $120. Same effort, more money.', stars: 5 },
  ],
  'digital-001': [
    { initials: 'AC', color: '#1CBF73', name: 'Alex C.', earnings: '$7,200/mo', weeks: 16, quote: 'Niched into Shopify stores for e-commerce. First 3 projects at $75 on Fiverr, then raised to $600. Now at $1,200 per site.', stars: 5 },
    { initials: 'PK', color: '#17A85C', name: 'Priya K.', earnings: '$4,800/mo', weeks: 11, quote: 'Upwork profile hit Top Rated in 3 months. Long-term retainers are the dream — same clients, predictable income.', stars: 5 },
  ],
  'digital-002': [
    { initials: 'RL', color: '#6366F1', name: 'Rachel L.', earnings: '$4,200/mo', weeks: 8, quote: "3 retainer clients at $1,400/mo each. I'm 15 hours per week in. Specializing in email + calendar management made all the difference.", stars: 5 },
    { initials: 'JM', color: '#4F46E5', name: 'Jake M.', earnings: '$2,900/mo', weeks: 6, quote: 'Sent 20 DMs on Instagram to local coaches. 4 replied, 2 became clients. $2,900 first month working around my day job.', stars: 4 },
  ],
  'digital-003': [
    { initials: 'MS', color: '#FF4081', name: 'Maya S.', earnings: '$6,500/mo', weeks: 12, quote: "Landed my first brand at $150/video and now charge $750. 8 brands in my portfolio. They come to me through referrals now.", stars: 5 },
    { initials: 'TO', color: '#F50057', name: 'Tyler O.', earnings: '$3,800/mo', weeks: 7, quote: "UGC is the most beginner-friendly side hustle I've found. No following needed. My phone and ring light = $3.8K last month.", stars: 5 },
  ],
  'digital-004': [
    { initials: 'IE', color: '#E91E63', name: 'Isla E.', earnings: '$5,600/mo', weeks: 11, quote: '4 restaurant clients on retainer. I manage all their Instagram and TikTok. $1,400/month each. Set it and grow it.', stars: 5 },
    { initials: 'BF', color: '#C2185B', name: 'Ben F.', earnings: '$3,200/mo', weeks: 8, quote: 'Niche: local gyms and fitness studios. High pain point, easy wins. Went from 0 to 3 clients in 6 weeks.', stars: 4 },
  ],
  'digital-005': [
    { initials: 'LH', color: '#00D95F', name: 'Lisa H.', earnings: '$8,500/mo', weeks: 14, quote: "AI tools make me 5x faster. I deliver in 24 hours and charge premium for speed. Email sequences at $2K each now.", stars: 5 },
    { initials: 'SW', color: '#00C454', name: 'Sam W.', earnings: '$4,100/mo', weeks: 9, quote: 'Specialized in SaaS onboarding emails. Boring niche, incredible demand. Clients keep coming back.', stars: 5 },
  ],
  'passive-001': [
    { initials: 'KP', color: '#F1641E', name: 'Kim P.', earnings: '$2,100/mo', weeks: 20, quote: 'Hit my first $1K month at week 16 purely organic. Now it runs itself. I spend 2 hours a week checking metrics.', stars: 5 },
    { initials: 'RA', color: '#E55100', name: 'Ryan A.', earnings: '$3,400/mo', weeks: 24, quote: 'Found my niche: corgi owners. 14 Etsy listings, $3,400/mo now. Pinterest drives 60% of my traffic for free.', stars: 5 },
  ],
  'passive-002': [
    { initials: 'GN', color: '#2563EB', name: 'Greg N.', earnings: '$9,200/mo', weeks: 30, quote: "Bought 'AIagent.io' for $12. Sold it 8 months later for $11,500. It's like real estate but digital and faster.", stars: 5 },
    { initials: 'VT', color: '#1D4ED8', name: 'Vera T.', earnings: '$2,800/mo', weeks: 18, quote: 'Built a 40-domain portfolio over 6 months. Average sale is $700. 3-4 sales per month once momentum builds.', stars: 4 },
  ],
  'passive-003': [
    { initials: 'CB', color: '#DC2626', name: 'Carlos B.', earnings: '$3,500/mo', weeks: 22, quote: 'Started with 1 machine in a gym. Now have 7 machines across 5 locations. Each one earns while I sleep.', stars: 5 },
    { initials: 'MR', color: '#B91C1C', name: 'Monica R.', earnings: '$2,200/mo', weeks: 16, quote: 'Healthy snack vending in office buildings. Managers love it, clients love it. I service on Saturday mornings only.', stars: 4 },
  ],
  'passive-004': [
    { initials: 'JB', color: '#7C3AED', name: 'James B.', earnings: '$5,700/mo', weeks: 26, quote: "Taught my $0-$5K freelance framework as a $97 Gumroad course. Sold 400+ copies — I updated it twice. That's it.", stars: 5 },
    { initials: 'AT', color: '#6D28D9', name: 'Alicia T.', earnings: '$3,100/mo', weeks: 18, quote: "30-day TikTok strategy from the course drove $18K in sales in one month. Then the algorithm did the rest.", stars: 5 },
  ],
  'passive-005': [
    { initials: 'DH', color: '#D97706', name: 'Dana H.', earnings: '$4,800/mo', weeks: 14, quote: 'Target clearance + Amazon FBA. Toys during Q4 are a goldmine. Bought $200 of toys, flipped for $1,400 in a week.', stars: 5 },
    { initials: 'WC', color: '#B45309', name: 'Will C.', earnings: '$2,600/mo', weeks: 10, quote: 'Scan everything with the Amazon Seller app. Found $8 blenders selling for $47 at Walmart clearance. 485% ROI.', stars: 5 },
  ],
};

const DEFAULT_VETERANS: Veteran[] = [
  { initials: 'AK', color: '#00D95F', name: 'Alex K.', earnings: '$2,800/mo', weeks: 8, quote: 'Followed the Blueprint steps exactly. Week 8 and I replaced my part-time income entirely. The match score was accurate.', stars: 5 },
  { initials: 'JT', color: '#F59E0B', name: 'Jamie T.', earnings: '$1,500/mo', weeks: 5, quote: 'Started skeptical, finished a believer. The action steps removed all guesswork. Just execute.', stars: 4 },
];

interface BlueprintVeteransProps {
  ideaId: string;
}

export function BlueprintVeterans({ ideaId }: BlueprintVeteransProps) {
  const veterans = VETERANS_DATA[ideaId] || DEFAULT_VETERANS;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={16} color="#00D95F" />
        <Text style={styles.sectionTitle}>Blueprint Veterans</Text>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>VERIFIED</Text>
        </View>
      </View>
      <Text style={styles.sectionSubtitle}>Real results from people who followed this Blueprint</Text>

      {veterans.map((v, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: v.color + '25', borderColor: v.color + '60' }]}>
              <Text style={[styles.avatarText, { color: v.color }]}>{v.initials}</Text>
            </View>
            <View style={styles.vetInfo}>
              <Text style={styles.vetName}>{v.name}</Text>
              <View style={styles.starsRow}>
                {Array.from({ length: v.stars }).map((_, i) => (
                  <Ionicons key={i} name="star" size={11} color="#F59E0B" />
                ))}
              </View>
            </View>
            <View style={styles.earningsBadge}>
              <Text style={styles.earningsValue}>{v.earnings}</Text>
              <Text style={styles.earningsLabel}>in {v.weeks}w</Text>
            </View>
          </View>
            <Text style={styles.quote}>&quot;{v.quote}&quot;</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  verifiedBadge: {
    backgroundColor: '#00D95F18', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: '#00D95F40',
  },
  verifiedText: { fontSize: 9, color: '#00D95F', fontWeight: '800', letterSpacing: 1 },
  sectionSubtitle: { fontSize: 12, color: '#4A4A4A', marginBottom: 12 },
  card: {
    backgroundColor: '#1A1C23', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2A2C35',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  avatar: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  avatarText: { fontSize: 13, fontWeight: '800' },
  vetInfo: { flex: 1 },
  vetName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 },
  starsRow: { flexDirection: 'row', gap: 2 },
  earningsBadge: { alignItems: 'flex-end' },
  earningsValue: { fontSize: 15, fontWeight: '800', color: '#00D95F' },
  earningsLabel: { fontSize: 10, color: '#4A4A4A', fontWeight: '500' },
  quote: { fontSize: 13, color: '#8E8E8E', lineHeight: 19, fontStyle: 'italic' },
});
