import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { completePathStep } from '../../src/services/api';

export function TradingStepCard({ step }: { step: any }) {
  const [accountSize, setAccountSize] = useState('5000');
  const [riskPercent, setRiskPercent] = useState('1');
  const [checklist, setChecklist] = useState({ news: false, stopLoss: false, plan: false });
  const [pnl, setPnl] = useState('');

  const positionSize = useMemo(() => {
    const acct = Number(accountSize) || 0;
    const risk = Number(riskPercent) || 0;
    return acct * (risk / 100);
  }, [accountSize, riskPercent]);

  const toggleItem = async (key: keyof typeof checklist) => {
    const nextValue = !checklist[key];
    setChecklist((prev) => ({ ...prev, [key]: nextValue }));

    if (nextValue && step?.id) {
      await completePathStep(step.path_id || 'path-default', step.id, { type: 'trading_rule', rule: key, pnl: pnl || null });
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Trading Checklist</Text>
      <Text style={styles.title}>{step?.title || 'Market Execution'}</Text>
      {step?.description ? <Text style={styles.description}>{step.description}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pre-market rules</Text>
        {[
          ['news', 'Checked high-impact news'],
          ['stopLoss', 'Set stop loss'],
          ['plan', 'Confirmed entry and exit plan'],
        ].map(([key, label]) => (
          <TouchableOpacity key={key} style={styles.checkRow} onPress={() => toggleItem(key as keyof typeof checklist)}>
            <View style={[styles.checkbox, checklist[key as keyof typeof checklist] && styles.checkboxChecked]}>
              {checklist[key as keyof typeof checklist] ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Risk calculator</Text>
        <View style={styles.row}>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Account size</Text>
            <TextInput value={accountSize} onChangeText={setAccountSize} keyboardType="numeric" style={styles.input} />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Risk %</Text>
            <TextInput value={riskPercent} onChangeText={setRiskPercent} keyboardType="numeric" style={styles.input} />
          </View>
        </View>
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Max risk</Text>
          <Text style={styles.resultValue}>${positionSize.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verified PnL log</Text>
        <TextInput
          value={pnl}
          onChangeText={setPnl}
          placeholder="Enter +$420 or 62% win rate"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: '#1F2A44', padding: 16 },
  kicker: { color: '#35E4A1', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginTop: 4 },
  description: { color: '#CBD5E1', fontSize: 13, lineHeight: 18, marginTop: 8, marginBottom: 14 },
  section: { marginBottom: 16 },
  sectionTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: '#94A3B8', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#35E4A1', borderColor: '#35E4A1' },
  checkmark: { color: '#000', fontWeight: '900', fontSize: 12 },
  checkText: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  inputWrap: { flex: 1 },
  inputLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: '#0B1222', borderWidth: 1, borderColor: '#1F2A44', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, color: '#F8FAFC' },
  resultBox: { marginTop: 12, backgroundColor: '#35E4A122', borderRadius: 12, padding: 12 },
  resultLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: '700' },
  resultValue: { color: '#35E4A1', fontSize: 22, fontWeight: '800', marginTop: 4 },
});
