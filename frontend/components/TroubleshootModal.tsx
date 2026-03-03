import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#00D95F',
  medium: '#F59E0B',
  hard: '#FF6B6B',
};

interface Workaround {
  title: string;
  description: string;
  difficulty: string;
  time_to_implement: string;
}

interface Matrix {
  step_summary: string;
  workarounds: Workaround[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  ideaId: string;
  ideaTitle: string;
  stepNumber: number;
  stepText: string;
}

export function TroubleshootModal({ visible, onClose, userId, ideaId, ideaTitle, stepNumber, stepText }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [error, setError] = useState('');

  const fetchMatrix = async () => {
    setIsLoading(true);
    setError('');
    setMatrix(null);
    try {
      const res = await axios.post(`${API_URL}/api/troubleshoot/${userId}/${ideaId}/${stepNumber}`);
      setMatrix(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to generate workarounds. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    if (!matrix && !isLoading) fetchMatrix();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.architectBadge}>
            <Ionicons name="construct" size={13} color="#000" />
            <Text style={styles.architectLabel}>TROUBLESHOOTING MATRIX</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#8E8E8E" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Stuck on Step {stepNumber}?</Text>
        <Text style={styles.stepPreview} numberOfLines={2}>{stepText}</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          {isLoading && (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#00D95F" />
              <Text style={styles.loadingText}>Generating your workarounds...</Text>
            </View>
          )}

          {error !== '' && (
            <View style={styles.errorState}>
              <Ionicons name="alert-circle" size={24} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchMatrix}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {matrix && (
            <>
              <Text style={styles.summaryText}>{matrix.step_summary}</Text>
              <Text style={styles.workaroundsLabel}>3 ARCHITECT WORKAROUNDS</Text>
              {matrix.workarounds.map((w, i) => (
                <View key={i} style={styles.workaroundCard}>
                  <View style={styles.workaroundTop}>
                    <View style={[styles.numBadge, { backgroundColor: DIFFICULTY_COLORS[w.difficulty] + '20' }]}>
                      <Text style={[styles.numText, { color: DIFFICULTY_COLORS[w.difficulty] }]}>{i + 1}</Text>
                    </View>
                    <View style={styles.workaroundMeta}>
                      <Text style={styles.workaroundTitle}>{w.title}</Text>
                      <View style={styles.metaRow}>
                        <View style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLORS[w.difficulty] + '18' }]}>
                          <Text style={[styles.diffText, { color: DIFFICULTY_COLORS[w.difficulty] }]}>{w.difficulty}</Text>
                        </View>
                        <View style={styles.timeBadge}>
                          <Ionicons name="time-outline" size={11} color="#4A4A4A" />
                          <Text style={styles.timeText}>{w.time_to_implement}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.workaroundDesc}>{w.description}</Text>
                </View>
              ))}
              <View style={{ height: 20 }} />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: {
    maxHeight: '85%', backgroundColor: '#0D0E14',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, borderWidth: 1, borderColor: '#2A2C35',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2C35', alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  architectBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#00D95F', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  architectLabel: { fontSize: 10, fontWeight: '800', color: '#000', letterSpacing: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  stepPreview: { fontSize: 13, color: '#4A4A4A', lineHeight: 18, marginBottom: 16, fontStyle: 'italic' },
  scroll: { flex: 0 },
  loadingState: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  loadingText: { fontSize: 14, color: '#8E8E8E' },
  errorState: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  errorText: { fontSize: 14, color: '#FF6B6B', textAlign: 'center' },
  retryBtn: { backgroundColor: '#1A1C23', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { fontSize: 14, color: '#00D95F', fontWeight: '600' },
  summaryText: { fontSize: 13, color: '#8E8E8E', lineHeight: 18, marginBottom: 16 },
  workaroundsLabel: { fontSize: 10, color: '#4A4A4A', fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  workaroundCard: {
    backgroundColor: '#1A1C23', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2A2C35',
  },
  workaroundTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  numBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  numText: { fontSize: 15, fontWeight: '800' },
  workaroundMeta: { flex: 1 },
  workaroundTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  diffText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: 10, color: '#4A4A4A' },
  workaroundDesc: { fontSize: 13, color: '#8E8E8E', lineHeight: 19 },
});
