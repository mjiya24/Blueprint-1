import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

type SourceStatus = 'connected' | 'action_required';
type Source = {
  id: string;
  name: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: SourceStatus;
  lastSynced: string;
};

type Roadmap = {
  id: string;
  creator: string;
  title: string;
  category: string;
  phase: string;
  task: string;
  metric: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
};

const initialSources: Source[] = [
  { id: 'health', name: 'Apple Health', detail: 'Health & fitness', icon: 'fitness-outline', status: 'connected', lastSynced: '10m ago' },
  { id: 'finance', name: 'Plaid / Brokerage', detail: 'Cash & portfolio', icon: 'trending-up-outline', status: 'connected', lastSynced: '1h ago' },
  { id: 'commerce', name: 'Shopify Store', detail: 'Revenue & ROAS', icon: 'storefront-outline', status: 'action_required', lastSynced: 'Never' },
];

const roadmaps: Roadmap[] = [
  { id: 'fitness', creator: '@coachsarah', title: 'Hypertrophy Baseline', category: 'Fitness', phase: 'Phase 2 of 4', task: 'Set 3: Dumbbell Press @ 85% 1RM', metric: '1RM calculated from Health data', icon: 'barbell-outline', tone: '#35E4A1' },
  { id: 'finance', creator: '@miamitrader', title: 'DCF Moat Valuation Suite', category: 'Finance', phase: 'Phase 1 of 3', task: 'Review target buy zone for $NVDA', metric: 'Cash flow baseline synced via Plaid', icon: 'trending-up-outline', tone: '#60A5FA' },
  { id: 'commerce', creator: '@ecom_scale', title: 'Winning Product Validator', category: 'E-Commerce', phase: 'Phase 3 of 5', task: 'Recalibrate target ROAS', metric: 'Waiting for Shopify connection', icon: 'storefront-outline', tone: '#FBBF24' },
];

