import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { FontAwesome6 } from '@expo/vector-icons';
import { LOGO_ASSETS } from '../assets/images/logos/manifest';

type ThemeLike = {
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSub: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  isDark: boolean;
};

type BrandToken = {
  key: string;
  label: string;
  short: string;
  bg: string;
  fg: string;
  aliases?: string[];
  kind?: 'brand' | 'category';
  iconName?: string;
};

const BRANDS: BrandToken[] = [
  { key: 'doordash', label: 'DoorDash', short: 'D', bg: '#FF3008', fg: '#FFFFFF', aliases: ['door dash', 'dash'] },
  { key: 'rover', label: 'Rover', short: 'R', bg: '#14A800', fg: '#FFFFFF', aliases: ['dog walking', 'pet sitting'] },
  { key: 'biolife', label: 'BioLife', short: 'B', bg: '#0077C8', fg: '#FFFFFF', aliases: ['bio life', 'plasma donation', 'plasma'] },
  { key: 'uber eats', label: 'Uber Eats', short: 'UE', bg: '#06C167', fg: '#FFFFFF', aliases: ['ubereats'] },
  { key: 'uber', label: 'Uber', short: 'U', bg: '#111111', fg: '#FFFFFF' },
  { key: 'lyft', label: 'Lyft', short: 'L', bg: '#FF00BF', fg: '#FFFFFF' },
  { key: 'instacart', label: 'Instacart', short: 'IC', bg: '#43B02A', fg: '#FFFFFF' },
  { key: 'spark', label: 'Spark', short: 'SP', bg: '#FEBE10', fg: '#111827', aliases: ['spark driver'] },
  { key: 'grubhub', label: 'Grubhub', short: 'GH', bg: '#F63440', fg: '#FFFFFF' },
  { key: 'taskrabbit', label: 'Taskrabbit', short: 'TR', bg: '#00B140', fg: '#FFFFFF', aliases: ['task rabbit'] },
  { key: 'turo', label: 'Turo', short: 'TU', bg: '#111111', fg: '#FFFFFF' },
  { key: 'airbnb', label: 'Airbnb', short: 'AB', bg: '#FF5A5F', fg: '#FFFFFF', aliases: ['air bnb'] },
  { key: 'wag', label: 'Wag!', short: 'W', bg: '#2DD36F', fg: '#111827', aliases: ['wag!'] },
  { key: 'fiverr', label: 'Fiverr', short: 'fi', bg: '#1DBF73', fg: '#FFFFFF' },
  { key: 'upwork', label: 'Upwork', short: 'Up', bg: '#14A800', fg: '#FFFFFF' },
  { key: 'shopify', label: 'Shopify', short: 'S', bg: '#95BF47', fg: '#1A1A1A' },
  { key: 'etsy', label: 'Etsy', short: 'E', bg: '#F1641E', fg: '#FFFFFF' },
  { key: 'ebay', label: 'eBay', short: 'eB', bg: '#E53238', fg: '#FFFFFF' },
  { key: 'poshmark', label: 'Poshmark', short: 'P', bg: '#8A1947', fg: '#FFFFFF' },
  { key: 'mercari', label: 'Mercari', short: 'M', bg: '#FF0211', fg: '#FFFFFF' },
  { key: 'amazon', label: 'Amazon', short: 'a', bg: '#232F3E', fg: '#FFFFFF' },
  { key: 'youtube', label: 'YouTube', short: 'YT', bg: '#FF0000', fg: '#FFFFFF' },
  { key: 'tiktok', label: 'TikTok', short: 'TT', bg: '#111111', fg: '#FFFFFF' },
  { key: 'instagram', label: 'Instagram', short: 'IG', bg: '#E1306C', fg: '#FFFFFF' },
  { key: 'solitaire cash', label: 'Solitaire Cash', short: 'SC', bg: '#2563EB', fg: '#FFFFFF', aliases: ['solitairecash'] },
  { key: 'mistplay', label: 'Mistplay', short: 'MP', bg: '#7C3AED', fg: '#FFFFFF' },
  { key: 'swagbucks', label: 'Swagbucks', short: 'SB', bg: '#16A34A', fg: '#FFFFFF' },
];

