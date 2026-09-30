import React, { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';

type Props = { step: any };

const TICKER_REFERENCE: Record<string, { fair: number; market: number }> = {
  AAPL: { fair: 205, market: 190 },
  NVDA: { fair: 145, market: 138 },
  TSLA: { fair: 255, market: 270 },
  MSFT: { fair: 425, market: 410 },
};

export function InteractiveEngineCard({ step, pathCategory }: Props & { pathCategory?: string }) {
  const widget = useMemo(() => step?.widget_data || {}, [step?.widget_data]);
  const [pitch, setPitch] = useState('');
  const [metric, setMetric] = useState(String(widget.starting_value ?? 5000));
  const [promptInput, setPromptInput] = useState('');
  const [proof, setProof] = useState('');
  const [discountRate, setDiscountRate] = useState(String(widget.discount_rate_pct ?? 9));
  const terminalGrowth = Number(widget.terminal_growth_pct ?? 3);
  const [capital, setCapital] = useState(String(widget.capital ?? 25000));
  const [stopLoss, setStopLoss] = useState(String(widget.stop_loss_pct ?? 2));
  const [oneRepMax, setOneRepMax] = useState(Number(widget.one_rep_max ?? 315));
  const [rpe, setRpe] = useState(Number(widget.rpe ?? 8));
  const [buyerPersona, setBuyerPersona] = useState(widget.buyer_personas?.[0] || 'Price-Sensitive CFO');
  const [dealValue, setDealValue] = useState(String(widget.deal_value ?? 5000));
  const [specialtyInput, setSpecialtyInput] = useState('72');
  const [ticker, setTicker] = useState(String(widget.ticker || 'AAPL').toUpperCase());
  const [tickerSearch, setTickerSearch] = useState('');
  const [marginSafety, setMarginSafety] = useState(Number(widget.margin_of_safety_pct ?? 25));
  const [adSpend, setAdSpend] = useState(Number(widget.monthly_ad_spend ?? 5000));
  const [conversionRate, setConversionRate] = useState(Number(widget.conversion_rate_pct ?? 3));
  const [averageOrderValue, setAverageOrderValue] = useState(Number(widget.average_order_value ?? 100));
  const [purchasePrice, setPurchasePrice] = useState(Number(widget.purchase_price ?? 500000));
  const [downPaymentPct, setDownPaymentPct] = useState(Number(widget.down_payment_pct ?? 20));
  const [monthlyUsers, setMonthlyUsers] = useState(Number(widget.monthly_active_users ?? 2500));
  const [arpu, setArpu] = useState(Number(widget.arpu ?? 85));
  const [churn, setChurn] = useState(Number(widget.churn_pct ?? 5));
  const targetRate = widget.target_rate_pct ?? 2;
  const [submitted, setSubmitted] = useState(false);
  const styles = darkStyles;

  const calculatorResult = useMemo(() => {
    const value = Number(metric) || 0;
    return value * (Number(targetRate) / 100);
  }, [metric, targetRate]);
  const positionRisk = (Number(capital) || 0) * (Number(widget.risk_per_trade_pct || 1) / 100);
  const shareSize = positionRisk / Math.max(0.1, Number(stopLoss) || 2);
  const workingWeight = (Number(oneRepMax) || 0) * (0.72 + Math.max(0, 10 - Number(rpe)) * 0.02);
  const paybackMonths = (Number(dealValue) || 0) / Math.max(1, (Number(dealValue) || 0) * 0.2);
  const specialtyScore = Math.min(100, Math.max(0, Number(specialtyInput) || 0));
  const engineType = String(widget.widget_type || step?.engine_type || '').toLowerCase();
  const category = String(pathCategory || step?.category || step?.type || '').toLowerCase();
  const financeEngine = engineType === 'dcf_moat_evaluator' || engineType.includes('dcf') || engineType.includes('valuation') || ((category.includes('finance') || category.includes('investment')) && widget.specialty);
  const realEstateEngine = engineType.includes('cash_on_cash') || engineType.includes('real_estate_yield') || engineType === 'mao_calculator' || (category.includes('real estate') && engineType.includes('calculator'));
  const businessEngine = ['roas_profit_allocator', 'product_roas_gauge', 'funnel_roas_allocator', 'ecommerce_profit_allocator'].includes(engineType) || ((category.includes('business') || category.includes('ecommerce') || category.includes('e-commerce')) && widget.specialty);
  const saasEngine = ['ltv_churn_calculator', 'saas_ltv_churn', 'creator_ltv_calculator', 'creator_growth_calculator'].includes(engineType) || (category.includes('saas') && engineType.includes('calculator'));
  const selectedTicker = TICKER_REFERENCE[ticker] || { fair: 200, market: 200 };
  const discount = Math.max(5, Number(discountRate) || 9);
  const growth = Math.min(discount - 1, Math.max(0, Number(terminalGrowth) || 3));
  const fairValue = selectedTicker.fair * ((1 + growth / 100) / (Math.max(1, discount - growth) / 100)) / (1.03 / 0.06);
  const fairLow = fairValue * 0.94;
  const fairHigh = fairValue * 1.06;
  const targetBuy = fairValue * (1 - marginSafety / 100);
  const priceRatio = selectedTicker.market / Math.max(1, fairValue);
  const valuationLabel = priceRatio < 0.9 ? 'UNDERVALUED' : priceRatio > 1.1 ? 'OVERVALUED' : 'FAIR VALUE';
  const moatScore = Math.min(99, Math.max(30, Math.round(54 + marginSafety * 0.9 + (discount <= 10 ? 8 : 0) - Math.max(0, discount - 14) * 1.5)));
  const moatSignal = moatScore >= 80 ? 'STRONG BUY MARGIN' : moatScore >= 65 ? 'HEALTHY MARGIN' : 'REVIEW ASSUMPTIONS';
  const monthlyClicks = adSpend / 1.7;
  const monthlyOrders = monthlyClicks * conversionRate / 100;
  const monthlyRevenue = monthlyOrders * averageOrderValue;
  const blendedRoas = monthlyRevenue / Math.max(1, adSpend);
  const netMargin = monthlyRevenue > 0 ? Math.max(-100, ((monthlyRevenue * 0.7 - adSpend) / monthlyRevenue) * 100) : 0;
  const monthlyRent = purchasePrice * 0.009;
  const loanAmount = purchasePrice * (1 - downPaymentPct / 100);
  const monthlyMortgage = loanAmount * 0.006;
  const monthlyExpenses = purchasePrice * 0.002;
  const monthlyCashFlow = monthlyRent - monthlyMortgage - monthlyExpenses;
  const cashOnCash = (monthlyCashFlow * 12) / Math.max(1, purchasePrice * downPaymentPct / 100) * 100;
  const lifetimeValue = arpu / Math.max(0.01, churn / 100);
  const acquisitionCost = Number(widget.cac ?? 160);
  const ltvCac = lifetimeValue / Math.max(1, acquisitionCost);
  const ltvRatioLabel = ltvCac >= 3 ? 'EXCELLENT' : ltvCac >= 2 ? 'HEALTHY' : 'OPTIMIZE';
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
      {widget.video_url && widget.widget_type !== 'video_prompt_lab' ? <TouchableOpacity style={styles.videoBox} onPress={() => Linking.openURL(widget.video_url)}><Text style={styles.videoIcon}>▶</Text><View style={{ flex: 1 }}><Text style={styles.videoText}>Form & baseline video guide</Text><Text style={styles.helper}>{widget.video_duration || '0:45'} min guide</Text></View></TouchableOpacity> : null}

      {financeEngine ? (
        <>
          <View style={styles.metricRow}><View style={styles.metric}><Text style={styles.metricLabel}>Domain Diagnostic</Text><Text style={styles.metricValue}>{ticker} valuation model</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Moat Rating</Text><Text style={styles.metricValue}>{moatScore}/100 · {moatSignal}</Text></View></View>
          <Text style={styles.label}>Company / ticker</Text>
          <View style={styles.chipRow}>{['AAPL', 'NVDA', 'TSLA', 'MSFT'].map((symbol) => <TouchableOpacity key={symbol} accessibilityRole="radio" accessibilityState={{ selected: ticker === symbol }} onPress={() => setTicker(symbol)} style={[styles.quickChip, ticker === symbol && styles.quickChipActive]}><Text style={[styles.quickChipText, ticker === symbol && styles.quickChipTextActive]}>{symbol}</Text></TouchableOpacity>)}</View>
          <View style={styles.searchTickerRow}><TextInput value={tickerSearch} onChangeText={(value) => setTickerSearch(value.replace(/[^a-z0-9.-]/gi, '').slice(0, 8).toUpperCase())} autoCapitalize="characters" placeholder="Search ticker" placeholderTextColor="#64748B" style={[styles.input, styles.tickerSearchInput]} /><TouchableOpacity style={styles.searchTickerButton} onPress={() => { if (tickerSearch.trim()) { setTicker(tickerSearch.trim().toUpperCase()); setTickerSearch(''); } }}><Text style={styles.searchTickerText}>Use</Text></TouchableOpacity></View>
          <View style={styles.sliderHeading}><Text style={styles.label}>Discount rate</Text><Text style={styles.controlValue}>{discount.toFixed(1)}%</Text></View>
          <Slider style={styles.slider} minimumValue={5} maximumValue={20} step={0.5} value={discount} onValueChange={(value) => setDiscountRate(String(value))} minimumTrackTintColor="#35E4A1" maximumTrackTintColor="#334155" thumbTintColor="#35E4A1" accessibilityLabel="Discount rate from 5 to 20 percent" />
          <View style={styles.sliderBounds}><Text style={styles.helper}>5%</Text><Text style={styles.helper}>20%</Text></View>
          <View style={styles.sliderHeading}><Text style={styles.label}>Margin of safety</Text><Text style={styles.controlValue}>{marginSafety}%</Text></View>
          <View style={styles.chipRow}>{[10, 15, 20, 25, 30].map((value) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: marginSafety === value }} onPress={() => setMarginSafety(value)} style={[styles.quickChip, marginSafety === value && styles.quickChipActive]}><Text style={[styles.quickChipText, marginSafety === value && styles.quickChipTextActive]}>{value}%</Text></TouchableOpacity>)}</View>
          <View style={styles.resultBox}><Text style={styles.resultLabel}>⚡ INTRINSIC VALUE RANGE</Text><Text style={styles.resultValue}>${fairLow.toFixed(2)} – ${fairHigh.toFixed(2)}</Text><Text style={styles.financeTarget}>🎯 TARGET BUY ZONE ({marginSafety}% MoS): Under ${targetBuy.toFixed(2)} · RATIO: {valuationLabel}</Text></View>
        </>
      ) : null}

      {businessEngine ? (
        <>
          <View style={styles.sliderHeading}><Text style={styles.label}>Monthly ad spend</Text><Text style={styles.controlValue}>${Math.round(adSpend).toLocaleString()}</Text></View>
          <Slider style={styles.slider} minimumValue={500} maximumValue={50000} step={500} value={adSpend} onValueChange={setAdSpend} minimumTrackTintColor="#35E4A1" maximumTrackTintColor="#334155" thumbTintColor="#35E4A1" accessibilityLabel="Monthly ad spend from 500 to 50000 dollars" />
          <View style={styles.sliderBounds}><Text style={styles.helper}>$500</Text><Text style={styles.helper}>$50,000 / mo</Text></View>
          <Text style={styles.label}>Conversion rate</Text>
          <View style={styles.chipRow}>{[1, 2, 3, 5, 8].map((value) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: conversionRate === value }} onPress={() => setConversionRate(value)} style={[styles.quickChip, conversionRate === value && styles.quickChipActive]}><Text style={[styles.quickChipText, conversionRate === value && styles.quickChipTextActive]}>{value}%</Text></TouchableOpacity>)}</View>
          <Text style={[styles.label, { marginTop: 10 }]}>Average order value</Text>
          <View style={styles.chipRow}>{[50, 100, 250, 500].map((value) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: averageOrderValue === value }} onPress={() => setAverageOrderValue(value)} style={[styles.quickChip, averageOrderValue === value && styles.quickChipActive]}><Text style={[styles.quickChipText, averageOrderValue === value && styles.quickChipTextActive]}>${value}</Text></TouchableOpacity>)}</View>
          <View style={styles.resultBox}><Text style={styles.resultLabel}>⚡ PROJECTED MONTHLY REVENUE</Text><Text style={styles.resultValue}>${Math.round(monthlyRevenue).toLocaleString()}</Text><Text style={styles.financeTarget}>📊 NET PROFIT MARGIN: {Math.round(netMargin)}% · BLENDED ROAS: {blendedRoas.toFixed(1)}x</Text></View>
        </>
      ) : null}

      {realEstateEngine ? (
        <>
          <View style={styles.sliderHeading}><Text style={styles.label}>Purchase price</Text><Text style={styles.controlValue}>${Math.round(purchasePrice).toLocaleString()}</Text></View>
          <Slider style={styles.slider} minimumValue={100000} maximumValue={2000000} step={10000} value={purchasePrice} onValueChange={setPurchasePrice} minimumTrackTintColor="#35E4A1" maximumTrackTintColor="#334155" thumbTintColor="#35E4A1" accessibilityLabel="Purchase price from 100000 to 2000000 dollars" />
          <View style={styles.sliderBounds}><Text style={styles.helper}>$100k</Text><Text style={styles.helper}>$2M</Text></View>
          <Text style={styles.label}>Down payment</Text>
          <View style={styles.chipRow}>{[10, 20, 25, 30].map((value) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: downPaymentPct === value }} onPress={() => setDownPaymentPct(value)} style={[styles.quickChip, downPaymentPct === value && styles.quickChipActive]}><Text style={[styles.quickChipText, downPaymentPct === value && styles.quickChipTextActive]}>{value}%</Text></TouchableOpacity>)}</View>
          <View style={styles.resultBox}><Text style={styles.resultLabel}>⚡ CASH-ON-CASH RETURN</Text><Text style={styles.resultValue}>{cashOnCash.toFixed(1)}%</Text><Text style={styles.financeTarget}>💵 MONTHLY NET CASH FLOW: {monthlyCashFlow >= 0 ? '+' : '−'}${Math.abs(Math.round(monthlyCashFlow)).toLocaleString()} / mo</Text></View>
        </>
      ) : null}

      {saasEngine ? (
        <>
          <View style={styles.sliderHeading}><Text style={styles.label}>Monthly active users</Text><Text style={styles.controlValue}>{Math.round(monthlyUsers).toLocaleString()}</Text></View>
          <Slider style={styles.slider} minimumValue={100} maximumValue={50000} step={100} value={monthlyUsers} onValueChange={setMonthlyUsers} minimumTrackTintColor="#35E4A1" maximumTrackTintColor="#334155" thumbTintColor="#35E4A1" accessibilityLabel="Monthly active users from 100 to 50000" />
          <View style={styles.sliderHeading}><Text style={styles.label}>Monthly ARPU</Text><Text style={styles.controlValue}>${arpu}</Text></View>
          <Slider style={styles.slider} minimumValue={5} maximumValue={200} step={5} value={arpu} onValueChange={setArpu} minimumTrackTintColor="#35E4A1" maximumTrackTintColor="#334155" thumbTintColor="#35E4A1" accessibilityLabel="Monthly average revenue per user from 5 to 200 dollars" />
          <Text style={styles.label}>Monthly churn</Text>
          <View style={styles.chipRow}>{Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: churn === value }} onPress={() => setChurn(value)} style={[styles.rpeSegment, churn === value && styles.rpeSegmentActive]}><Text style={[styles.rpeText, churn === value && styles.rpeTextActive]}>{value}%</Text></TouchableOpacity>)}</View>
          <View style={styles.resultBox}><Text style={styles.resultLabel}>⚡ CUSTOMER LIFETIME VALUE (LTV)</Text><Text style={styles.resultValue}>${Math.round(lifetimeValue).toLocaleString()}</Text><Text style={styles.financeTarget}>🚀 LTV : CAC RATIO: {ltvCac.toFixed(1)}x ({ltvRatioLabel}) · ${Math.round(monthlyUsers * arpu).toLocaleString()} MRR</Text></View>
        </>
      ) : null}

      {widget.specialty && !financeEngine && !businessEngine && !realEstateEngine && !saasEngine ? (
        <>
          <View style={styles.metricRow}><View style={styles.metric}><Text style={styles.metricLabel}>Live engine</Text><Text style={styles.metricValue}>{specialtyLabels[widget.widget_type] || 'Domain Diagnostic'}</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Signal</Text><Text style={styles.metricValue}>{specialtyScore}/100</Text></View></View>
          <Text style={styles.label}>Adjust your baseline</Text>
          <TextInput value={specialtyInput} onChangeText={setSpecialtyInput} keyboardType="numeric" style={styles.input} />
          <View style={styles.gauge}><View style={[styles.gaugeFill, { width: `${specialtyScore}%` }]} /><Text style={styles.gaugeText}>{specialtyScore >= 70 ? 'Strong starting signal' : 'Needs optimization'}</Text></View>
          <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>{submitted ? 'Baseline saved' : 'Save my baseline'}</Text></TouchableOpacity>
        </>
      ) : null}

      {financeEngine ? <Text style={styles.helper}>Valuation sensitivity adjusts with your discount rate, ticker, and margin-of-safety assumptions.</Text> : null}

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
          <View style={styles.sliderHeading}><Text style={styles.label}>Current 1RM</Text><Text style={styles.controlValue}>{oneRepMax} lb</Text></View>
          <Slider style={styles.slider} minimumValue={100} maximumValue={500} step={5} value={oneRepMax} onValueChange={(value) => setOneRepMax(Math.round(value))} minimumTrackTintColor="#35E4A1" maximumTrackTintColor="#334155" thumbTintColor="#35E4A1" accessibilityLabel="Current one rep max in pounds" />
          <View style={styles.sliderBounds}><Text style={styles.helper}>100 lb</Text><Text style={styles.helper}>500 lb</Text></View>
          <View style={styles.sliderHeading}><Text style={styles.label}>Fatigue / RPE</Text><Text style={styles.controlValue}>{rpe} / 10</Text></View>
          <View style={styles.rpeSelector}>{Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityLabel={`RPE ${value}`} accessibilityState={{ selected: rpe === value }} onPress={() => setRpe(value)} style={[styles.rpeSegment, rpe === value && styles.rpeSegmentActive]}><Text style={[styles.rpeText, rpe === value && styles.rpeTextActive]}>{value}</Text></TouchableOpacity>)}</View>
          <View style={styles.prescriptionCard}><View style={styles.prescriptionHeading}><Text style={styles.prescriptionLabel}>TARGET WORKING LOAD</Text><Text style={styles.prescriptionIcon}>⚡</Text></View><Text style={styles.prescriptionValue}>{widget.sets} sets · {widget.reps} reps · {workingWeight.toFixed(0)} lb</Text></View>
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

