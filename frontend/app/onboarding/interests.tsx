import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORIES = [
  { id: 'flipping', label: 'Flipping & Reselling', icon: 'swap-horizontal' },
  { id: 'middleman', label: 'Middleman', icon: 'people' },
  { id: 'internet', label: 'Internet-Based', icon: 'globe' },
  { id: 'service', label: 'Service Middleman', icon: 'briefcase' },
];

export default function InterestsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(selectedCategories.filter(c => c !== id));
    } else {
      setSelectedCategories([...selectedCategories, id]);
    }
  };

  const handleContinue = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const updatedUser = {
          ...user,
          profile: { ...user.profile, interests: selectedCategories }
        };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      router.push('/onboarding/skills');
    } catch (error) {
      console.error('Error saving interests:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}> 
      <StatusBar barStyle={theme.statusBar as any} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.surfaceAlt }]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={[styles.progress, { backgroundColor: theme.surfaceAlt }]}> 
          <View style={[styles.progressBar, { width: '20%' }]} />
        </View>
        
        <Text style={styles.step}>Step 1 of 5</Text>
        <Text style={[styles.title, { color: theme.text }]}>What interests you?</Text>
        <Text style={[styles.subtitle, { color: theme.textSub }]}>Select categories you'd like to explore</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              selectedCategories.includes(category.id) && styles.categoryCardSelected,
            ]}
            onPress={() => toggleCategory(category.id)}
          >
            <View style={styles.categoryContent}>
              <Ionicons 
                name={category.icon as any} 
                size={32} 
                color={selectedCategories.includes(category.id) ? '#10B981' : '#94A3B8'} 
              />
              <Text style={[
                styles.categoryLabel,
                { color: theme.text },
                selectedCategories.includes(category.id) && styles.categoryLabelSelected,
              ]}>
                {category.label}
              </Text>
            </View>
            {selectedCategories.includes(category.id) && (
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedCategories.length === 0 && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={selectedCategories.length === 0}
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  progress: {
    height: 4,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  categoryCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#1E3A32',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
  },
  categoryLabelSelected: {
    color: '#10B981',
    fontWeight: '600',
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
