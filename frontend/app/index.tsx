import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await AsyncStorage.getItem('user');
      if (user) {
        // User is already logged in, go to main app
        router.replace('/(tabs)/home');
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="cash" size={60} color="#10B981" />
        </View>
        <Text style={styles.title}>Money Ideas</Text>
        <Text style={styles.subtitle}>Discover personalized ways to make money</Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Ionicons name="trending-up" size={24} color="#10B981" />
          <Text style={styles.featureText}>Curated money-making ideas</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="location" size={24} color="#10B981" />
          <Text style={styles.featureText}>Location-based opportunities</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="person" size={24} color="#10B981" />
          <Text style={styles.featureText}>Personalized to your skills</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('/onboarding/auth')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => router.push('/onboarding/guest')}
        >
          <Text style={styles.secondaryButtonText}>Continue as Guest</Text>
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
    justifyContent: 'space-between',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  features: {
    marginVertical: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#E2E8F0',
    marginLeft: 16,
  },
  buttonContainer: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '600',
  },
});
