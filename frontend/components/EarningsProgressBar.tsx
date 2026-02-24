import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

interface ProgressBarProps {
  progress: number; // 0-100
  earningsUnlocked: boolean;
  showEarnings?: boolean;
}

export default function EarningsProgressBar({ 
  progress, 
  earningsUnlocked,
  showEarnings = true 
}: ProgressBarProps) {
  
  // Color transitions: Cool blue → Warm green as progress increases
  const getProgressColor = () => {
    if (progress < 30) return '#3B82F6'; // Cool blue (starting)
    if (progress < 60) return '#10B981'; // Green (making progress)
    if (progress < 90) return '#059669'; // Vibrant green (almost there)
    return '#047857'; // Deep glowing green (ready to launch!)
  };

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress}%`,
    backgroundColor: getProgressColor(),
  }));

  const getStatusText = () => {
    if (progress === 0) return 'Ready to start';
    if (progress < 30) return 'Getting started...';
    if (earningsUnlocked && progress < 100) return '💰 Earnings unlocked!';
    if (progress < 60) return 'Halfway there!';
    if (progress < 90) return 'Almost ready to launch!';
    if (progress === 100) return '🚀 Ready to make money!';
    return `${progress}% complete`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressBackground}>
        <Animated.View style={[styles.progressFill, animatedStyle]} />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[
          styles.statusText,
          progress >= 50 && styles.statusTextHighlight,
          progress === 100 && styles.statusTextComplete
        ]}>
          {getStatusText()}
        </Text>
        <Text style={styles.percentageText}>{progress}%</Text>
      </View>

      {showEarnings && earningsUnlocked && progress < 100 && (
        <View style={styles.earningsBadge}>
          <Text style={styles.earningsText}>
            ✨ Setup complete - You can start earning!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  progressBackground: {
    height: 12,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statusTextHighlight: {
    color: '#10B981',
  },
  statusTextComplete: {
    color: '#047857',
    fontWeight: 'bold',
  },
  percentageText: {
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: 'bold',
  },
  earningsBadge: {
    marginTop: 12,
    backgroundColor: '#10B98120',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  earningsText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    textAlign: 'center',
  },
});
