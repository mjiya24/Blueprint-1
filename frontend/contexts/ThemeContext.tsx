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
  bg: '#070B14',
  surface: '#111827',
  surfaceAlt: '#0B1222',
  border: '#1F2A44',
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
