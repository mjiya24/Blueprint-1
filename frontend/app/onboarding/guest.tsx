import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function GuestScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinueAsGuest = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/guest`);
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
      router.replace('/(tabs)/home');
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconRing}>
          <Ionicons name="eye-outline" size={48} color="#00D95F" />
        </View>

        <Text style={styles.title}>Preview Mode</Text>
        <Text style={styles.description}>
          Explore Blueprint ideas before committing. A free account unlocks your personalized match scores and action tracking.
        </Text>

        <View style={styles.comparisonCard}>
          <View style={styles.compRow}>
            <Ionicons name="checkmark-circle" size={20} color="#00D95F" />
            <Text style={styles.compText}>Browse all 20+ income blueprints</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.compRow}>
            <Ionicons name="lock-closed" size={20} color="#4A4A4A" />
            <Text style={[styles.compText, styles.compTextLocked]}>Personalized match scores locked</Text>
          </View>
          <View style={styles.compRow}>
            <Ionicons name="lock-closed" size={20} color="#4A4A4A" />
            <Text style={[styles.compText, styles.compTextLocked]}>Action step progress tracking locked</Text>
          </View>
          <View style={styles.compRow}>
            <Ionicons name="lock-closed" size={20} color="#4A4A4A" />
            <Text style={[styles.compText, styles.compTextLocked]}>Save your blueprints locked</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.guestButton, isLoading && styles.disabledButton]}
          onPress={handleContinueAsGuest}
          disabled={isLoading}
        >
          <Text style={styles.guestButtonText}>{isLoading ? 'Loading...' : 'Continue as Guest'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accountButton} onPress={() => router.replace('/onboarding/auth')}>
          <Text style={styles.accountButtonText}>
            Create Free Account <Text style={styles.accountButtonBold}>— Unlock Everything</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 24 },
  backButton: {
    marginTop: 52, width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#00D95F10', borderWidth: 1, borderColor: '#00D95F30',
    justifyContent: 'center', alignItems: 'center', marginBottom: 28,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  description: { fontSize: 15, color: '#8E8E8E', textAlign: 'center', lineHeight: 22, marginBottom: 28, paddingHorizontal: 8 },
  comparisonCard: { width: '100%', backgroundColor: '#1A1C23', borderRadius: 16, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: '#2A2C35' },
  compRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  compText: { fontSize: 14, color: '#FFFFFF', marginLeft: 12, flex: 1 },
  compTextLocked: { color: '#4A4A4A' },
  divider: { height: 1, backgroundColor: '#2A2C35', marginVertical: 4 },
  guestButton: {
    width: '100%', backgroundColor: '#1A1C23', padding: 17, borderRadius: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#2A2C35', marginBottom: 14,
  },
  disabledButton: { opacity: 0.5 },
  guestButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  accountButton: { padding: 8 },
  accountButtonText: { fontSize: 14, color: '#8E8E8E', textAlign: 'center' },
  accountButtonBold: { color: '#00D95F', fontWeight: '700' },
});
