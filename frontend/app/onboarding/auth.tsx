import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../lib/config';
import { useTheme } from '../../contexts/ThemeContext';


export default function AuthScreen() {
  const router = useRouter();
  const { theme } = useTheme();
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
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={theme.statusBar as any} backgroundColor={theme.bg} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surfaceAlt }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <Ionicons name="grid" size={24} color="#00D95F" />
            <Text style={[styles.appName, { color: theme.text }]}>Blueprint</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            {isLogin ? 'Welcome back.' : 'Create your account.'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSub }]}>
            {isLogin ? 'Sign in to your Blueprint.' : 'Start architecting your income.'}
          </Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textMuted }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                placeholder="John Doe"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="you@example.com"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Password</Text>
            <View style={[styles.passwordContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                placeholder="Min. 8 characters"
                placeholderTextColor={theme.textMuted}
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
            <Text style={[styles.switchText, { color: theme.textSub }]}>
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
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24 },
  header: { marginTop: 48, marginBottom: 40 },
  backButton: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 28,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 8 },
  appName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  title: { fontSize: 30, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15 },
  form: { flex: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderRadius: 12, padding: 16,
    fontSize: 16, borderWidth: 1,
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1, paddingRight: 12,
  },
  passwordInput: { flex: 1, padding: 16, fontSize: 16 },
  eyeButton: { padding: 4 },
  submitButton: {
    backgroundColor: '#00D95F', padding: 18, borderRadius: 14,
    alignItems: 'center', marginTop: 8, marginBottom: 24,
  },
  disabledButton: { opacity: 0.5 },
  submitButtonText: { color: '#000', fontSize: 17, fontWeight: '700' },
  switchButton: { alignItems: 'center', padding: 8 },
  switchText: { fontSize: 14 },
  switchTextBold: { color: '#00D95F', fontWeight: '600' },
});
