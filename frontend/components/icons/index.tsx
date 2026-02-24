import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IdeaIconProps {
  ideaId: string;
  size?: number;
}

const BRAND_MAP: Record<string, { label: string; color: string; icon?: string }> = {
  'gig-001': { label: 'DD', color: '#FF3008' },       // DoorDash
  'gig-002': { label: 'Ub', color: '#000000' },       // Uber/Lyft
  'gig-003': { label: 'IC', color: '#43B02A' },       // Instacart
  'gig-004': { label: 'TR', color: '#5C6BC0' },       // TaskRabbit
  'gig-005': { label: 'Az', color: '#FF9900' },       // Amazon Flex
  'local-001': { label: 'PT', color: '#E91E63', icon: 'barbell' },   // Personal Trainer
  'local-002': { label: 'Rv', color: '#00BFA5' },     // Rover
  'local-003': { label: 'CD', color: '#1976D2', icon: 'car' },       // Car Detail
  'local-004': { label: 'HS', color: '#7B1FA2', icon: 'home' },      // House Sitter
  'local-005': { label: 'LC', color: '#388E3C', icon: 'leaf' },      // Lawn Care
  'digital-001': { label: 'FW', color: '#1CBF73' },   // Fiverr/Web
  'digital-002': { label: 'VA', color: '#6366F1', icon: 'briefcase' }, // VA
  'digital-003': { label: 'UGC', color: '#FF4081' },  // UGC Creator
  'digital-004': { label: 'SM', color: '#E91E63', icon: 'logo-instagram' }, // Social Media
  'digital-005': { label: 'AI', color: '#00D95F', icon: 'sparkles' }, // AI Copywriter
  'passive-001': { label: 'Et', color: '#F1641E' },   // Etsy/Printify
  'passive-002': { label: 'DN', color: '#2563EB', icon: 'globe' },    // Domain
  'passive-003': { label: 'VM', color: '#DC2626', icon: 'cube' },     // Vending
  'passive-004': { label: 'DC', color: '#7C3AED', icon: 'play-circle' }, // Digital Course
  'passive-005': { label: 'RA', color: '#D97706', icon: 'cart' },     // Retail Arbitrage
};

const DEFAULT_BRAND = { label: 'BP', color: '#00D95F' };

export function IdeaIcon({ ideaId, size = 44 }: IdeaIconProps) {
  const brand = BRAND_MAP[ideaId] || DEFAULT_BRAND;
  const fontSize = size <= 32 ? 10 : size <= 44 ? 13 : 16;
  const iconSize = size <= 32 ? 14 : size <= 44 ? 18 : 22;
  const radius = size * 0.25;

  return (
    <View
      style={[
        styles.iconWrapper,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: brand.color + '22',
          borderColor: brand.color + '55',
        },
      ]}
    >
      {brand.icon ? (
        <Ionicons name={brand.icon as any} size={iconSize} color={brand.color} />
      ) : (
        <Text style={[styles.iconLabel, { fontSize, color: brand.color }]}>{brand.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconLabel: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
