import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert('Missing Fields', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const payload = isLogin ? { email, password } : { email, password, name };
      const response = await axios.post(`${API_URL}${endpoint}`, payload);
      await AsyncStorage.setItem('user', JSON.stringify(response.data));

      // Check if user has completed questionnaire
      const profile = response.data.profile || {};
      if (profile.environment) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/onboarding/questionnaire');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <Ionicons name="grid" size={24} color="#00D95F" />
            <Text style={styles.appName}>Blueprint</Text>
          </View>

          <Text style={styles.title}>
            {isLogin ? 'Welcome back.' : 'Create your account.'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to your Blueprint.' : 'Start architecting your income.'}
          </Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#4A4A4A"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#4A4A4A"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Min. 8 characters"
                placeholderTextColor="#4A4A4A"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#8E8E8E" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchTextBold}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { flexGrow: 1, padding: 24 },
  header: { marginTop: 48, marginBottom: 40 },
  backButton: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center', marginBottom: 28,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 8 },
  appName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  title: { fontSize: 30, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#8E8E8E' },
  form: { flex: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#8E8E8E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1A1C23', borderRadius: 12, padding: 16,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#2A2C35',
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1C23', borderRadius: 12,
    borderWidth: 1, borderColor: '#2A2C35', paddingRight: 12,
  },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: '#fff' },
  eyeButton: { padding: 4 },
  submitButton: {
    backgroundColor: '#00D95F', padding: 18, borderRadius: 14,
    alignItems: 'center', marginTop: 8, marginBottom: 24,
  },
  disabledButton: { opacity: 0.5 },
  submitButtonText: { color: '#000', fontSize: 17, fontWeight: '700' },
  switchButton: { alignItems: 'center', padding: 8 },
  switchText: { fontSize: 14, color: '#8E8E8E' },
  switchTextBold: { color: '#00D95F', fontWeight: '600' },
});
