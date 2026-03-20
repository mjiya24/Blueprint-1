// AdBanner.web.tsx — Google AdSense banner for web platform only
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

const PUBLISHER_ID = 'ca-pub-7453043458871233';

interface Props {
  adSlot?: string;
  style?: any;
}

export function AdBanner({ adSlot = 'auto', style }: Props) {
  const adRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Inject AdSense script if not already present
    const existing = document.querySelector(`script[src*="adsbygoogle"]`);
    if (!existing) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
      script.onload = () => pushAd();
    } else {
      pushAd();
    }
  }, []);

  const pushAd = () => {
    try {
      if (typeof window !== 'undefined') {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense push error:', e);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 100, width: '100%' } as any}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%' as any,
    minHeight: 100,
    marginVertical: 8,
    backgroundColor: '#1A1C23',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