const CATEGORY_FALLBACK: Record<string, BrandToken> = {
  'AI & Automation': { key: 'ai-stack', label: 'AI & Automation', short: 'AI', bg: '#6366F1', fg: '#FFFFFF', kind: 'category', iconName: 'wand-magic-sparkles' },
  'No-Code & SaaS': { key: 'nocode', label: 'No-Code', short: 'NC', bg: '#8B5CF6', fg: '#FFFFFF', kind: 'category', iconName: 'cubes' },
  'Digital & Content': { key: 'digital', label: 'Content', short: 'DG', bg: '#EC4899', fg: '#FFFFFF', kind: 'category', iconName: 'film' },
  'Agency & B2B': { key: 'agency', label: 'Agency', short: 'B2B', bg: '#3B82F6', fg: '#FFFFFF', kind: 'category', iconName: 'briefcase' },
  'Local & Service': { key: 'local', label: 'Local Service', short: 'LOC', bg: '#10B981', fg: '#052E1A', kind: 'category', iconName: 'location-dot' },
  'Passive & Investment': { key: 'passive', label: 'Passive Income', short: 'PI', bg: '#F59E0B', fg: '#111827', kind: 'category', iconName: 'chart-line' },
};

const CATEGORY_MATCHERS: BrandToken[] = [
  { key: 'delivery', label: 'Delivery', short: 'DL', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'truck-fast', aliases: ['delivery', 'deliver', 'courier', 'food delivery', 'grocery delivery'] },
  { key: 'social-media', label: 'Social Media', short: 'SM', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'share-nodes', aliases: ['social media', 'instagram', 'tiktok', 'youtube', 'content creator'] },
  { key: 'freelance', label: 'Freelance', short: 'FL', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'laptop-code', aliases: ['freelance', 'client work', 'gig work', 'consulting', 'copywriting', 'design service'] },
  { key: 'ecommerce', label: 'E-commerce', short: 'EC', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'bag-shopping', aliases: ['e-commerce', 'ecommerce', 'shopify', 'etsy', 'amazon', 'reselling', 'dropshipping'] },
  { key: 'pets', label: 'Pet Care', short: 'PT', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'paw', aliases: ['pet', 'dog', 'cat', 'dog walking', 'pet sitting'] },
  { key: 'local-service', label: 'Service', short: 'SV', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'screwdriver-wrench', aliases: ['service business', 'local service', 'cleaning', 'handyman', 'pressure washing'] },
  { key: 'marketplace', label: 'Marketplace', short: 'MK', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'store', aliases: ['marketplace', 'marketplace app', 'resale', 'flip items'] },
  { key: 'investing', label: 'Investing', short: 'IV', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'chart-pie', aliases: ['investing', 'dividend', 'stocks', 'passive income'] },
  { key: 'passive-income', label: 'Passive Income', short: 'PI', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'coins', aliases: ['passive income', 'dividend', 'royalty income', 'cash flow', 'automated income'] },
  { key: 'ai-tech', label: 'AI / Tech', short: 'AI', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'microchip', aliases: ['ai', 'artificial intelligence', 'automation', 'software', 'saas', 'tech', 'no-code'] },
  { key: 'content-creation', label: 'Content Creation', short: 'CC', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'camera-retro', aliases: ['content creation', 'content creator', 'ugc', 'youtube', 'podcast', 'video editing', 'creator'] },
  { key: 'real-estate', label: 'Real Estate', short: 'RE', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'building', aliases: ['real estate', 'property', 'rental', 'airbnb', 'wholesaling', 'landlord'] },
  { key: 'health-fitness', label: 'Health & Fitness', short: 'HF', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'dumbbell', aliases: ['health', 'fitness', 'wellness', 'workout', 'gym', 'personal training', 'nutrition'] },
  { key: 'education', label: 'Education', short: 'ED', bg: '#0F6CBD', fg: '#FFFFFF', kind: 'category', iconName: 'graduation-cap', aliases: ['education', 'teaching', 'course', 'tutoring', 'coach', 'training', 'lesson'] },
];

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

