import React, { ReactNode, useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type PhaseAccordionItemProps = {
  phaseNumber: number;
  title: string;
  category: string;
  accessTier: 'FREE_HOOK' | 'MEMBER_ACCESS';
  isConsumerView: boolean;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children: ReactNode;
  editorControls?: ReactNode;
};

export function PhaseAccordionItem({
  phaseNumber,
  title,
  category,
  accessTier,
  isConsumerView,
  defaultExpanded = false,
  expanded,
  onToggle,
  children,
  editorControls,
}: PhaseAccordionItemProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (onToggle) onToggle();
    else setInternalExpanded((current) => !current);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.headerRow} onPress={toggle} activeOpacity={0.82} accessibilityRole="button" accessibilityState={{ expanded: isExpanded }}>
        <View style={styles.headerLeft}>
          <Text style={styles.phaseLabel}>PHASE {phaseNumber} <Text style={styles.arrow}>{isExpanded ? '▲' : '⇩'}</Text></Text>
          <Text numberOfLines={1} style={styles.phaseTitle}>{title}</Text>
          <Text numberOfLines={1} style={styles.category}>{category}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.badge, accessTier === 'FREE_HOOK' ? styles.freeBadge : styles.memberBadge]}>
            <Ionicons name={accessTier === 'FREE_HOOK' ? 'sparkles' : 'lock-closed'} size={11} color={accessTier === 'FREE_HOOK' ? '#35E4A1' : '#A78BFA'} />
            <Text style={[styles.badgeText, accessTier === 'FREE_HOOK' ? styles.freeText : styles.memberText]}>{accessTier === 'FREE_HOOK' ? 'FREE HOOK' : 'MEMBER ACCESS'}</Text>
          </View>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#94A3B8" />
        </View>
      </TouchableOpacity>
      {isExpanded ? <View style={styles.body}>
        {children}
        {!isConsumerView && editorControls ? <View style={styles.editorPanel}><View style={styles.editorHeader}><Ionicons name="settings-outline" size={14} color="#35E4A1" /><Text style={styles.editorTitle}>Phase Configuration & Formula Settings</Text></View>{editorControls}</View> : null}
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#0B0F17', borderRadius: 13, borderWidth: 1, borderColor: '#FFFFFF14', marginBottom: 12, overflow: 'hidden' },
  headerRow: { minHeight: 72, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingVertical: 11, backgroundColor: '#131B2E' },
  headerLeft: { flex: 1, minWidth: 0, gap: 3 },
  phaseLabel: { color: '#35E4A1', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  arrow: { color: '#6EE7B7', fontSize: 10 },
  phaseTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '800' },
  category: { color: '#64748B', fontSize: 9, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7 },
  freeBadge: { backgroundColor: '#35E4A11A' },
  memberBadge: { backgroundColor: '#A78BFA1A' },
  badgeText: { fontSize: 8, fontWeight: '900' },
  freeText: { color: '#6EE7B7' },
  memberText: { color: '#C4B5FD' },
  body: { padding: 12, gap: 13 },
  editorPanel: { padding: 13, backgroundColor: '#080B12', borderRadius: 10, borderWidth: 1, borderColor: '#FFFFFF14' },
  editorHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11 },
  editorTitle: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
});
