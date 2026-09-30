import React, { useState } from 'react';
import { ActivityIndicator, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createPathCheckout, completeTestPathCheckout } from '../src/services/api';

export function PaywallGateModal({ visible, onClose, onUnlocked, pathSlug, creatorHandle, userId, priceCents = 4900 }: {
  visible: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  pathSlug: string;
  creatorHandle: string;
  userId: string;
  priceCents?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const unlock = async () => {
    setLoading(true);
    setError('');
    const session = await createPathCheckout({ path_slug: pathSlug, creator_handle: creatorHandle, user_id: userId, price_cents: priceCents });
    if (!session) {
      setError('Checkout is unavailable. Try again in a moment.');
      setLoading(false);
      return;
    }
    if (session.test_mode) {
      const unlocked = await completeTestPathCheckout(session.session_id);
      setLoading(false);
      if (unlocked) {
        onUnlocked();
        return;
      }
    }
    await Linking.openURL(session.url);
    setLoading(false);
    onClose();
    return;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.lock}><Text style={styles.lockText}>LOCKED</Text></View>
          <Text style={styles.title}>Unlock the full engine</Text>
          <Text style={styles.copy}>Day 1 is your free instant win. Unlock Days 2–7 and every live AI tool for ${(priceCents / 100).toFixed(0)}.</Text>
          <View style={styles.benefit}><Text style={styles.check}>✓</Text><Text style={styles.benefitText}>All domain-specific interactive engines</Text></View>
          <View style={styles.benefit}><Text style={styles.check}>✓</Text><Text style={styles.benefitText}>Proof checkpoints and member progress</Text></View>
          <TouchableOpacity style={styles.cta} onPress={unlock} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.ctaText}>Unlock Full Access · ${(priceCents / 100).toFixed(0)}</Text>}
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity onPress={onClose}><Text style={styles.later}>Maybe later</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000AA' },
  sheet: { backgroundColor: '#0F141D', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: '#FFFFFF18', padding: 22, paddingBottom: 34 },
  lock: { alignSelf: 'flex-start', backgroundColor: '#F59E0B22', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  lockText: { color: '#FBBF24', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#F8FAFC', fontSize: 25, fontWeight: '900', marginTop: 14 },
  copy: { color: '#CBD5E1', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 16 },
  benefit: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  check: { color: '#35E4A1', fontSize: 17, fontWeight: '900', marginRight: 9 },
  benefitText: { color: '#E2E8F0', fontSize: 13, fontWeight: '700' },
  cta: { backgroundColor: '#35E4A1', borderRadius: 13, padding: 15, alignItems: 'center', marginTop: 12 },
  ctaText: { color: '#000', fontSize: 15, fontWeight: '900' },
  error: { color: '#FB7185', fontSize: 12, marginTop: 10, textAlign: 'center' },
  later: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 15, fontWeight: '700' },
});