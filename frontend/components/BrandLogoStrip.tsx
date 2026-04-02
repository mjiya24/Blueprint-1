import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { FontAwesome6 } from '@expo/vector-icons';

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
  domain?: string;
  aliases?: string[];
  kind?: 'brand' | 'category';
  iconName?: string;
};

// ─────────────────────────────────────────────
// Brand registry — each entry has a Clearbit domain
// ─────────────────────────────────────────────
const BRANDS: BrandToken[] = [
  { key: 'doordash',       label: 'DoorDash',      short: 'DD', bg: '#FF3008', fg: '#FFF', domain: 'doordash.com',       aliases: ['door dash', 'dash'] },
  { key: 'rover',          label: 'Rover',          short: 'R',  bg: '#14A800', fg: '#FFF', domain: 'rover.com',           aliases: ['dog walking', 'pet sitting'] },
  { key: 'biolife',        label: 'BioLife',        short: 'BL', bg: '#0077C8', fg: '#FFF', domain: 'biolifeplasma.com',   aliases: ['bio life', 'plasma donation', 'plasma'] },
  { key: 'ubereats',       label: 'Uber Eats',      short: 'UE', bg: '#06C167', fg: '#FFF', domain: 'ubereats.com',        aliases: ['uber eats', 'ubereats'] },
  { key: 'uber',           label: 'Uber',           short: 'U',  bg: '#111',    fg: '#FFF', domain: 'uber.com' },
  { key: 'lyft',           label: 'Lyft',           short: 'L',  bg: '#FF00BF', fg: '#FFF', domain: 'lyft.com' },
  { key: 'instacart',      label: 'Instacart',      short: 'IC', bg: '#43B02A', fg: '#FFF', domain: 'instacart.com' },
  { key: 'spark',          label: 'Spark',          short: 'SP', bg: '#FEBE10', fg: '#111', domain: 'walmart.com',         aliases: ['spark driver'] },
  { key: 'grubhub',        label: 'Grubhub',        short: 'GH', bg: '#F63440', fg: '#FFF', domain: 'grubhub.com' },
  { key: 'taskrabbit',     label: 'Taskrabbit',     short: 'TR', bg: '#00B140', fg: '#FFF', domain: 'taskrabbit.com',      aliases: ['task rabbit'] },
  { key: 'turo',           label: 'Turo',           short: 'TU', bg: '#111',    fg: '#FFF', domain: 'turo.com' },
  { key: 'airbnb',         label: 'Airbnb',         short: 'AB', bg: '#FF5A5F', fg: '#FFF', domain: 'airbnb.com',          aliases: ['air bnb'] },
  { key: 'wag',            label: 'Wag!',           short: 'W',  bg: '#2DD36F', fg: '#111', domain: 'wagwalking.com',      aliases: ['wag!'] },
  { key: 'fiverr',         label: 'Fiverr',         short: 'fi', bg: '#1DBF73', fg: '#FFF', domain: 'fiverr.com' },
  { key: 'upwork',         label: 'Upwork',         short: 'Up', bg: '#14A800', fg: '#FFF', domain: 'upwork.com' },
  { key: 'shopify',        label: 'Shopify',        short: 'S',  bg: '#95BF47', fg: '#1A1A1A', domain: 'shopify.com' },
  { key: 'etsy',           label: 'Etsy',           short: 'E',  bg: '#F1641E', fg: '#FFF', domain: 'etsy.com' },
  { key: 'ebay',           label: 'eBay',           short: 'eB', bg: '#E53238', fg: '#FFF', domain: 'ebay.com' },
  { key: 'poshmark',       label: 'Poshmark',       short: 'P',  bg: '#8A1947', fg: '#FFF', domain: 'poshmark.com' },
  { key: 'mercari',        label: 'Mercari',        short: 'M',  bg: '#FF0211', fg: '#FFF', domain: 'mercari.com' },
  { key: 'amazon',         label: 'Amazon',         short: 'a',  bg: '#232F3E', fg: '#FFF', domain: 'amazon.com' },
  { key: 'youtube',        label: 'YouTube',        short: 'YT', bg: '#FF0000', fg: '#FFF', domain: 'youtube.com' },
  { key: 'tiktok',         label: 'TikTok',         short: 'TT', bg: '#111',    fg: '#FFF', domain: 'tiktok.com' },
  { key: 'instagram',      label: 'Instagram',      short: 'IG', bg: '#E1306C', fg: '#FFF', domain: 'instagram.com' },
  { key: 'solitaire cash', label: 'Solitaire Cash', short: 'SC', bg: '#2563EB', fg: '#FFF', domain: 'solitairecash.com',   aliases: ['solitairecash'] },
  { key: 'mistplay',       label: 'Mistplay',       short: 'MP', bg: '#7C3AED', fg: '#FFF', domain: 'mistplay.com' },
  { key: 'swagbucks',      label: 'Swagbucks',      short: 'SB', bg: '#16A34A', fg: '#FFF', domain: 'swagbucks.com' },
  { key: 'freecash',       label: 'Freecash',       short: 'FC', bg: '#00D95F', fg: '#111', domain: 'freecash.com' },
  { key: 'userinterviews', label: 'UserInterviews', short: 'UI', bg: '#3B82F6', fg: '#FFF', domain: 'userinterviews.com',  aliases: ['user interviews'] },
  { key: 'surveyjunkie',   label: 'Survey Junkie',  short: 'SJ', bg: '#EC4899', fg: '#FFF', domain: 'surveyjunkie.com',    aliases: ['survey junkie'] },
];

