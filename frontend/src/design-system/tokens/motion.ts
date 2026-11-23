import { Easing } from 'react-native';

/**
 * Purposeful motion tokens: timing durations, cubic easings, and touch feedback factors.
 */
export const motion = {
  duration: {
    fast: 140,
    normal: 180,
    slow: 240,
    reducedFade: 80,
  },
  easing: {
    standard: Easing.out(Easing.cubic),
    exit: Easing.in(Easing.cubic),
  },
  pressOpacity: 0.78,
  pressScale: 0.985,
} as const;
