import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

type StepType = 'single' | 'multi' | 'location';

interface StepOption {
  id: string;
  label: string;
  desc: string;
  icon: string;
}

interface StepConfig {
  module: string;
  title: string;
  subtitle: string;
  type: StepType;
  field: string;
  options: StepOption[];
  skipCondition?: (answers: Record<string, any>) => boolean;
}

const STEP_CONFIG: StepConfig[] = [
  {
    module: 'Current Reality',
    title: 'What is your current reality?',
    subtitle: 'We tailor your legal and financial opportunities to your stage.',
    type: 'single',
    field: 'student_status',
    options: [
      { id: 'full-time-student', label: 'Full-Time Student', desc: 'Campus, internships, student pathways', icon: 'school' },
      { id: 'recent-grad', label: 'Recent Graduate', desc: 'Entry-level and transition opportunities', icon: 'ribbon' },
      { id: 'professional', label: 'Working Professional', desc: 'Side-hustle and upskilling tracks', icon: 'briefcase' },
      { id: 'career-shift', label: 'Career Shifter', desc: 'All-in transition blueprints', icon: 'rocket' },
    ],
  },
  {
    module: 'Legal Eligibility',
    title: 'Which opportunities are legally viable for you?',
    subtitle: 'We hide options you cannot legally execute, and prioritize the ones you can.',
    type: 'single',
    field: 'visa_status',
    skipCondition: (answers) => answers.student_status === 'professional' || answers.student_status === 'career-shift',
    options: [
      { id: 'citizen', label: 'Citizen / Permanent Resident', desc: 'No work authorization restrictions', icon: 'shield-checkmark' },
      { id: 'opt-cpt', label: 'OPT / CPT', desc: 'Student authorization pathways', icon: 'document-text' },
      { id: 'visa-restricted', label: 'International Student', desc: 'Restrict to eligible and remote options', icon: 'globe' },
      { id: 'remote-only', label: 'Remote-Only', desc: 'Digital-first opportunities only', icon: 'wifi' },
    ],
  },
  {
    module: 'Deployment Preference',
    title: 'How many hours a week can you dedicate to your Blueprint?',
    subtitle: 'We calibrate opportunity intensity to your true bandwidth.',
    type: 'single',
    field: 'hours_per_week',
    options: [
      { id: 'side-hustle', label: 'Under 10 (Side Hustle)', desc: 'Lightweight momentum play', icon: 'flash' },
      { id: 'part-time', label: '10-30 (Part-Time / Internship)', desc: 'Structured part-time track', icon: 'time' },
      { id: 'full-career', label: '40+ (Full Career Shift)', desc: 'High-commitment growth track', icon: 'trending-up' },
    ],
  },
  {
    module: 'Work Environment',
    title: 'Where do you work best?',
    subtitle: 'This helps us find ideas that fit your day-to-day reality.',
    type: 'single',
    field: 'environment',
    options: [
      { id: 'home', label: 'From Home', desc: 'Remote-first, laptop lifestyle', icon: 'home' },
      { id: 'office', label: 'In an Office', desc: 'Structured desk environment', icon: 'business' },
      { id: 'outdoor', label: 'On the Move', desc: 'Field work and mobility', icon: 'car' },
    ],
  },
  {
    module: 'Working Style',
    title: 'How do you prefer to work?',
    subtitle: 'Your operating style affects execution success.',
    type: 'single',
    field: 'social_preference',
    options: [
      { id: 'solo', label: 'Solo', desc: 'Independent and focused', icon: 'person' },
      { id: 'small-team', label: 'Small Team', desc: 'Collaborative and agile', icon: 'people' },
      { id: 'customer-facing', label: 'Customer-Facing', desc: 'Client and people energy', icon: 'chatbubbles' },
    ],
  },
  {
    module: 'Assets',
    title: 'What do you have access to?',
    subtitle: 'Select all that apply.',
    type: 'multi',
    field: 'assets',
    options: [
      { id: 'car', label: 'A Vehicle', desc: 'Car, truck, or scooter', icon: 'car-sport' },
      { id: 'laptop', label: 'A Laptop / PC', desc: 'Digital execution capability', icon: 'laptop' },
      { id: 'investment', label: '$100+ to Invest', desc: 'Starter capital available', icon: 'cash' },
    ],
  },
  {
    module: 'Passions',
    title: 'What excites you most?',
    subtitle: 'Pick the domains you would enjoy building in.',
    type: 'multi',
    field: 'questionnaire_interests',
    options: [
      { id: 'tech', label: 'Tech & Digital', desc: 'Apps, AI, software', icon: 'code-slash' },
      { id: 'fitness', label: 'Fitness & Wellness', desc: 'Health and active lifestyle', icon: 'barbell' },
      { id: 'pets', label: 'Pets & Animals', desc: 'Animal-focused opportunities', icon: 'paw' },
      { id: 'real-estate', label: 'Real Estate', desc: 'Property and local markets', icon: 'home' },
      { id: 'creative', label: 'Creative & Design', desc: 'Content, design, brand work', icon: 'color-palette' },
      { id: 'finance', label: 'Finance & Investing', desc: 'Money and growth systems', icon: 'trending-up' },
    ],
  },
  {
    module: 'Location',
    title: 'Where are you based?',
    subtitle: 'Unlock local market opportunities around you.',
    type: 'location',
    field: 'location',
    options: [],
  },
];

