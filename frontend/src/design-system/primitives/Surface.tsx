import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { RadiusKey } from '../tokens/radius';
import { SpacingKey } from '../tokens/spacing';

export type SurfaceTone = 'bg' | 'surface' | 'subtle';

export interface SurfaceProps extends ViewProps {
  tone?: SurfaceTone;
  bordered?: boolean;
  padded?: boolean | SpacingKey;
  radiusKey?: RadiusKey;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Tonal container primitive (`bg` | `surface` | `subtle`) with optional 1px hairline border.
 */
export function Surface({
  tone = 'surface',
  bordered = false,
  padded = false,
  radiusKey = 'md',
  style,
  children,
  ...rest
}: SurfaceProps): React.ReactElement {
  const { theme } = useTheme();

  const paddingValue =
    padded === true
      ? theme.spacing.md
      : typeof padded === 'string'
        ? theme.spacing[padded]
        : undefined;

  const surfaceStyle: ViewStyle = {
    backgroundColor: theme.colors[tone],
    borderRadius: theme.radius[radiusKey],
    padding: paddingValue,
    ...(bordered
      ? {
          borderWidth: 1,
          borderColor: theme.colors.line,
        }
      : undefined),
  };

  return (
    <View {...rest} style={[surfaceStyle, style]}>
      {children}
    </View>
  );
}
