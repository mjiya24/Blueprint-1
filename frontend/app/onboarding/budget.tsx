import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const BUDGET_OPTIONS = [
  { id: 'low', label: 'Low Budget', subtitle: '$0 - $100', icon: 'cash-outline' },
  { id: 'medium', label: 'Medium Budget', subtitle: '$100 - $1000', icon: 'cash' },
  { id: 'high', label: 'High Budget', subtitle: '$1000+', icon: 'wallet' },
];

export default function BudgetScreen() {
  const router = useRouter();
  const [selectedBudget, setSelectedBudget] = useState('');

  const handleContinue = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const updatedUser = {
          ...user,
          profile: { ...user.profile, budget: selectedBudget }
        };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      router.push('/onboarding/time');
    } catch (error) {
      console.error('Error saving budget:', error);
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
          <View style={[styles.progressBar, { width: '60%' }]} />
        </View>
        
        <Text style={styles.step}>Step 3 of 5</Text>
        <Text style={styles.title}>Startup Budget</Text>
        <Text style={styles.subtitle}>How much can you invest to start?</Text>
      </View>

      <View style={styles.content}>
        {BUDGET_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              selectedBudget === option.id && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedBudget(option.id)}
          >
            <View style={styles.optionContent}>
              <View style={[
                styles.iconContainer,
                selectedBudget === option.id && styles.iconContainerSelected,
              ]}>
                <Ionicons 
                  name={option.icon as any} 
                  size={32} 
                  color={selectedBudget === option.id ? '#10B981' : '#94A3B8'} 
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[
                  styles.optionLabel,
                  selectedBudget === option.id && styles.optionLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
            </View>
            {selectedBudget === option.id && (
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedBudget && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={!selectedBudget}
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
