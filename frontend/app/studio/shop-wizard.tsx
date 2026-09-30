import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const categories = [
  { id: 'Fitness', subtitle: 'Training, nutrition, coaching' },
  { id: 'Trading', subtitle: 'Markets, risk, investing' },
  { id: 'Content', subtitle: 'Creator economy, audience growth' },
  { id: 'Real Estate', subtitle: 'Acquisition, investing, property' },
  { id: 'E-commerce', subtitle: 'Products, retail, growth' },
  { id: 'SaaS', subtitle: 'Software, AI, no-code' },
];

type ModuleId = 'blueprints' | 'pod_merch' | 'affiliate_stack' | 'dropship' | 'services';

const arsenalByNiche: Record<string, { id: ModuleId; title: string; detail: string; icon: string }[]> = {
  Fitness: [
    { id: 'blueprints', title: 'Interactive Digital Tools', detail: '1-RM, overload, and macro planners', icon: 'flash-outline' },
    { id: 'pod_merch', title: 'Print-on-Demand Merch', detail: 'Pump covers, lifting hoodies, shakers', icon: 'shirt-outline' },
    { id: 'affiliate_stack', title: 'Affiliate & Gear Stack', detail: 'Supplements, massage guns, lifting straps', icon: 'link-outline' },
    { id: 'dropship', title: 'Dropshipping Shelf', detail: 'Recovery tech and training accessories', icon: 'cube-outline' },
    { id: 'services', title: 'High-Ticket Services', detail: 'Contest prep and macro coaching', icon: 'diamond-outline' },
  ],
  Trading: [
    { id: 'blueprints', title: 'Interactive Digital Tools', detail: 'Position sizing and risk-to-reward calculators', icon: 'flash-outline' },
    { id: 'pod_merch', title: 'Print-on-Demand Merch', detail: 'Risk First desk mats, journals, hoodies', icon: 'shirt-outline' },
    { id: 'affiliate_stack', title: 'Affiliate & Gear Stack', detail: 'TradingView, brokers, hardware wallets', icon: 'link-outline' },
    { id: 'dropship', title: 'Dropshipping Shelf', detail: 'Desk accessories and monitor arms', icon: 'cube-outline' },
    { id: 'services', title: 'High-Ticket Services', detail: 'Private mastermind and live room access', icon: 'diamond-outline' },
  ],
  Content: [
    { id: 'blueprints', title: 'Interactive Digital Tools', detail: 'Viral hook scoring and script vaults', icon: 'flash-outline' },
    { id: 'pod_merch', title: 'Print-on-Demand Merch', detail: 'Creator merch, studio mugs, aesthetic caps', icon: 'shirt-outline' },
    { id: 'affiliate_stack', title: 'Affiliate & Gear Stack', detail: 'Cameras, microphones, editing software', icon: 'link-outline' },
    { id: 'dropship', title: 'Dropshipping Shelf', detail: 'Teleprompters and portable studio lighting', icon: 'cube-outline' },
    { id: 'services', title: 'High-Ticket Services', detail: 'Channel audits and strategy retainers', icon: 'diamond-outline' },
  ],
  'Real Estate': [
    { id: 'blueprints', title: 'Interactive Digital Tools', detail: 'Cap rate, cash-on-cash, and BRRRR analyzers', icon: 'flash-outline' },
    { id: 'pod_merch', title: 'Print-on-Demand Merch', detail: 'Investor journals, closing gifts, desk mats', icon: 'shirt-outline' },
    { id: 'affiliate_stack', title: 'Affiliate & Gear Stack', detail: 'CRM, staging, and property management tools', icon: 'link-outline' },
    { id: 'dropship', title: 'Dropshipping Shelf', detail: 'Smart lock kits and laser measures', icon: 'cube-outline' },
    { id: 'services', title: 'High-Ticket Services', detail: 'Deal mentorship and portfolio structuring', icon: 'diamond-outline' },
  ],
  'E-commerce': [
    { id: 'blueprints', title: 'Interactive Digital Tools', detail: 'Margin calculators and ad angle vaults', icon: 'flash-outline' },
    { id: 'pod_merch', title: 'Print-on-Demand Merch', detail: 'Brand capsules and sample apparel', icon: 'shirt-outline' },
    { id: 'affiliate_stack', title: 'Affiliate & Gear Stack', detail: 'Store apps, ad intelligence, logistics', icon: 'link-outline' },
    { id: 'dropship', title: 'Dropshipping Shelf', detail: 'Supplier-ready product concepts', icon: 'cube-outline' },
    { id: 'services', title: 'High-Ticket Services', detail: 'Scaling advisory and creative retainers', icon: 'diamond-outline' },
  ],
  SaaS: [
    { id: 'blueprints', title: 'Interactive Digital Tools', detail: 'API cost and workflow ROI estimators', icon: 'flash-outline' },
    { id: 'pod_merch', title: 'Print-on-Demand Merch', detail: 'Developer hoodies and code mug sets', icon: 'shirt-outline' },
    { id: 'affiliate_stack', title: 'Affiliate & Gear Stack', detail: 'Cloud hosting, no-code, API toolkits', icon: 'link-outline' },
    { id: 'dropship', title: 'Dropshipping Shelf', detail: 'Keyboard and developer desk gear', icon: 'cube-outline' },
    { id: 'services', title: 'High-Ticket Services', detail: 'Architecture sprints and fractional CTO', icon: 'diamond-outline' },
  ],
};

