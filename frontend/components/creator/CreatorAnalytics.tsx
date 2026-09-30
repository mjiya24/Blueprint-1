import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fetchCreatorAnalytics, fetchCreatorInsights } from '../../src/services/api';

const defaultFunnelData = [
  { label: 'Step 1', value: 92 },
  { label: 'Step 3', value: 74 },
  { label: 'Step 5', value: 58 },
  { label: 'Step 8', value: 39 },
  { label: 'Final', value: 24 },
];

const defaultFrictionPoints = [
  { step: 'Step 4', text: '42% of members drop here when the setup feels unclear.', tone: '#F59E0B' },
  { step: 'Step 7', text: 'Members pause longer when the proof requirement is missing.', tone: '#35E4A1' },
  { step: 'Step 9', text: 'Shorter checklists improve completion momentum at the finish line.', tone: '#60A5FA' },
];

const proofFeed = [
  { name: 'Maya', path: 'Launch Sprint', badge: 'Live proof', minutes: '3m ago' },
  { name: 'Derrick', path: 'AI Workflow', badge: 'Finished', minutes: '14m ago' },
  { name: 'Nia', path: 'Creator Setup', badge: 'Verified', minutes: '42m ago' },
];

const members = [
  { name: 'Maya R.', stage: 'Finished step 5', status: 'Joined 3 days ago' },
  { name: 'Marcus T.', stage: 'Working on step 2', status: '2 active check-ins' },
  { name: 'Nia S.', stage: 'Completed final task', status: 'Proof posted' },
  { name: 'Leo P.', stage: 'Stalled at roadblock', status: 'Needs follow-up' },
];

