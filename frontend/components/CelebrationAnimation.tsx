import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
type Tier = 'first' | 'momentum' | 'complete' | null;

interface Props {
  tier: Tier;
  onDone: () => void;
}

// Tier 1: First step - pulsing checkmark
function FirstStepAnim({ onDone }: { onDone: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.3, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.spring(scale, { toValue: 1.0, useNativeDriver: true }),
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(scale, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View style={[styles.firstContainer, { opacity, transform: [{ scale }] }]}>
      <View style={styles.firstCircle}>
        <Ionicons name="checkmark" size={36} color="#000" />
      </View>
    </Animated.View>
  );
}

// Tier 2: Momentum - rising bar chart
function MomentumAnim({ onDone }: { onDone: () => void }) {
  const heights = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current];
  const opacity = useRef(new Animated.Value(0)).current;
  const targetHeights = [28, 40, 52, 44, 60];

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.stagger(80, heights.map((h, i) =>
        Animated.spring(h, { toValue: targetHeights[i], useNativeDriver: false })
      )),
      Animated.delay(1200),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View style={[styles.momentumContainer, { opacity }]}>
      <View style={styles.momentumCard}>
        <Text style={styles.momentumTitle}>Momentum Building! 📈</Text>
        <Text style={styles.momentumSub}>You're halfway to launch</Text>
        <View style={styles.barsRow}>
          {heights.map((h, i) => (
            <Animated.View key={i} style={[styles.bar, { height: h, opacity: 0.6 + i * 0.08 }]} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// Tier 3: Blueprint Complete - full screen
function CompleteAnim({ onDone }: { onDone: () => void }) {
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const ringScale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.spring(ringScale, { toValue: 1.2, useNativeDriver: true }),
      ]),
      Animated.spring(ringScale, { toValue: 1, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(bgOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View style={[styles.completeOverlay, { opacity: bgOpacity }]}>
      <Animated.View style={[styles.completeContent, { transform: [{ scale }] }]}>
        <Animated.View style={[styles.completeRing, { transform: [{ scale: ringScale }] }]}>
          <Ionicons name="trophy" size={48} color="#00D95F" />
        </Animated.View>
        <Text style={styles.completeTitle}>Blueprint{"\n"}Complete!</Text>
        <Text style={styles.completeSub}>Time to start earning 💰</Text>
      </Animated.View>
    </Animated.View>
  );
}

export default function CelebrationAnimation({ tier, onDone }: Props) {
  if (!tier) return null;
  return (
    <View style={styles.overlay} pointerEvents="none">
      {tier === 'first' && <FirstStepAnim onDone={onDone} />}
      {tier === 'momentum' && <MomentumAnim onDone={onDone} />}
      {tier === 'complete' && <CompleteAnim onDone={onDone} />}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999, pointerEvents: 'none',
  },
  // Tier 1: First step
  firstContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  firstCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#00D95F',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#00D95F', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 24, elevation: 12,
  },
  // Tier 2: Momentum
  momentumContainer: {
    position: 'absolute', bottom: 120, left: 24, right: 24,
  },
  momentumCard: {
    backgroundColor: '#1A1C23', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#00D95F30',
    shadowColor: '#00D95F', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  momentumTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  momentumSub: { fontSize: 13, color: '#8E8E8E', marginBottom: 16 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 70 },
  bar: {
    flex: 1, borderRadius: 4, backgroundColor: '#00D95F',
    shadowColor: '#00D95F', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 8,
  },
  // Tier 3: Complete
  completeOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  completeContent: { alignItems: 'center' },
  completeRing: {
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 3, borderColor: '#00D95F',
    justifyContent: 'center', alignItems: 'center', marginBottom: 28,
    shadowColor: '#00D95F', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 32, elevation: 16,
  },
  completeTitle: {
    fontSize: 40, fontWeight: '800', color: '#FFFFFF',
    textAlign: 'center', lineHeight: 48, marginBottom: 12,
  },
  completeSub: { fontSize: 18, color: '#00D95F', fontWeight: '600' },
});
