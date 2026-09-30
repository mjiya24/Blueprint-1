import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { completePathStep } from '../../src/services/api';

export function FitnessStepCard({ step }: { step: any }) {
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSets, setCompletedSets] = useState<Record<number, boolean>>({ 1: true, 2: false, 3: false });

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [secondsLeft]);

  const toggleSet = async (setNumber: number) => {
    const nextValue = !completedSets[setNumber];
    setCompletedSets((prev) => ({ ...prev, [setNumber]: nextValue }));

    if (nextValue && step?.id) {
      await completePathStep(step.path_id || 'path-default', step.id, { type: 'fitness_set', set_number: setNumber });
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>Fitness Focus</Text>
          <Text style={styles.title}>{step?.title || 'Workout Block'}</Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{formattedTime}</Text>
        </View>
      </View>

      {step?.description ? <Text style={styles.description}>{step.description}</Text> : null}

      <View style={styles.timerRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setIsRunning((prev) => !prev)}>
          <Text style={styles.primaryButtonText}>{isRunning ? 'Pause' : 'Start'} Rest</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => { setIsRunning(false); setSecondsLeft(90); }}>
          <Text style={styles.secondaryButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Set Tracker</Text>
        {[1, 2, 3].map((setNumber) => (
          <TouchableOpacity key={setNumber} style={styles.setRow} onPress={() => toggleSet(setNumber)}>
            <View style={[styles.checkbox, completedSets[setNumber] && styles.checkboxChecked]}>
              {completedSets[setNumber] ? <Ionicons name="checkmark" size={14} color="#000" /> : null}
            </View>
            <Text style={styles.setText}>Set {setNumber}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.mediaPlaceholder}>
        <Ionicons name="videocam" size={22} color="#35E4A1" />
        <Text style={styles.mediaText}>Exercise demo/video</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2A44',
    padding: 16,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  kicker: { color: '#35E4A1', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginTop: 4 },
  timerBadge: { backgroundColor: '#35E4A122', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  timerText: { color: '#35E4A1', fontSize: 14, fontWeight: '800' },
  description: { color: '#CBD5E1', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  timerRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  primaryButton: { backgroundColor: '#35E4A1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: '#000', fontWeight: '800' },
  secondaryButton: { backgroundColor: '#0B1222', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#1F2A44' },
  secondaryButtonText: { color: '#F8FAFC', fontWeight: '700' },
  section: { marginBottom: 16 },
  sectionTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '800', marginBottom: 10 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: '#94A3B8', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#35E4A1', borderColor: '#35E4A1' },
  setText: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  mediaPlaceholder: { backgroundColor: '#0B1222', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F2A44', alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  mediaText: { color: '#CBD5E1', marginTop: 8, fontWeight: '600' },
});
