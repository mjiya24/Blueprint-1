import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, Modal,
  TouchableOpacity, StatusBar, TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogoStrip } from '../../components/BrandLogoStrip';
import { useTheme } from '../../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://blueprint-1-mnvh.onrender.com';

const DIFF_COLORS: Record<string, string> = {
  easy: '#00D95F', medium: '#F59E0B', hard: '#FF6B6B',
  beginner: '#00D95F', intermediate: '#F59E0B', advanced: '#FF6B6B',
};

const getMatchColor = (s: number) => s >= 75 ? '#00D95F' : s >= 55 ? '#F59E0B' : '#FF6B6B';

const normalizeBlueprintList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.ideas)) return payload.ideas;       // /api/ideas
  if (Array.isArray(payload?.blueprints)) return payload.blueprints; // /api/blueprints
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const CATEGORY_TABS = [
  { key: 'All',                  label: 'All' },
  { key: 'Gig Economy',          label: 'Gig' },
  { key: 'AI & Automation',      label: 'AI' },
  { key: 'Digital & Content',    label: 'Content' },
  { key: 'No-Code & SaaS',       label: 'No-Code' },
  { key: 'Passive & Investment', label: 'Passive' },
  { key: 'Agency & B2B',         label: 'Agency' },
  { key: 'Local & Service',      label: 'Local' },
  { key: 'Student & Campus',     label: 'Student' },
];

const PAY_FILTERS = [
  { key: 'all', label: 'Any Pay' },
  { key: 'under-250', label: 'Under $250' },
  { key: '250-1500', label: '$250-$1500' },
  { key: '1500-5000', label: '$1500-$5000' },
  { key: '5000+', label: '$5000+' },
];

