import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const students = [
  { name: 'Maya R.', stage: 'Step 5 complete', proof: 'Posted win' },
  { name: 'Marcus T.', stage: 'Day 2 active', proof: 'Live check-in' },
  { name: 'Nia S.', stage: 'Final milestone', proof: 'Verified output' },
  { name: 'Leo P.', stage: 'Stalled on Step 4', proof: 'Needs support' },
];

export default function AudienceScreen() {
  const { theme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Audience</Text>
      <Text style={[styles.subtitle, { color: theme.textSub }]}>Student momentum and proof activity</Text>

      {students.map((student) => (
        <View key={student.name} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <View style={[styles.avatar, { backgroundColor: '#35E4A122' }]}> 
            <Text style={[styles.avatarText, { color: theme.accent }]}>{student.name.split(' ')[0][0]}</Text>
          </View>
          <View style={styles.meta}> 
            <Text style={[styles.name, { color: theme.text }]}>{student.name}</Text>
            <Text style={[styles.stage, { color: theme.textSub }]}>{student.stage}</Text>
          </View>
          <View style={styles.tagWrap}> 
            <Ionicons name={student.proof.includes('Posted') ? 'checkmark-circle' : 'time'} size={14} color={theme.accent} />
            <Text style={[styles.tagText, { color: theme.text }]}>{student.proof}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 6, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '800' },
  meta: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800' },
  stage: { fontSize: 12, marginTop: 4 },
  tagWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagText: { fontSize: 11, fontWeight: '700' },
});
