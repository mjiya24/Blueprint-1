import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, StatusBar, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogoStrip } from '../../components/BrandLogoStrip';
import { useTheme } from '../../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const DIFF_COLORS: Record<string, string> = {
  easy: '#00D95F', medium: '#F59E0B', hard: '#FF6B6B',
  beginner: '#00D95F', intermediate: '#F59E0B', advanced: '#FF6B6B',
};

const getMatchColor = (s: number) => s >= 75 ? '#00D95F' : s >= 55 ? '#F59E0B' : '#FF6B6B';

const normalizeBlueprintList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.blueprints)) return payload.blueprints;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const CATEGORY_TABS = [
  { key: 'All',                  label: 'All',        icon: 'apps-outline' },
  { key: 'AI & Automation',      label: 'AI',         icon: 'flash-outline' },
  { key: 'Digital & Content',    label: 'Content',    icon: 'film-outline' },
  { key: 'No-Code & SaaS',       label: 'No-Code',    icon: 'code-slash-outline' },
  { key: 'Passive & Investment', label: 'Passive',    icon: 'trending-up-outline' },
  { key: 'Agency & B2B',         label: 'Agency',     icon: 'briefcase-outline' },
  { key: 'Local & Service',      label: 'Local',      icon: 'location-outline' },
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
  const [showFilters, setShowFilters]           = useState(false);

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
      const params: any = { limit: 60 };
      if (u && !u.is_guest) params.user_id = u.id;
      const res = await axios.get(`${API_URL}/api/blueprints`, { params });
      setBlueprints(normalizeBlueprintList(res.data));
    } catch (e) {
      console.error('Discover load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSearch = async (q: string, cat: string, diff: string) => {
    setIsSearching(true);
    try {
      const p: any = { limit: 40 };
      if (q) p.q = q;
      if (cat && cat !== 'All') p.category = cat;
      if (diff && diff !== 'all') p.difficulty = diff;
      if (user && !user.is_guest) p.user_id = user.id;

      const res = await axios.get(`${API_URL}/api/blueprints/search`, { params: p });
      let results = normalizeBlueprintList(res.data);

      // Client-side fallback if search API returns empty
      if (results.length === 0) {
        results = blueprints.filter(bp => {
          const haystack = `${bp.title} ${bp.description}`.toLowerCase();
          const matchQ    = !q    || haystack.includes(q.toLowerCase());
          const matchCat  = cat === 'All' || bp.category === cat;
          const matchDiff = diff === 'all' || bp.difficulty?.toLowerCase() === diff;
          return matchQ && matchCat && matchDiff;
        });
      }
      setSearchResults(results);
    } catch {
      // API failed — client-side filter only
      const results = blueprints.filter(bp => {
        const haystack = `${bp.title} ${bp.description}`.toLowerCase();
        return (!q || haystack.includes(q.toLowerCase())) &&
               (cat === 'All' || bp.category === cat);
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
      triggerSearch(text, activeCategory, selectedDifficulty);
    } else {
      setIsSearchMode(false);
    }
  };

  const handleCategoryTab = (key: string) => {
    setActiveCategory(key);
    // If in search mode, re-run search with new category
    if (isSearchMode && searchQuery) {
      triggerSearch(searchQuery, key, selectedDifficulty);
    }
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    searchRef.current?.blur();
  };

  const filteredBlueprints = activeCategory === 'All'
    ? blueprints
    : blueprints.filter(bp => bp.category === activeCategory);

  const displayData = isSearchMode ? searchResults : filteredBlueprints;

  const renderCard = ({ item }: { item: any }) => {
    const diffColor  = DIFF_COLORS[item.difficulty] || '#8E8E8E';
    const matchColor = item.match_score ? getMatchColor(item.match_score) : null;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push({ pathname: '/blueprint-detail', params: { id: item.id } })}
        activeOpacity={0.75}
        data-testid={`discover-card-${item.id}`}
      >
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={[styles.catBadge, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={[styles.catText, { color: theme.textMuted }]} numberOfLines={1}>
              {item.category}
            </Text>
          </View>
          {matchColor && item.match_score && !user?.is_guest && (
            <View style={[styles.matchPill, { borderColor: matchColor + '40' }]}>
              <View style={[styles.matchDot, { backgroundColor: matchColor }]} />
              <Text style={[styles.matchScore, { color: matchColor }]}>{item.match_score}% Match</Text>
            </View>
          )}
        </View>

        <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: theme.textSub }]} numberOfLines={2}>
          {item.description}
        </Text>

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
            {isLoading ? 'Loading…' : `${blueprints.length > 0 ? blueprints.length + '+' : '99+'} income blueprints`}
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
              <Ionicons name={tab.icon as any} size={12} color={active ? '#000' : theme.textMuted} />
              <Text style={[styles.tabText, { color: active ? '#000' : theme.textSub }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Difficulty filter strip ── */}
      {showFilters && (
        <View style={[styles.filterStrip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Difficulty</Text>
          <View style={styles.filterChips}>
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
                    if (isSearchMode || searchQuery) triggerSearch(searchQuery, activeCategory, d);
                  }}
                >
                  <Text style={[styles.filterChipText, { color: active ? theme.accent : theme.textSub }]}>
                    {d === 'all' ? 'Any' : d}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
                  : `${displayData.length} ${isSearchMode ? 'results' : 'blueprints'}`}
                {activeCategory !== 'All' && !isSearchMode ? ` · ${activeCategory}` : ''}
              </Text>
            </View>
          }
          ListEmptyComponent={
            isSearching ? (
              <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.emptyState}>
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
  tabsRow:    { marginBottom: 14, flexGrow: 0 },
  tabsContent: { paddingHorizontal: 20, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  tabText: { fontSize: 12, fontWeight: '600' },

  // Difficulty filter
  filterStrip: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 12, borderWidth: 1,
  },
  filterLabel:    { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  filterChips:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  filterChipText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  // List
  list:         { paddingHorizontal: 16, paddingBottom: 32 },
  listHeader:   { marginBottom: 6, marginTop: 2 },
  resultsCount: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Card
  card: {
    borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catText:   { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  matchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  matchDot:  { width: 6, height: 6, borderRadius: 3 },
  matchScore: { fontSize: 11, fontWeight: '700' },
  cardTitle:  { fontSize: 16, fontWeight: '700', marginBottom: 5, lineHeight: 22 },
  cardDesc:   { fontSize: 12, lineHeight: 17 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  pillsRow:   { flexDirection: 'row', gap: 6, flex: 1 },
  pill:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillText:   { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  earnings: {
    fontSize: 18, fontWeight: '800', color: '#00D95F',
    textShadowColor: 'rgba(0, 217, 95, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
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
