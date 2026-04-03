import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity,
  Animated, ActivityIndicator, Linking, Alert, Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LocalLead {
  name: string;
  type: string;
  why: string;
  google_search_url: string;
  maps_url: string;
  approach: string;
}

interface DMScript {
  subject: string;
  body: string;
  follow_up: string;
}

interface Objection {
  objection: string;
  reframe: string;
}

interface TacticalData {
  summary: string;
  local_leads: LocalLead[];
  dm_script: DMScript;
  objection_guide: Objection[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  ideaId: string;
  ideaTitle: string;
  stepText: string;
  stepNumber: number;
  city?: string;
  state?: string;
  country?: string;
}

const APPROACH_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  cold_email: { icon: 'mail', color: '#3B82F6', label: 'Email' },
  instagram_dm: { icon: 'logo-instagram', color: '#EC4899', label: 'Instagram' },
  walk_in: { icon: 'walk', color: '#10B981', label: 'Walk-In' },
  linkedin: { icon: 'logo-linkedin', color: '#0EA5E9', label: 'LinkedIn' },
};

export function TacticalAIPanel({ visible, onClose, userId, ideaId, ideaTitle, stepText, stepNumber, city = '', state = '', country = '' }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TacticalData | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'leads' | 'script' | 'objections'>('leads');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setData(null);
      setActiveTab('leads');
      setCopiedScript(false);
      // Slide up animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, useNativeDriver: true,
          tension: 65, friction: 12,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1, duration: 250, useNativeDriver: true,
        }),
      ]).start();
      fetchTacticalData();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0, duration: 250, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const fetchTacticalData = async () => {
    if (!userId || !ideaId || !stepText) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/tactical-ai/go-deeper`, {
        user_id: userId,
        idea_id: ideaId,
        idea_title: ideaTitle,
        step_text: stepText,
        city, state, country,
      });
      setData(res.data);
    } catch (e) {
      console.error('Tactical AI error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyScript = async () => {
    if (!data?.dm_script?.body) return;
    await Clipboard.setStringAsync(data.dm_script.body);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleOpenLink = (url: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open link')
    );
  };

  const approachConfig = (approach: string) =>
    APPROACH_CONFIG[approach] || { icon: 'send', color: '#00D95F', label: 'Reach Out' };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.aiBadge}>
              <Ionicons name="flash" size={12} color="#000" />
              <Text style={styles.aiBadgeText}>GEMINI 3 AI</Text>
            </View>
            <Text style={styles.headerTitle}>Go Deeper ⚡</Text>
            <Text style={styles.headerSub} numberOfLines={2}>
              Step {stepNumber}: {stepText}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#8E8E8E" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#00D95F" />
            <Text style={styles.loadingText}>Gemini is finding your leads...</Text>
            <Text style={styles.loadingSubtext}>Analyzing {city || 'your local market'}</Text>
          </View>
        ) : data ? (
          <>
            {/* Summary */}
            <View style={styles.summaryRow}>
              <Ionicons name="bulb-outline" size={14} color="#00D95F" />
              <Text style={styles.summaryText}>{data.summary}</Text>
            </View>

            {/* Tab bar */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'leads' && styles.tabActive]}
                onPress={() => setActiveTab('leads')}
              >
                <Ionicons name="business" size={14} color={activeTab === 'leads' ? '#00D95F' : '#4A4A4A'} />
                <Text style={[styles.tabText, activeTab === 'leads' && styles.tabTextActive]}>5 Leads</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'script' && styles.tabActive]}
                onPress={() => setActiveTab('script')}
              >
                <Ionicons name="copy" size={14} color={activeTab === 'script' ? '#00D95F' : '#4A4A4A'} />
                <Text style={[styles.tabText, activeTab === 'script' && styles.tabTextActive]}>DM Script</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'objections' && styles.tabActive]}
                onPress={() => setActiveTab('objections')}
              >
                <Ionicons name="shield" size={14} color={activeTab === 'objections' ? '#00D95F' : '#4A4A4A'} />
                <Text style={[styles.tabText, activeTab === 'objections' && styles.tabTextActive]}>Handle No</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
              {/* LEADS TAB */}
              {activeTab === 'leads' && (
                <View style={styles.leadsContainer}>
                  {(data.local_leads || []).map((lead, i) => {
                    const ac = approachConfig(lead.approach);
                    return (
                      <View key={i} style={styles.leadCard}>
                        <View style={styles.leadHeader}>
                          <View style={styles.leadNum}>
                            <Text style={styles.leadNumText}>{i + 1}</Text>
                          </View>
                          <View style={styles.leadInfo}>
                            <Text style={styles.leadName}>{lead.name}</Text>
                            <Text style={styles.leadType}>{lead.type}</Text>
                          </View>
                          <View style={[styles.approachBadge, { backgroundColor: ac.color + '18' }]}>
                            <Ionicons name={ac.icon as any} size={11} color={ac.color} />
                            <Text style={[styles.approachText, { color: ac.color }]}>{ac.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.leadWhy}>{lead.why}</Text>
                        <View style={styles.leadActions}>
                          <TouchableOpacity
                            style={styles.leadActionBtn}
                            onPress={() => handleOpenLink(lead.google_search_url)}
                          >
                            <Ionicons name="search" size={13} color="#00D95F" />
                            <Text style={styles.leadActionText}>Search</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.leadActionBtn}
                            onPress={() => handleOpenLink(lead.maps_url)}
                          >
                            <Ionicons name="map" size={13} color="#00D95F" />
                            <Text style={styles.leadActionText}>Maps</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* SCRIPT TAB */}
              {activeTab === 'script' && data.dm_script && (
                <View style={styles.scriptContainer}>
                  {/* Subject */}
                  <View style={styles.scriptSection}>
                    <Text style={styles.scriptLabel}>SUBJECT / OPENER</Text>
                    <View style={styles.scriptBox}>
                      <Text style={styles.scriptSubject}>{data.dm_script.subject}</Text>
                    </View>
                  </View>

                  {/* Body */}
                  <View style={styles.scriptSection}>
                    <View style={styles.scriptLabelRow}>
                      <Text style={styles.scriptLabel}>MESSAGE BODY</Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={handleCopyScript}
                      >
                        <Ionicons
                          name={copiedScript ? 'checkmark-circle' : 'copy-outline'}
                          size={14}
                          color={copiedScript ? '#00D95F' : '#8E8E8E'}
                        />
                        <Text style={[styles.copyBtnText, copiedScript && { color: '#00D95F' }]}>
                          {copiedScript ? 'Copied!' : 'Copy All'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.scriptBodyBox}>
                      <Text style={styles.scriptBody}>{data.dm_script.body}</Text>
                    </View>
                  </View>

                  {/* Follow-up */}
                  <View style={styles.followUpBox}>
                    <Ionicons name="time" size={13} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.followUpLabel}>3-Day Follow-Up:</Text>
                      <Text style={styles.followUpText}>{data.dm_script.follow_up}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* OBJECTIONS TAB */}
              {activeTab === 'objections' && (
                <View style={styles.objectionsContainer}>
                  <Text style={styles.objectionsIntro}>
                    When they say "no," here's exactly what to say back:
                  </Text>
                  {(data.objection_guide || []).map((item, i) => (
                    <View key={i} style={styles.objectionCard}>
                      <View style={styles.objectionHeader}>
                        <View style={styles.objectionBadge}>
                          <Text style={styles.objectionBadgeText}>THEY SAY</Text>
                        </View>
                        <Text style={styles.objectionText}>"{item.objection}"</Text>
                      </View>
                      <View style={styles.reframeDivider}>
                        <Ionicons name="return-down-forward" size={14} color="#00D95F" />
                        <Text style={styles.reframeLabel}>YOU SAY:</Text>
                      </View>
                      <Text style={styles.reframeText}>{item.reframe}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ height: 32 }} />
            </ScrollView>
          </>
        ) : (
          <View style={styles.errorState}>
            <Ionicons name="alert-circle-outline" size={40} color="#4A4A4A" />
            <Text style={styles.errorText}>Couldn't load tactical data</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchTacticalData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  panel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#0D0E14',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.88,
    borderTopWidth: 1, borderColor: '#2A2C35',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#2A2C35', alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1A1C23',
  },
  headerLeft: { flex: 1, marginRight: 12 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#00D95F', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6,
  },
  aiBadgeText: { fontSize: 9, fontWeight: '800', color: '#000', letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  headerSub: { fontSize: 12, color: '#4A4A4A', lineHeight: 16 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center',
  },
  loadingState: {
    padding: 48, alignItems: 'center', gap: 12,
  },
  loadingText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  loadingSubtext: { fontSize: 12, color: '#4A4A4A' },
  summaryRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 20, marginTop: 12, marginBottom: 12,
    backgroundColor: '#00D95F08', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#00D95F20',
  },
  summaryText: { flex: 1, fontSize: 12, color: '#8E8E8E', lineHeight: 17 },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 9,
  },
  tabActive: { backgroundColor: '#00D95F15' },
  tabText: { fontSize: 12, color: '#4A4A4A', fontWeight: '600' },
  tabTextActive: { color: '#00D95F' },
  tabContent: { paddingHorizontal: 20 },
  // Leads
  leadsContainer: { gap: 10 },
  leadCard: {
    backgroundColor: '#1A1C23', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2A2C35',
  },
  leadHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  leadNum: {
    width: 24, height: 24, borderRadius: 8, backgroundColor: '#00D95F15',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  leadNumText: { fontSize: 11, fontWeight: '800', color: '#00D95F' },
  leadInfo: { flex: 1 },
  leadName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  leadType: { fontSize: 11, color: '#4A4A4A' },
  approachBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8,
  },
  approachText: { fontSize: 9, fontWeight: '700' },
  leadWhy: { fontSize: 12, color: '#8E8E8E', lineHeight: 17, marginBottom: 10 },
  leadActions: { flexDirection: 'row', gap: 8 },
  leadActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#00D95F12', borderRadius: 8, paddingVertical: 8,
    borderWidth: 1, borderColor: '#00D95F25',
  },
  leadActionText: { fontSize: 12, color: '#00D95F', fontWeight: '600' },
  // Script
  scriptContainer: { gap: 14 },
  scriptSection: { gap: 6 },
  scriptLabel: { fontSize: 10, color: '#4A4A4A', fontWeight: '700', letterSpacing: 1 },
  scriptLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scriptBox: {
    backgroundColor: '#1A1C23', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#2A2C35',
  },
  scriptSubject: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  scriptBodyBox: {
    backgroundColor: '#1A1C23', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#00D95F20',
  },
  scriptBody: { fontSize: 13, color: '#FFFFFF', lineHeight: 21 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1A1C23', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#2A2C35',
  },
  copyBtnText: { fontSize: 11, color: '#8E8E8E', fontWeight: '600' },
  followUpBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F59E0B08', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#F59E0B20',
  },
  followUpLabel: { fontSize: 10, color: '#F59E0B', fontWeight: '700', marginBottom: 3 },
  followUpText: { fontSize: 12, color: '#8E8E8E', lineHeight: 17 },
  // Objections
  objectionsContainer: { gap: 10 },
  objectionsIntro: { fontSize: 12, color: '#4A4A4A', marginBottom: 4 },
  objectionCard: {
    backgroundColor: '#1A1C23', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2A2C35',
  },
  objectionHeader: { marginBottom: 10 },
  objectionBadge: {
    backgroundColor: '#FF6B6B15', paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6,
  },
  objectionBadgeText: { fontSize: 9, color: '#FF6B6B', fontWeight: '800', letterSpacing: 0.5 },
  objectionText: { fontSize: 13, color: '#FF6B6B', fontStyle: 'italic', lineHeight: 18 },
  reframeDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#2A2C35',
  },
  reframeLabel: { fontSize: 10, color: '#00D95F', fontWeight: '700', letterSpacing: 0.5 },
  reframeText: { fontSize: 13, color: '#FFFFFF', lineHeight: 19, fontWeight: '500' },
  // Error
  errorState: { padding: 40, alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, color: '#4A4A4A' },
  retryBtn: {
    backgroundColor: '#1A1C23', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: '#00D95F30',
  },
  retryText: { fontSize: 14, color: '#00D95F', fontWeight: '600' },
});