const brandMatches = (brand: BrandToken, haystack: string) => {
  const terms = [brand.key, ...(brand.aliases || [])];
  return terms.some((term) => haystack.includes(term));
};

const inferBrands = (item: any): BrandToken[] => {
  const haystack = collectText(item);
  const found = BRANDS.filter((b) => brandMatches(b, haystack));
  if (found.length > 0) return found.slice(0, 3);

  const categoryHit = CATEGORY_MATCHERS.find((matcher) => brandMatches(matcher, haystack));
  if (categoryHit) return [categoryHit];

  const fallback = CATEGORY_FALLBACK[item?.category as string];
  if (fallback) return [fallback];

  return [{ key: 'platform', label: 'Blueprint', short: 'APP', bg: '#334155', fg: '#FFFFFF', kind: 'category', iconName: 'layer-group' }];
};

const getGlassBg = (theme: ThemeLike) =>
  theme.isDark ? 'rgba(11, 18, 34, 0.72)' : 'rgba(255, 255, 255, 0.72)';

const handleBadgePress = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export function BrandLogoStrip({ item, theme }: { item: any; theme: ThemeLike }) {
  const brands = inferBrands(item);

  return (
    <View style={styles.row}>
      {brands.map((brand) => {
        const asset = LOGO_ASSETS[brand.key];
        const logoSource = asset?.source ?? undefined;
        const isCategory = brand.kind === 'category';
        const categoryIconColor = theme.isDark ? '#F8FAFC' : theme.accent;
        const categoryShellBg = theme.isDark ? theme.surfaceAlt : theme.accentLight;

        return (
          <Pressable
            key={brand.key}
            onPress={handleBadgePress}
            style={({ pressed }) => [
              styles.pressWrap,
              pressed && styles.pressWrapPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${brand.label} brand badge`}
          >
            <BlurView
              intensity={theme.isDark ? 26 : 38}
              tint={theme.isDark ? 'dark' : 'light'}
              style={[
                styles.badge,
                {
                  backgroundColor: getGlassBg(theme),
                  borderColor: theme.border,
                  shadowColor: theme.isDark ? '#000000' : '#0F172A',
                },
              ]}
            >
              <View style={[styles.logoShell, { borderColor: brand.bg + '66', backgroundColor: theme.surface }]}> 
                {logoSource ? (
                  <Image
                    source={logoSource}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                ) : isCategory ? (
                  <View style={[styles.categoryIconWrap, { backgroundColor: categoryShellBg }]}> 
                    <FontAwesome6 name={brand.iconName as any} size={14} color={categoryIconColor} />
                  </View>
                ) : (
                  <View style={[styles.logoStub, { backgroundColor: brand.bg }]}> 
                    <Text style={[styles.logoStubText, { color: brand.fg }]}>{brand.short}</Text>
                  </View>
                )}
              </View>
              <View style={styles.wordmarkWrap}>
                <Text style={[styles.brandLabel, { color: theme.text }]} numberOfLines={1}>
                  {brand.label}
                </Text>
                <Text style={[styles.brandMeta, { color: theme.textMuted }]} numberOfLines={1}>
                  {logoSource ? asset.filename : isCategory ? 'category' : 'platform'}
                </Text>
              </View>
            </BlurView>
          </Pressable>
        );
      })}
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
  pressWrap: {
    borderRadius: 16,
  },
  pressWrapPressed: {
    transform: [{ scale: 0.985 }],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 8,
    minWidth: 112,
    maxWidth: 168,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  logoShell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  logoImage: {
    width: 22,
    height: 22,
  },
  categoryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoStub: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoStubText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  wordmarkWrap: {
    flex: 1,
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  brandMeta: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
