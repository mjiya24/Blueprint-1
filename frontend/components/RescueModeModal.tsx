import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

interface Task {
  title: string;
  description: string;
  estimated_earn: string;
  time_required: string;
  action_label: string;
}

interface RescueData {
  rescue_message: string;
  tasks: Task[];
  stuck_step: string;
  stuck_step_num: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  ideaId: string;
  isArchitect: boolean;
  onUpgrade: () => void;
}

export function RescueModeModal({ visible, onClose, userId, ideaId, isArchitect, onUpgrade }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rescueData, setRescueData] = useState<RescueData | null>(null);
  const [error, setError] = useState('');

  const loadRescueTasks = async () => {
    if (!isArchitect) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/rescue/${userId}/${ideaId}`);
      setRescueData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to generate rescue tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (isArchitect && !rescueData && !loading) {
      loadRescueTasks();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.rescueIcon}>
                <Ionicons name="flash" size={18} color="#000" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Quick-Cash Rescue</Text>
                <Text style={styles.headerSub}>Earn back your $14.99 today</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} data-testid="rescue-modal-close">
              <Ionicons name="close" size={20} color="#8E8E8E" />
            </TouchableOpacity>
          </View>

          {/* Non-Architect Paywall */}
          {!isArchitect ? (
            <View style={styles.paywallSection}>
              <View style={styles.paywallIcon}>
                <Ionicons name="lock-closed" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.paywallTitle}>Architect Rescue Mode</Text>
              <Text style={styles.paywallDesc}>
                Unlock AI-powered Quick-Cash tasks designed to get you earning in 48 hours — even when your main blueprint stalls.
              </Text>
              <View style={styles.previewTasks}>
                {['Lead Audit Service', 'Micro-Consulting Session', 'Digital Asset Flip'].map(t => (
                  <View key={t} style={styles.previewTask}>
                    <View style={styles.previewBlur} />
                    <Text style={styles.previewTitle}>{t}</Text>
                    <Text style={styles.previewEarn}>$50-$150 / task</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => { onClose(); onUpgrade(); }}
                data-testid="rescue-upgrade-btn"
              >
                <Ionicons name="flash" size={16} color="#000" />
                <Text style={styles.upgradeBtnText}>Unlock Rescue Mode — $14.99/mo</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <View style={styles.loadingState}>
              <View style={styles.loadingIcon}>
                <ActivityIndicator color="#00D95F" size="large" />
              </View>
              <Text style={styles.loadingText}>Generating your rescue plan...</Text>
              <Text style={styles.loadingSubtext}>Analyzing your blueprint progress</Text>
            </View>
          ) : error ? (
            <View style={styles.errorState}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadRescueTasks}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : rescueData ? (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
              {/* Rescue message */}
              <View style={styles.rescueMessage}>
                <Ionicons name="checkmark-circle" size={16} color="#00D95F" />
                <Text style={styles.rescueMessageText}>{rescueData.rescue_message}</Text>
              </View>

              {/* Stuck step indicator */}
              <View style={styles.stuckBadge}>
                <Ionicons name="pause-circle-outline" size={13} color="#F59E0B" />
                <Text style={styles.stuckText} numberOfLines={2}>
                  Stuck on Step {rescueData.stuck_step_num}: {rescueData.stuck_step}
                </Text>
              </View>

              {/* 3 Tasks */}
              <Text style={styles.tasksLabel}>48-HOUR SPRINT TASKS</Text>
              {rescueData.tasks.map((task, i) => (
                <View key={i} style={styles.taskCard} data-testid={`rescue-task-${i}`}>
                  <View style={styles.taskHeader}>
                    <View style={styles.taskNum}>
                      <Text style={styles.taskNumText}>{i + 1}</Text>
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <View style={styles.taskMeta}>
                        <View style={styles.earnPill}>
                          <Ionicons name="cash-outline" size={11} color="#00D95F" />
                          <Text style={styles.earnText}>{task.estimated_earn}</Text>
                        </View>
                        <View style={styles.timePill}>
                          <Ionicons name="time-outline" size={11} color="#8E8E8E" />
                          <Text style={styles.timeText}>{task.time_required}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.taskDesc}>{task.description}</Text>
                  <TouchableOpacity
                    style={styles.taskActionBtn}
                    onPress={onClose}
                    data-testid={`rescue-task-action-${i}`}
                  >
                    <Text style={styles.taskActionText}>{task.action_label}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#000" />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0D0E14', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', borderWidth: 1, borderColor: '#2A2C35',
  },
  handle: {
    width: 36, height: 4, backgroundColor: '#2A2C35',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1A1C23',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rescueIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#00D95F', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: '#4A4A4A', marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center',
  },
  // Paywall
  paywallSection: { padding: 24, alignItems: 'center' },
  paywallIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: '#F59E0B18', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: '#F59E0B30',
  },
  paywallTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  paywallDesc: { fontSize: 13, color: '#8E8E8E', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  previewTasks: { width: '100%', gap: 8, marginBottom: 20 },
  previewTask: {
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#2A2C35', overflow: 'hidden',
  },
  previewBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0E14B0',
  },
  previewTitle: { fontSize: 13, color: '#FFFFFF', fontWeight: '600', flex: 1, opacity: 0.3 },
  previewEarn: { fontSize: 12, color: '#00D95F', fontWeight: '700', opacity: 0.3 },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#00D95F', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, width: '100%', justifyContent: 'center',
  },
  upgradeBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  // Loading
  loadingState: { padding: 40, alignItems: 'center' },
  loadingIcon: { marginBottom: 16 },
  loadingText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600', marginBottom: 6 },
  loadingSubtext: { fontSize: 12, color: '#4A4A4A' },
  // Error
  errorState: { padding: 32, alignItems: 'center' },
  errorText: { fontSize: 14, color: '#FF6B6B', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#1A1C23', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#00D95F', fontWeight: '600', fontSize: 14 },
  // Content
  content: { paddingHorizontal: 20 },
  rescueMessage: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#00D95F0A', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#00D95F25', marginTop: 16, marginBottom: 12,
  },
  rescueMessageText: { flex: 1, fontSize: 13, color: '#FFFFFF', lineHeight: 18 },
  stuckBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F59E0B0A', borderRadius: 10, padding: 10,
    marginBottom: 20, borderWidth: 1, borderColor: '#F59E0B25',
  },
  stuckText: { flex: 1, fontSize: 12, color: '#F59E0B', lineHeight: 16 },
  tasksLabel: {
    fontSize: 10, color: '#4A4A4A', fontWeight: '800',
    letterSpacing: 1.5, marginBottom: 12,
  },
  taskCard: {
    backgroundColor: '#1A1C23', borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#2A2C35',
  },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  taskNum: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#00D95F15', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#00D95F30', flexShrink: 0,
  },
  taskNumText: { fontSize: 13, fontWeight: '800', color: '#00D95F' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  taskMeta: { flexDirection: 'row', gap: 8 },
  earnPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  earnText: { fontSize: 12, color: '#00D95F', fontWeight: '700' },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11, color: '#8E8E8E' },
  taskDesc: { fontSize: 13, color: '#8E8E8E', lineHeight: 18, marginBottom: 14 },
  taskActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#00D95F', paddingVertical: 10, borderRadius: 10,
  },
  taskActionText: { fontSize: 13, fontWeight: '700', color: '#000' },
});