export function CreatorAnalytics() {
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'performance' | 'members'>('performance');
  const [fixedSteps, setFixedSteps] = useState<Record<string, string>>({});
  const [insights, setInsights] = useState<{
    active_members: number;
    total_joins: number;
    completion_speed_days: number;
    roadblocks: { step: string; text: string; tone: string }[];
    step_dropoff: { label: string; value: number }[];
    total_revenue: number;
    funnel_conversion_rate: number;
    hook_engagement_rate: number;
    paywall_conversion_rate: number;
    avg_time_to_day_1_seconds: number;
    funnel: { label: string; value: number }[];
  }>({
    active_members: 1284,
    total_joins: 3961,
    completion_speed_days: 4.8,
    roadblocks: defaultFrictionPoints,
    step_dropoff: defaultFunnelData,
    total_revenue: 0,
    funnel_conversion_rate: 0,
    hook_engagement_rate: 0,
    paywall_conversion_rate: 0,
    avg_time_to_day_1_seconds: 240,
    funnel: [],
  });

  const autoFixStep = (step: string, text: string) => {
    setFixedSteps((current) => ({
      ...current,
      [step]: `${text} Start with one smaller action, then capture proof before continuing.`,
    }));
  };

  useEffect(() => {
    const loadInsights = async () => {
      const data = await fetchCreatorInsights();
      if (data) {
        setInsights((current) => ({
          ...current,
          active_members: data.active_members ?? 1284,
          total_joins: data.total_joins ?? 3961,
          completion_speed_days: data.completion_speed_days ?? 4.8,
          roadblocks: data.roadblocks?.length ? data.roadblocks : defaultFrictionPoints,
          step_dropoff: data.step_dropoff?.length ? data.step_dropoff : defaultFunnelData,
        }));
      }
      const analytics = await fetchCreatorAnalytics();
      if (analytics) {
        setInsights((current) => ({ ...current, ...analytics }));
      }
    };

    loadInsights();
  }, []);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: theme.accent }]}>PATHFINDER</Text>
        <Text style={[styles.title, { color: theme.text }]}>Creator Insights</Text>
      </View>

      <View style={[styles.toggle, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <TouchableOpacity
          onPress={() => setActiveTab('performance')}
          style={[styles.toggleButton, activeTab === 'performance' && { backgroundColor: theme.accent }, { borderColor: theme.border }]}
        >
          <Text style={[styles.toggleText, { color: activeTab === 'performance' ? '#000' : theme.textSub }]}>Performance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('members')}
          style={[styles.toggleButton, activeTab === 'members' && { backgroundColor: theme.accent }, { borderColor: theme.border }]}
        >
          <Text style={[styles.toggleText, { color: activeTab === 'members' ? '#000' : theme.textSub }]}>Members</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'performance' ? (
        <>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, styles.glowCard, { backgroundColor: '#0D111A', borderColor: '#FFFFFF14' }]}> 
              <Text style={[styles.metricLabel, { color: theme.textSub }]}>Gross Revenue</Text>
              <Text style={[styles.metricValue, { color: theme.accent }]}>${insights.total_revenue.toLocaleString()}</Text>
            </View>
            <View style={[styles.metricCard, styles.glowCard, { backgroundColor: '#0D111A', borderColor: '#FFFFFF14' }]}> 
              <Text style={[styles.metricLabel, { color: theme.textSub }]}>Conversion Rate</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>{insights.funnel_conversion_rate}%</Text>
            </View>
            <View style={[styles.metricCard, styles.glowCard, { backgroundColor: '#0D111A', borderColor: '#FFFFFF14' }]}> 
              <Text style={[styles.metricLabel, { color: theme.textSub }]}>Active Members</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>{insights.active_members}</Text>
            </View>
            <View style={[styles.metricCard, styles.glowCard, { backgroundColor: '#0D111A', borderColor: '#FFFFFF14' }]}> 
              <Text style={[styles.metricLabel, { color: theme.textSub }]}>Avg. Time to Day 1</Text>
              <Text style={[styles.metricValue, { color: theme.text }]}>{Math.round(insights.avg_time_to_day_1_seconds / 60)}m</Text>
            </View>
          </View>

          <View style={[styles.panel, { backgroundColor: '#0D111A', borderColor: '#FFFFFF14' }]}> 
            <Text style={[styles.panelTitle, { color: theme.text }]}>Conversion Funnel</Text>
            {(insights.funnel.length ? insights.funnel : [{ label: 'Unique visitors', value: 1284 }, { label: 'Day 1 tool executed', value: 912 }, { label: 'Paywall hit', value: 420 }, { label: 'Checkout initiated', value: 168 }, { label: 'Member joined', value: 96 }]).map((stage) => {
              const max = insights.funnel[0]?.value || 1284;
              return <View key={stage.label} style={styles.funnelRow}><Text style={[styles.funnelLabelWide, { color: theme.textSub }]}>{stage.label}</Text><View style={[styles.barTrack, { backgroundColor: isDark ? '#1A2333' : '#E8EEF8' }]}><View style={[styles.barFill, { width: `${Math.max(4, (stage.value / max) * 100)}%`, backgroundColor: theme.accent }]} /></View><Text style={[styles.funnelValue, { color: theme.text }]}>{stage.value}</Text></View>;
            })}
            <Text style={[styles.conversionHint, { color: theme.textSub }]}>Hook engagement {insights.hook_engagement_rate}% · Paywall conversion {insights.paywall_conversion_rate}%</Text>
          </View>

          <View style={[styles.panel, { backgroundColor: '#0D111A', borderColor: '#FFFFFF14' }]}> 
            <Text style={[styles.panelTitle, { color: theme.text }]}>Step Drop-off</Text>
            <View style={styles.funnelWrap}>
              {insights.step_dropoff.map((step: { label: string; value: number }) => (
                <View key={step.label} style={styles.funnelRow}>
                  <Text style={[styles.funnelLabel, { color: theme.textSub }]}>{step.label}</Text>
                  <View style={[styles.barTrack, { backgroundColor: isDark ? '#1A2333' : '#E8EEF8' }]}> 
                    <View style={[styles.barFill, { width: `${step.value}%`, backgroundColor: step.value > 50 ? '#35E4A1' : '#F59E0B' }]} />
                  </View>
                  <Text style={[styles.funnelValue, { color: theme.text }]}>{step.value}%</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.panel, { backgroundColor: '#0D111A', borderColor: '#FFFFFF14' }]}> 
            <Text style={[styles.panelTitle, { color: theme.text }]}>Roadblocks</Text>
            {insights.roadblocks.map((item: { step: string; text: string; tone: string }) => (
              <View key={item.step} style={[styles.frictionRow, { borderColor: theme.border }]}> 
                <View style={[styles.dot, { backgroundColor: item.tone }]} />
                <View style={styles.frictionTextWrap}>
                    <Text style={[styles.frictionStep, { color: theme.text }]}>{item.step}</Text>
                    <Text style={[styles.frictionText, { color: theme.textSub }]}>{fixedSteps[item.step] || item.text}</Text>
                    <TouchableOpacity style={[styles.fixButton, { borderColor: theme.accent }]} onPress={() => autoFixStep(item.step, item.text)}>
                      <Text style={[styles.fixButtonText, { color: theme.accent }]}>{fixedSteps[item.step] ? 'Step Simplified' : 'AI Auto-Fix Step'}</Text>
                    </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={[styles.panel, { backgroundColor: '#0D111A', borderColor: '#FFFFFF14' }]}> 
            <Text style={[styles.panelTitle, { color: theme.text }]}>Member list</Text>
            {members.map((member) => (
              <View key={member.name} style={[styles.proofRow, { borderColor: theme.border }]}> 
                <View style={[styles.avatar, { backgroundColor: '#35E4A122' }]}>
                  <Text style={[styles.avatarText, { color: theme.accent }]}>{member.name.split(' ')[0][0]}</Text>
                </View>
                <View style={styles.proofMeta}> 
                  <Text style={[styles.proofName, { color: theme.text }]}>{member.name}</Text>
                  <Text style={[styles.proofPath, { color: theme.textSub }]}>{member.stage}</Text>
                </View>
                <Text style={[styles.memberStatus, { color: theme.textSub }]}>{member.status}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.panelTitle, { color: theme.text }]}>Proof feed</Text>
            {proofFeed.map((item) => (
              <View key={`${item.name}-${item.minutes}`} style={[styles.proofRow, { borderColor: theme.border }]}> 
                <View style={[styles.avatar, { backgroundColor: '#35E4A122' }]}>
                  <Text style={[styles.avatarText, { color: theme.accent }]}>{item.name[0]}</Text>
                </View>
                <View style={styles.proofMeta}> 
                  <Text style={[styles.proofName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.proofPath, { color: theme.textSub }]}>{item.path}</Text>
                </View>
                <View style={styles.proofTagWrap}>
                  <Text style={[styles.proofTag, { color: theme.accent }]}>{item.badge}</Text>
                  <Text style={[styles.proofTime, { color: theme.textSub }]}>{item.minutes}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  header: { marginBottom: 16 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800' },
  toggle: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, marginBottom: 18 },
  toggleButton: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  toggleText: { fontSize: 12, fontWeight: '800' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 18 },
  metricCard: { width: '48%', borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 12 },
  glowCard: { shadowColor: '#00F2FE', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  metricLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  panel: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 18 },
  panelTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  funnelWrap: { gap: 10 },
  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  funnelLabel: { width: 52, fontSize: 11, fontWeight: '700' },
  funnelLabelWide: { width: 118, fontSize: 10, fontWeight: '700' },
  barTrack: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: '#00F2FE' },
  funnelValue: { width: 42, textAlign: 'right', fontSize: 12, fontWeight: '800' },
  conversionHint: { fontSize: 11, marginTop: 12, lineHeight: 17 },
  frictionRow: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 999, marginTop: 6, marginRight: 10 },
  frictionTextWrap: { flex: 1 },
  frictionStep: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  frictionText: { fontSize: 12, lineHeight: 18 },
  fixButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, marginTop: 9 },
  fixButtonText: { fontSize: 11, fontWeight: '800' },
  proofRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { fontWeight: '800' },
  proofMeta: { flex: 1 },
  proofName: { fontSize: 13, fontWeight: '800' },
  proofPath: { fontSize: 11, marginTop: 2 },
  memberStatus: { fontSize: 10, fontWeight: '700', textAlign: 'right', maxWidth: 92 },
  proofTagWrap: { alignItems: 'flex-end' },
  proofTag: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  proofTime: { fontSize: 10, marginTop: 4 },
});
