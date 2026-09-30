import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type BillingFrequency = 'per_week' | 'per_month' | 'per_year' | 'lifetime';
export type PathPricingSettings = { accessType: 'free' | 'custom'; price: string; frequency: BillingFrequency };

type Props = {
  initialAccessType?: 'free' | 'custom';
  initialPrice?: string;
  initialFrequency?: BillingFrequency;
  onSettingsChange: (settings: PathPricingSettings) => void;
};

const frequencies: { label: string; value: BillingFrequency; suffix: string }[] = [
  { label: 'Per Week', value: 'per_week', suffix: '/ wk' },
  { label: 'Per Month', value: 'per_month', suffix: '/ mo' },
  { label: 'Per Year', value: 'per_year', suffix: '/ yr' },
  { label: 'Lifetime Access', value: 'lifetime', suffix: 'one-time' },
];

export function PathLaunchSettings({ initialAccessType = 'custom', initialPrice = '49', initialFrequency = 'per_month', onSettingsChange }: Props) {
  const [accessType, setAccessType] = useState<'free' | 'custom'>(initialAccessType);
  const [price, setPrice] = useState(initialPrice);
  const [frequency, setFrequency] = useState<BillingFrequency>(initialFrequency);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const update = (next: PathPricingSettings) => {
    setAccessType(next.accessType);
    setPrice(next.price);
    setFrequency(next.frequency);
    onSettingsChange(next);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Launch Settings & Pricing</Text>
      <View style={styles.accessRow}>
        {(['free', 'custom'] as const).map((type) => <TouchableOpacity key={type} onPress={() => update({ accessType: type, price: type === 'free' ? '0' : (price === '0' ? '49' : price), frequency })} style={[styles.accessPill, accessType === type && styles.accessPillActive]}><Text style={[styles.accessText, accessType === type && styles.accessTextActive]}>{type === 'free' ? 'Free' : 'Custom Paid'}</Text></TouchableOpacity>)}
      </View>
      {accessType === 'custom' ? <>
        <View style={styles.fieldsRow}>
          <View style={styles.fieldColumn}><Text style={styles.label}>Price (USD)</Text><View style={styles.priceBox}><Text style={styles.currency}>$</Text><TextInput value={price} onChangeText={(value) => update({ accessType: 'custom', price: value.replace(/[^0-9.]/g, ''), frequency })} keyboardType="decimal-pad" placeholder="49.00" placeholderTextColor="#64748B" style={styles.priceInput} /></View></View>
          <View style={styles.fieldColumn}><Text style={styles.label}>Billing Frequency</Text><TouchableOpacity style={styles.frequencyTrigger} onPress={() => setDropdownOpen((open) => !open)}><Text style={styles.frequencyText}>{frequencies.find((entry) => entry.value === frequency)?.label} ({frequencies.find((entry) => entry.value === frequency)?.suffix})</Text><Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#94A3B8" /></TouchableOpacity></View>
        </View>
        {dropdownOpen ? <View style={styles.frequencyMenu}>{frequencies.map((entry) => <TouchableOpacity key={entry.value} style={styles.frequencyOption} onPress={() => { update({ accessType: 'custom', price, frequency: entry.value }); setDropdownOpen(false); }}><Text style={[styles.frequencyOptionText, frequency === entry.value && styles.frequencySelected]}>{entry.label} ({entry.suffix})</Text>{frequency === entry.value ? <Ionicons name="checkmark" size={15} color="#35E4A1" /> : null}</TouchableOpacity>)}</View> : null}
        <Text style={styles.presetTitle}>Quick Presets</Text>
        <View style={styles.presetRow}>{[
          { price: '19', frequency: 'per_week' as const, label: '$19 / wk' },
          { price: '49', frequency: 'per_month' as const, label: '$49 / mo' },
          { price: '199', frequency: 'per_year' as const, label: '$199 / yr' },
          { price: '299', frequency: 'lifetime' as const, label: '$299 lifetime' },
        ].map((preset) => <TouchableOpacity key={preset.frequency} onPress={() => update({ accessType: 'custom', price: preset.price, frequency: preset.frequency })} style={styles.preset}><Text style={styles.presetText}>{preset.label}</Text></TouchableOpacity>)}</View>
      </> : <Text style={styles.freeNote}>Free access · no payment required.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 15, backgroundColor: '#131B2E', borderWidth: 1, borderColor: '#FFFFFF14', borderRadius: 13, gap: 11 },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  accessRow: { flexDirection: 'row', gap: 8 },
  accessPill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 9, backgroundColor: '#0B0F19' },
  accessPillActive: { borderColor: '#35E4A1', backgroundColor: '#35E4A11A' },
  accessText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  accessTextActive: { color: '#6EE7B7' },
  fieldsRow: { flexDirection: 'row', gap: 9 },
  fieldColumn: { flex: 1, gap: 5 },
  label: { color: '#94A3B8', fontSize: 9, fontWeight: '800' },
  priceBox: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 8 },
  currency: { color: '#35E4A1', fontSize: 14, fontWeight: '900' },
  priceInput: { flex: 1, color: '#FFFFFF', paddingVertical: 8, fontSize: 13, fontWeight: '800' },
  frequencyTrigger: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, paddingHorizontal: 9, backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 8 },
  frequencyText: { flex: 1, color: '#E2E8F0', fontSize: 10, fontWeight: '700' },
  frequencyMenu: { backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 9, overflow: 'hidden' },
  frequencyOption: { minHeight: 38, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#FFFFFF0D' },
  frequencyOptionText: { color: '#CBD5E1', fontSize: 10, fontWeight: '700' },
  frequencySelected: { color: '#6EE7B7' },
  presetTitle: { color: '#64748B', fontSize: 9, fontWeight: '800', marginTop: 2 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  preset: { paddingHorizontal: 9, paddingVertical: 7, backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 99 },
  presetText: { color: '#6EE7B7', fontSize: 9, fontWeight: '800' },
  freeNote: { color: '#94A3B8', fontSize: 11 },
});
