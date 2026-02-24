import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('user');
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={48} color="#10B981" />
          </View>
          <Text style={styles.name}>{user?.name || 'Guest'}</Text>
          {!user?.is_guest && user?.email && (
            <Text style={styles.email}>{user.email}</Text>
          )}
          {user?.is_guest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>Guest Account</Text>
            </View>
          )}
        </View>

        {user?.profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Profile</Text>
            
            {user.profile.interests?.length > 0 && (
              <View style={styles.profileCard}>
                <View style={styles.profileCardHeader}>
                  <Ionicons name="heart" size={20} color="#10B981" />
                  <Text style={styles.profileCardTitle}>Interests</Text>
                </View>
                <View style={styles.tagsContainer}>
                  {user.profile.interests.map((interest: string, index: number) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {user.profile.skills?.length > 0 && (
              <View style={styles.profileCard}>
                <View style={styles.profileCardHeader}>
                  <Ionicons name="bulb" size={20} color="#3B82F6" />
                  <Text style={styles.profileCardTitle}>Skills</Text>
                </View>
                <View style={styles.tagsContainer}>
                  {user.profile.skills.map((skill: string, index: number) => (
                    <View key={index} style={[styles.tag, styles.skillTag]}>
                      <Text style={[styles.tagText, styles.skillTagText]}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {user.profile.budget && (
              <View style={styles.profileCard}>
                <View style={styles.profileCardHeader}>
                  <Ionicons name="cash" size={20} color="#F59E0B" />
                  <Text style={styles.profileCardTitle}>Budget</Text>
                </View>
                <Text style={styles.profileValue}>
                  {user.profile.budget.charAt(0).toUpperCase() + user.profile.budget.slice(1)} Budget
                </Text>
              </View>
            )}

            {user.profile.time_availability && (
              <View style={styles.profileCard}>
                <View style={styles.profileCardHeader}>
                  <Ionicons name="time" size={20} color="#8B5CF6" />
                  <Text style={styles.profileCardTitle}>Time Availability</Text>
                </View>
                <Text style={styles.profileValue}>
                  {user.profile.time_availability.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </Text>
              </View>
            )}

            {user.profile.location && (
              <View style={styles.profileCard}>
                <View style={styles.profileCardHeader}>
                  <Ionicons name="location" size={20} color="#EF4444" />
                  <Text style={styles.profileCardTitle}>Location</Text>
                </View>
                <Text style={styles.profileValue}>Location enabled</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/onboarding/interests')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="create-outline" size={24} color="#E2E8F0" />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={24} color="#E2E8F0" />
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={24} color="#E2E8F0" />
              <Text style={styles.menuItemText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={24} color="#E2E8F0" />
              <Text style={styles.menuItemText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#94A3B8',
  },
  guestBadge: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  guestBadgeText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  profileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  skillTag: {
    backgroundColor: '#3B82F620',
  },
  skillTagText: {
    color: '#3B82F6',
  },
  profileValue: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#E2E8F0',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF444420',
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
    marginLeft: 8,
  },
  version: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
});