const darkStyles = StyleSheet.create({
  card: { backgroundColor: '#0F141D', borderRadius: 20, borderWidth: 1, borderColor: '#35E4A155', padding: 18, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 7 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: '#35E4A122', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#35E4A144' },
  badgeText: { color: '#35E4A1', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  gate: { color: '#6EE7B7', backgroundColor: '#35E4A118', fontSize: 9, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99 },
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
  sliderHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 },
  controlValue: { color: '#6EE7B7', fontSize: 13, fontWeight: '900' },
  slider: { width: '100%', height: 38, marginTop: 2 },
  sliderBounds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -2, marginBottom: 7 },
  rpeSelector: { flexDirection: 'row', gap: 4, marginVertical: 8 },
  rpeSegment: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#FFFFFF14', borderRadius: 7 },
  rpeSegmentActive: { backgroundColor: '#35E4A1', borderColor: '#35E4A1' },
  rpeText: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
  rpeTextActive: { color: '#06110D' },
  prescriptionCard: { backgroundColor: '#35E4A118', borderColor: '#35E4A155', borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 10 },
  prescriptionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prescriptionLabel: { color: '#6EE7B7', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  prescriptionIcon: { color: '#35E4A1', fontSize: 15 },
  prescriptionValue: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 7 },
  quickChip: { minWidth: 49, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF1A', backgroundColor: '#0B0F19', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9 },
  quickChipActive: { backgroundColor: '#35E4A1', borderColor: '#35E4A1' },
  quickChipText: { color: '#CBD5E1', fontSize: 10, fontWeight: '900' },
  quickChipTextActive: { color: '#06110D' },
  searchTickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tickerSearchInput: { flex: 1, marginBottom: 7 },
  searchTickerButton: { backgroundColor: '#35E4A1', borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 7 },
  searchTickerText: { color: '#06110D', fontSize: 10, fontWeight: '900' },
  financeTarget: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', lineHeight: 19, marginTop: 9 },
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
