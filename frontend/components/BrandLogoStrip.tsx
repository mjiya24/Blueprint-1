import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type ThemeLike = {
  surface: string;
  border: string;
  text: string;
  textSub: string;
  textMuted: string;
  isDark: boolean;
};

type BrandToken = {
  key: string;
  label: string;
  short: string;
  bg: string;
  fg: string;
};

const BRANDS: BrandToken[] = [
  { key: 'doordash', label: 'DoorDash', short: 'DD', bg: '#FF3008', fg: '#FFFFFF' },
  { key: 'uber', label: 'Uber', short: 'UB', bg: '#000000', fg: '#FFFFFF' },
  { key: 'lyft', label: 'Lyft', short: 'LF', bg: '#FF00BF', fg: '#FFFFFF' },
  { key: 'fiverr', label: 'Fiverr', short: 'FV', bg: '#1DBF73', fg: '#FFFFFF' },
  { key: 'upwork', label: 'Upwork', short: 'UW', bg: '#14A800', fg: '#FFFFFF' },
  { key: 'shopify', label: 'Shopify', short: 'SP', bg: '#95BF47', fg: '#1A1A1A' },
  { key: 'etsy', label: 'Etsy', short: 'ET', bg: '#F1641E', fg: '#FFFFFF' },
  { key: 'amazon', label: 'Amazon', short: 'AM', bg: '#232F3E', fg: '#FFFFFF' },
  { key: 'youtube', label: 'YouTube', short: 'YT', bg: '#FF0000', fg: '#FFFFFF' },
  { key: 'tiktok', label: 'TikTok', short: 'TT', bg: '#111111', fg: '#FFFFFF' },
  { key: 'instagram', label: 'Instagram', short: 'IG', bg: '#E1306C', fg: '#FFFFFF' },
  { key: 'solitaire cash', label: 'Solitaire Cash', short: 'SC', bg: '#2563EB', fg: '#FFFFFF' },
  { key: 'solitaire', label: 'Solitaire', short: 'SC', bg: '#2563EB', fg: '#FFFFFF' },
];

const CATEGORY_FALLBACK: Record<string, BrandToken> = {
  'AI & Automation': { key: 'ai-stack', label: 'AI Stack', short: 'AI', bg: '#6366F1', fg: '#FFFFFF' },
  'No-Code & SaaS': { key: 'nocode', label: 'No-Code', short: 'NC', bg: '#8B5CF6', fg: '#FFFFFF' },
  'Digital & Content': { key: 'digital', label: 'Digital', short: 'DG', bg: '#EC4899', fg: '#FFFFFF' },
  'Agency & B2B': { key: 'agency', label: 'Agency', short: 'B2B', bg: '#3B82F6', fg: '#FFFFFF' },
  'Local & Service': { key: 'local', label: 'Local', short: 'LOC', bg: '#10B981', fg: '#052E1A' },
  'Passive & Investment': { key: 'passive', label: 'Passive', short: 'PI', bg: '#F59E0B', fg: '#111827' },
};

const collectText = (item: any): string => {
  const parts: string[] = [];
  if (item?.title) parts.push(String(item.title));
  if (item?.description) parts.push(String(item.description));
  if (Array.isArray(item?.tags)) parts.push(item.tags.join(' '));
  if (Array.isArray(item?.action_steps)) {
    const flattened = item.action_steps
      .map((s: any) => (typeof s === 'string' ? s : s?.text || ''))
      .join(' ');
    parts.push(flattened);
  }
  return parts.join(' ').toLowerCase();
};

const inferBrands = (item: any): BrandToken[] => {
  const haystack = collectText(item);
  const found = BRANDS.filter((b) => haystack.includes(b.key));
  if (found.length > 0) return found.slice(0, 3);

  const fallback = CATEGORY_FALLBACK[item?.category as string];
  if (fallback) return [fallback];

  return [{ key: 'platform', label: 'Platform', short: 'APP', bg: '#334155', fg: '#FFFFFF' }];
};

export function BrandLogoStrip({ item, theme }: { item: any; theme: ThemeLike }) {
  const brands = inferBrands(item);

  return (
    <View style={styles.row}>
      {brands.map((brand) => (
        <View key={brand.key} style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.logoStub, { backgroundColor: brand.bg }]}>
            <Text style={[styles.logoStubText, { color: brand.fg }]}>{brand.short}</Text>
          </View>
          <Text style={[styles.brandLabel, { color: theme.textSub }]} numberOfLines={1}>
            {brand.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 8,
    maxWidth: 140,
  },
  logoStub: {
    width: 22,
    height: 22,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  logoStubText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
