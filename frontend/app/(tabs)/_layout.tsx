import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import type { UserRole } from '../../types/path';

export default function TabLayout() {
  const { theme } = useTheme();
  const [userRole, setUserRole] = useState<UserRole>('customer');

  useEffect(() => {
    const loadRole = async () => {
      const savedRole = await AsyncStorage.getItem('userRole');
      if (savedRole === 'creator' || savedRole === 'customer') {
        setUserRole(savedRole);
      }
    };

    loadRole();
  }, []);

  const isCreator = userRole === 'creator';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOpacity: theme.isDark ? 0 : 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -3 },
          elevation: theme.isDark ? 0 : 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          href: isCreator ? null : '/home',
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          href: isCreator ? null : '/discover',
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          href: isCreator ? null : '/saved',
          title: 'My Paths',
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="studio"
        options={{
          href: isCreator ? '/studio' : null,
          title: 'Studio',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          href: isCreator ? '/insights' : null,
          title: 'Insights',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wins"
        options={{
          href: isCreator ? '/wins' : null,
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />

      <Tabs.Screen name="audience" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="architect" options={{ href: null }} />
    </Tabs>
  );
}
