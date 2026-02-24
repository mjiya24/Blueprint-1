import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';

interface EarningsProgressBarProps {
  progress: number;
  earningsUnlocked: boolean;
  showEarnings?: boolean;
}

export default function EarningsProgressBar({
  progress,
  earningsUnlocked,
  showEarnings = true,
}: EarningsProgressBarProps) {

  const getStatusText = () => {
    if (progress === 0) return 'Blueprint ready to start';
    if (progress < 25) return 'Getting momentum...';
    if (progress < 50) return 'Blueprint in progress';
    if (progress < 75) return 'Momentum building!';
    if (progress < 100) return 'Almost there — keep going!';
    return 'Blueprint Complete!';
  };

  const getBarColor = () => {
    if (progress < 33) return '#3B82F6';
    if (progress < 66) return '#00D95F';
    return '#00D95F';
  };

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: `${progress}%`,
              backgroundColor: getBarColor(),
              shadowColor: progress > 10 ? '#00D95F' : 'transparent',
            }
          ]}
        />
      </View>

      <View style={styles.row}>
        <Text style={[
          styles.statusText,
          progress >= 50 && styles.statusTextActive,
          progress === 100 && styles.statusTextComplete,
        ]}>
          {getStatusText()}
        </Text>
        <Text style={styles.percentage}>{progress}%</Text>
      </View>

      {showEarnings && earningsUnlocked && progress < 100 && (
        <View style={styles.unlockBadge}>
          <Text style={styles.unlockText}>✅ Setup complete — You can start earning now</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  track: { height: 8, backgroundColor: '#1A1C23', borderRadius: 4, overflow: 'hidden' },
  fill: {
    height: '100%', borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  statusText: { fontSize: 13, color: '#8E8E8E', fontWeight: '500' },
  statusTextActive: { color: '#00D95F' },
  statusTextComplete: { color: '#00D95F', fontWeight: '700' },
  percentage: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  unlockBadge: {
    marginTop: 10, backgroundColor: '#00D95F0A', padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#00D95F25',
  },
  unlockText: { fontSize: 12, color: '#00D95F', fontWeight: '600', textAlign: 'center' },
});
