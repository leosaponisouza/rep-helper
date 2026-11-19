import { Platform, ViewStyle } from 'react-native';
import { palette } from './palette';

export type ElevationKey = 'none' | 'floating';

/**
 * Closed 2-level elevation scale (`none` default, `floating` for overlays/dialogs/toasts).
 */
export const elevation: Record<ElevationKey, ViewStyle> = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.common.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: palette.common.floatingBoxShadow,
    } as ViewStyle,
    default: {
      shadowColor: palette.common.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
  }),
};
