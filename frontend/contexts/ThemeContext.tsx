import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Theme {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSub: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  danger: string;
  warning: string;
  isDark: boolean;
  statusBar: 'light-content' | 'dark-content';
}

export const DARK_THEME: Theme = {
  bg: '#000000',
  surface: '#1A1C23',
  surfaceAlt: '#0D0E14',
  border: '#2A2C35',
  text: '#FFFFFF',
  textSub: '#8E8E8E',
  textMuted: '#4A4A4A',
  accent: '#00D95F',
  accentLight: '#00D95F18',
  danger: '#FF6B6B',
  warning: '#F59E0B',
  isDark: true,
  statusBar: 'light-content',
};

export const LIGHT_THEME: Theme = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  border: '#E5E7EB',
  text: '#1A1A1A',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  accent: '#00BF54',
  accentLight: '#00BF5418',
  danger: '#EF4444',
  warning: '#D97706',
  isDark: false,
  statusBar: 'dark-content',
};

const THEME_KEY = 'blueprint_theme';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DARK_THEME,
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val !== null) setIsDark(val === 'dark');
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? DARK_THEME : LIGHT_THEME, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
