import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface CelebrationProps {
  trigger: boolean;
  isScaryStep?: boolean;
}

export default function CelebrationAnimation({ trigger, isScaryStep = false }: CelebrationProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      // Big celebration for scary steps
      if (isScaryStep) {
        scale.value = withSequence(
          withSpring(1.5, { damping: 2 }),
          withSpring(1.2),
          withSpring(0)
        );
        opacity.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 500 })
        );
        rotation.value = withRepeat(
          withTiming(360, { duration: 1000, easing: Easing.linear }),
          2
        );
      } else {
        // Quick celebration for regular steps
        scale.value = withSequence(
          withSpring(1.2),
          withSpring(0)
        );
        opacity.value = withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(1, { duration: 800 }),
          withTiming(0, { duration: 300 })
        );
      }
    }
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.celebration, animatedStyle]}>
        <Ionicons 
          name={isScaryStep ? "trophy" : "checkmark-circle"} 
          size={isScaryStep ? 120 : 80} 
          color={isScaryStep ? "#F59E0B" : "#10B981"} 
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  celebration: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
});