const PAYOUT_FILTERS = [
  { key: 'all', label: 'Any Speed' },
  { key: '48h', label: '48 hours' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const searchRef = useRef<TextInput>(null);

  const [user, setUser]                         = useState<any>(null);
  const [blueprints, setBlueprints]             = useState<any[]>([]);
  const [searchResults, setSearchResults]       = useState<any[]>([]);
  const [isLoading, setIsLoading]               = useState(true);
  const [isSearching, setIsSearching]           = useState(false);
  const [searchQuery, setSearchQuery]           = useState('');
  const [isSearchMode, setIsSearchMode]         = useState(false);
  const [activeCategory, setActiveCategory]     = useState('All');
  const [selectedDifficulty, setSelectedDiff]   = useState('all');
  const [selectedPayBand, setSelectedPayBand]   = useState('all');
  const [selectedPayout, setSelectedPayout]     = useState('all');
  const [showFilters, setShowFilters]           = useState(false);
  const [verifyModalBp, setVerifyModalBp]       = useState<any>(null);
  const [verifiedOnly, setVerifiedOnly]         = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const raw = await AsyncStorage.getItem('user');
    const u = raw ? JSON.parse(raw) : null;
    setUser(u);
    await loadBlueprints(u);
  };

  const loadBlueprints = async (u?: any) => {
    setIsLoading(true);
    try {
      const params: any = { limit: 150 };
      if (u && !u.is_guest) params.user_id = u.id;
      // Try /api/ideas first (always seeded), fall back to /api/blueprints
      let items: any[] = [];
      try {
        const res = await axios.get(`${API_URL}/api/ideas`, { params, timeout: 12000 });
        items = normalizeBlueprintList(res.data);
      } catch {
        const res = await axios.get(`${API_URL}/api/blueprints`, { params, timeout: 12000 });
        items = normalizeBlueprintList(res.data);
      }
      setBlueprints(items);
    } catch (e) {
      setBlueprints([]);
      if (__DEV__) {
        console.log('Discover data unavailable, showing empty state.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const matchesCategory = (bp: any, cat: string) => {
    if (cat === 'All') return true;
    const category = String(bp?.category || '');
    if (category === cat) return true;
    const catPrefix = cat.split(' & ')[0];
    return category.startsWith(catPrefix);
  };

  const matchesDifficulty = (bp: any, diff: string) => {
    if (diff === 'all') return true;
    return String(bp?.difficulty || '').toLowerCase() === diff;
  };

  const parseMonthlyEarnings = (value?: string): number => {
    if (!value) return 0;
    const raw = String(value).toLowerCase();
    const nums = (raw.match(/\d[\d,]*/g) || []).map((n) => parseInt(n.replace(/,/g, ''), 10)).filter((n) => !Number.isNaN(n));
    if (nums.length === 0) return 0;
    const top = Math.max(...nums);
    if (raw.includes('/hour')) return top * 160;
    if (raw.includes('/day')) return top * 22;
    if (raw.includes('/week')) return top * 4;
    if (raw.includes('/year')) return Math.round(top / 12);
    return top;
  };

  const inferPayoutSpeed = (bp: any): string => {
    if (bp?.payout_speed) return String(bp.payout_speed).toLowerCase();
    const tags = Array.isArray(bp?.tags) ? bp.tags.join(' ').toLowerCase() : '';
    const horizon = String(bp?.time_horizon || '').toLowerCase();
    if (tags.includes('quick-win') || tags.includes('quick-cash') || horizon === 'fast') return '48h';
    if (horizon === 'long') return 'monthly';
    return 'weekly';
  };

  const inferPayBand = (bp: any): string => {
    const monthly = parseMonthlyEarnings(bp?.potential_earnings);
    if (monthly < 250) return 'under-250';
    if (monthly < 1500) return '250-1500';
    if (monthly < 5000) return '1500-5000';
    return '5000+';
  };

  const matchesPayBand = (bp: any, payBand: string) => payBand === 'all' || inferPayBand(bp) === payBand;

  const matchesPayout = (bp: any, payout: string) => payout === 'all' || inferPayoutSpeed(bp) === payout;

  const computeLocationAwareMatch = (bp: any): number => {
    const base = typeof bp?.match_score === 'number' ? bp.match_score : 50;
    let score = base;

    const profile = user?.profile || {};
    const hasCity = !!profile?.city;
    const country = String(profile?.country_code || 'US').toUpperCase();
    const regions: string[] = Array.isArray(bp?.available_regions) ? bp.available_regions : ['US', 'CA', 'GB', 'IN'];

    if (bp?.is_location_based) {
      score += hasCity ? 10 : -8;
      score += regions.includes(country) ? 10 : -10;
    } else {
      score += 8;
    }

    const reqAssets = (bp?.asset_requirements || []).filter((a: string) => a !== 'none');
    const userAssets = new Set(profile?.assets || []);
    if (reqAssets.length > 0) {
      const matched = reqAssets.filter((a: string) => userAssets.has(a)).length;
      if (matched === reqAssets.length) score += 8;
      else if (matched > 0) score += 3;
      else score -= 6;
    }

    return Math.max(30, Math.min(99, Math.round(score)));
  };

  const triggerSearch = async (q: string, cat: string, diff: string, payBand: string, payout: string, verified = verifiedOnly) => {
    setIsSearching(true);
    try {
      const query = q.toLowerCase();
      const results = blueprints.filter(bp => {
        const haystack = `${bp.title} ${bp.description} ${bp.category}`.toLowerCase();
        const matchQ = !query || haystack.includes(query);
        const matchVerified = !verified || bp.verification_status === 'source-linked' || bp.verification_status === 'bls-verified';
        return matchQ &&
               matchesCategory(bp, cat) &&
               matchesDifficulty(bp, diff) &&
               matchesPayBand(bp, payBand) &&
               matchesPayout(bp, payout) &&
               matchVerified;
      });
      setSearchResults(results);
    } catch {
      // API failed — client-side filter only
      const results = blueprints.filter(bp => {
        const haystack = `${bp.title} ${bp.description}`.toLowerCase();
        const matchVerified = !verified || bp.verification_status === 'source-linked' || bp.verification_status === 'bls-verified';
        return (!q || haystack.includes(q.toLowerCase())) &&
               matchesCategory(bp, cat) &&
               matchesDifficulty(bp, diff) &&
               matchesPayBand(bp, payBand) &&
               matchesPayout(bp, payout) &&
               matchVerified;
      });
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length > 0) {
      setIsSearchMode(true);
      triggerSearch(text, activeCategory, selectedDifficulty, selectedPayBand, selectedPayout);
    } else {
      setIsSearchMode(false);
    }
  };

  const handleCategoryTab = (key: string) => {
    setActiveCategory(key);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // If in search mode, re-run search with new category
    if (isSearchMode && searchQuery) {
      triggerSearch(searchQuery, key, selectedDifficulty, selectedPayBand, selectedPayout);
    }
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    searchRef.current?.blur();
  };

  const filteredBlueprints = blueprints.filter(bp => {
    const matchVerified = !verifiedOnly || bp.verification_status === 'source-linked' || bp.verification_status === 'bls-verified';
    return matchesCategory(bp, activeCategory) &&
      matchesDifficulty(bp, selectedDifficulty) &&
      matchesPayBand(bp, selectedPayBand) &&
      matchesPayout(bp, selectedPayout) &&
      matchVerified;
  });

  const displayData = isSearchMode ? searchResults : filteredBlueprints;
  const libraryCount = blueprints.length;

  const renderCard = ({ item }: { item: any }) => {
    const diffColor  = DIFF_COLORS[item.difficulty] || '#8E8E8E';
    const liveMatch = computeLocationAwareMatch(item);
    const matchColor = getMatchColor(liveMatch);
    const requirements = item?.required_credentials?.length
      ? item.required_credentials.join(', ')
      : (item?.requirements_summary || (item?.asset_requirements || []).filter((a: string) => a !== 'none').join(', '));
    const verification = item?.verification_status || 'source-linked';
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: 'rgba(255,255,255,0.05)' }]}
        onPress={() => router.push({ pathname: '/blueprint-detail', params: { id: item.id } })}
        activeOpacity={0.75}
        data-testid={`discover-card-${item.id}`}
      >
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={[styles.catBadge, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.13)' : theme.surfaceAlt }]}> 
            <Text style={[styles.catText, { color: theme.text }]} numberOfLines={1}>
              {item.category}
            </Text>
          </View>
          <View style={[
            styles.matchPill,
            { borderColor: matchColor + '40' },
            liveMatch >= 85 && {
              shadowColor: '#00D95F',
              shadowOpacity: 0.55,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
              elevation: 8,
            },
          ]}>
            <View style={[styles.matchDot, { backgroundColor: matchColor }]} />
            <Text style={[styles.matchScore, { color: matchColor }]}>{liveMatch}% Match</Text>
          </View>
        </View>

        <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: theme.textSub }]} numberOfLines={2}>
          {item.description}
        </Text>

        {!!requirements && (
          <Text style={[styles.reqText, { color: theme.textMuted }]} numberOfLines={1}>
            Requirements: {requirements}
          </Text>
        )}

        <View style={styles.metaLine}>
          <TouchableOpacity
            style={[styles.verifyPill, { backgroundColor: 'rgba(0,217,95,0.08)', borderColor: '#00D95F40' }]}
            onPress={() => setVerifyModalBp(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark-outline" size={11} color="#00D95F" />
            <Text style={[styles.verifyText, { color: '#00D95F' }]}>{verification}</Text>
          </TouchableOpacity>
          <View style={[styles.verifyPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Ionicons name="time-outline" size={11} color={theme.textMuted} />
            <Text style={[styles.verifyText, { color: theme.textMuted }]}>{inferPayoutSpeed(item)}</Text>
          </View>
        </View>

        <BrandLogoStrip item={item} theme={theme} />

        <View style={styles.cardFooter}>
          <View style={styles.pillsRow}>
            <View style={[styles.pill, { backgroundColor: diffColor + '18' }]}>
              <Text style={[styles.pillText, { color: diffColor }]}>{item.difficulty}</Text>
            </View>
            {item.startup_cost && (
              <View style={[styles.pill, { backgroundColor: '#3B82F618' }]}>
                <Text style={[styles.pillText, { color: '#60A5FA' }]}>{item.startup_cost} cost</Text>
              </View>
            )}
          </View>
          <Text style={styles.earnings}>{item.potential_earnings}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: theme.bg }]}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Discover</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {isLoading ? 'Loading…' : '99+ curated income blueprints'}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            { backgroundColor: showFilters ? theme.accentLight : theme.surface, borderColor: showFilters ? theme.accent : theme.border },
          ]}
          onPress={() => setShowFilters(f => !f)}
          data-testid="filter-toggle-btn"
        >
          <Ionicons name="options" size={20} color={showFilters ? theme.accent : theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchWrap}>
        <View style={[
          styles.searchBox,
          { backgroundColor: theme.surface, borderColor: isSearchMode ? theme.accent + '60' : theme.border },
        ]}>
          <Ionicons name="search" size={16} color={isSearchMode ? theme.accent : theme.textMuted} />
          <TextInput
            ref={searchRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search blueprints, categories, tags…"
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            data-testid="search-input"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={handleSearchClear} data-testid="search-clear-btn">
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Category tab pills ── */}
      <View style={styles.tabsPanel}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          style={styles.tabsRow}
        >
          {CATEGORY_TABS.map(tab => {
            const active = activeCategory === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? theme.accent : theme.surface,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => handleCategoryTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, { color: active ? '#000' : theme.text }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Filter strip ── */}
      {showFilters && (
        <View style={[styles.filterStrip, { backgroundColor: theme.surface, borderColor: theme.border }]}>

          {/* Verified Only toggle row */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Verified</Text>
            <TouchableOpacity
              style={[
                styles.verifiedToggle,
                verifiedOnly
                  ? { backgroundColor: 'rgba(0,217,95,0.15)', borderColor: '#00D95F' }
                  : { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
              onPress={() => {
                const next = !verifiedOnly;
                setVerifiedOnly(next);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                if (isSearchMode || searchQuery) {
                  triggerSearch(searchQuery, activeCategory, selectedDifficulty, selectedPayBand, selectedPayout, next);
                }
              }}
              activeOpacity={0.75}
            >
              <Ionicons
                name={verifiedOnly ? 'shield-checkmark' : 'shield-checkmark-outline'}
                size={13}
                color={verifiedOnly ? '#00D95F' : theme.textMuted}
              />
              <Text style={[
                styles.filterChipText,
                { color: verifiedOnly ? '#00D95F' : theme.textSub },
              ]}>Verified Only</Text>
            </TouchableOpacity>
          </View>

          {/* Difficulty row */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Difficulty</Text>
            <View style={styles.filterChipsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                {['all', 'beginner', 'intermediate', 'advanced'].map(d => {
                  const active = selectedDifficulty === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active ? theme.accent + '22' : theme.surfaceAlt,
                          borderColor: active ? theme.accent : theme.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedDiff(d);
                        if (isSearchMode || searchQuery) triggerSearch(searchQuery, activeCategory, d, selectedPayBand, selectedPayout);
                      }}
                    >
                      <Text style={[styles.filterChipText, { color: active ? theme.accent : theme.textSub }]}>
                        {d === 'all' ? 'Any' : d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <LinearGradient
                colors={['transparent', theme.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterFade}
                pointerEvents="none"
              />
            </View>
          </View>

          {/* Pay row */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Pay</Text>
            <View style={styles.filterChipsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                {PAY_FILTERS.map(p => {
                  const active = selectedPayBand === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active ? theme.accent + '22' : theme.surfaceAlt,
                          borderColor: active ? theme.accent : theme.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedPayBand(p.key);
                        if (isSearchMode || searchQuery) triggerSearch(searchQuery, activeCategory, selectedDifficulty, p.key, selectedPayout);
                      }}
                    >
                      <Text style={[styles.filterChipText, { color: active ? theme.accent : theme.textSub }]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <LinearGradient
                colors={['transparent', theme.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterFade}
                pointerEvents="none"
              />
            </View>
          </View>

          {/* Payout row */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Payout</Text>
            <View style={styles.filterChipsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                {PAYOUT_FILTERS.map(p => {
                  const active = selectedPayout === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active ? theme.accent + '22' : theme.surfaceAlt,
                          borderColor: active ? theme.accent : theme.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedPayout(p.key);
                        if (isSearchMode || searchQuery) triggerSearch(searchQuery, activeCategory, selectedDifficulty, selectedPayBand, p.key);
                      }}
                    >
                      <Text style={[styles.filterChipText, { color: active ? theme.accent : theme.textSub }]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <LinearGradient
                colors={['transparent', theme.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterFade}
                pointerEvents="none"
              />
            </View>
          </View>

        </View>
      )}

      {/* ── Blueprint list ── */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading blueprints…</Text>
        </View>
      ) : (
        <FlatList
          data={displayData}
          renderItem={renderCard}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={[styles.resultsCount, { color: theme.textMuted }]}>
                {isSearching
                  ? 'Searching…'
                  : (isSearchMode
                    ? `${displayData.length} RESULTS`
                    : `${libraryCount} BLUEPRINTS`)}
                {activeCategory !== 'All' && !isSearchMode ? ` · ${activeCategory}` : ''}
              </Text>
            </View>
          }
          ListEmptyComponent={
            isSearching ? (
              <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.emptyState}>
                {verifiedOnly && displayData.length === 0 && !isSearchMode ? (
                  <>
                    <View style={[styles.emptyIconWrap, { backgroundColor: theme.accentLight }]}>
                      <Ionicons name="layers-outline" size={40} color={theme.accent} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>Curation in Progress</Text>
                    <Text style={[styles.emptySub, { color: theme.textMuted }]}>We're verifying more blueprints daily. Check back soon for verified-only opportunities.</Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.emptyIconWrap, { backgroundColor: theme.surface }]}>
                      <Ionicons name="compass-outline" size={38} color={theme.textMuted} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>
                      {isSearchMode ? 'No results found' : 'No blueprints yet'}
                    </Text>
                    <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                      {isSearchMode
                        ? 'Try a different keyword or clear your filters'
                        : 'New blueprints are added daily — check back soon'}
                    </Text>
                  </>
                )}
                {isSearchMode && (
                  <TouchableOpacity
                    style={[styles.emptyBtn, { backgroundColor: theme.accentLight }]}
                    onPress={handleSearchClear}
                  >
                    <Text style={[styles.emptyBtnText, { color: theme.accent }]}>Clear Search</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
        />
      )}

      {/* ── Verification Sources Modal ── */}
      <Modal
        visible={!!verifyModalBp}
        transparent
        animationType="fade"
        onRequestClose={() => setVerifyModalBp(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVerifyModalBp(null)}
        >
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Verified Sources</Text>
            <Text style={[styles.modalBpTitle, { color: theme.textSub }]} numberOfLines={2}>
              {verifyModalBp?.title}
            </Text>
            {typeof verifyModalBp?.confidence_score === 'number' && (
              <View style={styles.confidenceRow}>
                <Text style={[styles.confidenceLabel, { color: theme.textMuted }]}>Confidence Score</Text>
                <View style={[
                  styles.confidenceBadge,
                  {
                    backgroundColor: verifyModalBp.confidence_score >= 80 ? 'rgba(0,217,95,0.15)' : verifyModalBp.confidence_score >= 45 ? 'rgba(245,158,11,0.15)' : 'rgba(255,107,107,0.15)',
                    borderColor: verifyModalBp.confidence_score >= 80 ? '#00D95F' : verifyModalBp.confidence_score >= 45 ? '#F59E0B' : '#FF6B6B',
                  },
                ]}>
                  <Text style={[
                    styles.confidenceScore,
                    { color: verifyModalBp.confidence_score >= 80 ? '#00D95F' : verifyModalBp.confidence_score >= 45 ? '#F59E0B' : '#FF6B6B' },
                  ]}>{verifyModalBp.confidence_score}%</Text>
                </View>
              </View>
            )}
            <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />
            {(verifyModalBp?.verification_sources || []).map((src: string, i: number) => (
              <View key={i} style={styles.modalSourceRow}>
                <Ionicons name="checkmark-circle" size={15} color="#00D95F" />
                <Text style={[styles.modalSourceText, { color: theme.textSub }]}>{src}</Text>
              </View>
            ))}
            {!(verifyModalBp?.verification_sources?.length) && (
              <View style={styles.modalSourceRow}>
                <Ionicons name="checkmark-circle" size={15} color="#00D95F" />
                <Text style={[styles.modalSourceText, { color: theme.textSub }]}>BLS Occupational Outlook Handbook</Text>
              </View>
            )}
            {!!verifyModalBp?.verification_last_checked && (
              <Text style={[styles.modalLastChecked, { color: theme.textMuted }]}>
                Last verified: {verifyModalBp.verification_last_checked}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: theme.accentLight }]}
              onPress={() => setVerifyModalBp(null)}
            >
              <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 14 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 58, paddingBottom: 12,
  },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  filterBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', marginTop: 6,
  },

  // Search
  searchWrap: { paddingHorizontal: 20, marginBottom: 14 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, height: 46,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // Category tabs
  tabsPanel: {
    marginBottom: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  tabsRow:    { flexGrow: 0 },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22, borderWidth: 1,
    minHeight: 42,
  },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabsContent: { paddingHorizontal: 20, gap: 10, paddingVertical: 2 },

  // Filter strip
  filterStrip: {
    flexDirection: 'column', gap: 2,
    marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 12, borderWidth: 1,
  },
  filterRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  filterLabel:     { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 68 },
  filterChipsWrap: { flex: 1, overflow: 'hidden' },
  filterChips:     { flexDirection: 'row', gap: 6, paddingVertical: 2, paddingRight: 32 },
  filterFade:      { position: 'absolute', right: 0, top: 0, bottom: 0, width: 32 },
  filterChip:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  filterChipText:  { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  verifiedToggle:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },

  // List
  list:         { paddingHorizontal: 16, paddingBottom: 32 },
  listHeader:   { marginBottom: 6, marginTop: 2 },
  resultsCount: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Card
  card: {
    borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catText:   { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  matchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  matchDot:  { width: 6, height: 6, borderRadius: 3 },
  matchScore: { fontSize: 11, fontWeight: '700' },
  cardTitle:  { fontSize: 16, fontWeight: '700', marginBottom: 5, lineHeight: 22 },
  cardDesc:   { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  reqText:    { fontSize: 10, marginBottom: 7, lineHeight: 14, fontStyle: 'italic' },
  metaLine:   { flexDirection: 'row', gap: 6, marginBottom: 8 },
  verifyPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifyText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  pillsRow:   { flexDirection: 'row', gap: 6, flex: 1 },
  pill:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillText:   { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  earnings: {
    fontSize: 22, fontWeight: '800', color: '#00D95F',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0, 217, 95, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // Verification Modal
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1,
    padding: 24, paddingBottom: 40,
  },
  modalHandle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:       { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalBpTitle:     { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  confidenceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  confidenceLabel:  { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  confidenceBadge:  { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, minWidth: 70, alignItems: 'center' },
  confidenceScore:  { fontSize: 14, fontWeight: '800' },
  modalDivider:     { height: 1, marginBottom: 12 },
  modalSourceRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 9 },
  modalSourceText:  { fontSize: 13, flex: 1, lineHeight: 19 },
  modalLastChecked: { fontSize: 11, marginTop: 12, marginBottom: 2 },
  modalClose: {
    marginTop: 22, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },

  // Loading / Empty
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13 },
  emptyState:  { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  emptyBtn:   { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { fontSize: 13, fontWeight: '700' },
});
