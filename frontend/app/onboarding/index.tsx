import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function OnboardingScreen() {
  const router = useRouter();
  const [inviteLink, setInviteLink] = useState('');
  const [showInviteInput, setShowInviteInput] = useState(false);

  const handleSelectRole = async (role: 'creator' | 'member', isGuest = false) => {
    await AsyncStorage.setItem('userRole', role);
    await AsyncStorage.setItem('isGuest', isGuest ? 'true' : 'false');

    if (role === 'creator') {
      router.push('/onboarding/auth?role=creator');
    } else if (isGuest) {
      router.replace('/(tabs)/home');
    } else {
      router.push('/onboarding/auth?role=member');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>⚡</Text>
        </View>
        <Text style={styles.brandTitle}>PATHFINDER</Text>
        <View style={styles.statusPill}><Text style={styles.statusDot}>●</Text><Text style={styles.statusText}>AI-POWERED EXECUTION ENGINE</Text></View>
        <Text style={styles.brandTagline}>Turn expertise into interactive paths people finish.</Text>
        <Text style={styles.headerCopy}>Replace static courses with live tools, proof checkpoints, and a member journey built to convert.</Text>
      </View>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={[styles.gatewayCard, styles.creatorBorder]}
          activeOpacity={0.88}
          onPress={() => handleSelectRole('creator')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🛠️</Text>
            <Text style={styles.cardRoleTitle}>I&apos;m a Creator</Text>
          </View>
          <Text style={styles.cardDescription}>
            Turn your guides, templates, and courses into interactive member journeys.
          </Text>
          <View style={styles.actionButtonPrimary}>
            <Text style={styles.actionButtonTextPrimary}>Launch Creator Studio →</Text>
          </View>
          <View style={styles.noteRow}><Text style={styles.noteAccent}>BUILD & SELL</Text><Text style={styles.authNote}> Creator account required</Text></View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gatewayCard, styles.memberBorder]}
          activeOpacity={0.88}
          onPress={() => handleSelectRole('member', true)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🔥</Text>
            <Text style={styles.cardRoleTitle}>I&apos;m a Member</Text>
          </View>
          <Text style={styles.cardDescription}>
            Follow step-by-step roadmaps, track streaks, and log proof as you complete each milestone.
          </Text>
          <View style={styles.actionButtonSecondary}>
            <Text style={styles.actionButtonTextSecondary}>Explore as Guest 👁️</Text>
          </View>
          <View style={styles.noteRow}><Text style={styles.noteAccentBlue}>EXPLORE FREE</Text><Text style={styles.authNote}> Preview without an account</Text></View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        {!showInviteInput ? (
          <TouchableOpacity onPress={() => setShowInviteInput(true)}>
            <Text style={styles.inviteLinkText}>
              Got a creator link or invite code? <Text style={styles.underline}>Tap here</Text>
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.inviteBox}>
            <TextInput
              style={styles.inviteInput}
              placeholder="Paste creator link or path ID..."
              placeholderTextColor="#666"
              value={inviteLink}
              onChangeText={setInviteLink}
            />
            <TouchableOpacity
              style={styles.inviteGoBtn}
              onPress={() => {
                if (inviteLink.trim()) {
                  handleSelectRole('member', true);
                }
              }}
            >
              <Text style={styles.inviteGoText}>Peek Path →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080A0F' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 40 },
  glowTop: { position: 'absolute', top: -90, left: '20%', width: 260, height: 260, borderRadius: 130, backgroundColor: '#10B98118' },
  glowBottom: { position: 'absolute', bottom: 50, right: -100, width: 260, height: 260, borderRadius: 130, backgroundColor: '#22D3EE0D' },
  header: { alignItems: 'center', marginTop: 10 },
  logoBadge: { width: 68, height: 68, borderRadius: 22, backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#35E4A1', justifyContent: 'center', alignItems: 'center', marginBottom: 14, shadowColor: '#10B981', shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } },
  logoIcon: { fontSize: 28 },
  brandTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B98118', borderWidth: 1, borderColor: '#10B98140', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, marginTop: 12 },
  statusDot: { color: '#35E4A1', fontSize: 10, marginRight: 6 },
  statusText: { color: '#6EE7B7', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  brandTagline: { fontSize: 16, color: '#CBD5E1', marginTop: 14, fontWeight: '700', textAlign: 'center' },
  headerCopy: { fontSize: 13, color: '#94A3B8', lineHeight: 19, textAlign: 'center', marginTop: 9, maxWidth: 340 },
  cardContainer: { gap: 16, marginVertical: 28 },
  gatewayCard: { backgroundColor: '#0F141DCC', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: '#FFFFFF12', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  creatorBorder: { borderColor: '#35E4A166' },
  memberBorder: { borderColor: '#22D3EE55' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardIcon: { fontSize: 22 },
  cardRoleTitle: { fontSize: 21, fontWeight: '800', color: '#F8FAFC' },
  cardDescription: { fontSize: 13, color: '#A7B3C5', lineHeight: 19, marginBottom: 16 },
  actionButtonPrimary: { backgroundColor: '#35E4A1', paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  actionButtonTextPrimary: { color: '#090D16', fontWeight: '800', fontSize: 14 },
  actionButtonSecondary: { backgroundColor: '#FFFFFF0A', paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#22D3EE55' },
  actionButtonTextSecondary: { color: '#F3F4F6', fontWeight: '700', fontSize: 14 },
  noteRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  noteAccent: { fontSize: 10, color: '#6EE7B7', fontWeight: '900', letterSpacing: 0.8 },
  noteAccentBlue: { fontSize: 10, color: '#67E8F9', fontWeight: '900', letterSpacing: 0.8 },
  authNote: { fontSize: 10, color: '#718096', textAlign: 'center' },
  footer: { alignItems: 'center' },
  inviteLinkText: { color: '#9CA3AF', fontSize: 13 },
  underline: { color: '#10B981', textDecorationLine: 'underline', fontWeight: '600' },
  inviteBox: { flexDirection: 'row', width: '100%', gap: 8, marginTop: 10 },
  inviteInput: { flex: 1, backgroundColor: '#0F141D', borderRadius: 12, paddingHorizontal: 14, color: '#FFF', borderWidth: 1, borderColor: '#FFFFFF18', fontSize: 13 },
  inviteGoBtn: { backgroundColor: '#35E4A1', paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' },
  inviteGoText: { color: '#090D16', fontWeight: '800', fontSize: 13 },
});
