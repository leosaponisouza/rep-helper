import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { motion } from '../tokens/motion';

export interface MotionConfig {
  reduceMotion: boolean;
  shouldAnimate: boolean;
  useNativeDriver: boolean;
  duration: (ms: number, opts?: { allowReducedFade?: boolean }) => number;
}

/**
 * Exposes platform-safe animation flags and Reduce Motion-aware durations.
 */
export function useMotion(): MotionConfig {
  const [reduceMotion, setReduceMotion] = useState(false);
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    let isMounted = true;
    let hasReceivedChangeEvent = false;

    const queryReduceMotion = async () => {
      try {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        if (isMounted && !hasReceivedChangeEvent) {
          setReduceMotion(Boolean(enabled));
        }
      } catch {
        if (isMounted && !hasReceivedChangeEvent) {
          setReduceMotion(false);
        }
      }
    };

    queryReduceMotion();

    let subscription: { remove?: () => void } | undefined;
    try {
      subscription = AccessibilityInfo.addEventListener?.(
        'reduceMotionChanged',
        (enabled: boolean) => {
          hasReceivedChangeEvent = true;
          if (isMounted) {
            setReduceMotion(Boolean(enabled));
          }
        }
      );
    } catch {
      subscription = undefined;
    }

    return () => {
      isMounted = false;
      subscription?.remove?.();
    };
  }, []);

  const duration = useCallback(
    (ms: number, opts?: { allowReducedFade?: boolean }): number => {
      if (reduceMotion) {
        return opts?.allowReducedFade ? motion.duration.reducedFade : 0;
      }
      return ms;
    },
    [reduceMotion]
  );

  return useMemo<MotionConfig>(
    () => ({
      reduceMotion,
      shouldAnimate: !reduceMotion,
      useNativeDriver,
      duration,
    }),
    [reduceMotion, useNativeDriver, duration]
  );
}
