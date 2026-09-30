import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { completePathStep } from '../../src/services/api';

export function CreatorStepCard({ step }: { step: any }) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    script: true,
    hook: false,
    post: false,
  });
  const [link, setLink] = useState('');

  const toggle = async (key: string) => {
    const nextValue = !checklist[key];
    setChecklist((prev) => ({ ...prev, [key]: nextValue }));

    if (nextValue && step?.id) {
      await completePathStep(step.path_id || 'path-default', step.id, { type: 'creator_proof', checklist_key: key, proof_link: link || null });
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Creator Workflow</Text>
      <Text style={styles.title}>{step?.title || 'Content Sprint'}</Text>
      {step?.description ? <Text style={styles.description}>{step.description}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={async () => {
          if (step?.id && link) {
            await completePathStep(step.path_id || 'path-default', step.id, { type: 'creator_proof', proof_link: link });
          }
        }}
      >
        <Text style={styles.primaryButtonText}>Submit Proof Link</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content checklist</Text>
        {[
          ['script', 'Script reel'],
          ['hook', 'Film hook'],
          ['post', 'Post at 2 PM'],
        ].map(([key, label]) => (
          <TouchableOpacity key={key} style={styles.checkRow} onPress={() => toggle(key)}>
            <View style={[styles.checkbox, checklist[key] && styles.checkboxChecked]}>
              {checklist[key] ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Post link verifier</Text>
        <TextInput
          value={link}
          onChangeText={setLink}
          placeholder="Paste Instagram Reel, TikTok, or X link"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: '#1F2A44', padding: 16 },
  kicker: { color: '#35E4A1', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginTop: 4 },
  description: { color: '#CBD5E1', fontSize: 13, lineHeight: 18, marginTop: 8, marginBottom: 14 },
  section: { marginBottom: 16 },
  sectionTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: '#94A3B8', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#35E4A1', borderColor: '#35E4A1' },
  checkmark: { color: '#000', fontWeight: '900', fontSize: 12 },
  checkText: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: '#0B1222', borderWidth: 1, borderColor: '#1F2A44', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, color: '#F8FAFC' },
  primaryButton: { backgroundColor: '#35E4A1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  primaryButtonText: { color: '#000', fontWeight: '800', textAlign: 'center' },
});
