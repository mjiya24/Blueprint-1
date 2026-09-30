import React, { useEffect, useState } from 'react';
import { Image, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

type Media = { id?: string; type?: string; uri?: string; name?: string };
type Props = {
  item: any;
  visible: boolean;
  onClose: () => void;
  onBuy: (item: any, variant: string) => void;
};

function VideoSlide({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => { instance.loop = false; });
  return <VideoView player={player} style={styles.video} nativeControls contentFit="cover" />;
}

export function ProductDetailDrawer({ item, visible, onClose, onBuy }: Props) {
  const [selectedVariant, setSelectedVariant] = useState('');
  useEffect(() => { setSelectedVariant(''); }, [item?.id, item?.title]);
  const media: Media[] = item?.media || [
    ...(item?.images || []).map((uri: string, index: number) => ({ id: `image-${index}`, type: 'image', uri })),
    ...(item?.video_url ? [{ id: 'video', type: /^https?:\/\//i.test(item.video_url) ? 'link' : 'video', uri: item.video_url }] : []),
  ];
  const images = media.filter((entry) => entry.type === 'image' && entry.uri);
  const videos = media.filter((entry) => entry.type === 'video' && entry.uri);
  const links = media.filter((entry) => entry.type === 'link' && entry.uri);
  const count = Number(item?.stock_count);
  const lowStock = item?.stock_tier === 'Specific Low Stock (< 50)';
  const validCount = lowStock && Number.isInteger(count) && count > 0 && count < 50;
  const stockText = validCount ? `Low Stock · Only ${count} left` : lowStock ? 'Low Stock' : item?.stock_tier && item.stock_tier !== '500+' ? `In Stock: ${item.stock_tier}` : 'In Stock';
  const variants: string[] = item?.variants || [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.drawer}>
          <View style={styles.grabber} />
          <View style={styles.header}><Text style={styles.kicker}>{String(item?.item_type || 'CUSTOM OFFER').toUpperCase()}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close product details" onPress={onClose} style={styles.close}><Ionicons name="close" size={20} color="#CBD5E1" /></TouchableOpacity></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {images.length || videos.length || links.length ? <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
              {images.map((entry) => <Image key={entry.id || entry.uri} source={{ uri: entry.uri }} style={styles.image} />)}
              {videos.map((entry) => <VideoSlide key={entry.id || entry.uri} uri={entry.uri!} />)}
              {links.map((entry) => <TouchableOpacity key={entry.id || entry.uri} style={styles.linkSlide} onPress={() => Linking.openURL(entry.uri!)}><Ionicons name="link-outline" size={32} color="#35E4A1" /><Text style={styles.linkLabel}>OPEN ATTACHED LINK</Text><Text numberOfLines={2} style={styles.linkText}>{entry.name || entry.uri}</Text></TouchableOpacity>)}
            </ScrollView> : <View style={styles.emptyMedia}><Ionicons name="bag-handle-outline" size={34} color="#6EE7B7" /><Text style={styles.emptyLabel}>CREATOR SELECTED OFFER</Text></View>}
            <Text style={styles.title}>{item?.title || 'Custom offer'}</Text>
            <Text style={styles.price}>${Number(item?.price || 0).toFixed(0)}</Text>
            <View style={[styles.stockBadge, validCount && styles.stockLow]}><View style={[styles.stockDot, validCount && styles.stockDotLow]} /><Text style={[styles.stockText, validCount && styles.stockTextLow]}>{stockText}</Text></View>
            {variants.length ? <View style={styles.variantBlock}><Text style={styles.fieldLabel}>CHOOSE AN OPTION</Text><View style={styles.variants}>{variants.map((variant) => <TouchableOpacity key={variant} accessibilityRole="radio" accessibilityState={{ selected: selectedVariant === variant }} onPress={() => setSelectedVariant(variant)} style={[styles.variant, selectedVariant === variant && styles.variantSelected]}><Text style={[styles.variantText, selectedVariant === variant && styles.variantTextSelected]}>{variant}</Text></TouchableOpacity>)}</View></View> : null}
            {item?.description ? <View style={styles.descriptionBlock}><Text style={styles.fieldLabel}>ABOUT THIS ITEM</Text><Text style={styles.description}>{item.description}</Text></View> : null}
          </ScrollView>
          <TouchableOpacity style={styles.buyButton} onPress={() => onBuy(item, selectedVariant)}><Text style={styles.buyText}>{item?.item_type === 'service' ? 'Claim Offer' : 'Buy Now'} · ${Number(item?.price || 0).toFixed(0)}</Text><Ionicons name="arrow-forward" size={17} color="#06110D" /></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000B8', paddingTop: 30 },
  drawer: { width: '100%', maxWidth: 640, maxHeight: '94%', alignSelf: 'center', backgroundColor: '#131B2E', borderColor: '#35E4A155', borderWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingBottom: 22 },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#64748B', alignSelf: 'center', marginTop: 9, marginBottom: 13 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: '#6EE7B7', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF0A' },
  body: { paddingBottom: 16 },
  gallery: { height: 280, marginTop: 8, marginBottom: 16 },
  image: { width: 340, height: 270, borderRadius: 13, marginRight: 9, resizeMode: 'cover' },
  video: { width: 340, height: 270, borderRadius: 13, marginRight: 9, backgroundColor: '#0B0F19' },
  linkSlide: { width: 340, height: 270, borderRadius: 13, marginRight: 9, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#0B0F19', borderColor: '#FFFFFF14', borderWidth: 1, padding: 18 },
  linkLabel: { color: '#6EE7B7', fontSize: 9, fontWeight: '900' },
  linkText: { color: '#CBD5E1', fontSize: 12, textAlign: 'center' },
  emptyMedia: { height: 180, borderRadius: 13, marginTop: 8, marginBottom: 16, alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#0B0F19' },
  emptyLabel: { color: '#64748B', fontSize: 9, fontWeight: '900' },
  title: { color: '#FFFFFF', fontSize: 23, fontWeight: '900' },
  price: { color: '#35E4A1', fontSize: 22, fontWeight: '900', marginTop: 5 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, backgroundColor: '#35E4A118', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, marginTop: 11 },
  stockLow: { backgroundColor: '#F59E0B1A' },
  stockDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#35E4A1' },
  stockDotLow: { backgroundColor: '#FBBF24' },
  stockText: { color: '#6EE7B7', fontSize: 10, fontWeight: '900' },
  stockTextLow: { color: '#FBBF24' },
  variantBlock: { marginTop: 20 },
  fieldLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 9 },
  variants: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variant: { borderWidth: 1, borderColor: '#FFFFFF24', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#0B0F19' },
  variantSelected: { borderColor: '#35E4A1', backgroundColor: '#35E4A11A' },
  variantText: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
  variantTextSelected: { color: '#6EE7B7' },
  descriptionBlock: { marginTop: 20 },
  description: { color: '#CBD5E1', fontSize: 13, lineHeight: 20 },
  buyButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#35E4A1', borderRadius: 11, marginTop: 10, paddingHorizontal: 16 },
  buyText: { color: '#06110D', fontSize: 12, fontWeight: '900' },
});
