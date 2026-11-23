import { ViewStyle } from 'react-native';
import { Theme } from '../theme/types';

export interface PressFeedbackOptions {
  disabled?: boolean;
  scale?: boolean;
}

/**
 * Computes consistent Pressable visual feedback respecting theme motion tokens and Reduce Motion.
 */
export function getPressFeedbackStyle(
  pressed: boolean,
  theme: Theme,
  reduceMotion: boolean,
  options?: PressFeedbackOptions
): ViewStyle | undefined {
  if (!pressed || options?.disabled) {
    return undefined;
  }

  if (options?.scale && !reduceMotion) {
    return {
      opacity: theme.motion.pressOpacity,
      transform: [{ scale: theme.motion.pressScale }],
    };
  }

  return {
    opacity: theme.motion.pressOpacity,
  };
}
