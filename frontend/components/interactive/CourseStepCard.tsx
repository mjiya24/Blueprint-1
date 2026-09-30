import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';

export function CourseStepCard({ step }: { step: any }) {
  const [copied, setCopied] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState('');

  const snippet = step?.snippet || 'python\n# Draft your project\nprint("Ship the first version")\n';
  const resources = step?.resources || ['https://notion.so/template', 'https://example.com/guide.pdf'];

  const handleCopy = () => {
    setCopied(true);
    Alert.alert('Snippet copied', 'Your code snippet is ready to paste.');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Course Module</Text>
      <Text style={styles.title}>{step?.title || 'Lesson Action'}</Text>
      {step?.description ? <Text style={styles.description}>{step.description}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prompt / Code Snippet</Text>
        <TextInput multiline value={snippet} editable={false} style={styles.snippet} />
        <TouchableOpacity style={styles.primaryButton} onPress={handleCopy}>
          <Text style={styles.primaryButtonText}>{copied ? 'Copied' : 'Copy Snippet'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resource links</Text>
        {resources.map((resource: string, idx: number) => (
          <TouchableOpacity key={`${resource}-${idx}`} style={styles.linkButton} onPress={() => Linking.openURL(resource)}>
            <Text style={styles.linkButtonText}>{resource}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Milestone submission</Text>
        <TextInput
          value={submissionUrl}
          onChangeText={setSubmissionUrl}
          placeholder="Paste your Notion, Figma, or project link"
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
  snippet: { backgroundColor: '#0B1222', borderRadius: 12, borderWidth: 1, borderColor: '#1F2A44', padding: 12, color: '#F8FAFC', minHeight: 90 },
  primaryButton: { marginTop: 10, backgroundColor: '#35E4A1', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  primaryButtonText: { color: '#000', fontWeight: '800' },
  linkButton: { backgroundColor: '#0B1222', borderWidth: 1, borderColor: '#1F2A44', borderRadius: 10, padding: 10, marginBottom: 8 },
  linkButtonText: { color: '#F8FAFC', fontWeight: '600', fontSize: 12 },
  input: { backgroundColor: '#0B1222', borderWidth: 1, borderColor: '#1F2A44', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, color: '#F8FAFC' },
});
