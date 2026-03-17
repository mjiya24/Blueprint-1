import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, StatusBar, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { DailyBlueprintWidget } from '../../components/DailyBlueprintWidget';
import { CategoryCarousel } from '../../components/discover/CategoryCarousel';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const DIFF_COLORS: Record<string, string> = {
  easy: '#00D95F', medium: '#F59E0B', hard: '#FF6B6B',
  beginner: '#00D95F', intermediate: '#F59E0B', advanced: '#FF6B6B',
};

const getMatchColor = (score: number) =>
  score >= 75 ? '#00D95F' : score >= 55 ? '#F59E0B' : '#FF6B6B';

export default function DiscoverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const searchRef = useRef<TextInput>(null);

  const [user, setUser] = useState<any>(null);
  const [carousels, setCarousels] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoadingCarousels, setIsLoadingCarousels] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCost, setSelectedCost] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const CATEGORIES = ['All', 'AI & Automation', 'Passive & Investment', 'Agency & B2B', 'Digital & Content', 'Local & Service', 'No-Code & SaaS'];

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user !== undefined) loadCarousels();
  }, [user]);

  // If a category param is passed (e.g. from carousel "See all")
  useEffect(() => {
    if (params.category) {
      const catMap: Record<string, string> = {
        ai: 'AI & Automation', passive: 'Passive & Investment', agency: 'Agency & B2B',
        digital: 'Digital & Content', local: 'Local & Service', nocode: 'No-Code & SaaS',
      };
      const cat = catMap[params.category as string];
      if (cat) setSelectedCategory(cat);
      setIsSearchMode(true);
      triggerSearch('', cat || 'All', 'all', 'all');
    }
  }, [params.category]);

  useEffect(() => {
    if (isSearchMode) triggerSearch(searchQuery, selectedCategory, selectedDifficulty, selectedCost);
  }, [searchQuery, selectedCategory, selectedDifficulty, selectedCost]);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    setUser(userData ? JSON.parse(userData) : null);
  };

  const loadCarousels = async () => {
    try {
      const userId = user && !user.is_guest ? `?user_id=${user.id}` : '';
      const res = await axios.get(`${API_URL}/api/blueprints/carousels${userId}`);
      setCarousels(res.data);
    } catch (e) {
      console.error('Carousels error:', e);
    } finally {
      setIsLoadingCarousels(false);
    }
  };

  const triggerSearch = async (q: string, cat: string, diff: string, cost: string) => {
    setIsSearching(true);
    try {
      const params: any = { limit: 40 };
      if (q) params.q = q;
      if (cat && cat !== 'All') params.category = cat;
      if (diff && diff !== 'all') params.difficulty = diff;
      if (cost && cost !== 'all') params.startup_cost = cost;
      if (user && !user.is_guest) params.user_id = user.id;
      const res = await axios.get(`${API_URL}/api/blueprints/search`, { params });
      setSearchResults(res.data);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchFocus = () => {
    setIsSearchMode(true);
    if (!searchResults.length) triggerSearch(searchQuery, selectedCategory, selectedDifficulty, selectedCost);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    setSelectedCategory('All');
    setSelectedDifficulty('all');
    setSelectedCost('all');
    setShowFilters(false);
  };

  const activeFilterCount = [
    selectedCategory !== 'All', selectedDifficulty !== 'all', selectedCost !== 'all'
  ].filter(Boolean).length;

  const renderSearchCard = ({ item }: { item: any }) => {
    const diffColor = DIFF_COLORS[item.difficulty] || '#8E8E8E';
    const matchColor = item.match_score ? getMatchColor(item.match_score) : null;
    return (
      <TouchableOpacity
        style={styles.searchCard}
        onPress={() => router.push({ pathname: '/blueprint-detail', params: { id: item.id } })}
        activeOpacity={0.75}
        data-testid={`search-result-${item.id}`}
      >
        <View style={styles.searchCardTop}>
          <View style={styles.searchCardLeft}>
            <View style={styles.catBadge}>
              <Text style={styles.catBadgeText}>{item.category}</Text>
            </View>
          </View>
          {matchColor && item.match_score && !user?.is_guest && (
            <View style={[styles.matchPill, { borderColor: matchColor + '40' }]}>
              <View style={[styles.matchDot, { backgroundColor: matchColor }]} />
              <Text style={[styles.matchScore, { color: matchColor }]}>{item.match_score}% Match</Text>
            </View>
          )}
        </View>
        <Text style={styles.searchCardTitle}>{item.title}</Text>
        <Text style={styles.searchCardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.searchCardFooter}>
          <View style={styles.pillsRow}>
            <View style={[styles.pill, { backgroundColor: diffColor + '18' }]}>
              <Text style={[styles.pillText, { color: diffColor }]}>{item.difficulty}</Text>
            </View>
            {item.startup_cost && (
              <View style={[styles.pill, { backgroundColor: '#3B82F618' }]}>
                <Text style={[styles.pillText, { color: '#3B82F6' }]}>{item.startup_cost} cost</Text>
              </View>
            )}
          </View>
          <Text style={styles.earnings}>{item.potential_earnings}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>99+ income blueprints</Text>
        </View>
        <TouchableOpacity
          style={[styles.filterIconBtn, (showFilters || activeFilterCount > 0) && styles.filterIconBtnActive]}
          onPress={() => {
            setShowFilters(!showFilters);
            setIsSearchMode(true);
            if (!searchResults.length) triggerSearch(searchQuery, selectedCategory, selectedDifficulty, selectedCost);
          }}
          data-testid="filter-toggle-btn"
        >
          <Ionicons name="options" size={20} color={activeFilterCount > 0 ? '#00D95F' : '#8E8E8E'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, isSearchMode && styles.searchBoxActive]}>
          <Ionicons name="search" size={16} color={isSearchMode ? '#00D95F' : '#4A4A4A'} />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder="Search blueprints, categories, tags..."
            placeholderTextColor="#4A4A4A"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            returnKeyType="search"
            data-testid="search-input"
          />
          {(isSearchMode || searchQuery !== '') && (
            <TouchableOpacity onPress={handleSearchClear} data-testid="search-clear-btn">
              <Ionicons name="close-circle" size={18} color="#4A4A4A" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.filterChips}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.filterChip, selectedCategory === c && styles.filterChipActive]}
                    onPress={() => setSelectedCategory(c)}
                    data-testid={`category-filter-${c}`}
                  >
                    <Text style={[styles.filterChipText, selectedCategory === c && styles.filterChipTextActive]}>
                      {c === 'All' ? 'All' : c.split(' & ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Difficulty</Text>
            <View style={styles.filterChips}>
              {['all', 'easy', 'medium', 'hard'].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.filterChip, selectedDifficulty === d && styles.filterChipActive]}
                  onPress={() => setSelectedDifficulty(d)}
                >
                  <Text style={[styles.filterChipText, selectedDifficulty === d && styles.filterChipTextActive]}>
                    {d === 'all' ? 'Any' : d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.filterLabel, { marginLeft: 12 }]}>Cost</Text>
            <View style={styles.filterChips}>
              {['all', 'low', 'medium', 'high'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.filterChip, selectedCost === c && styles.filterChipActive]}
                  onPress={() => setSelectedCost(c)}
                >
                  <Text style={[styles.filterChipText, selectedCost === c && styles.filterChipTextActive]}>
                    {c === 'all' ? 'Any' : c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Main content */}
      {isSearchMode ? (
        /* Search / Filter Results */
        <FlatList
          data={searchResults}
          renderItem={renderSearchCard}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.searchList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsLabel}>
              {isSearching ? 'Searching...' : `${searchResults.length} results`}
              {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
            </Text>
          }
          ListEmptyComponent={
            isSearching ? (
              <ActivityIndicator color="#00D95F" style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#2A2C35" />
                <Text style={styles.emptyText}>No blueprints found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
              </View>
            )
          }
        />
      ) : (
        /* Discovery Feed — carousels */
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Daily Blueprint Widget */}
          {user && !user.is_guest && (
            <View style={styles.widgetSection}>
              <View style={styles.widgetHeader}>
                <Ionicons name="calendar" size={13} color="#00D95F" />
                <Text style={styles.widgetHeaderText}>TODAY'S PICK</Text>
              </View>
              <DailyBlueprintWidget userId={user.id} profile={user.profile} />
            </View>
          )}

          {/* Guest CTA */}
          {(!user || user.is_guest) && (
            <TouchableOpacity
              style={styles.guestBanner}
              onPress={() => router.push('/onboarding/auth')}
              data-testid="guest-create-account-banner"
            >
              <Ionicons name="flash" size={16} color="#00D95F" />
              <Text style={styles.guestBannerText}>Create a free account to see your Match Scores</Text>
              <Ionicons name="chevron-forward" size={14} color="#00D95F" />
            </TouchableOpacity>
          )}

          {/* Carousels */}
          {isLoadingCarousels ? (
            <View style={styles.loadingCarousels}>
              <ActivityIndicator color="#00D95F" />
            </View>
          ) : (
            carousels.map(carousel => (
              <CategoryCarousel key={carousel.id} carousel={carousel} />
            ))
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 58, paddingBottom: 14,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#4A4A4A' },
  filterIconBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#2A2C35', marginTop: 4,
  },
  filterIconBtnActive: { borderColor: '#00D95F', backgroundColor: '#00D95F10' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#00D95F', justifyContent: 'center', alignItems: 'center',
  },
  filterBadgeText: { fontSize: 9, color: '#000', fontWeight: '800' },
  searchRow: { paddingHorizontal: 20, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A1C23', borderRadius: 12,
    paddingHorizontal: 14, borderWidth: 1, borderColor: '#2A2C35',
  },
  searchBoxActive: { borderColor: '#00D95F30' },
  searchInput: { flex: 1, height: 44, color: '#FFFFFF', fontSize: 14 },
  filterPanel: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#0D0E14', borderRadius: 14,
    borderWidth: 1, borderColor: '#2A2C35', padding: 14,
  },
  filterScroll: { paddingBottom: 8 },
  filterGroup: { marginBottom: 4 },
  filterRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  filterLabel: {
    fontSize: 10, color: '#4A4A4A', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  filterChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#1A1C23', borderWidth: 1, borderColor: '#2A2C35',
  },
  filterChipActive: { backgroundColor: '#00D95F12', borderColor: '#00D95F' },
  filterChipText: { fontSize: 11, color: '#8E8E8E', fontWeight: '500' },
  filterChipTextActive: { color: '#00D95F', fontWeight: '600' },
  searchList: { paddingHorizontal: 20, paddingBottom: 32 },
  resultsLabel: { fontSize: 12, color: '#4A4A4A', marginBottom: 12, marginTop: 4 },
  searchCard: {
    backgroundColor: '#1A1C23', borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#2A2C35',
  },
  searchCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  searchCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  catBadge: { backgroundColor: '#00D95F12', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 10, color: '#00D95F', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  matchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  matchDot: { width: 6, height: 6, borderRadius: 3 },
  matchScore: { fontSize: 11, fontWeight: '700' },
  searchCardTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 5 },
  searchCardDesc: { fontSize: 12, color: '#8E8E8E', lineHeight: 17, marginBottom: 10 },
  searchCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillsRow: { flexDirection: 'row', gap: 6, flex: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  earnings: { fontSize: 13, fontWeight: '700', color: '#00D95F' },
  widgetSection: { paddingTop: 4 },
  widgetHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, marginBottom: 8,
  },
  widgetHeaderText: { fontSize: 10, color: '#00D95F', fontWeight: '800', letterSpacing: 1.5 },
  guestBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 20, padding: 14,
    backgroundColor: '#00D95F0A', borderRadius: 12, borderWidth: 1, borderColor: '#00D95F30',
  },
  guestBannerText: { flex: 1, fontSize: 13, color: '#00D95F', fontWeight: '600' },
  loadingCarousels: { paddingTop: 60, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: '#8E8E8E', fontWeight: '600', marginTop: 14 },
  emptySubtext: { fontSize: 12, color: '#4A4A4A', marginTop: 4 },
});
