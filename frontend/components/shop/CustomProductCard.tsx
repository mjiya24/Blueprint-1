import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ProductMedia = { id?: string; type?: string; uri?: string; name?: string };

type Props = {
  item: any;
  onPress: () => void;
};

export function CustomProductCard({ item, onPress }: Props) {
  const media: ProductMedia[] = item.media || [
    ...(item.images || []).map((uri: string, index: number) => ({ id: `image-${index}`, type: 'image', uri })),
    ...(item.video_url ? [{ id: 'video', type: /^https?:\/\//i.test(item.video_url) ? 'link' : 'video', uri: item.video_url }] : []),
  ];
  const hero = media.find((entry) => entry.type === 'image' || entry.type === 'video' || entry.type === 'link');
  const count = Number(item.stock_count);
  const exactLowStock = item.stock_tier === 'Specific Low Stock (< 50)' && Number.isInteger(count) && count > 0 && count < 50;
  const stockLabel = exactLowStock
    ? `Only ${count} left!`
    : item.stock_tier === 'Specific Low Stock (< 50)'
      ? 'Low Stock'
      : item.stock_tier && item.stock_tier !== '500+'
        ? `${item.stock_tier} In Stock`
        : 'In Stock';

  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.card} activeOpacity={0.86}>
      <View style={styles.mediaFrame}>
        {hero?.type === 'image' && hero.uri ? <Image source={{ uri: hero.uri }} style={styles.heroImage} /> : null}
        {hero?.type !== 'image' && hero?.uri ? <ImageBackground source={{ uri: item.banner_image || item.thumbnail_url }} style={styles.mediaFallback} imageStyle={styles.fallbackImage}><View style={styles.videoMark}><Ionicons name={hero.type === 'link' ? 'link-outline' : 'play'} size={18} color="#06110D" /></View><Text numberOfLines={2} style={styles.mediaHint}>{hero.type === 'link' ? 'VIEW MEDIA LINK' : 'VIDEO PREVIEW'}</Text></ImageBackground> : null}
        {!hero ? <View style={styles.mediaFallback}><Ionicons name={item.item_type === 'service' ? 'sparkles-outline' : item.item_type === 'digital' ? 'document-text-outline' : 'bag-handle-outline'} size={40} color="#6EE7B7" /><Text style={styles.mediaHint}>{item.item_type === 'service' ? 'CREATOR SERVICE' : item.item_type === 'digital' ? 'DIGITAL OFFER' : 'CUSTOM MERCH'}</Text></View> : null}
        {media.filter((entry) => entry.type === 'image').length > 1 ? <View style={styles.mediaCount}><Text style={styles.mediaCountText}>{media.filter((entry) => entry.type === 'image').length} PHOTOS</Text></View> : null}
      </View>
      <View style={styles.details}>
        <Text numberOfLines={2} style={styles.title}>{item.title || 'Custom offer'}</Text>
        <View style={[styles.stockBadge, exactLowStock && styles.lowStockBadge]}><View style={[styles.stockDot, exactLowStock && styles.lowStockDot]} /><Text numberOfLines={1} style={[styles.stockText, exactLowStock && styles.lowStockText]}>{stockLabel}</Text></View>
        <View style={styles.priceRow}><Text style={styles.price}>${Number(item.price || 0).toFixed(0)}</Text><View style={styles.viewButton}><Text style={styles.viewText}>View</Text><Ionicons name="arrow-forward" size={13} color="#06110D" /></View></View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: '48.5%', overflow: 'hidden', backgroundColor: '#131B2E', borderColor: '#FFFFFF14', borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  mediaFrame: { width: '100%', aspectRatio: 4 / 5, backgroundColor: '#0B0F19', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  mediaFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#18243A' },
  fallbackImage: { opacity: 0.5 },
  videoMark: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#35E4A1' },
  mediaHint: { color: '#94A3B8', fontSize: 8, fontWeight: '900', letterSpacing: 0.6, textAlign: 'center', paddingHorizontal: 8 },
  mediaCount: { position: 'absolute', top: 8, left: 8, backgroundColor: '#0B0F19CC', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5 },
  mediaCountText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  details: { padding: 10, gap: 8 },
  title: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', minHeight: 34 },
  stockBadge: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#35E4A11A', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 5 },
  lowStockBadge: { backgroundColor: '#F59E0B1A' },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#35E4A1' },
  lowStockDot: { backgroundColor: '#FBBF24' },
  stockText: { color: '#6EE7B7', fontSize: 8, fontWeight: '900' },
  lowStockText: { color: '#FBBF24' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  price: { color: '#35E4A1', fontSize: 17, fontWeight: '900' },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#35E4A1', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 7 },
  viewText: { color: '#06110D', fontSize: 9, fontWeight: '900' },
});