const CATEGORY_FALLBACK: Record<string, BrandToken> = {
  'AI & Automation':     { key: 'ai-stack', label: 'AI & Automation', short: 'AI',  bg: '#6366F1', fg: '#FFF', kind: 'category', iconName: 'wand-magic-sparkles' },
  'No-Code & SaaS':      { key: 'nocode',   label: 'No-Code',         short: 'NC',  bg: '#8B5CF6', fg: '#FFF', kind: 'category', iconName: 'cubes' },
  'Digital & Content':   { key: 'digital',  label: 'Content',         short: 'DG',  bg: '#EC4899', fg: '#FFF', kind: 'category', iconName: 'film' },
  'Agency & B2B':        { key: 'agency',   label: 'Agency',          short: 'B2B', bg: '#3B82F6', fg: '#FFF', kind: 'category', iconName: 'briefcase' },
  'Local & Service':     { key: 'local',    label: 'Local Service',   short: 'LOC', bg: '#10B981', fg: '#052E1A', kind: 'category', iconName: 'location-dot' },
  'Passive & Investment':{ key: 'passive',  label: 'Passive Income',  short: 'PI',  bg: '#F59E0B', fg: '#111827', kind: 'category', iconName: 'chart-line' },
};

const CATEGORY_MATCHERS: BrandToken[] = [
  { key: 'delivery',         label: 'Delivery',        short: 'DL', bg: '#0F6CBD', fg: '#FFF', kind: 'category', iconName: 'truck-fast',          aliases: ['delivery', 'deliver', 'courier', 'food delivery', 'grocery delivery'] },
  { key: 'social-media',     label: 'Social Media',    short: 'SM', bg: '#7C3AED', fg: '#FFF', kind: 'category', iconName: 'share-nodes',          aliases: ['social media', 'tiktok', 'youtube', 'content creator'] },
  { key: 'freelance',        label: 'Freelance',       short: 'FL', bg: '#2563EB', fg: '#FFF', kind: 'category', iconName: 'laptop-code',          aliases: ['freelance', 'client work', 'gig work', 'consulting', 'copywriting', 'design service'] },
  { key: 'ecommerce',        label: 'E-commerce',      short: 'EC', bg: '#F59E0B', fg: '#111', kind: 'category', iconName: 'bag-shopping',         aliases: ['e-commerce', 'ecommerce', 'reselling', 'dropshipping'] },
  { key: 'pets',             label: 'Pet Care',        short: 'PT', bg: '#10B981', fg: '#FFF', kind: 'category', iconName: 'paw',                  aliases: ['pet', 'dog', 'cat', 'dog walking', 'pet sitting'] },
  { key: 'local-service',    label: 'Service',         short: 'SV', bg: '#10B981', fg: '#FFF', kind: 'category', iconName: 'screwdriver-wrench',   aliases: ['service business', 'local service', 'cleaning', 'handyman', 'pressure washing'] },
  { key: 'marketplace',      label: 'Marketplace',     short: 'MK', bg: '#EC4899', fg: '#FFF', kind: 'category', iconName: 'store',                aliases: ['marketplace', 'resale', 'flip items'] },
  { key: 'investing',        label: 'Investing',       short: 'IV', bg: '#16A34A', fg: '#FFF', kind: 'category', iconName: 'chart-pie',            aliases: ['investing', 'dividend', 'stocks'] },
  { key: 'passive-income',   label: 'Passive Income',  short: 'PI', bg: '#F59E0B', fg: '#111', kind: 'category', iconName: 'coins',                aliases: ['passive income', 'royalty income', 'cash flow', 'automated income'] },
  { key: 'ai-tech',          label: 'AI / Tech',       short: 'AI', bg: '#6366F1', fg: '#FFF', kind: 'category', iconName: 'microchip',            aliases: ['ai', 'artificial intelligence', 'automation', 'software', 'saas', 'tech', 'no-code'] },
  { key: 'content-creation', label: 'Content',         short: 'CC', bg: '#EC4899', fg: '#FFF', kind: 'category', iconName: 'camera-retro',         aliases: ['content creation', 'content creator', 'ugc', 'podcast', 'video editing', 'creator'] },
  { key: 'real-estate',      label: 'Real Estate',     short: 'RE', bg: '#3B82F6', fg: '#FFF', kind: 'category', iconName: 'building',             aliases: ['real estate', 'property', 'rental', 'wholesaling', 'landlord'] },
  { key: 'health-fitness',   label: 'Health & Fit',    short: 'HF', bg: '#EF4444', fg: '#FFF', kind: 'category', iconName: 'dumbbell',             aliases: ['health', 'fitness', 'wellness', 'workout', 'gym', 'personal training', 'nutrition'] },
  { key: 'education',        label: 'Education',       short: 'ED', bg: '#8B5CF6', fg: '#FFF', kind: 'category', iconName: 'graduation-cap',       aliases: ['education', 'teaching', 'course', 'tutoring', 'coach', 'training', 'lesson'] },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const collectText = (item: any): string => {
  const parts: string[] = [];
  if (item?.title) parts.push(String(item.title));
  if (item?.description) parts.push(String(item.description));
  if (Array.isArray(item?.tags)) parts.push(item.tags.join(' '));
  if (Array.isArray(item?.action_steps)) {
    parts.push(item.action_steps.map((s: any) => (typeof s === 'string' ? s : s?.text || '')).join(' '));
  }
  return parts.join(' ').toLowerCase();
};

const brandMatches = (brand: BrandToken, haystack: string) =>
  [brand.key, ...(brand.aliases || [])].some((term) => haystack.includes(term));

/** Returns exactly ONE primary badge token for the item. */
const inferPrimaryBrand = (item: any): BrandToken => {
  const haystack = collectText(item);

  const brandHit = BRANDS.find((b) => brandMatches(b, haystack));
  if (brandHit) return brandHit;

  const categoryHit = CATEGORY_MATCHERS.find((m) => brandMatches(m, haystack));
  if (categoryHit) return categoryHit;

  const fallback = CATEGORY_FALLBACK[item?.category as string];
  if (fallback) return fallback;

  return { key: 'platform', label: 'Blueprint', short: 'APP', bg: '#334155', fg: '#FFFFFF', kind: 'category', iconName: 'layer-group' };
};

// ─────────────────────────────────────────────
// Single badge — owns its own error state
// ─────────────────────────────────────────────
function SingleBadge({ brand, theme }: { brand: BrandToken; theme: ThemeLike }) {
  const [imgError, setImgError] = useState(false);

  const clearbitUri = brand.domain ? `https://logo.clearbit.com/${brand.domain}` : null;
  const showRemoteLogo = !!clearbitUri && !imgError;
  const isCategory = brand.kind === 'category';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.pressWrap, pressed && styles.pressWrapPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${brand.label} badge`}
    >
      <BlurView
        intensity={theme.isDark ? 24 : 36}
        tint={theme.isDark ? 'dark' : 'light'}
        style={[
          styles.badge,
          {
            borderColor: theme.isDark ? theme.border : '#E5E7EB',
            shadowColor: '#000',
          },
        ]}
      >
        {/* ── Logo shell ── */}
        <View style={styles.logoShell}>
          {showRemoteLogo ? (
            <Image
              source={{ uri: clearbitUri! }}
              style={styles.logoImage}
              resizeMode="contain"
              onError={() => setImgError(true)}
            />
          ) : isCategory ? (
            <View style={[styles.categoryIconWrap, { backgroundColor: brand.bg + '22' }]}>
              <FontAwesome6 name={brand.iconName as any} size={15} color={brand.bg} />
            </View>
          ) : (
            <View style={[styles.logoStub, { backgroundColor: brand.bg }]}>
              <Text style={[styles.logoStubText, { color: brand.fg }]}>{brand.short}</Text>
            </View>
          )}
        </View>

        {/* ── Label ── */}
        <Text style={[styles.brandLabel, { color: theme.text }]} numberOfLines={1}>
          {brand.label}
        </Text>
      </BlurView>
    </Pressable>
  );
}

// ─────────────────────────────────────────────
// Public export
// ─────────────────────────────────────────────
export function BrandLogoStrip({ item, theme }: { item: any; theme: ThemeLike }) {
  const brand = inferPrimaryBrand(item);
  return (
    <View style={styles.row}>
      <SingleBadge brand={brand} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 10,
    marginBottom: 2,
  },
  pressWrap: {
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  pressWrapPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
    // floating shadow
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logoShell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    // subtle inner glow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  logoImage: {
    width: 22,
    height: 22,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoStub: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoStubText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  brandLabel: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    maxWidth: 110,
  },
});
