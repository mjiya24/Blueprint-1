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
      router.replace('/onboarding/interests');
    } catch (error) {
      Alert.alert('Error', 'Failed to create guest account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="person-outline" size={80} color="#10B981" />
        </View>
        
        <Text style={styles.title}>Continue as Guest</Text>
        <Text style={styles.description}>
          You can browse ideas without creating an account. However, you won't be able to save ideas or track your progress.
        </Text>

        <View style={styles.infoBox}>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.infoText}>Browse all money-making ideas</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
            <Text style={styles.infoText}>Can't save favorite ideas</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
            <Text style={styles.infoText}>Limited personalization</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.disabledButton]}
          onPress={handleContinueAsGuest}
          disabled={isLoading}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Loading...' : 'Continue as Guest'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signUpButton}
          onPress={() => router.replace('/onboarding/auth')}
        >
          <Text style={styles.signUpButtonText}>Create Account Instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 24,
  },
  header: {
    marginTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
    lineHeight: 24,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#E2E8F0',
    marginLeft: 12,
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#10B981',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  disabledButton: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signUpButton: {
    marginTop: 16,
    padding: 16,
  },
  signUpButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
});
