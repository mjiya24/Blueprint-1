import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const STEP_CONFIG = [
  {
    step: 1,
    title: 'Where do you work best?',
    subtitle: 'This helps us find ideas that fit your environment.',
    type: 'single',
    field: 'environment',
    options: [
      { id: 'home', label: 'From Home', desc: 'Remote-first, laptop lifestyle', icon: 'home' },
      { id: 'office', label: 'In an Office', desc: 'Corporate environment, desk setup', icon: 'business' },
      { id: 'outdoor', label: 'Outdoors / On the Move', desc: 'Always moving, prefer physical work', icon: 'car' },
    ],
  },
  {
    step: 2,
    title: 'How do you prefer to work?',
    subtitle: 'We match ideas to your working style.',
    type: 'single',
    field: 'social_preference',
    options: [
      { id: 'solo', label: 'Solo', desc: 'Focused, independent, headphones on', icon: 'person' },
      { id: 'small-team', label: 'Small Team', desc: 'Collaborative, startup-style energy', icon: 'people' },
      { id: 'customer-facing', label: 'Customer-Facing', desc: 'Love meeting and helping people', icon: 'chatbubbles' },
    ],
  },
  {
    step: 3,
    title: 'What do you have access to?',
    subtitle: 'Select all that apply — this unlocks more opportunity types.',
    type: 'multi',
    field: 'assets',
    options: [
      { id: 'car', label: 'A Vehicle', desc: 'Car, truck, or scooter', icon: 'car-sport' },
      { id: 'laptop', label: 'A Laptop / PC', desc: 'Can work on digital projects', icon: 'laptop' },
      { id: 'investment', label: '$100+ to Invest', desc: 'Some startup capital available', icon: 'cash' },
    ],
  },
  {
    step: 4,
    title: 'What excites you most?',
    subtitle: 'Pick everything that resonates — more = better matches.',
    type: 'multi',
    field: 'questionnaire_interests',
    options: [
      { id: 'tech', label: 'Tech & Digital', desc: 'Apps, AI, software, internet', icon: 'code-slash' },
      { id: 'fitness', label: 'Fitness & Wellness', desc: 'Health, sports, active lifestyle', icon: 'barbell' },
      { id: 'pets', label: 'Pets & Animals', desc: 'Dogs, cats, animal care', icon: 'paw' },
      { id: 'real-estate', label: 'Real Estate', desc: 'Property, spaces, neighborhoods', icon: 'home' },
      { id: 'creative', label: 'Creative & Design', desc: 'Art, video, writing, branding', icon: 'color-palette' },
      { id: 'finance', label: 'Finance & Investing', desc: 'Money, markets, business', icon: 'trending-up' },
    ],
  },
];

export default function QuestionnaireScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({
    environment: '',
    social_preference: '',
    assets: [],
    questionnaire_interests: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  const config = STEP_CONFIG[currentStep];
  const progress = ((currentStep + 1) / STEP_CONFIG.length) * 100;

  const handleSingle = (field: string, id: string) => {
    setAnswers(prev => ({ ...prev, [field]: id }));
  };

  const handleMulti = (field: string, id: string) => {
    setAnswers(prev => {
      const current = prev[field] as string[];
      return {
        ...prev,
        [field]: current.includes(id) ? current.filter(i => i !== id) : [...current, id],
      };
    });
  };

  const canProceed = (): boolean => {
    const val = answers[config.field];
    if (config.type === 'single') return !!val;
    return (val as string[]).length > 0;
  };

  const handleNext = async () => {
    if (currentStep < STEP_CONFIG.length - 1) {
      setCurrentStep(s => s + 1);
      return;
    }
    // Last step - save and navigate
    setIsSaving(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        router.replace('/(tabs)/home');
        return;
      }
      const user = JSON.parse(userData);
      const updatedProfile = {
        ...(user.profile || {}),
        environment: answers.environment,
        social_preference: answers.social_preference,
        assets: answers.assets,
        questionnaire_interests: answers.questionnaire_interests,
      };
      // Save to backend
      await axios.put(`${API_URL}/api/users/${user.id}/profile`, updatedProfile);
      // Update local storage
      const updatedUser = { ...user, profile: updatedProfile };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      router.replace('/(tabs)/home');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    router.replace('/(tabs)/home');
  };

  const isSelected = (id: string): boolean => {
    const val = answers[config.field];
    if (config.type === 'single') return val === id;
    return (val as string[]).includes(id);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>{currentStep + 1} of {STEP_CONFIG.length}</Text>
          </View>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>
      </View>

      {/* Options */}
      <ScrollView style={styles.options} showsVerticalScrollIndicator={false}>
        {config.options.map((option) => {
          const selected = isSelected(option.id);
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, selected && styles.optionCardSelected]}
              onPress={() => config.type === 'single'
                ? handleSingle(config.field, option.id)
                : handleMulti(config.field, option.id)
              }
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                <Ionicons name={option.icon as any} size={22} color={selected ? '#000' : '#8E8E8E'} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDesc}>{option.desc}</Text>
              </View>
              {selected && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={16} color="#000" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep(s => s - 1)}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled,
            currentStep > 0 && { flex: 1 }]}
          onPress={handleNext}
          disabled={!canProceed() || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep === STEP_CONFIG.length - 1 ? 'Build My Blueprint →' : 'Next →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  stepIndicator: {
    backgroundColor: '#1A1C23', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#2A2C35',
  },
  stepText: { fontSize: 12, color: '#8E8E8E', fontWeight: '600' },
  skipText: { fontSize: 14, color: '#4A4A4A' },
  progressTrack: { height: 3, backgroundColor: '#1A1C23', borderRadius: 2, marginBottom: 24 },
  progressFill: { height: '100%', backgroundColor: '#00D95F', borderRadius: 2 },
  title: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8E8E8E', marginBottom: 8 },
  options: { flex: 1, paddingHorizontal: 24 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1C23', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1.5, borderColor: '#2A2C35',
  },
  optionCardSelected: { borderColor: '#00D95F', backgroundColor: '#00D95F0A' },
  optionIcon: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#000', justifyContent: 'center',
    alignItems: 'center', marginRight: 14,
  },
  optionIconSelected: { backgroundColor: '#00D95F' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  optionLabelSelected: { color: '#00D95F' },
  optionDesc: { fontSize: 12, color: '#8E8E8E' },
  checkmark: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#00D95F', justifyContent: 'center', alignItems: 'center',
  },
  footer: {
    flexDirection: 'row', gap: 12,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderTopColor: '#1A1C23',
  },
  backBtn: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: '#1A1C23', justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: '#2A2C35',
  },
  nextButton: {
    flex: 1, backgroundColor: '#00D95F', padding: 16,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  nextButtonDisabled: { backgroundColor: '#1A1C23', borderWidth: 1, borderColor: '#2A2C35' },
  nextButtonText: { color: '#000', fontSize: 17, fontWeight: '700' },
});
