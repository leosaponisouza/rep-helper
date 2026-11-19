import React, { useEffect, useRef } from 'react';
import {
  Animated,
  DimensionValue,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useMotion } from '../motion/useMotion';
import { useTheme } from '../theme/useTheme';
import { RadiusKey } from '../tokens/radius';

export interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  radiusKey?: RadiusKey;
  style?: StyleProp<ViewStyle>;
}

const PULSE_DURATION_MS = 750;
const MIN_PULSE_OPACITY = 0.55;

/**
 * Tonal placeholder block using `subtle` surface and optional Reduce Motion-safe pulse.
 */
export function Skeleton({
  width = '100%',
  height,
  radiusKey = 'sm',
  style,
}: SkeletonProps): React.ReactElement {
  const { theme } = useTheme();
  const motion = useMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!motion.shouldAnimate) {
      opacity.setValue(1);
      return;
    }

    const cycleDuration = motion.duration(PULSE_DURATION_MS);
    if (cycleDuration === 0) {
      opacity.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: MIN_PULSE_OPACITY,
          duration: cycleDuration,
          easing: theme.motion.easing.standard,
          useNativeDriver: motion.useNativeDriver,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: cycleDuration,
          easing: theme.motion.easing.standard,
          useNativeDriver: motion.useNativeDriver,
        }),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
      opacity.setValue(1);
    };
  }, [motion, opacity, theme.motion.easing.standard]);

  return (
    <Animated.View
      accessibilityElementsHidden={true}
      importantForAccessibility="no"
      style={[
        {
          width,
          height,
          backgroundColor: theme.colors.subtle,
          borderRadius: theme.radius[radiusKey],
          opacity,
        },
        style,
      ]}
    />
  );
}
