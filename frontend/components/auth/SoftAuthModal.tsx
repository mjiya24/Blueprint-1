import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function SoftAuthModal({
  visible,
  onClose,
  onCreateAccount,
  pathTitle,
}: {
  visible: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
  pathTitle?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={26} color="#10B981" />
          </View>

          <Text style={styles.title}>Save your streak & progress</Text>
          <Text style={styles.subtitle}>
            {pathTitle ? `Keep your momentum in ${pathTitle}.` : 'Keep your momentum and verified proof.'}
          </Text>
          <Text style={styles.body}>
            Create a free account in 10 seconds to save your place, log proof, and keep your progress synced.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={onCreateAccount}>
            <Text style={styles.primaryButtonText}>Create Free Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Continue Previewing</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5, 8, 15, 0.7)',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: '#334155',
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 18,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#10B98120',
    borderWidth: 1,
    borderColor: '#10B98150',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#A7F3D0',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#020817',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
  },
});