export function UnifiedMemberHub() {
  const { theme } = useTheme();
  const [sources, setSources] = useState(initialSources);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  const connectSource = (source: Source) => {
    setSources((current) => current.map((item) => item.id === source.id
      ? { ...item, status: 'connected', lastSynced: 'Just now' }
      : item));
  };

  const handleSourcePress = (source: Source) => {
    if (source.status === 'connected') {
      setSources((current) => current.map((item) => item.id === source.id ? { ...item, lastSynced: 'Just now' } : item));
      return;
    }
    Alert.alert('Connect data source', `${source.name} is ready for a provider connection. Demo mode marks it synced locally.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark connected', onPress: () => connectSource(source) },
    ]);
  };

  const pickScreenshot = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadedName(result.assets[0].name);
      Alert.alert('Screenshot queued', 'The file is ready for AI extraction in this demo.');
    }
  };

  const connectedCount = sources.filter((source) => source.status === 'connected').length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>UNIVERSAL MEMBER PASSPORT</Text>
          <Text style={[styles.title, { color: theme.text }]}>Your paths, in one view.</Text>
          <Text style={[styles.subtitle, { color: theme.textSub }]}>Permission once. Useful data everywhere you are learning.</Text>
        </View>
        <View style={[styles.passportMark, { backgroundColor: theme.accentLight, borderColor: theme.accent + '55' }]}>
          <Ionicons name="shield-checkmark" size={22} color={theme.accent} />
        </View>
      </View>

      <View style={[styles.passportCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.passportTop}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}><Text style={styles.avatarText}>JD</Text></View>
          <View style={styles.passportIdentity}>
            <Text style={[styles.name, { color: theme.text }]}>John Doe</Text>
            <Text style={[styles.passportStatus, { color: theme.textMuted }]}>Universal Passport · 3 paths active</Text>
          </View>
          <View style={[styles.livePill, { backgroundColor: theme.accentLight }]}><View style={[styles.liveDot, { backgroundColor: theme.accent }]} /><Text style={[styles.liveText, { color: theme.accent }]}>LIVE</Text></View>
        </View>
        <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
          <Stat value="12 days" label="Active streak" color={theme.accent} theme={theme} />
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <Stat value="5 / 7" label="Phases cleared" color="#60A5FA" theme={theme} />
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <Stat value={`${connectedCount} apps`} label="Data vault sync" color="#FBBF24" theme={theme} />
        </View>
      </View>

      <SectionHeader title="Automated data vault" subtitle="Live inputs that keep creator tools current" theme={theme} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourceRow}>
        {sources.map((source) => (
          <TouchableOpacity key={source.id} style={[styles.sourceChip, { backgroundColor: theme.surface, borderColor: source.status === 'connected' ? theme.accent + '55' : theme.warning + '66' }]} onPress={() => handleSourcePress(source)} activeOpacity={0.8}>
            <View style={[styles.sourceIcon, { backgroundColor: source.status === 'connected' ? theme.accentLight : '#F59E0B18' }]}><Ionicons name={source.icon} size={17} color={source.status === 'connected' ? theme.accent : theme.warning} /></View>
            <View style={styles.sourceCopy}><Text style={[styles.sourceName, { color: theme.text }]}>{source.name}</Text><Text style={[styles.sourceDetail, { color: theme.textMuted }]}>{source.status === 'connected' ? `Synced ${source.lastSynced}` : 'Connect to sync'}</Text></View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.sourceChip, styles.uploadChip, { backgroundColor: theme.accentLight, borderColor: theme.accent + '66' }]} onPress={pickScreenshot} activeOpacity={0.8}>
          <View style={[styles.sourceIcon, { backgroundColor: theme.accent }]}><Ionicons name="scan-outline" size={17} color="#06110D" /></View>
          <View style={styles.sourceCopy}><Text style={[styles.sourceName, { color: theme.accent }]}>Drop a screenshot</Text><Text style={[styles.sourceDetail, { color: theme.textSub }]}>{uploadedName || 'AI extract · PDF or image'}</Text></View>
        </TouchableOpacity>
      </ScrollView>

      <SectionHeader title="Unified today feed" subtitle="One next action from every enrolled creator" theme={theme} />
      <View style={styles.roadmapList}>
        {roadmaps.map((roadmap) => (
          <TouchableOpacity key={roadmap.id} style={[styles.roadmapCard, { backgroundColor: theme.surface, borderColor: theme.border }]} activeOpacity={0.82}>
            <View style={styles.roadmapTop}>
              <View style={styles.categoryRow}><View style={[styles.categoryIcon, { backgroundColor: `${roadmap.tone}18` }]}><Ionicons name={roadmap.icon} size={15} color={roadmap.tone} /></View><Text style={[styles.categoryText, { color: theme.textSub }]}>{roadmap.category} · {roadmap.creator}</Text></View>
              <Text style={[styles.phaseText, { color: roadmap.tone }]}>{roadmap.phase}</Text>
            </View>
            <Text style={[styles.roadmapTitle, { color: theme.text }]}>{roadmap.title}</Text>
            <Text style={[styles.task, { color: theme.textSub }]}>{roadmap.task}</Text>
            <View style={[styles.metric, { backgroundColor: `${roadmap.tone}12` }]}><Ionicons name="flash" size={13} color={roadmap.tone} /><Text style={[styles.metricText, { color: roadmap.tone }]}>{roadmap.metric}</Text><Ionicons name="chevron-forward" size={14} color={roadmap.tone} /></View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title, subtitle, theme }: { title: string; subtitle: string; theme: ReturnType<typeof useTheme>['theme'] }) {
  return <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>{subtitle}</Text></View>;
}

function Stat({ value, label, color, theme }: { value: string; label: string; color: string; theme: ReturnType<typeof useTheme>['theme'] }) {
  return <View style={styles.stat}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 860, alignSelf: 'center', padding: 20, paddingTop: 28, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
  headerCopy: { flex: 1, paddingRight: 18 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 8 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 500 },
  passportMark: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  passportCard: { borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 24 },
  passportTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 45, height: 45, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#06110D', fontSize: 15, fontWeight: '900' },
  passportIdentity: { flex: 1, marginLeft: 12 },
  name: { fontSize: 17, fontWeight: '800' },
  passportStatus: { fontSize: 11, marginTop: 3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: 1, marginTop: 17, paddingTop: 15 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 10, marginTop: 3, textAlign: 'center' },
  statDivider: { width: 1, height: 27 },
  sectionHeader: { marginBottom: 11, marginTop: 3 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { fontSize: 11, marginTop: 3 },
  sourceRow: { gap: 10, paddingBottom: 6, paddingRight: 20 },
  sourceChip: { width: 205, minHeight: 70, borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center' },
  uploadChip: { width: 220 },
  sourceIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sourceCopy: { flex: 1, marginLeft: 9 },
  sourceName: { fontSize: 12, fontWeight: '800' },
  sourceDetail: { fontSize: 10, marginTop: 4 },
  roadmapList: { gap: 11 },
  roadmapCard: { borderWidth: 1, borderRadius: 16, padding: 15 },
  roadmapTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryIcon: { width: 27, height: 27, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  categoryText: { fontSize: 11, fontWeight: '700', marginLeft: 7 },
  phaseText: { fontSize: 10, fontWeight: '800' },
  roadmapTitle: { fontSize: 16, fontWeight: '800', marginTop: 13 },
  task: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  metric: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, marginTop: 12 },
  metricText: { fontSize: 10, fontWeight: '700', maxWidth: '88%' },
});
