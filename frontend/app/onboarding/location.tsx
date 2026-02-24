import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function LocationScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);

  const requestLocation = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is needed to find local opportunities. You can still continue without it.',
          [
            { text: 'Try Again', onPress: requestLocation },
            { text: 'Skip', onPress: handleSkip },
          ]
        );
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      setLocationGranted(true);
      await saveLocationAndContinue(latitude, longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get location. You can continue without it.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveLocationAndContinue = async (latitude: number, longitude: number) => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const updatedProfile = {
          ...user.profile,
          location: { latitude, longitude }
        };
        
        // Update profile in backend
        await axios.put(
          `${API_URL}/api/users/${user.id}/profile`,
          updatedProfile
        );
        
        const updatedUser = {
          ...user,
          profile: updatedProfile
        };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error saving location:', error);
      router.replace('/(tabs)/home');
    }
  };

  const handleSkip = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        // Update profile without location
        await axios.put(
          `${API_URL}/api/users/${user.id}/profile`,
          user.profile
        );
      }
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error:', error);
      router.replace('/(tabs)/home');
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
        
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: '100%' }]} />
        </View>
        
        <Text style={styles.step}>Step 5 of 5</Text>
        <Text style={styles.title}>Enable Location</Text>
        <Text style={styles.subtitle}>Find money-making opportunities near you</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="location" size={80} color="#10B981" />
        </View>

        <View style={styles.benefitsBox}>
          <Text style={styles.benefitsTitle}>Why we need location:</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="business" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Find local businesses to partner with</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="people" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Discover area-specific opportunities</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="trending-up" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Get ideas based on local demand</Text>
          </View>
        </View>

        <Text style={styles.privacyNote}>
          <Ionicons name="shield-checkmark" size={16} color="#94A3B8" />
          {' '}We only use your location to show relevant opportunities. Your privacy is important to us.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.enableButton, isLoading && styles.disabledButton]}
          onPress={requestLocation}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="location" size={20} color="#fff" />
              <Text style={styles.enableButtonText}>Enable Location</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
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
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  progress: {
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  step: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
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
  },
  benefitsBox: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#E2E8F0',
    marginLeft: 12,
    flex: 1,
  },
  privacyNote: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  footer: {
    paddingTop: 16,
  },
  enableButton: {
    backgroundColor: '#10B981',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  skipButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
});
