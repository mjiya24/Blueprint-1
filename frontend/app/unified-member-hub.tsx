import React from 'react';
import { StatusBar, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UnifiedMemberHub } from '../components/interactive/UnifiedMemberHub';
import { useTheme } from '../contexts/ThemeContext';

export default function UnifiedMemberHubScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
      <View style={{ position: 'absolute', top: 18, left: 20, zIndex: 2 }}>
        <Ionicons.Button
          name="arrow-back"
          size={20}
          color={theme.text}
          backgroundColor={theme.surface}
          borderRadius={10}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
          accessibilityLabel="Back"
        />
      </View>
      <UnifiedMemberHub />
    </View>
  );
}
