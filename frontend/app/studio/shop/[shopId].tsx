import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { publishCreatorShop } from '../../../src/services/api';

export default function ShopBuilderScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId?: string }>();
  const [shop, setShop] = useState<any>(null);
  const [liveUrl, setLiveUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'consumer_preview'>('editor');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [stockMenuIndex, setStockMenuIndex] = useState<number | null>(null);
  const [linkModalIndex, setLinkModalIndex] = useState<number | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const stockTiers = ['1–10', '11–100', '101–500', '500+', 'Specific Low Stock (< 50)'];

  useEffect(() => {
    AsyncStorage.getItem(`shop_draft_${String(shopId || '')}`).then((raw) => raw && setShop(JSON.parse(raw)));
  }, [shopId]);

  useEffect(() => {
    if (shop) AsyncStorage.setItem(`shop_draft_${String(shopId || '')}`, JSON.stringify(shop)).catch(() => undefined);
  }, [shop, shopId]);

  const updateProduct = (index: number, key: string, value: string) => {
    setShop((current: any) => {
      if (!current) return current;
      const products = [...(current.products || [])];
      products[index] = { ...products[index], [key]: key === 'price' ? Number(value) || 0 : value };
      return { ...current, products };
    });
  };

  const addCustomItem = () => {
    setShop((current: any) => ({ ...current, custom_inventory: [...(current.custom_inventory || []), { id: `custom-${Date.now()}`, title: 'New custom offer', description: '', price: 0, item_type: 'physical', media: [], images: [], variants: [], variant_input: '', stock_tier: '500+', stock_count: null }] }));
  };

  const updateCustomItem = (index: number, key: string, value: any) => {
    setShop((current: any) => {
      const inventory = [...(current.custom_inventory || [])];
      inventory[index] = { ...inventory[index], [key]: key === 'price' ? Number(value) || 0 : value };
      return { ...current, custom_inventory: inventory };
    });
  };

  const saveItem = async (index: number) => {
    const item = shop?.custom_inventory?.[index];
    if (!item) return;
    await AsyncStorage.setItem(`shop_draft_${String(shopId || '')}`, JSON.stringify(shop));
    Alert.alert('Item saved', `${item.title || 'Custom item'} is saved in this draft.`);
  };

  const deleteItem = (index: number) => setShop((current: any) => ({ ...current, custom_inventory: current.custom_inventory.filter((_: any, itemIndex: number) => itemIndex !== index) }));

  const persistMediaUri = async (uri: string) => {
    if (typeof window === 'undefined' || !uri.startsWith('blob:')) return uri;
    const blob = await fetch(uri).then((response) => response.blob());
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read upload'));
      reader.onerror = () => reject(new Error('Unable to store upload'));
      reader.readAsDataURL(blob);
    });
  };

  const appendMedia = (index: number, attachment: any) => {
    setShop((current: any) => {
      const inventory = [...(current.custom_inventory || [])];
      const item = inventory[index];
      inventory[index] = { ...item, media: [...(item.media || []), attachment] };
      return { ...current, custom_inventory: inventory };
    });
  };

  const addItemVideo = async (index: number) => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['video/*'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      try {
        const asset = result.assets[0];
        const uri = await persistMediaUri(asset.uri);
        appendMedia(index, { id: `media-${Date.now()}`, type: 'video', uri, name: asset.name, mimeType: asset.mimeType });
      } catch {
        Alert.alert('Video could not be added', 'Try a smaller file or add a hosted video URL instead.');
      }
    }
  };

  const addItemImages = async (index: number) => {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['image/*'], multiple: true, copyToCacheDirectory: true });
    if (!picked.canceled) {
      try {
        const attachments = await Promise.all(picked.assets.map(async (asset) => ({ id: `media-${Date.now()}-${asset.name}`, type: 'image', uri: await persistMediaUri(asset.uri), name: asset.name, mimeType: asset.mimeType })));
        setShop((current: any) => {
          const inventory = [...(current.custom_inventory || [])];
          const item = inventory[index];
          inventory[index] = { ...item, media: [...(item.media || []), ...attachments] };
          return { ...current, custom_inventory: inventory };
        });
      } catch {
        Alert.alert('Photos could not be added', 'Try smaller image files and add them again.');
      }
    }
  };

  const saveItemLink = () => {
    const url = linkDraft.trim();
    if (!/^https?:\/\//i.test(url)) {
      Alert.alert('Enter a valid URL', 'Use a link that starts with http:// or https://.');
      return;
    }
    if (linkModalIndex !== null) appendMedia(linkModalIndex, { id: `media-${Date.now()}`, type: 'link', uri: url, name: url.replace(/^https?:\/\//i, '') });
    setLinkDraft('');
    setLinkModalIndex(null);
  };

  const removeItemMedia = (index: number, mediaId: string) => {
    setShop((current: any) => {
      const inventory = [...(current.custom_inventory || [])];
      const item = inventory[index];
      const legacyImageMatch = mediaId.match(/^legacy-image-(\d+)$/);
      inventory[index] = {
        ...item,
        media: (item.media || []).filter((attachment: any) => attachment.id !== mediaId),
        images: legacyImageMatch ? (item.images || []).filter((_: string, imageIndex: number) => imageIndex !== Number(legacyImageMatch[1])) : item.images,
        video_url: mediaId.startsWith('legacy-video-') ? '' : item.video_url,
      };
      return { ...current, custom_inventory: inventory };
    });
  };

  const handleVariantInput = (index: number, value: string) => {
    setShop((current: any) => {
      const inventory = [...(current.custom_inventory || [])];
      const item = inventory[index];
      const parts = value.split(/[\n,]/);
      const committed = parts.slice(0, -1).map((part) => part.trim()).filter(Boolean);
      inventory[index] = { ...item, variants: [...new Set([...(item.variants || []), ...committed])], variant_input: parts[parts.length - 1] || '' };
      return { ...current, custom_inventory: inventory };
    });
  };

  const commitVariant = (index: number) => {
    setShop((current: any) => {
      const inventory = [...(current.custom_inventory || [])];
      const item = inventory[index];
      const value = String(item.variant_input || '').trim();
      inventory[index] = { ...item, variants: value ? [...new Set([...(item.variants || []), value])] : item.variants || [], variant_input: '' };
      return { ...current, custom_inventory: inventory };
    });
  };

  const updateConcierge = (key: string, value: any) => setShop((current: any) => ({ ...current, sales_agent: { ...current.sales_agent, [key]: value } }));

  const publishStore = async () => {
    if (!shop) return;
    setPublishing(true);
    const published = await publishCreatorShop(shop);
    setPublishing(false);
    if (!published) {
      Alert.alert('Store preview saved', 'Publishing service is unavailable. Your editable draft remains on this device.');
      return;
    }
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://pathfinder.so';
    setLiveUrl(`${base}${published.url}`);
  };

  if (!shop) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator color={theme.accent} /><Text style={{ color: theme.text, marginTop: 12 }}>Preparing storefront...</Text></View>;

  return (
    <View style={[styles.root, { backgroundColor: '#080A0F' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#080A0F" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topline}><View><Text style={styles.eyebrow}>PATHFINDER · SHOP BUILDER</Text><Text style={styles.pageTitle}>Your digital storefront</Text><Text style={styles.caption}>A zero-inventory shop draft generated from your expertise.</Text></View><TouchableOpacity style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>Studio</Text></TouchableOpacity></View>

        <View style={styles.viewToggle}>{(['editor', 'consumer_preview'] as const).map((mode) => <TouchableOpacity key={mode} onPress={() => setViewMode(mode)} style={[styles.viewToggleButton, viewMode === mode && styles.viewToggleActive]}><Text style={[styles.viewToggleText, viewMode === mode && styles.viewToggleTextActive]}>{mode === 'editor' ? 'Edit Draft' : 'Live Consumer Preview'}</Text></TouchableOpacity>)}</View>

        {viewMode === 'editor' ? <>

        <View style={[styles.hero, { borderColor: `${shop.accent_color || '#35E4A1'}66` }]}>
          <Text style={styles.microLabel}>LIVE STORE PREVIEW</Text>
          <TextInput value={shop.name} onChangeText={(name) => setShop({ ...shop, name })} style={styles.storeName} />
          <Text style={styles.fieldLabel}>PUBLIC HANDLE · pathfinder.so/[handle]</Text>
          <View style={styles.handleRow}><Text style={styles.handlePrefix}>@</Text><TextInput value={shop.handle} onChangeText={(handle) => setShop({ ...shop, handle: handle.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })} autoCapitalize="none" style={styles.handleInput} /></View>
          <Text style={styles.fieldLabel}>ACCENT COLOR · HEX</Text>
          <View style={styles.handleRow}><View style={[styles.colorSwatch, { backgroundColor: shop.accent_color || '#35E4A1' }]} /><TextInput value={shop.accent_color} onChangeText={(accent_color) => setShop({ ...shop, accent_color })} autoCapitalize="none" style={styles.handleInput} /></View>
          <Text style={styles.fieldLabel}>BANNER WALLPAPER URL</Text>
          <View style={styles.handleRow}><TextInput value={shop.banner_wallpaper || ''} onChangeText={(banner_wallpaper) => setShop({ ...shop, banner_wallpaper })} autoCapitalize="none" style={styles.handleInput} placeholder="Optional hero image URL" placeholderTextColor="#64748B" /></View>
          {shop.banner_wallpaper ? <Image source={{ uri: shop.banner_wallpaper }} style={{ width: '100%', height: 120, borderRadius: 12, marginTop: 9 }} /> : null}
          <TextInput value={shop.headline} onChangeText={(headline) => setShop({ ...shop, headline })} style={styles.headline} multiline />
          <TextInput value={shop.description} onChangeText={(description) => setShop({ ...shop, description })} style={styles.bodyCopy} multiline />
          <View style={styles.hook}><View style={styles.hookBadge}><Text style={styles.hookBadgeText}>FREE INTERACTIVE TOOL</Text></View><Text style={styles.hookTitle}>{shop.hook_tool.title}</Text><Text style={styles.copy}>A quick diagnostic that gives visitors a useful first result before they choose a paid path.</Text></View>
        </View>

        {shop.modules?.includes('blueprints') !== false ? <View style={styles.panel}>
          <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Digital Guides & Playbooks</Text><Text style={styles.copy}>Interactive paths · no inventory</Text></View><Text style={styles.count}>01—02</Text></View>
          {shop.products.map((product: any, index: number) => <View key={`${product.title}-${index}`} style={styles.product}><View style={styles.productNumber}><Text style={styles.productNumberText}>0{index + 1}</Text></View><View style={styles.productFields}><TextInput value={product.title} onChangeText={(value) => updateProduct(index, 'title', value)} style={styles.productTitle} /><TextInput value={product.description} onChangeText={(value) => updateProduct(index, 'description', value)} style={styles.copy} multiline /></View><View style={styles.priceBox}><Text style={styles.priceLabel}>USD</Text><TextInput value={String(product.price)} onChangeText={(value) => updateProduct(index, 'price', value)} keyboardType="numeric" style={styles.priceInput} /></View></View>)}
        </View> : null}

        {shop.modules?.includes('pod_merch') ? <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Official Merch</Text><Text style={styles.copy}>Mockup concepts are drafts until a Printify or Printful account is connected.</Text>
          {shop.pod_products?.map((product: any, index: number) => <View key={product.title} style={styles.product}><TouchableOpacity style={styles.trash} onPress={() => setShop((current: any) => ({ ...current, pod_products: current.pod_products.filter((_: any, itemIndex: number) => itemIndex !== index) }))}><Ionicons name="trash-outline" size={16} color="#FB7185" /></TouchableOpacity><View style={styles.productNumber}><Text style={styles.productNumberText}>POD</Text></View><View style={styles.productFields}><TextInput value={product.title} onChangeText={(title) => setShop((current: any) => { const pod_products = [...current.pod_products]; pod_products[index] = { ...pod_products[index], title }; return { ...current, pod_products }; })} style={styles.productTitle} /><Text style={styles.copy}>{product.provider} · estimated margin {Math.round((product.profit_margin || 0) * 100)}%</Text><Text style={styles.fieldLabel}>STOCK TIER</Text><View style={styles.stockTiers}>{stockTiers.map((tier) => <TouchableOpacity key={tier} onPress={() => setShop((current: any) => { const pod_products = [...current.pod_products]; pod_products[index] = { ...pod_products[index], stock_tier: tier }; return { ...current, pod_products }; })} style={[styles.itemType, product.stock_tier === tier && styles.itemTypeActive]}><Text style={styles.stockTierText}>{tier}</Text></TouchableOpacity>)}</View>{product.stock_tier === 'Specific Low Stock (< 50)' ? <TextInput value={String(product.stock_count ?? '')} onChangeText={(value) => setShop((current: any) => { const pod_products = [...current.pod_products]; pod_products[index] = { ...pod_products[index], stock_count: Number(value) || 0 }; return { ...current, pod_products }; })} keyboardType="numeric" placeholder="Exact stock count (1–49)" placeholderTextColor="#64748B" style={styles.copyInput} /> : null}</View><TextInput value={String(product.price)} onChangeText={(value) => setShop((current: any) => { const pod_products = [...current.pod_products]; pod_products[index] = { ...pod_products[index], price: Number(value) || 0 }; return { ...current, pod_products }; })} keyboardType="numeric" style={styles.merchPrice} /></View>)}
        </View> : null}

        <View style={styles.panel}>
          <View style={styles.sectionHeader}>
            <View><Text style={styles.sectionTitle}>Custom Inventory</Text><Text style={styles.copy}>Add physical goods, digital assets, or services.</Text></View>
            <TouchableOpacity style={styles.addItemButton} onPress={addCustomItem}><Text style={styles.addItemText}>+ Add Custom Item</Text></TouchableOpacity>
          </View>
          <Text style={styles.fieldLabel}>CUSTOM SECTION TITLE</Text>
          <TextInput value={shop.custom_inventory_section_title || 'Custom Merch'} onChangeText={(custom_inventory_section_title) => setShop({ ...shop, custom_inventory_section_title })} placeholder="Custom Merch" placeholderTextColor="#64748B" style={styles.copyInput} />
          {(shop.custom_inventory || []).map((item: any, index: number) => {
            const media = [
              ...(item.media || []),
              ...(!item.media?.length ? (item.images || []).map((uri: string, imageIndex: number) => ({ id: `legacy-image-${imageIndex}`, type: 'image', uri, name: 'Uploaded photo' })) : []),
              ...(!item.media?.length && item.video_url ? [{ id: `legacy-video-${index}`, type: /^https?:\/\//i.test(item.video_url) ? 'link' : 'video', uri: item.video_url, name: 'Video attachment' }] : []),
            ];
            return (
              <View key={item.id} style={styles.customItem}>
                <View style={styles.customItemHeader}>
                  <TextInput value={item.title} onChangeText={(value) => updateCustomItem(index, 'title', value)} placeholder="Offer title (e.g., 1-on-1 Coaching Session)" placeholderTextColor="#64748B" style={[styles.productTitle, styles.customTitleInput]} />
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete custom item" style={styles.trash} onPress={() => deleteItem(index)}><Ionicons name="trash-outline" size={18} color="#DC2626" /></TouchableOpacity>
                </View>
                <TextInput value={item.description} onChangeText={(value) => updateCustomItem(index, 'description', value)} placeholder="Description" placeholderTextColor="#64748B" style={styles.copyInput} multiline />
                <View style={styles.priceField}><Text style={styles.fieldLabel}>PRICE · USD</Text><TextInput value={String(item.price ?? '')} onChangeText={(value) => updateCustomItem(index, 'price', value)} keyboardType="numeric" placeholder="0" placeholderTextColor="#64748B" style={styles.inventoryPriceInput} /></View>
                <View style={[styles.itemTypeRow, styles.customTypeRow]}>{(['physical', 'digital', 'service'] as const).map((kind) => <TouchableOpacity key={kind} onPress={() => updateCustomItem(index, 'item_type', kind)} style={[styles.itemType, item.item_type === kind && styles.itemTypeActive]}><Text style={styles.itemTypeText}>{kind[0].toUpperCase() + kind.slice(1)}</Text></TouchableOpacity>)}</View>
                <Text style={styles.fieldLabel}>STOCK TIER</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Stock tier, currently ${item.stock_tier || '500+'}`} style={styles.stockSelect} onPress={() => setStockMenuIndex(index)}>
                  <Text style={styles.stockSelectText}>{item.stock_tier || '500+'}</Text><Ionicons name="chevron-down" size={18} color="#334155" />
                </TouchableOpacity>
                {item.stock_tier === 'Specific Low Stock (< 50)' ? <TextInput value={String(item.stock_count ?? '')} onChangeText={(value) => { const digits = value.replace(/\D/g, ''); updateCustomItem(index, 'stock_count', digits ? Math.min(49, Number(digits)) : ''); }} keyboardType="numeric" placeholder="Exact stock count (1–49)" placeholderTextColor="#64748B" style={styles.copyInput} /> : null}
                <Text style={styles.fieldLabel}>MEDIA & ATTACHMENTS</Text>
                <View style={styles.mediaActions}>
                  <TouchableOpacity style={styles.addItemButton} onPress={() => addItemImages(index)}><Text style={styles.addItemText}>+ Add Photos</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.addItemButton} onPress={() => addItemVideo(index)}><Text style={styles.addItemText}>+ Add Video</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.addItemButton} onPress={() => { setLinkModalIndex(index); setLinkDraft(''); }}><Text style={styles.addItemText}>+ Insert Link / URL</Text></TouchableOpacity>
                </View>
                {media.length ? <View style={styles.mediaGrid}>{media.map((attachment: any, mediaIndex: number) => {
                  const id = attachment.id || `media-${mediaIndex}`;
                  if (attachment.type === 'image' || (!attachment.type && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(attachment.uri || ''))) {
                    return <View key={id} style={styles.mediaTile}><Image source={{ uri: attachment.uri }} style={styles.mediaImage} /><TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove attachment" style={styles.mediaDelete} onPress={() => removeItemMedia(index, id)}><Ionicons name="trash-outline" size={14} color="#FFFFFF" /></TouchableOpacity></View>;
                  }
                  const isLink = attachment.type === 'link' || /^https?:\/\//i.test(attachment.uri || '');
                  return <View key={id} style={styles.mediaTile}>
                    <TouchableOpacity style={styles.mediaTileContent} onPress={() => isLink ? Linking.openURL(attachment.uri) : undefined}>
                      <Ionicons name={isLink ? 'link-outline' : 'videocam-outline'} size={20} color="#1D4ED8" />
                      <Text numberOfLines={2} style={styles.mediaTileText}>{attachment.name || (isLink ? 'External link' : 'Video attachment')}</Text>
                      {isLink ? <Text style={styles.mediaKind}>OPEN LINK</Text> : <Text style={styles.mediaKind}>VIDEO PREVIEW</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove attachment" style={styles.mediaDelete} onPress={() => removeItemMedia(index, id)}><Ionicons name="trash-outline" size={14} color="#FFFFFF" /></TouchableOpacity>
                  </View>;
                })}</View> : null}
                <Text style={styles.fieldLabel}>VARIANTS</Text>
                <View style={styles.variantInputWrap}>
                  {(item.variants || []).map((variant: string) => <View key={variant} style={styles.variantTag}><Text style={styles.variantTagText}>{variant}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${variant}`} onPress={() => updateCustomItem(index, 'variants', item.variants.filter((entry: string) => entry !== variant))}><Ionicons name="close" size={13} color="#1D4ED8" /></TouchableOpacity></View>)}
                  <TextInput value={item.variant_input || ''} onChangeText={(value) => handleVariantInput(index, value)} onSubmitEditing={() => commitVariant(index)} onKeyPress={(event) => { if (event.nativeEvent.key === 'Enter') commitVariant(index); }} blurOnSubmit={false} returnKeyType="done" placeholder="Type next variant..." placeholderTextColor="#64748B" style={styles.variantInput} />
                </View>
                <TouchableOpacity style={styles.saveItemButton} onPress={() => saveItem(index)}><Text style={styles.saveItemText}>Save Item</Text></TouchableOpacity>
              </View>
            );
          })}
        </View>

        {shop.modules?.includes('affiliate_stack') ? <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Affiliate gear stack</Text><Text style={styles.copy}>Add referral URLs in the editor when your partner links are ready.</Text>
          {shop.affiliate_items?.map((item: any, index: number) => <View key={item.name} style={styles.product}><View style={styles.productNumber}><Text style={styles.productNumberText}>↗</Text></View><View style={styles.productFields}><TextInput value={item.name} onChangeText={(name) => setShop((current: any) => { const affiliate_items = [...current.affiliate_items]; affiliate_items[index] = { ...affiliate_items[index], name }; return { ...current, affiliate_items }; })} style={styles.productTitle} /><Text style={styles.copy}>{item.category} · referral link</Text><TextInput value={item.affiliate_url || ''} onChangeText={(affiliate_url) => setShop((current: any) => { const affiliate_items = [...current.affiliate_items]; affiliate_items[index] = { ...affiliate_items[index], affiliate_url }; return { ...current, affiliate_items }; })} placeholder="Paste referral URL" placeholderTextColor="#64748B" style={styles.copyInput} /></View></View>)}
        </View> : null}

        {shop.modules?.includes('dropship') ? <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Supplier shelf</Text><Text style={styles.copy}>Supplier inventory and fulfillment require a verified supplier connection.</Text>
          {shop.dropship_items?.map((item: any) => <View key={item.title} style={styles.product}><View style={styles.productFields}><Text style={styles.productTitle}>{item.title}</Text><Text style={styles.copy}>{item.supplier_status}</Text></View><Text style={styles.merchPrice}>${item.price}</Text></View>)}
        </View> : null}

        {shop.modules?.includes('services') ? <View style={styles.panel}>
          <Text style={styles.sectionTitle}>VIP backroom</Text>
          <TextInput value={shop.high_ticket_offer.title} onChangeText={(title) => setShop({ ...shop, high_ticket_offer: { ...shop.high_ticket_offer, title } })} style={styles.productTitle} />
          <Text style={styles.copy}>A premium application or booking offer for qualified members.</Text>
          <View style={styles.highTicket}><Text style={styles.highTicketLabel}>APPLICATION OFFER</Text><Text style={styles.highTicketPrice}>${Number(shop.high_ticket_offer.price).toLocaleString()}</Text><Text style={styles.copy}>{shop.high_ticket_offer.cta}</Text></View>
        </View> : null}

        {shop.street_cred_enabled ? <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Street Cred · Vouch Wall</Text>
          <View style={styles.proofRow}><View><Text style={styles.proofValue}>{shop.proof_wall.verified_completions}</Text><Text style={styles.copy}>verified completions</Text></View><View><Text style={styles.proofValue}>{shop.proof_wall.average_score || '—'}</Text><Text style={styles.copy}>average score</Text></View><View><Text style={styles.proofValue}>4.9</Text><Text style={styles.copy}>member rating</Text></View></View>
        </View> : null}

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>AI sales concierge</Text>
          <TextInput value={shop.sales_agent.title || 'AI Shopping Assistant'} onChangeText={(title) => updateConcierge('title', title)} placeholder="Concierge display name" placeholderTextColor="#64748B" style={styles.copyInput} />
          <TextInput value={shop.sales_agent.avatar_url || ''} onChangeText={(avatar_url) => updateConcierge('avatar_url', avatar_url)} placeholder="Concierge avatar image URL (optional)" placeholderTextColor="#64748B" style={styles.copyInput} />
          <TextInput value={shop.sales_agent.greeting || shop.sales_agent.welcome} onChangeText={(greeting) => updateConcierge('greeting', greeting)} placeholder="Greeting" placeholderTextColor="#64748B" style={styles.copyInput} />
          <Text style={styles.copy}>Quick prompts · separate with a new line</Text>
          <TextInput value={(shop.sales_agent.prompts || ['Which guide fits my level?', 'What is included in coaching?', 'How do I start?']).join('\n')} onChangeText={(value) => updateConcierge('prompts', value.split('\n').slice(0, 3))} multiline placeholderTextColor="#64748B" style={styles.copyInput} />
          <View style={styles.agentMessage}><Text style={styles.agentLabel}>{shop.sales_agent.title || 'AI Shopping Assistant'} · PREVIEW</Text><Text style={styles.agentText}>“{shop.sales_agent.greeting || shop.sales_agent.welcome || `Start with ${shop.hook_tool.title} and choose the offer that matches your goal.`}”</Text></View>
          {(shop.sales_agent.prompts || []).map((prompt: string, index: number) => <Text key={`${prompt}-${index}`} style={styles.conciergePrompt}>{prompt}</Text>)}
        </View>

        <View style={styles.connectBanner}><View style={styles.connectIcon}><Text style={styles.connectIconText}>$</Text></View><View style={styles.connectCopy}><Text style={styles.connectTitle}>Connect Stripe to accept payouts</Text><Text style={styles.copy}>No monthly fee. Platform transaction fees apply only when you make a sale.</Text></View><TouchableOpacity style={styles.connectButton} onPress={() => Alert.alert('Payout setup', 'Stripe Connect onboarding will be enabled when creator payouts are configured.')}><Text style={styles.connectButtonText}>Connect</Text></TouchableOpacity></View>

        <View style={styles.panel}><Text style={styles.sectionTitle}>Social Proof & Reviews</Text><View style={styles.inlineRow}><Text style={styles.copy}>Show proof, completion stats, and reviews</Text><TouchableOpacity accessibilityRole="switch" accessibilityState={{ checked: !!shop.street_cred_enabled }} onPress={() => setShop({ ...shop, street_cred_enabled: !shop.street_cred_enabled })} style={[styles.switchTrack, shop.street_cred_enabled && styles.switchOn]}><View style={[styles.switchKnob, shop.street_cred_enabled && styles.switchKnobOn]} /></TouchableOpacity></View></View>
        <View style={styles.launchRow}><Text style={styles.launchNote}>Preview mode · Nothing is charged until payout and checkout are configured.</Text><TouchableOpacity style={styles.launchButton} onPress={publishStore} disabled={publishing}>{publishing ? <ActivityIndicator color="#06110D" /> : <Text style={styles.launchButtonText}>Publish Shop</Text>}</TouchableOpacity></View>
        </> : (
          <View style={styles.consumerPreview}>
            <View style={[styles.previewBanner, shop.banner_wallpaper ? { backgroundColor: '#17212A' } : null]}>{shop.banner_wallpaper ? <Image source={{ uri: shop.banner_wallpaper }} style={styles.bannerImage} /> : null}<View style={styles.bannerShade} /></View>
            <View style={styles.previewBrand}>{shop.logo_url ? <Image source={{ uri: shop.logo_url }} style={styles.logoImage} /> : <View style={styles.logoFallback}><Text style={styles.logoFallbackText}>{shop.name.slice(0, 1).toUpperCase()}</Text></View>}<Text style={styles.previewStoreName}>{shop.name}</Text><Text style={[styles.previewHeadline, { color: shop.accent_color || '#35E4A1' }]}>{shop.headline}</Text><Text style={styles.copy}>{shop.description}</Text></View>
            {shop.modules?.includes('blueprints') !== false && shop.products?.length ? <View style={styles.previewPanel}><Text style={styles.sectionTitle}>Digital Guides & Playbooks</Text>{shop.products.map((product: any, index: number) => <TouchableOpacity key={`${product.title}-${index}`} onPress={() => setSelectedItem(product)} style={styles.previewOffer}><View style={{ flex: 1 }}><Text style={styles.productTitle}>{product.title}</Text><Text style={styles.copy}>{product.description}</Text></View><Text style={styles.merchPrice}>${product.price}</Text></TouchableOpacity>)}</View> : null}
            {shop.modules?.includes('pod_merch') && shop.pod_products?.length ? <View style={styles.previewPanel}><Text style={styles.sectionTitle}>Official Merch</Text>{shop.pod_products.map((product: any, index: number) => <TouchableOpacity key={`${product.title}-${index}`} onPress={() => setSelectedItem(product)} style={styles.previewOffer}>{product.mockup_url ? <Image source={{ uri: product.mockup_url }} style={styles.thumb} /> : null}<View style={{ flex: 1 }}><Text style={styles.productTitle}>{product.title}</Text><Text style={styles.copy}>Made to order</Text></View><Text style={styles.merchPrice}>${product.price}</Text></TouchableOpacity>)}</View> : null}
            {shop.custom_inventory?.length ? <View style={styles.previewPanel}><Text style={styles.sectionTitle}>More from this creator</Text>{shop.custom_inventory.map((item: any) => { const previewImage = item.media?.find((attachment: any) => attachment.type === 'image')?.uri || item.images?.[0]; return <TouchableOpacity key={item.id} onPress={() => setSelectedItem(item)} style={styles.previewOffer}>{previewImage ? <Image source={{ uri: previewImage }} style={styles.thumb} /> : null}<View style={{ flex: 1 }}><Text style={styles.productTitle}>{item.title}</Text><Text style={styles.copy}>{item.description}</Text></View><Text style={styles.merchPrice}>${item.price}</Text></TouchableOpacity>; })}</View> : null}
            {shop.modules?.includes('affiliate_stack') && shop.affiliate_items?.length ? <View style={styles.previewPanel}><Text style={styles.sectionTitle}>What I Use</Text>{shop.affiliate_items.map((item: any) => <TouchableOpacity key={item.name} onPress={() => setSelectedItem(item)} style={styles.previewOffer}><Text style={styles.productTitle}>{item.name}</Text><Text style={styles.copy}>Referral link</Text></TouchableOpacity>)}</View> : null}
            {shop.modules?.includes('dropship') && shop.dropship_items?.length ? <View style={styles.previewPanel}><Text style={styles.sectionTitle}>Gear Shelf</Text>{shop.dropship_items.map((item: any) => <TouchableOpacity key={item.title} onPress={() => setSelectedItem(item)} style={styles.previewOffer}><Text style={styles.productTitle}>{item.title}</Text><Text style={styles.merchPrice}>${item.price}</Text></TouchableOpacity>)}</View> : null}
            {shop.modules?.includes('services') && shop.high_ticket_offer?.title ? <View style={styles.previewPanel}><Text style={styles.sectionTitle}>Private Access</Text><TouchableOpacity onPress={() => setSelectedItem(shop.high_ticket_offer)}><Text style={styles.productTitle}>{shop.high_ticket_offer.title}</Text><Text style={styles.merchPrice}>${Number(shop.high_ticket_offer.price).toLocaleString()}</Text></TouchableOpacity></View> : null}
          </View>
        )}
      </ScrollView>
      <Modal visible={stockMenuIndex !== null} transparent animationType="fade" onRequestClose={() => setStockMenuIndex(null)}>
        <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setStockMenuIndex(null)}><View style={styles.stockMenu}><Text style={styles.modalEyebrow}>SELECT STOCK TIER</Text>{stockTiers.map((tier) => <TouchableOpacity key={tier} accessibilityRole="radio" accessibilityState={{ selected: shop.custom_inventory?.[stockMenuIndex ?? -1]?.stock_tier === tier }} style={styles.stockOption} onPress={() => { if (stockMenuIndex !== null) updateCustomItem(stockMenuIndex, 'stock_tier', tier); setStockMenuIndex(null); }}><Text style={styles.stockOptionText}>{tier}</Text>{shop.custom_inventory?.[stockMenuIndex ?? -1]?.stock_tier === tier ? <Ionicons name="checkmark" size={18} color="#1D4ED8" /> : null}</TouchableOpacity>)}</View></TouchableOpacity>
      </Modal>
      <Modal visible={linkModalIndex !== null} transparent animationType="fade" onRequestClose={() => setLinkModalIndex(null)}>
        <View style={styles.modalOverlay}><View style={styles.urlModal}><Text style={styles.modalEyebrow}>MEDIA LINK</Text><Text style={styles.modalTitle}>Add a URL</Text><Text style={styles.copy}>Enter video link, website, or asset URL (for example, https://youtube.com/...)</Text><TextInput value={linkDraft} onChangeText={setLinkDraft} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://" placeholderTextColor="#64748B" style={styles.copyInput} /><View style={styles.modalActions}><TouchableOpacity style={styles.urlCancel} onPress={() => setLinkModalIndex(null)}><Text style={styles.urlCancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.urlSave} onPress={saveItemLink}><Text style={styles.urlSaveText}>Add Link</Text></TouchableOpacity></View></View></View>
      </Modal>
      <Modal visible={!!liveUrl} transparent animationType="fade" onRequestClose={() => setLiveUrl('')}>
        <View style={styles.modalOverlay}><View style={styles.modal}><Text style={styles.modalEyebrow}>STORE PUBLISHED</Text><Text style={styles.modalTitle}>Your shop is live</Text><Text style={styles.copy}>Share your storefront with your audience.</Text><Text selectable style={styles.liveUrl}>{liveUrl}</Text><TouchableOpacity style={styles.launchButton} onPress={() => Clipboard.setStringAsync(liveUrl)}><Text style={styles.launchButtonText}>Copy Share Link</Text></TouchableOpacity><TouchableOpacity style={styles.viewButton} onPress={() => { const path = liveUrl.replace(typeof window !== 'undefined' ? window.location.origin : 'https://pathfinder.so', ''); setLiveUrl(''); router.push(path as any); }}><Text style={styles.viewButtonText}>View Live Storefront</Text></TouchableOpacity></View></View>
      </Modal>
      <Modal visible={!!selectedItem} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.modalOverlay}><View style={styles.itemDrawer}><View style={styles.itemDrawerHeader}><Text style={styles.modalTitle}>{selectedItem?.title || selectedItem?.name}</Text><TouchableOpacity onPress={() => setSelectedItem(null)}><Ionicons name="close" size={22} color="#CBD5E1" /></TouchableOpacity></View><ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>{(selectedItem?.media?.length ? selectedItem.media.filter((attachment: any) => attachment.type === 'image').map((attachment: any) => attachment.uri) : selectedItem?.images?.length ? selectedItem.images : selectedItem?.mockup_url ? [selectedItem.mockup_url] : []).map((uri: string, index: number) => <Image key={`${uri}-${index}`} source={{ uri }} style={styles.galleryImage} />)}{selectedItem?.media?.filter((attachment: any) => attachment.type === 'video' || attachment.type === 'link').map((attachment: any, index: number) => <TouchableOpacity key={attachment.id || `attachment-${index}`} style={styles.galleryPlaceholder} onPress={() => attachment.type === 'link' ? Linking.openURL(attachment.uri) : undefined}><Ionicons name={attachment.type === 'link' ? 'link-outline' : 'videocam-outline'} size={34} color="#1D4ED8" /><Text numberOfLines={2} style={styles.copy}>{attachment.name || (attachment.type === 'link' ? 'Open link' : 'Video attachment')}</Text></TouchableOpacity>)}{!selectedItem?.media?.length && !selectedItem?.images?.length && !selectedItem?.mockup_url ? <View style={styles.galleryPlaceholder}><Ionicons name="image-outline" size={34} color="#64748B" /><Text style={styles.copy}>Product gallery</Text></View> : null}</ScrollView><Text style={styles.copy}>{selectedItem?.description || selectedItem?.desc || selectedItem?.category || 'Creator-selected offer.'}</Text>{selectedItem?.variants?.length ? <Text style={styles.itemSpecs}>Options: {selectedItem.variants.join(' · ')}</Text> : null}<Text style={styles.merchPrice}>${Number(selectedItem?.price || 0).toLocaleString()}</Text><TouchableOpacity style={styles.launchButton} onPress={() => Alert.alert('Checkout preview', 'Checkout becomes available when payment processing is connected.')}><Text style={styles.launchButtonText}>Continue to Checkout</Text></TouchableOpacity></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: 20, paddingBottom: 54, maxWidth: 900, width: '100%', alignSelf: 'center' }, topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }, eyebrow: { color: '#35E4A1', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, pageTitle: { color: '#F8FAFC', fontSize: 30, fontWeight: '900', marginTop: 7 }, caption: { color: '#94A3B8', fontSize: 13, marginTop: 5 }, back: { borderColor: '#FFFFFF20', borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 }, backText: { color: '#CBD5E1', fontWeight: '800' }, hero: { backgroundColor: '#0D111A', borderColor: '#35E4A155', borderWidth: 1, borderRadius: 22, padding: 20, marginBottom: 14 }, microLabel: { color: '#6EE7B7', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, storeName: { color: '#F8FAFC', fontSize: 27, fontWeight: '900', marginTop: 10 }, fieldLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 14 }, handleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080A0F', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 10, marginTop: 6, paddingHorizontal: 11 }, handlePrefix: { color: '#67E8F9', fontWeight: '900' }, handleInput: { color: '#E2E8F0', paddingVertical: 10, paddingHorizontal: 7, flex: 1 }, colorSwatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#FFFFFF44' }, headline: { color: '#E2E8F0', fontSize: 19, fontWeight: '800', marginTop: 14, minHeight: 48 }, bodyCopy: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginTop: 6, minHeight: 52 }, hook: { backgroundColor: '#080A0F', borderColor: '#22D3EE44', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 17 }, hookBadge: { alignSelf: 'flex-start', backgroundColor: '#22D3EE20', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 }, hookBadgeText: { color: '#67E8F9', fontSize: 9, fontWeight: '900' }, hookTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '900', marginTop: 10 }, panel: { backgroundColor: '#0D111A', borderColor: '#FFFFFF14', borderWidth: 1, borderRadius: 18, padding: 17, marginBottom: 13 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }, sectionTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900' }, count: { color: '#64748B', fontSize: 11, fontWeight: '900' }, product: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: '#FFFFFF12', paddingVertical: 13, gap: 11 }, productNumber: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#35E4A118', alignItems: 'center', justifyContent: 'center' }, productNumberText: { color: '#6EE7B7', fontSize: 11, fontWeight: '900' }, productFields: { flex: 1 }, productTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '800', paddingVertical: 5 }, copy: { color: '#94A3B8', fontSize: 12, lineHeight: 18 }, priceBox: { backgroundColor: '#080A0F', borderColor: '#FFFFFF18', borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 6, alignItems: 'flex-end' }, priceLabel: { color: '#64748B', fontSize: 8, fontWeight: '900' }, priceInput: { color: '#6EE7B7', fontSize: 17, fontWeight: '900', minWidth: 48, textAlign: 'right' }, highTicket: { marginTop: 12, backgroundColor: '#241A0B', borderColor: '#F59E0B44', borderWidth: 1, borderRadius: 13, padding: 14 }, highTicketLabel: { color: '#FBBF24', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, highTicketPrice: { color: '#F8FAFC', fontSize: 27, fontWeight: '900', marginVertical: 4 }, proofRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }, proofValue: { color: '#6EE7B7', fontSize: 20, fontWeight: '900' }, agentMessage: { backgroundColor: '#080A0F', borderWidth: 1, borderColor: '#22D3EE33', borderRadius: 13, padding: 13, marginTop: 12 }, agentLabel: { color: '#67E8F9', fontSize: 9, fontWeight: '900', marginBottom: 6 }, agentText: { color: '#E2E8F0', fontSize: 13, lineHeight: 19 }, connectBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D111A', borderColor: '#F59E0B33', borderWidth: 1, borderRadius: 15, padding: 13, gap: 10, marginBottom: 15 }, connectIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center' }, connectIconText: { color: '#FBBF24', fontWeight: '900' }, connectCopy: { flex: 1 }, connectTitle: { color: '#F8FAFC', fontSize: 12, fontWeight: '900', marginBottom: 4 }, connectButton: { borderWidth: 1, borderColor: '#F59E0B66', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 }, connectButtonText: { color: '#FBBF24', fontWeight: '900', fontSize: 11 }, launchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 3 }, launchNote: { color: '#64748B', fontSize: 10, flex: 1, lineHeight: 15 }, launchButton: { backgroundColor: '#35E4A1', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 13, alignItems: 'center' }, launchButtonText: { color: '#06110D', fontSize: 13, fontWeight: '900' }, modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000CC', padding: 20 }, modal: { width: '100%', maxWidth: 480, backgroundColor: '#0D111A', borderColor: '#35E4A155', borderWidth: 1, borderRadius: 22, padding: 22 }, modalEyebrow: { color: '#35E4A1', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, modalTitle: { color: '#F8FAFC', fontSize: 25, fontWeight: '900', marginTop: 8 }, liveUrl: { color: '#67E8F9', fontSize: 13, marginVertical: 14 }, viewButton: { borderWidth: 1, borderColor: '#FFFFFF20', borderRadius: 11, padding: 12, alignItems: 'center', marginTop: 9 }, viewButtonText: { color: '#E2E8F0', fontWeight: '800' },
  viewToggle: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: '#080A0F', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 11, padding: 4, marginBottom: 14 },
  viewToggleButton: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 8 },
  viewToggleActive: { backgroundColor: '#35E4A1' },
  viewToggleText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  viewToggleTextActive: { color: '#06110D' },
  consumerPreview: { backgroundColor: '#090B0E', borderWidth: 1, borderColor: '#FFFFFF16', borderRadius: 18, padding: 14 },
  previewBanner: { height: 150, borderRadius: 13, backgroundColor: '#13202A', overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%' },
  bannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#080A0F44' },
  previewBrand: { alignItems: 'center', marginTop: -36, paddingHorizontal: 15 },
  logoImage: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#090B0E' },
  logoFallback: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#15352D', borderWidth: 3, borderColor: '#090B0E', alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { color: '#6EE7B7', fontSize: 27, fontWeight: '900' },
  previewStoreName: { color: '#F8FAFC', fontSize: 22, fontWeight: '900', marginTop: 9 },
  previewHeadline: { fontSize: 14, fontWeight: '800', textAlign: 'center', marginTop: 5 },
  previewPanel: { backgroundColor: '#11141C', borderWidth: 1, borderColor: '#FFFFFF14', borderRadius: 13, padding: 13, marginTop: 13 },
  previewOffer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#FFFFFF10', paddingVertical: 10 },
  previewDisclaimer: { color: '#64748B', fontSize: 10, textAlign: 'center', marginTop: 14 },
  merchPrice: { color: '#6EE7B7', fontSize: 15, fontWeight: '900' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  switchTrack: { width: 44, height: 25, borderRadius: 14, backgroundColor: '#273244', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: '#137D5A' },
  switchKnob: { width: 19, height: 19, borderRadius: 10, backgroundColor: '#E2E8F0' },
  switchKnobOn: { alignSelf: 'flex-end', backgroundColor: '#6EE7B7' },
  addItemButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#35E4A155', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  addItemText: { color: '#6EE7B7', fontSize: 10, fontWeight: '900' },
  customItem: { borderTopWidth: 1, borderColor: '#FFFFFF12', paddingTop: 11, marginTop: 10 },
  customItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customTitleInput: { flex: 1, minWidth: 0, backgroundColor: '#080A0F', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9 },
  priceField: { width: '100%', marginTop: 4 },
  inventoryPriceInput: { color: '#E2E8F0', backgroundColor: '#080A0F', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9, marginTop: 7, minHeight: 40 },
  customTypeRow: { marginTop: 10 },
  stockSelect: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#080A0F', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 9, paddingHorizontal: 12, marginTop: 7 },
  stockSelectText: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10 },
  mediaTile: { width: 150, minHeight: 112, position: 'relative', overflow: 'hidden', backgroundColor: '#111827', borderWidth: 1, borderColor: '#334155', borderRadius: 10 },
  mediaImage: { width: '100%', height: 112, resizeMode: 'cover' },
  mediaTileContent: { flex: 1, minHeight: 112, justifyContent: 'center', alignItems: 'center', gap: 7, padding: 12 },
  mediaTileText: { color: '#E2E8F0', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  mediaKind: { color: '#93C5FD', fontSize: 8, fontWeight: '900' },
  mediaDelete: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: '#0F172ADD', alignItems: 'center', justifyContent: 'center' },
  variantInputWrap: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, backgroundColor: '#080A0F', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 9, padding: 7, marginTop: 7 },
  variantTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 },
  variantTagText: { color: '#1D4ED8', fontSize: 10, fontWeight: '800' },
  variantInput: { flexGrow: 1, minWidth: 135, color: '#F8FAFC', paddingVertical: 7, paddingHorizontal: 5 },
  stockMenu: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 14, padding: 12 },
  stockOption: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 9, borderTopWidth: 1, borderColor: '#E2E8F0' },
  stockOptionText: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
  urlModal: { width: '100%', maxWidth: 460, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 14, padding: 18 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  urlCancel: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9' },
  urlCancelText: { color: '#334155', fontSize: 11, fontWeight: '800' },
  urlSave: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1D4ED8' },
  urlSaveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  copyInput: { color: '#CBD5E1', backgroundColor: '#080A0F', borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 9, padding: 10, marginTop: 7, minHeight: 40 },
  itemTypeRow: { flexDirection: 'row', gap: 5, flex: 1 },
  itemType: { borderWidth: 1, borderColor: '#FFFFFF18', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 6 },
  itemTypeActive: { borderColor: '#35E4A1', backgroundColor: '#35E4A118' },
  stockTiers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  stockTierText: { color: '#CBD5E1', fontSize: 9, fontWeight: '800' },
  trash: { alignSelf: 'flex-end', padding: 6 },
  mediaActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  saveItemButton: { backgroundColor: '#35E4A1', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8 },
  saveItemText: { color: '#06110D', fontSize: 10, fontWeight: '900' },
  itemTypeText: { color: '#CBD5E1', fontSize: 9, fontWeight: '800' },
  thumb: { width: 35, height: 35, borderRadius: 7, marginLeft: 5 },
  conciergePrompt: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#22D3EE33', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, color: '#A5F3FC', fontSize: 9, marginTop: 7 },
  itemDrawer: { width: '100%', maxWidth: 500, maxHeight: '82%', backgroundColor: '#0D111A', borderWidth: 1, borderColor: '#35E4A155', borderRadius: 20, padding: 18 },
  itemDrawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  gallery: { height: 210, marginVertical: 13 },
  galleryImage: { width: 420, height: 200, borderRadius: 12, marginRight: 8, resizeMode: 'cover' },
  galleryPlaceholder: { width: 420, height: 200, backgroundColor: '#080A0F', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemSpecs: { color: '#CBD5E1', fontSize: 11, marginTop: 10 },
});