const categoryPreset = (category: string) => {
  if (category === 'Fitness') return { hook: '1-RM & Daily Calorie / Macro Target Calculator', widget: 'progressive_overload_rpe', products: [{ title: '12-Week Hypertrophy & Overload Matrix', price: 67, description: 'A coached progressive-overload pathway with training and proof checkpoints.' }], pod: ['Pump cover tee', 'Shaker bottle', 'Lifting straps'], affiliate: ['Creatine', 'Protein powder', 'Massage gun'], service: '1-on-1 Contest Prep & Macro Coaching' };
  if (category === 'Trading') return { hook: 'Risk-to-Reward & Position Size Calculator', widget: 'position_sizing_simulator', products: [{ title: 'Prop Firm Funding Checklist & Trading Journal', price: 97, description: 'A risk-first execution path with journal templates and funding milestones.' }], pod: ['Risk First desk mat', 'Trading journal', 'Minimal hoodie'], affiliate: ['Broker platform', 'TradingView', 'Hardware wallet'], service: 'Private Trading Mastermind & Live Room' };
  if (category === 'Content') return { hook: 'Viral Hook Scoring Diagnostic', widget: 'hook_diagnostic', products: [{ title: 'Short-Form Content Machine & Script Vault', price: 49, description: 'A repeatable hook-to-publish workflow with scripts and proof checkpoints.' }], pod: ['Creator tee', 'Studio mug', 'Desk journal'], affiliate: ['Camera', 'Microphone', 'Editing software'], service: 'Channel Audit & Retainer Strategy' };
  if (category === 'Real Estate') return { hook: 'Maximum Allowable Offer Calculator', widget: 'mao_calculator', products: [{ title: 'BRRRR Deal Analyzer & Rehab Estimator', price: 149, description: 'Underwrite deals, scope rehab, and model refinance outcomes.' }], pod: ['Property investor journal', 'Deal desk mat'], affiliate: ['Deal analysis software', 'Laser measure'], service: 'Investor Deal Review & Advisory' };
  if (category === 'E-commerce') return { hook: 'Product Margin & Breakeven ROAS Gauge', widget: 'product_roas_gauge', products: [{ title: 'Winning Product Validation Sprint', price: 59, description: 'Validate product economics and launch a focused offer.' }], pod: ['Branded packaging', 'Founder cap'], affiliate: ['Store platform', 'Analytics tools'], service: 'Store Growth Audit' };
  return { hook: 'API Token Cost & Workflow ROI Estimator', widget: 'api_automation_roi', products: [{ title: 'AI Lead Generation & Workflow Architect', price: 49, description: 'Map and launch a measurable AI-powered workflow.' }], pod: ['Builder tee', 'Workflow notebook'], affiliate: ['Automation platform', 'AI tools'], service: 'Automation Strategy Sprint' };
};

