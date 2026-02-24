import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const TIME_OPTIONS = [
  { id: 'part-time', label: 'Part-Time', subtitle: '10-20 hours/week', icon: 'time-outline' },
  { id: 'full-time', label: 'Full-Time', subtitle: '40+ hours/week', icon: 'time' },
  { id: 'flexible', label: 'Flexible', subtitle: 'Whenever I can', icon: 'infinite' },
];

export default function TimeScreen() {
  const router = useRouter();
  const [selectedTime, setSelectedTime] = useState('');

  const handleContinue = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const updatedUser = {
          ...user,
          profile: { ...user.profile, time_availability: selectedTime }
        };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      router.push('/onboarding/location');
    } catch (error) {
      console.error('Error saving time:', error);
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
          <View style={[styles.progressBar, { width: '80%' }]} />
        </View>
        
        <Text style={styles.step}>Step 4 of 5</Text>
        <Text style={styles.title}>Time Availability</Text>
        <Text style={styles.subtitle}>How much time can you dedicate?</Text>
      </View>

      <View style={styles.content}>
        {TIME_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              selectedTime === option.id && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedTime(option.id)}
          >
            <View style={styles.optionContent}>
              <View style={[
                styles.iconContainer,
                selectedTime === option.id && styles.iconContainerSelected,
              ]}>
                <Ionicons 
                  name={option.icon as any} 
                  size={32} 
                  color={selectedTime === option.id ? '#10B981' : '#94A3B8'} 
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[
                  styles.optionLabel,
                  selectedTime === option.id && styles.optionLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
            </View>
            {selectedTime === option.id && (
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedTime && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={!selectedTime}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
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
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#1E3A32',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSelected: {
    backgroundColor: '#064E3B',
  },
  optionText: {
    marginLeft: 16,
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    color: '#E2E8F0',
    fontWeight: '600',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#fff',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  footer: {
    paddingTop: 16,
  },
  continueButton: {
    backgroundColor: '#10B981',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
