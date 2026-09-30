import React from 'react';
import { StatusBar, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { CreatorAnalytics } from '../../components/creator/CreatorAnalytics';

export default function AnalyticsScreen() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
      <CreatorAnalytics />
    </View>
  );
}
