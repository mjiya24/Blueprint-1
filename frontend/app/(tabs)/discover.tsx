import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { IdeaIcon } from '../../components/icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CATEGORIES = ['All', 'Gig Economy', 'Local & Service Based', 'Digital & Freelance', 'Passive/Scalable'];

const getMatchColor = (score: number) => {
  if (score >= 75) return '#00D95F';
  if (score >= 50) return '#F59E0B';
  return '#FF6B6B';
};

const getDifficultyColor = (d: string) => {
  if (d === 'beginner') return '#00D95F';
  if (d === 'intermediate') return '#F59E0B';
  return '#FF6B6B';
};

export default function DiscoverScreen() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<any[]>([]);
  const [filteredIdeas, setFilteredIdeas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCost, setSelectedCost] = useState('all');

  useEffect(() => { fetchIdeas(); }, []);

  useEffect(() => { filterIdeas(); }, [searchQuery, selectedCategory, selectedDifficulty, selectedCost, ideas]);

  const fetchIdeas = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const u = userData ? JSON.parse(userData) : null;
      setUser(u);

      if (u && !u.is_guest) {
        const res = await axios.get(`${API_URL}/api/ideas/personalized/${u.id}`);
        setIdeas(res.data);
      } else {
        const res = await axios.get(`${API_URL}/api/ideas`, { params: { limit: 100 } });
        setIdeas(res.data.ideas || []);
      }
    } catch (e) {
      console.error('Error fetching ideas:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filterIdeas = () => {
    let f = [...ideas];
    if (searchQuery) f = f.filter(i =>
      i.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (selectedCategory !== 'All') f = f.filter(i => i.category === selectedCategory);
    if (selectedDifficulty !== 'all') f = f.filter(i => i.difficulty === selectedDifficulty);
    if (selectedCost !== 'all') f = f.filter(i => i.startup_cost === selectedCost);
    setFilteredIdeas(f);
  };

  const renderIdeaCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.ideaCard}
      onPress={() => router.push({ pathname: '/idea-detail', params: { id: item.id } })}
      activeOpacity={0.75}
      data-testid={`idea-card-${item.id}`}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <IdeaIcon ideaId={item.id} size={36} />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        </View>
        {item.match_score !== undefined && user && !user.is_guest && (
          <View style={[styles.matchBadge, { borderColor: getMatchColor(item.match_score) + '40' }]}>
            <View style={[styles.matchDot, { backgroundColor: getMatchColor(item.match_score) }]} />
            <Text style={[styles.matchScore, { color: getMatchColor(item.match_score) }]}>
              {item.match_score}% Match
            </Text>
          </View>
        )}
        {user?.is_guest && (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={11} color="#4A4A4A" />
            <Text style={styles.lockedText}>Match</Text>
          </View>
        )}
      </View>

      <Text style={styles.ideaTitle}>{item.title}</Text>
      <Text style={styles.ideaDesc} numberOfLines={2}>{item.description}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.pillsRow}>
          <View style={[styles.pill, { backgroundColor: getDifficultyColor(item.difficulty) + '18' }]}>
            <Text style={[styles.pillText, { color: getDifficultyColor(item.difficulty) }]}>{item.difficulty}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: '#3B82F618' }]}>
            <Text style={[styles.pillText, { color: '#3B82F6' }]}>{item.startup_cost} cost</Text>
          </View>
        </View>
        <Text style={styles.earnings}>{item.potential_earnings}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#00D95F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>{filteredIdeas.length} blueprints found</Text>
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={20} color={showFilters ? '#00D95F' : '#8E8E8E'} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#4A4A4A" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search blueprints..."
          placeholderTextColor="#4A4A4A"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#4A4A4A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={i => i}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, selectedCategory === item && styles.catChipSelected]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={[styles.catChipText, selectedCategory === item && styles.catChipTextSelected]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catsContainer}
      />

      {/* Filter panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Difficulty</Text>
            {['all', 'beginner', 'intermediate', 'advanced'].map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.filterChip, selectedDifficulty === d && styles.filterChipActive]}
                onPress={() => setSelectedDifficulty(d)}
              >
                <Text style={[styles.filterChipText, selectedDifficulty === d && styles.filterChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Startup Cost</Text>
            {['all', 'low', 'medium', 'high'].map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.filterChip, selectedCost === c && styles.filterChipActive]}
                onPress={() => setSelectedCost(c)}
              >
                <Text style={[styles.filterChipText, selectedCost === c && styles.filterChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={filteredIdeas}
        renderItem={renderIdeaCard}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={52} color="#2A2C35" />
            <Text style={styles.emptyText}>No blueprints found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#8E8E8E' },
  filterBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1C23', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2A2C35' },
  filterBtnActive: { borderColor: '#00D95F', backgroundColor: '#00D95F10' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A1C23', marginHorizontal: 24, marginBottom: 14,
    borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#2A2C35',
  },
  searchInput: { flex: 1, height: 46, color: '#FFFFFF', fontSize: 15 },
  catsContainer: { paddingHorizontal: 24, paddingBottom: 14, gap: 8 },
  catChip: { backgroundColor: '#1A1C23', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#2A2C35' },
  catChipSelected: { backgroundColor: '#00D95F0F', borderColor: '#00D95F' },
  catChipText: { fontSize: 13, color: '#8E8E8E', fontWeight: '500' },
  catChipTextSelected: { color: '#00D95F', fontWeight: '600' },
  filterPanel: { backgroundColor: '#1A1C23', marginHorizontal: 24, marginBottom: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2A2C35' },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  filterLabel: { fontSize: 12, color: '#8E8E8E', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, width: '100%', marginBottom: 4 },
  filterChip: { backgroundColor: '#000', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: '#2A2C35' },
  filterChipActive: { backgroundColor: '#00D95F0F', borderColor: '#00D95F' },
  filterChipText: { fontSize: 12, color: '#8E8E8E', fontWeight: '500', textTransform: 'capitalize' },
  filterChipTextActive: { color: '#00D95F', fontWeight: '600' },
  listContainer: { paddingHorizontal: 24, paddingBottom: 32 },
  ideaCard: { backgroundColor: '#1A1C23', borderRadius: 16, padding: 18, marginBottom: 10, borderWidth: 1, borderColor: '#2A2C35' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  categoryBadge: { backgroundColor: '#00D95F12', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryBadgeText: { fontSize: 11, color: '#00D95F', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1A1C23', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  matchDot: { width: 7, height: 7, borderRadius: 4 },
  matchScore: { fontSize: 12, fontWeight: '700' },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A1C23', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#2A2C35' },
  lockedText: { fontSize: 11, color: '#4A4A4A', fontWeight: '600' },
  ideaTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  ideaDesc: { fontSize: 13, color: '#8E8E8E', lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillsRow: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  earnings: { fontSize: 14, fontWeight: '700', color: '#00D95F' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, color: '#8E8E8E', fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 13, color: '#4A4A4A', marginTop: 6 },
});
