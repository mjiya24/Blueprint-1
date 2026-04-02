import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const SKILLS = [
  'Research',
  'Negotiation',
  'Photography',
  'Communication',
  'Marketing',
  'SEO',
  'Social Media',
  'Content Creation',
  'Sales',
  'Customer Service',
  'Organization',
  'Time Management',
  'Networking',
  'Business Analysis',
  'Problem Solving',
  'Design',
  'Technology',
];

export default function SkillsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleContinue = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const updatedUser = {
          ...user,
          profile: { ...user.profile, skills: selectedSkills }
        };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      router.push('/onboarding/budget');
    } catch (error) {
      console.error('Error saving skills:', error);
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
          <View style={[styles.progressBar, { width: '40%' }]} />
        </View>
        
        <Text style={styles.step}>Step 2 of 5</Text>
        <Text style={[styles.title, { color: theme.text }]}>What are your skills?</Text>
        <Text style={[styles.subtitle, { color: theme.textSub }]}>Select skills that match your strengths</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.skillsGrid}>
          {SKILLS.map((skill) => (
            <TouchableOpacity
              key={skill}
              style={[
                styles.skillChip,
                { backgroundColor: theme.surface, borderColor: theme.border },
                selectedSkills.includes(skill) && styles.skillChipSelected,
              ]}
              onPress={() => toggleSkill(skill)}
            >
              <Text style={[
                styles.skillText,
                { color: theme.text },
                selectedSkills.includes(skill) && styles.skillTextSelected,
              ]}>
                {skill}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedSkills.length === 0 && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={selectedSkills.length === 0}
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
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  skillChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    margin: 4,
    borderWidth: 2,
  },
  skillChipSelected: {
    backgroundColor: '#1E3A32',
    borderColor: '#10B981',
  },
  skillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  skillTextSelected: {
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
