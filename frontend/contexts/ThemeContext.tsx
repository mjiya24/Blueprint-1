import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

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
  bg: '#080A0F',
  surface: '#0F141D',
  surfaceAlt: '#0B1018',
  border: '#FFFFFF18',
  text: '#F8FAFC',
  textSub: '#CBD5E1',
  textMuted: '#94A3B8',
  accent: '#35E4A1',
  accentLight: '#35E4A122',
  danger: '#FF6B6B',
  warning: '#F59E0B',
  isDark: true,
  statusBar: 'light-content',
};

export const LIGHT_THEME: Theme = {
  bg: '#F7FAFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF4FF',
  border: '#D8E3F2',
  text: '#10213A',
  textSub: '#425776',
  textMuted: '#6D809D',
  accent: '#0A66D1',
  accentLight: '#0A66D11F',
  danger: '#D13438',
  warning: '#B76E00',
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

export function ThemeProvider({ children, forceDark = false }: { children: ReactNode; forceDark?: boolean }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(forceDark || systemScheme !== 'light');

  useEffect(() => {
    if (forceDark) return;
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val !== null) setIsDark(val === 'dark');
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  const activeIsDark = forceDark || isDark;

  return (
    <ThemeContext.Provider value={{ theme: activeIsDark ? DARK_THEME : LIGHT_THEME, isDark: activeIsDark, toggleTheme: forceDark ? async () => {} : toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
