import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await AsyncStorage.getItem('user');
      if (user) {
        router.replace('/(tabs)/home');
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}> 
        <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
        <View style={styles.logoMark}>
          <Ionicons name="grid" size={32} color="#00D95F" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />

      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Ionicons name="grid" size={28} color="#00D95F" />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Blueprint</Text>
        </View>
        <View style={styles.taglineContainer}>
          <Text style={[styles.tagline, { color: theme.text }]}>Architect Your Income.</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSub }]}> 
          A personalized roadmap to every income stream that fits your life.
        </Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureRow}>
          <View style={styles.featureIcon}>
            <Ionicons name="analytics" size={20} color="#00D95F" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Personalized Match Scores</Text>
            <Text style={[styles.featureDesc, { color: theme.textSub }]}>Ideas ranked by how well they fit your life</Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.featureIcon}>
            <Ionicons name="checkmark-done" size={20} color="#00D95F" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Step-by-Step Action Plans</Text>
            <Text style={[styles.featureDesc, { color: theme.textSub }]}>Track every move from idea to first dollar</Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.featureIcon}>
            <Ionicons name="flash" size={20} color="#00D95F" />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Gig to Passive — All Categories</Text>
            <Text style={[styles.featureDesc, { color: theme.textSub }]}>DoorDash, freelancing, digital products & more</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/onboarding/auth')}
        >
          <Text style={styles.primaryButtonText}>Build My Blueprint</Text>
          <Ionicons name="arrow-forward" size={20} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/onboarding/guest')}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Preview as Guest</Text>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: theme.textMuted }]}> 
          No credit card required · Free forever
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoMark: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: 48,
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#00D95F15',
    borderWidth: 1,
    borderColor: '#00D95F40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  taglineContainer: {
    marginBottom: 12,
  },
  tagline: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  features: {
    marginVertical: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#00D95F10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#00D95F',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
  },
});
