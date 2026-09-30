import React, { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Props = { step: any };

export function InteractiveEngineCard({ step }: Props) {
  const widget = useMemo(() => step?.widget_data || {}, [step?.widget_data]);
  const [pitch, setPitch] = useState('');
  const [metric, setMetric] = useState(String(widget.starting_value ?? 5000));
  const [promptInput, setPromptInput] = useState('');
  const [proof, setProof] = useState('');
  const [discountRate, setDiscountRate] = useState(String(widget.discount_rate_pct ?? 9));
  const [terminalGrowth, setTerminalGrowth] = useState(String(widget.terminal_growth_pct ?? 3));
  const [capital, setCapital] = useState(String(widget.capital ?? 25000));
  const [stopLoss, setStopLoss] = useState(String(widget.stop_loss_pct ?? 2));
  const [oneRepMax, setOneRepMax] = useState(String(widget.one_rep_max ?? 315));
  const [rpe, setRpe] = useState(String(widget.rpe ?? 8));
  const [buyerPersona, setBuyerPersona] = useState(widget.buyer_personas?.[0] || 'Price-Sensitive CFO');
  const [dealValue, setDealValue] = useState(String(widget.deal_value ?? 5000));
  const [specialtyInput, setSpecialtyInput] = useState('72');
  const targetRate = widget.target_rate_pct ?? 2;
  const [submitted, setSubmitted] = useState(false);

  const calculatorResult = useMemo(() => {
    const value = Number(metric) || 0;
    return value * (Number(targetRate) / 100);
  }, [metric, targetRate]);
  const intrinsicValue = useMemo(() => {
    const revenue = Number(widget.starting_revenue) || 100000000;
    const discount = Number(discountRate) / 100 || 0.09;
    const growth = Number(terminalGrowth) / 100 || 0.03;
    return (revenue * (1 + growth) / Math.max(0.01, discount - growth)) * (1 - Number(widget.margin_of_safety_pct || 25) / 100);
  }, [discountRate, terminalGrowth, widget]);
  const positionRisk = (Number(capital) || 0) * (Number(widget.risk_per_trade_pct || 1) / 100);
  const shareSize = positionRisk / Math.max(0.1, Number(stopLoss) || 2);
  const workingWeight = (Number(oneRepMax) || 0) * (0.72 + Math.max(0, 10 - Number(rpe)) * 0.02);
  const paybackMonths = (Number(dealValue) || 0) / Math.max(1, (Number(dealValue) || 0) * 0.2);
  const specialtyScore = Math.min(100, Math.max(0, Number(specialtyInput) || 0));
  const specialtyLabels: Record<string, string> = {
    confluence_bias_score: 'Confluence Bias Score',
    outreach_roi_model: 'Outreach ROI & Retainer Model',
    api_automation_roi: 'API Cost & Automation ROI',
    product_roas_gauge: 'Breakeven ROAS Gauge',
    hook_diagnostic: 'Scroll-Stop Hook Diagnostic',
    mao_calculator: 'Maximum Allowable Offer',
    mvp_scope_calculator: 'MVP Scope & Complexity',
    sleep_window_calculator: 'Deep Work & Sleep Window',
  };

  const submit = () => setSubmitted(true);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}><Text style={styles.badgeText}>{String(widget.widget_type || 'interactive').replace('_', ' ').toUpperCase()}</Text></View>
        <Text style={styles.gate}>{step?.day === 1 ? 'FREE INSTANT WIN' : 'MEMBER ACCESS'}</Text>
      </View>
      <Text style={styles.title}>{step?.title || 'Interactive step'}</Text>
      {step?.instructions ? <Text style={styles.description}>{step.instructions}</Text> : null}

      {widget.specialty ? (
        <>
          <View style={styles.metricRow}><View style={styles.metric}><Text style={styles.metricLabel}>Live engine</Text><Text style={styles.metricValue}>{specialtyLabels[widget.widget_type] || 'Domain Diagnostic'}</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Signal</Text><Text style={styles.metricValue}>{specialtyScore}/100</Text></View></View>
          <Text style={styles.label}>Adjust your baseline</Text>
          <TextInput value={specialtyInput} onChangeText={setSpecialtyInput} keyboardType="numeric" style={styles.input} />
          <View style={styles.gauge}><View style={[styles.gaugeFill, { width: `${specialtyScore}%` }]} /><Text style={styles.gaugeText}>{specialtyScore >= 70 ? 'Strong starting signal' : 'Needs optimization'}</Text></View>
          <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>{submitted ? 'Baseline saved' : 'Save my baseline'}</Text></TouchableOpacity>
        </>
      ) : null}

      {widget.widget_type === 'dcf_moat_evaluator' ? (
        <>
          <View style={styles.metricRow}><View style={styles.metric}><Text style={styles.metricLabel}>Ticker</Text><Text style={styles.metricValue}>{widget.ticker}</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Margin of safety</Text><Text style={styles.metricValue}>{widget.margin_of_safety_pct}%</Text></View></View>
          <Text style={styles.label}>Discount rate: {discountRate}%</Text><TextInput value={discountRate} onChangeText={setDiscountRate} keyboardType="numeric" style={styles.input} />
          <Text style={styles.label}>Terminal growth: {terminalGrowth}%</Text><TextInput value={terminalGrowth} onChangeText={setTerminalGrowth} keyboardType="numeric" style={styles.input} />
          <View style={styles.resultBox}><Text style={styles.resultLabel}>{widget.output_label}</Text><Text style={styles.resultValue}>${(intrinsicValue / 1000000).toFixed(1)}M</Text><Text style={styles.helper}>Moat-adjusted value after your safety margin.</Text></View>
        </>
      ) : null}

      {widget.widget_type === 'position_sizing_simulator' ? (
        <>
          <View style={styles.metricRow}><View style={styles.metric}><Text style={styles.metricLabel}>Risk budget</Text><Text style={styles.metricValue}>${positionRisk.toFixed(0)}</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Share / contract size</Text><Text style={styles.metricValue}>{shareSize.toFixed(1)}</Text></View></View>
          <Text style={styles.label}>Total capital</Text><TextInput value={capital} onChangeText={setCapital} keyboardType="numeric" style={styles.input} />
          <Text style={styles.label}>Stop-loss distance: {stopLoss}%</Text><TextInput value={stopLoss} onChangeText={setStopLoss} keyboardType="numeric" style={styles.input} />
          <View style={styles.gauge}><View style={[styles.gaugeFill, { width: `${Math.min(100, Number(widget.leverage_cap || 3) * 20)}%` }]} /><Text style={styles.gaugeText}>Leverage cap: {widget.leverage_cap}x</Text></View>
        </>
      ) : null}

      {widget.widget_type === 'progressive_overload_rpe' ? (
        <>
          <View style={styles.metricRow}><View style={styles.metric}><Text style={styles.metricLabel}>{widget.split}</Text><Text style={styles.metricValue}>{widget.sets} × {widget.reps}</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Target load</Text><Text style={styles.metricValue}>{workingWeight.toFixed(0)} lb</Text></View></View>
          <Text style={styles.label}>Current 1RM</Text><TextInput value={oneRepMax} onChangeText={setOneRepMax} keyboardType="numeric" style={styles.input} />
          <Text style={styles.label}>Fatigue / RPE: {rpe}/10</Text><TextInput value={rpe} onChangeText={setRpe} keyboardType="numeric" style={styles.input} />
          <View style={styles.resultBox}><Text style={styles.resultLabel}>Today&apos;s prescription</Text><Text style={styles.resultValue}>{widget.sets} sets · {widget.reps} reps · {workingWeight.toFixed(0)} lb</Text></View>
        </>
      ) : null}

      {widget.widget_type === 'nutrient_timing_allocator' ? (
        <>
          <View style={styles.metricRow}><View style={styles.metric}><Text style={styles.metricLabel}>Pre / intra carbs</Text><Text style={styles.metricValue}>{widget.carbs_grams}g</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Protein target</Text><Text style={styles.metricValue}>{widget.protein_grams}g</Text></View></View>
          <View style={styles.gauge}><View style={[styles.gaugeFill, { width: `${Number(widget.workout_intensity || 8) * 10}%` }]} /><Text style={styles.gaugeText}>Workout intensity {widget.workout_intensity}/10</Text></View>
          <Text style={styles.helper}>Fuel window: {widget.timing_window_minutes} minutes around your session.</Text>
        </>
      ) : null}

      {widget.widget_type === 'objection_roleplay_matrix' ? (
        <>
          <View style={styles.personaRow}>{(widget.buyer_personas || ['Price-Sensitive CFO']).map((persona: string) => <TouchableOpacity key={persona} onPress={() => setBuyerPersona(persona)} style={[styles.persona, buyerPersona === persona && styles.personaActive]}><Text style={styles.personaText}>{persona}</Text></TouchableOpacity>)}</View>
          <Text style={styles.prompt}>{buyerPersona}: “{widget.objection || 'Why should I buy today?'}”</Text>
          <TextInput value={pitch} onChangeText={setPitch} multiline placeholder="Respond as the closer..." placeholderTextColor="#94A3B8" style={styles.input} />
          <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>{submitted ? 'Roleplay graded' : 'Run objection round'}</Text></TouchableOpacity>
          {submitted ? <Text style={styles.result}>Frame control 84 · Value stacking 76 · Close technique 81</Text> : null}
        </>
      ) : null}

      {widget.widget_type === 'deal_velocity_calculator' ? (
        <>
          <View style={styles.metricRow}><View style={styles.metric}><Text style={styles.metricLabel}>Expected commission</Text><Text style={styles.metricValue}>${((Number(dealValue) || 0) * (Number(widget.close_rate_pct || 20) / 100) * (Number(widget.commission_pct || 10) / 100)).toFixed(0)}</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Payback model</Text><Text style={styles.metricValue}>{paybackMonths.toFixed(1)} mo</Text></View></View>
          <Text style={styles.label}>Program value</Text><TextInput value={dealValue} onChangeText={setDealValue} keyboardType="numeric" style={styles.input} />
          <View style={styles.gauge}><View style={[styles.gaugeFill, { width: `${Number(widget.close_rate_pct || 20)}%` }]} /><Text style={styles.gaugeText}>Pipeline close rate: {widget.close_rate_pct}%</Text></View>
        </>
      ) : null}

      {widget.widget_type === 'ai_pitch_simulator' ? (
        <>
          <Text style={styles.prompt}>AI buyer: “Your price is too high. Why should I pay today?”</Text>
          <TextInput value={pitch} onChangeText={setPitch} multiline placeholder="Type your response..." placeholderTextColor="#94A3B8" style={styles.input} />
          <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>{submitted ? 'Buyer scored your pitch' : 'Run buyer simulation'}</Text></TouchableOpacity>
          {submitted ? <Text style={styles.result}>Score: {pitch.length > 80 ? '92' : '68'}/100. Add proof and a sharper outcome.</Text> : null}
        </>
      ) : null}

      {widget.widget_type === 'diagnostic_calculator' ? (
        <>
          <Text style={styles.label}>{widget.input_label || 'Current baseline'}</Text>
          <TextInput value={metric} onChangeText={setMetric} keyboardType="numeric" style={styles.input} />
          <View style={styles.resultBox}><Text style={styles.resultLabel}>{widget.output_label || 'Projected outcome'}</Text><Text style={styles.resultValue}>{calculatorResult.toFixed(0)}</Text></View>
          <Text style={styles.helper}>Adjust your baseline to generate a personalized next step.</Text>
        </>
      ) : null}

      {widget.widget_type === 'video_prompt_lab' ? (
        <>
          <TouchableOpacity style={styles.videoBox} onPress={() => widget.video_url && Linking.openURL(widget.video_url)}><Text style={styles.videoIcon}>▶</Text><Text style={styles.videoText}>Open video lab · {widget.chapters?.length || 3} chapters</Text></TouchableOpacity>
          <TextInput value={promptInput} onChangeText={setPromptInput} multiline placeholder="Run the creator prompt here..." placeholderTextColor="#94A3B8" style={styles.input} />
          <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>{submitted ? 'Prompt output ready' : 'Run prompt sandbox'}</Text></TouchableOpacity>
        </>
      ) : null}

      {widget.widget_type === 'proof_engine' ? (
        <>
          <Text style={styles.label}>{widget.proof_type || 'Submit proof to unlock the next step'}</Text>
          <TextInput value={proof} onChangeText={setProof} placeholder="Paste a chart, call recording, or result URL" placeholderTextColor="#94A3B8" style={styles.input} />
          <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>{submitted ? 'Proof queued for AI verification' : 'Verify proof'}</Text></TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0F141D', borderRadius: 20, borderWidth: 1, borderColor: '#35E4A155', padding: 18, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 7 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: '#35E4A122', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#35E4A144' },
  badgeText: { color: '#35E4A1', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  gate: { color: '#F59E0B', fontSize: 9, fontWeight: '900' },
  title: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginTop: 10 },
  description: { color: '#CBD5E1', fontSize: 13, lineHeight: 18, marginTop: 7, marginBottom: 12 },
  prompt: { color: '#E2E8F0', backgroundColor: '#080A0F', borderRadius: 14, borderWidth: 1, borderColor: '#FFFFFF12', padding: 14, lineHeight: 20, marginBottom: 10 },
  label: { color: '#CBD5E1', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: '#080A0F', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 12, padding: 12, color: '#F8FAFC', minHeight: 46, marginBottom: 10, fontSize: 15, fontWeight: '700' },
  button: { backgroundColor: '#35E4A1', borderRadius: 12, padding: 13, alignItems: 'center', shadowColor: '#35E4A1', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  buttonText: { color: '#000', fontWeight: '900' },
  result: { color: '#35E4A1', fontWeight: '700', marginTop: 10, lineHeight: 18 },
  resultBox: { backgroundColor: '#35E4A114', borderRadius: 14, borderWidth: 1, borderColor: '#35E4A144', padding: 14, marginBottom: 8 },
  resultLabel: { color: '#CBD5E1', fontSize: 11 },
  resultValue: { color: '#35E4A1', fontSize: 28, fontWeight: '900', marginTop: 3 },
  helper: { color: '#94A3B8', fontSize: 11, lineHeight: 16 },
  videoBox: { backgroundColor: '#080A0F', borderRadius: 14, borderWidth: 1, borderColor: '#22D3EE44', padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  videoIcon: { color: '#35E4A1', fontSize: 22, marginRight: 10 },
  videoText: { color: '#F8FAFC', fontWeight: '700' },
  metricRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metric: { flex: 1, backgroundColor: '#080A0F', borderRadius: 14, borderWidth: 1, borderColor: '#FFFFFF14', padding: 12 },
  metricLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '700' },
  metricValue: { color: '#F8FAFC', fontSize: 17, fontWeight: '900', marginTop: 5 },
  gauge: { backgroundColor: '#080A0F', borderRadius: 999, overflow: 'hidden', minHeight: 44, justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#FFFFFF14' },
  gaugeFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#35E4A133' },
  gaugeText: { color: '#35E4A1', fontSize: 11, fontWeight: '800', paddingHorizontal: 11 },
  personaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  persona: { borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FFFFFF06' },
  personaActive: { borderColor: '#35E4A1', backgroundColor: '#35E4A122' },
  personaText: { color: '#CBD5E1', fontSize: 10, fontWeight: '800' },
});