const MANUAL_CITY_OPTIONS = [
  { city: 'New York', state: 'NY', country: 'United States', country_code: 'US' },
  { city: 'San Francisco', state: 'CA', country: 'United States', country_code: 'US' },
  { city: 'London', state: '', country: 'United Kingdom', country_code: 'GB' },
  { city: 'Toronto', state: 'ON', country: 'Canada', country_code: 'CA' },
  { city: 'Dubai', state: '', country: 'United Arab Emirates', country_code: 'AE' },
  { city: 'Bengaluru', state: 'KA', country: 'India', country_code: 'IN' },
  { city: 'Singapore', state: '', country: 'Singapore', country_code: 'SG' },
  { city: 'Sydney', state: 'NSW', country: 'Australia', country_code: 'AU' },
];

function getNextStepIdx(fromIdx: number, answers: Record<string, any>): number {
  let next = fromIdx + 1;
  while (next < STEP_CONFIG.length && STEP_CONFIG[next].skipCondition?.(answers)) next += 1;
  return next;
}

function getPrevStepIdx(fromIdx: number, answers: Record<string, any>): number {
  let prev = fromIdx - 1;
  while (prev >= 0 && STEP_CONFIG[prev].skipCondition?.(answers)) prev -= 1;
  return prev;
}

export default function QuestionnaireScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [dotCount, setDotCount] = useState(0);
  const [locationData, setLocationData] = useState<{ city: string; state: string; country: string; country_code: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationHint, setLocationHint] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({
    student_status: '',
    visa_status: '',
    hours_per_week: '',
    environment: '',
    social_preference: '',
    assets: [],
    questionnaire_interests: [],
  });

  const stepFade = useRef(new Animated.Value(1)).current;
  const config = STEP_CONFIG[currentStep];

  const visibleSteps = STEP_CONFIG.filter((s) => !s.skipCondition?.(answers));
  const visibleIndex = STEP_CONFIG.slice(0, currentStep + 1).filter((s) => !s.skipCondition?.(answers)).length;
  const progress = (visibleIndex / visibleSteps.length) * 100;
  const isLastVisibleStep = getNextStepIdx(currentStep, answers) >= STEP_CONFIG.length;

  useEffect(() => {
    if (!isSaving) return;
    const id = setInterval(() => setDotCount((d) => (d + 1) % 4), 450);
    return () => clearInterval(id);
  }, [isSaving]);

  const animateStep = (change: () => void) => {
    Animated.timing(stepFade, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      change();
      Animated.timing(stepFade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  const handleSingle = (field: string, id: string) => setAnswers((prev) => ({ ...prev, [field]: id }));

  const handleMulti = (field: string, id: string) => {
    setAnswers((prev) => {
      const current = prev[field] as string[];
      return { ...prev, [field]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] };
    });
  };

  const canProceed = () => config.type === 'location' || (config.type === 'single' ? !!answers[config.field] : (answers[config.field] as string[]).length > 0);

  const detectLocation = async () => {
    setLocationLoading(true);
    setLocationHint('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationHint('Location permission not granted. Select your city manually below.');
        return;
      }

      const coords = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('location-timeout')), 8000)),
      ]);

      const geocode = await Location.reverseGeocodeAsync(coords.coords);
      if (!geocode.length) {
        throw new Error('no-geocode-result');
      }
      const g = geocode[0];
      setLocationData({
        city: g.city || g.subregion || 'Unknown',
        state: g.region || '',
        country: g.country || '',
        country_code: g.isoCountryCode || 'US',
      });
    } catch (e) {
      console.log('Location detection skipped:', (e as any)?.message);
      setLocationHint('We could not detect GPS right now. Select your city manually below to continue.');
    } finally {
      setLocationLoading(false);
    }
  };

  const chooseManualCity = (city: { city: string; state: string; country: string; country_code: string }) => {
    setLocationData(city);
    setLocationHint('City selected manually. You can continue.');
  };

  const registerPushToken = async (userId: string) => {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync();
      await axios.post(`${API_URL}/api/users/${userId}/push-token`, { push_token: tokenData.data });
    } catch {
      // non-critical
    }
  };

  const saveAndFinish = async () => {
    setIsSaving(true);
    try {
      const raw = await AsyncStorage.getItem('user');
      if (!raw) {
        router.replace('/(tabs)/home');
        return;
      }
      const user = JSON.parse(raw);
      const updatedProfile = {
        ...(user.profile || {}),
        student_status: answers.student_status,
        visa_status: answers.visa_status,
        hours_per_week: answers.hours_per_week,
        is_student: answers.student_status === 'full-time-student' || answers.student_status === 'recent-grad',
        environment: answers.environment,
        social_preference: answers.social_preference,
        assets: answers.assets,
        questionnaire_interests: answers.questionnaire_interests,
        ...(locationData ? {
          city: locationData.city,
          state: locationData.state,
          country: locationData.country,
          country_code: locationData.country_code,
        } : {}),
      };
      await axios.put(`${API_URL}/api/users/${user.id}/profile`, updatedProfile);
      AsyncStorage.setItem('user', JSON.stringify({ ...user, profile: updatedProfile })).catch(() => {
        // Non-blocking local persistence to avoid UI hang on slower devices.
      });
      registerPushToken(user.id);
      setTimeout(() => router.replace('/(tabs)/home'), 2800);
    } catch {
      router.replace('/(tabs)/home');
    }
  };

  const onNext = async () => {
    const next = getNextStepIdx(currentStep, answers);
    if (next < STEP_CONFIG.length) {
      animateStep(() => setCurrentStep(next));
      return;
    }
    await saveAndFinish();
  };

  const onBack = () => {
    const prev = getPrevStepIdx(currentStep, answers);
    if (prev >= 0) animateStep(() => setCurrentStep(prev));
  };

  const isSelected = (id: string) => (config.type === 'single' ? answers[config.field] === id : (answers[config.field] as string[]).includes(id));

  if (isSaving) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}> 
        <StatusBar barStyle={theme.statusBar as any} />
        <View style={styles.analyzingWrap}>
          <Ionicons name="analytics" size={48} color="#00D95F" />
          <Text style={[styles.analyzingTitle, { color: theme.text }]}>Analyzing your profile</Text>
          <Text style={styles.analyzingDots}>{'●'.repeat(dotCount)}{'○'.repeat(3 - dotCount)}</Text>
          <Text style={[styles.analyzingSub, { color: theme.textSub }]}>Generating your personalized roadmaps...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}> 
      <StatusBar barStyle={theme.statusBar as any} />
      <View style={styles.header}>
        <View style={styles.rowBetween}>
          <Text style={[styles.stepText, { color: theme.textMuted }]}>{visibleIndex} of {visibleSteps.length}</Text>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}><Text style={{ color: theme.textMuted }}>Skip</Text></TouchableOpacity>
        </View>
        <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.moduleBadge}><Text style={styles.moduleBadgeText}>{config.module.toUpperCase()}</Text></View>
        <Animated.View style={{ opacity: stepFade }}>
          <Text style={[styles.title, { color: theme.text }]}>{config.title}</Text>
          <Text style={[styles.subtitle, { color: theme.textSub }]}>{config.subtitle}</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.body, { opacity: stepFade }]}>
        {config.type === 'location' ? (
          <ScrollView style={styles.body}>
            <TouchableOpacity style={styles.locBtn} onPress={detectLocation} disabled={locationLoading}>
              {locationLoading ? <ActivityIndicator color="#000" /> : <Ionicons name="navigate" size={18} color="#000" />}
              <Text style={styles.locBtnText}>{locationLoading ? 'Detecting...' : 'Unlock Local Market Data'}</Text>
            </TouchableOpacity>
            {!!locationHint && <Text style={[styles.locationHint, { color: theme.textSub }]}>{locationHint}</Text>}
            {locationData && <Text style={[styles.locationSelected, { color: theme.textSub }]}>{locationData.city}, {locationData.country}</Text>}
            <Text style={[styles.manualCityTitle, { color: theme.text }]}>Pick a major city instead</Text>
            <View style={styles.manualCityWrap}>
              {MANUAL_CITY_OPTIONS.map((city) => {
                const selected = locationData?.city === city.city && locationData?.country_code === city.country_code;
                return (
                  <TouchableOpacity
                    key={`${city.city}-${city.country_code}`}
                    onPress={() => chooseManualCity(city)}
                    style={[
                      styles.cityChip,
                      { borderColor: selected ? '#00D95F' : theme.border, backgroundColor: selected ? '#00D95F14' : theme.surface },
                    ]}
                  >
                    <Text style={{ color: selected ? '#00D95F' : theme.text, fontWeight: '600' }}>{city.city}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={styles.body}>
            {config.options.map((option) => {
              const selected = isSelected(option.id);
              return (
                <TouchableOpacity key={option.id} onPress={() => config.type === 'single' ? handleSingle(config.field, option.id) : handleMulti(config.field, option.id)} style={[styles.card, { backgroundColor: theme.surface, borderColor: selected ? '#00D95F' : theme.border }]}>
                  <Ionicons name={option.icon as any} size={22} color={selected ? '#00D95F' : theme.textMuted} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{option.label}</Text>
                    <Text style={{ color: theme.textSub, fontSize: 12 }}>{option.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>

      <View style={styles.footer}>
        {currentStep > 0 && <TouchableOpacity style={[styles.back, { borderColor: theme.border }]} onPress={onBack}><Ionicons name="arrow-back" size={20} color={theme.text} /></TouchableOpacity>}
        <TouchableOpacity style={[styles.next, !canProceed() && styles.nextDisabled]} disabled={!canProceed()} onPress={onNext}>
          <Text style={styles.nextTxt}>{isLastVisibleStep ? 'View My Architect Match →' : 'Next →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stepText: { fontSize: 12, fontWeight: '600' },
  track: { height: 3, borderRadius: 2, marginBottom: 14 },
  fill: { height: '100%', backgroundColor: '#00D95F', borderRadius: 2 },
  moduleBadge: { alignSelf: 'flex-start', backgroundColor: '#00D95F18', borderColor: '#00D95F35', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  moduleBadgeText: { color: '#00D95F', fontSize: 10, letterSpacing: 0.8, fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  body: { flex: 1, paddingHorizontal: 24 },
  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  locBtn: { marginTop: 8, backgroundColor: '#00D95F', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  locBtnText: { color: '#000', fontWeight: '700' },
  locationHint: { marginTop: 12, fontSize: 12, lineHeight: 18 },
  locationSelected: { marginTop: 10, fontSize: 13, fontWeight: '600' },
  manualCityTitle: { marginTop: 18, marginBottom: 10, fontSize: 14, fontWeight: '700' },
  manualCityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 18 },
  cityChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  footer: { padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: '#1A1C23', flexDirection: 'row', gap: 12 },
  back: { width: 52, height: 52, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  next: { flex: 1, backgroundColor: '#00D95F', borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 16 },
  nextDisabled: { opacity: 0.4 },
  nextTxt: { color: '#000', fontWeight: '800', fontSize: 16 },
  analyzingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  analyzingTitle: { marginTop: 18, fontSize: 22, fontWeight: '700' },
  analyzingDots: { marginTop: 10, color: '#00D95F', fontSize: 20, letterSpacing: 5 },
  analyzingSub: { marginTop: 10, textAlign: 'center' },
});