const nicheBanners: Record<string, string[]> = {
  Fitness: ['https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80'],
  Trading: ['https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1200&q=80'],
  Content: ['https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80'],
  'Real Estate': ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'],
  'E-commerce': ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80'],
  SaaS: ['https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80'],
};

const cleanOfferTitle = (category: string, intent: string) => {
  const text = intent.toLowerCase();
  if (category === 'Fitness') return /8.?week/.test(text) ? '8-Week High-Volume Shred Blueprint' : '12-Week Hypertrophy & Overload Matrix';
  if (category === 'Trading') return /journal|risk/.test(text) ? 'Risk-First Trading Journal & Funding Checklist' : '7-Day Algorithmic Edge Blueprint';
  if (category === 'Real Estate') return 'BRRRR Deal Analyzer & Rehab Estimator';
  if (category === 'Content') return 'Short-Form Content Machine & Script Vault';
  if (category === 'E-commerce') return 'Winning Product Validation Sprint';
  return 'AI Lead Generation & Workflow Architect';
};

export default function ShopWizardScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('Fitness');
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>(['blueprints', 'services']);
  const [source, setSource] = useState('');
  const [creatorNotes, setCreatorNotes] = useState('');
  const [socials, setSocials] = useState({ instagram: '', youtube: '', twitter: '', patreon: '' });
  const [focusedSocial, setFocusedSocial] = useState<string | null>(null);
  const [logo, setLogo] = useState<{ name: string; uri: string } | null>(null);
  const [banner, setBanner] = useState('');
  const [handle, setHandle] = useState('');
  const [isAssembling, setIsAssembling] = useState(false);
  const [seed, setSeed] = useState<any>(null);
  const [storeNames, setStoreNames] = useState<string[]>([]);
  const [selectedStoreName, setSelectedStoreName] = useState('');
  const [synthesizedOffers, setSynthesizedOffers] = useState<any[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('shop_wizard_seed').then((raw) => {
      if (!raw) return;
      const data = JSON.parse(raw);
      setSeed(data);
      setSource(data.description || '');
      setCreatorNotes(data.creator_intent || data.description || '');
      setCategory(data.category || 'Fitness');
      setHandle(data.handle || data.creator_handle || 'creator');
    });
  }, []);

  const preset = useMemo(() => categoryPreset(category), [category]);
  const currentArsenal = arsenalByNiche[category] || arsenalByNiche.SaaS;
  const toggleModule = (moduleId: ModuleId) => setSelectedModules((current) => current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId]);

  const chooseLogo = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) setLogo({ name: result.assets[0].name, uri: result.assets[0].uri });
  };

  const synthesizeOffers = () => {
    const intent = creatorNotes.trim() || source.trim();
    const topic = cleanOfferTitle(category, intent);
    const cleanHandle = (handle || 'creator').replace(/^@/, '').replace(/[^a-zA-Z0-9]/g, '');
    const brand = cleanHandle ? cleanHandle.charAt(0).toUpperCase() + cleanHandle.slice(1) : 'Creator';
    const names = category === 'Fitness' ? ['Intent Fit Protocol', 'Apex Performance Lab', 'The Iron Standard'] : [`${brand} ${category} Lab`, `The ${brand} ${category} Protocol`, `${brand} ${category} Studio`];
    const offers: any[] = [];
    if (selectedModules.includes('blueprints')) offers.push({ type: 'blueprint', title: `${topic} Execution Blueprint`, price: preset.products[0].price, description: `An interactive ${category.toLowerCase()} framework built around: ${topic}.` });
    if (selectedModules.includes('pod_merch')) offers.push({ type: 'pod_merch', title: `${brand} ${preset.pod[0]}`, price: 48, description: `Made-to-order ${category.toLowerCase()} merch concept; provider connection required before fulfillment.` });
    if (selectedModules.includes('affiliate_stack')) offers.push({ type: 'affiliate', title: `${brand} Recommended ${preset.affiliate[0]} Stack`, price: 0, description: `Curated ${category.toLowerCase()} picks. Add verified referral URLs before publishing.` });
    if (selectedModules.includes('dropship')) offers.push({ type: 'dropship', title: `${brand} ${preset.pod[0]} Starter Shelf`, price: 49, description: 'Supplier concept only; connect a verified supplier to enable fulfillment.' });
    if (selectedModules.includes('services')) offers.push({ type: 'service', title: `${topic} Coaching & Advisory`, price: category === 'Fitness' ? 1500 : 1000, description: `A private ${category.toLowerCase()} engagement focused on ${topic}.` });
    setStoreNames(names);
    setSelectedStoreName((current) => current && names.includes(current) ? current : names[0]);
    setSynthesizedOffers(offers);
    return { topic, names, offers };
  };

  const assembleShop = async () => {
    setIsAssembling(true);
    const synthesis = synthesizeOffers();
    const shopId = `shop-${Date.now()}`;
    const shopDraft = {
      ...(seed || {}),
      handle: (handle || 'creator').replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      name: selectedStoreName || synthesis.names[0],
      name_options: synthesis.names,
      headline: `Turn your ${category.toLowerCase()} expertise into measurable results`,
      description: creatorNotes.trim() || `A ${category.toLowerCase()} storefront built around ${synthesis.topic}, practical tools, and member outcomes.`,
      category,
      logo_url: logo?.uri || '',
      banner_wallpaper: banner || nicheBanners[category]?.[0] || '',
      socials,
      creator_intent: creatorNotes,
      ingestion_source: source,
      modules: selectedModules,
      hook_tool: { title: preset.hook, widget_type: preset.widget },
      products: synthesis.offers.filter((offer) => offer.type === 'blueprint'),
      pod_products: synthesis.offers.filter((offer) => offer.type === 'pod_merch').map((offer) => ({ ...offer, mockup_url: '', printify_blueprint_id: '', profit_margin: 0.35, provider: 'Printify / Printful', stock_tier: '500+', stock_count: null })),
      affiliate_items: synthesis.offers.filter((offer) => offer.type === 'affiliate').map((offer) => ({ ...offer, name: offer.title, image_url: '', category, affiliate_url: '', click_count: 0 })),
      dropship_items: synthesis.offers.filter((offer) => offer.type === 'dropship').map((offer) => ({ ...offer, supplier_sku: '', cost_price: 26, image_url: '', supplier_status: 'needs supplier connection' })),
      high_ticket_offer: synthesis.offers.find((offer) => offer.type === 'service') ? { ...synthesis.offers.find((offer) => offer.type === 'service'), cta: 'Apply for private coaching', url: '' } : { title: '', price: 0, cta: '', url: '' },
      proof_wall: { verified_completions: 0, average_score: 0, label: 'Member outcomes' },
      street_cred_enabled: false,
      sales_agent: { enabled: true, title: 'AI Shopping Assistant', avatar_url: logo?.uri || '', greeting: `Welcome. Ask about ${synthesis.topic} and I can help you choose a next step.`, welcome: `Ask about ${synthesis.topic}. Answers must stay within the creator's stated intent and supplied source context.`, prompts: ['Which offer fits my experience level?', 'What is included?', 'How do I get started?'] },
      visibility: 'public',
    };
    await AsyncStorage.setItem(`shop_draft_${shopId}`, JSON.stringify(shopDraft));
    await AsyncStorage.removeItem('shop_wizard_seed');
    setIsAssembling(false);
    router.push({ pathname: '/studio/shop/[shopId]', params: { shopId } });
  };

  const progress = `${step} / 4`;

  return (
    <View style={[styles.root, { backgroundColor: '#080A0F' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#080A0F" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}><View><Text style={styles.eyebrow}>PATHFINDER · STORE ASSEMBLY</Text><Text style={styles.title}>Build your creator shop</Text><Text style={styles.subtitle}>Choose your business model. We’ll assemble the first storefront draft.</Text></View><Text style={styles.progress}>{progress}</Text></View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${step * 25}%` }]} /></View>

        {step === 1 ? (
          <View style={styles.panel}>
            <Text style={styles.stepTitle}>01 · Choose your niche</Text>
            <Text style={styles.stepSub}>We’ll tailor your free hook and product ideas to this market.</Text>
            <View style={styles.grid}>
              {categories.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => setCategory(item.id)} style={[styles.category, category === item.id && styles.selected]}>
                  <Text style={styles.categoryName}>{item.id}</Text>
                  <Text style={styles.categorySub}>{item.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.panel}>
            <Text style={styles.stepTitle}>02 · Choose your revenue arsenal</Text>
            <Text style={styles.stepSub}>Select the modules you want assembled. You can customize them next.</Text>
            {currentArsenal.map((item) => {
              const selected = selectedModules.includes(item.id);
              return (
                <TouchableOpacity key={item.id} onPress={() => toggleModule(item.id)} style={[styles.module, selected && styles.moduleSelected]}>
                  <View style={[styles.checkbox, selected && styles.checkboxOn]}>{selected ? <Ionicons name="checkmark" size={15} color="#06110D" /> : null}</View>
                  <View style={styles.moduleCopy}><Text style={styles.moduleTitle}>{item.title}</Text><Text style={styles.moduleDetail}>{item.detail}</Text></View>
                  <Ionicons name={item.icon as any} size={20} color={selected ? '#35E4A1' : '#64748B'} />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.panel}>
            <Text style={styles.stepTitle}>03 · Add your source & brand</Text>
            <Text style={styles.stepSub}>Add source links and explicit offer intent. Creator notes take priority over inferred social context.</Text>
            <Text style={styles.inputLabel}>CONTENT SOURCE / KNOWLEDGE NOTES</Text>
            <TextInput value={source} onChangeText={setSource} multiline placeholder="e.g., Link your YouTube channel, drop course outlines, paste newsletter archives, or summarize your core methodology..." placeholderTextColor="#64748B" style={styles.sourceInput} />
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>WHAT DO YOU WANT TO SELL? · CREATOR INTENT</Text>
            <TextInput value={creatorNotes} onChangeText={setCreatorNotes} multiline placeholder="e.g., 4-week 1-on-1 fitness coaching, downloadable PDF workout tracker, or monthly VIP community access..." placeholderTextColor="#64748B" style={styles.sourceInput} />
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>SOCIAL CHANNELS</Text>
            {(['instagram', 'youtube', 'twitter', 'patreon'] as const).map((channel) => <View key={channel} style={[styles.socialInputWrap, focusedSocial === channel && styles.socialInputFocused]}><Ionicons name={channel === 'instagram' ? 'logo-instagram' : channel === 'youtube' ? 'logo-youtube' : channel === 'twitter' ? 'logo-twitter' : 'heart-outline'} size={16} color={channel === 'instagram' ? '#F472B6' : channel === 'youtube' ? '#F87171' : '#67E8F9'} /><Text style={styles.socialPrefix}>{focusedSocial === channel || socials[channel] ? '@' : ''}</Text><TextInput key={`social-${channel}`} value={socials[channel]} onFocus={() => setFocusedSocial(channel)} onBlur={() => setFocusedSocial(null)} onChangeText={(value) => setSocials((current) => ({ ...current, [channel]: value.replace(/^@/, '') }))} placeholder={channel === 'twitter' ? 'X / Twitter handle or URL' : `${channel[0].toUpperCase()}${channel.slice(1)} handle or URL`} placeholderTextColor="#64748B" autoCapitalize="none" style={styles.socialInput} /></View>)}
            <Text style={styles.inputLabel}>BANNER PRESETS</Text>
            <View style={styles.bannerPresetRow}>{(nicheBanners[category] || nicheBanners.SaaS).map((url, index) => <TouchableOpacity key={url} onPress={() => setBanner(url)} style={[styles.bannerPreset, banner === url && styles.bannerPresetActive]}><Text style={styles.bannerPresetText}>{`${category} Style ${index + 1}`}</Text></TouchableOpacity>)}</View>
            <Text style={styles.inputLabel}>STOREFRONT HANDLE</Text>
            <TextInput value={handle} onChangeText={setHandle} placeholder="yourname" placeholderTextColor="#64748B" style={styles.textInput} />
            <Text style={styles.inputLabel}>BANNER WALLPAPER URL</Text>
            <TextInput value={banner} onChangeText={setBanner} placeholder="Optional hero image URL" placeholderTextColor="#64748B" style={styles.textInput} />
            <TouchableOpacity style={styles.upload} onPress={chooseLogo}><Ionicons name="image-outline" size={19} color="#67E8F9" /><Text style={styles.uploadText}>{logo?.name || 'Upload logo or creator avatar'}</Text></TouchableOpacity>
            <Text style={styles.disclaimer}>Logo stays local to this preview until connected storage is configured.</Text>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.panel}>
            <Text style={styles.stepTitle}>04 · Assemble your storefront</Text>
            <Text style={styles.stepSub}>Context-aware synthesis from your stated intent and supplied social references. Review your store name and offer concepts.</Text>
            <Text style={styles.inputLabel}>EDIT STORE NAME</Text>
            <TextInput value={selectedStoreName} onChangeText={setSelectedStoreName} style={styles.textInput} />
            <View style={styles.previewHero}><Text style={styles.previewBadge}>FREE HOOK</Text><Text style={styles.previewName}>{selectedStoreName || seed?.name || `${category} Creator Suite`}</Text><Text style={styles.previewHook}>{preset.hook}</Text></View>
            <Text style={styles.summaryLabel}>STORE NAME OPTIONS</Text>
            <View style={styles.grid}>{storeNames.map((name) => <TouchableOpacity key={name} onPress={() => setSelectedStoreName(name)} style={[styles.category, selectedStoreName === name && styles.selected]}><Text style={styles.categoryName}>{name}</Text></TouchableOpacity>)}</View>
            <Text style={styles.summaryLabel}>ACTIVE REVENUE MODULES</Text>
            {selectedModules.map((id) => <Text key={id} style={styles.summaryItem}>Selected · {currentArsenal.find((module) => module.id === id)?.title}</Text>)}
            {synthesizedOffers.map((offer, index) => <View key={`${offer.type}-${index}`} style={styles.offer}><View style={{ flex: 1 }}><Text style={styles.offerTitle}>{offer.title}</Text><Text style={styles.categorySub}>{offer.description}</Text></View><Text style={styles.offerPrice}>{offer.price ? `$${offer.price}` : 'Referral'}</Text></View>)}
            <Text style={styles.zeroCapital}>$0 inventory · pay-as-you-grow storefront model</Text>
          </View>
        ) : null}

        <View style={styles.navButtons}>{step > 1 ? <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep((value) => value - 1)}><Text style={styles.secondaryText}>Back</Text></TouchableOpacity> : <View />}{step < 4 ? <TouchableOpacity style={styles.primaryButton} onPress={() => { if (step === 3) synthesizeOffers(); setStep((value) => value + 1); }}><Text style={styles.primaryText}>{step === 3 ? 'Synthesize Store' : 'Continue'}</Text><Ionicons name="arrow-forward" size={16} color="#06110D" /></TouchableOpacity> : <TouchableOpacity style={styles.primaryButton} onPress={assembleShop} disabled={isAssembling}>{isAssembling ? <ActivityIndicator color="#06110D" /> : <><Text style={styles.primaryText}>Open Store Customizer</Text><Ionicons name="arrow-forward" size={16} color="#06110D" /></>}</TouchableOpacity>}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: 820, alignSelf: 'center', padding: 20, paddingBottom: 48 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  eyebrow: { color: '#35E4A1', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '900', marginTop: 7 },
  subtitle: { color: '#94A3B8', fontSize: 13, marginTop: 5, maxWidth: 560 },
  progress: { color: '#67E8F9', fontSize: 12, fontWeight: '900' },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: '#FFFFFF14', marginBottom: 18, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#35E4A1' },
  panel: { backgroundColor: '#0D111A', borderColor: '#FFFFFF14', borderWidth: 1, borderRadius: 19, padding: 18 },
  stepTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '900' },
  stepSub: { color: '#94A3B8', fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  category: { width: '48%', flexGrow: 1, backgroundColor: '#080A0F', borderWidth: 1, borderColor: '#FFFFFF14', borderRadius: 13, padding: 13 },
  selected: { borderColor: '#35E4A1', backgroundColor: '#35E4A10D' },
  categoryName: { color: '#F8FAFC', fontWeight: '900', fontSize: 14 },
  categorySub: { color: '#94A3B8', fontSize: 10, marginTop: 5, lineHeight: 15 },
  module: { minHeight: 68, backgroundColor: '#080A0F', borderWidth: 1, borderColor: '#FFFFFF14', borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 11 },
  moduleSelected: { borderColor: '#35E4A177', backgroundColor: '#35E4A10B' },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, borderColor: '#64748B', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#35E4A1', borderColor: '#35E4A1' },
  moduleCopy: { flex: 1 },
  moduleTitle: { color: '#F8FAFC', fontSize: 12, fontWeight: '900' },
  moduleDetail: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  inputLabel: { color: '#67E8F9', fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 10, marginBottom: 6 },
  sourceInput: { minHeight: 100, backgroundColor: '#080A0F', borderColor: '#FFFFFF18', borderWidth: 1, borderRadius: 11, padding: 12, color: '#F8FAFC', textAlignVertical: 'top' },
  textInput: { backgroundColor: '#080A0F', borderColor: '#FFFFFF18', borderWidth: 1, borderRadius: 11, padding: 12, color: '#F8FAFC' },
  socialInputWrap: { minHeight: 44, backgroundColor: '#080A0F', borderColor: '#FFFFFF18', borderWidth: 1, borderRadius: 11, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  socialInputFocused: { borderColor: '#35E4A1' },
  socialPrefix: { color: '#94A3B8', fontSize: 12, marginLeft: 7, minWidth: 10 },
  socialInput: { flex: 1, color: '#F8FAFC', fontSize: 12, paddingVertical: 10, paddingLeft: 4 },
  bannerPresetRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  bannerPreset: { flex: 1, borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 10, padding: 9, backgroundColor: '#080A0F' },
  bannerPresetActive: { borderColor: '#35E4A1' },
  bannerPresetText: { color: '#CBD5E1', fontSize: 10, fontWeight: '800' },
  upload: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderStyle: 'dashed', borderColor: '#22D3EE55', borderRadius: 11, padding: 13, marginTop: 13 },
  uploadText: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
  disclaimer: { color: '#64748B', fontSize: 9, marginTop: 7 },
  previewHero: { backgroundColor: '#080A0F', borderColor: '#35E4A144', borderWidth: 1, borderRadius: 14, padding: 15, marginBottom: 14 },
  previewBadge: { color: '#6EE7B7', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  previewName: { color: '#F8FAFC', fontSize: 19, fontWeight: '900', marginTop: 8 },
  previewHook: { color: '#67E8F9', fontSize: 12, fontWeight: '800', marginTop: 6 },
  summaryLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 8 },
  summaryItem: { color: '#CBD5E1', fontSize: 12, marginBottom: 6 },
  offer: { borderTopWidth: 1, borderColor: '#FFFFFF12', paddingTop: 10, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  offerTitle: { color: '#E2E8F0', fontSize: 11, fontWeight: '800', flex: 1 },
  offerPrice: { color: '#6EE7B7', fontWeight: '900', marginLeft: 9 },
  zeroCapital: { color: '#FBBF24', fontSize: 10, fontWeight: '800', marginTop: 14 },
  navButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  secondaryButton: { borderWidth: 1, borderColor: '#FFFFFF20', borderRadius: 11, paddingHorizontal: 17, paddingVertical: 12 },
  secondaryText: { color: '#CBD5E1', fontSize: 12, fontWeight: '800' },
  primaryButton: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#35E4A1', borderRadius: 11, paddingHorizontal: 17, paddingVertical: 12 },
  primaryText: { color: '#06110D', fontSize: 12, fontWeight: '900' },
});
