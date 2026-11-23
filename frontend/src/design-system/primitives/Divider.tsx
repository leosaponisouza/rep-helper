import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

export type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProps {
  orientation?: DividerOrientation;
  inset?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * 1px hairline divider using the semantic `line` token.
 */
export function Divider({
  orientation = 'horizontal',
  inset = 0,
  style,
}: DividerProps): React.ReactElement {
  const { theme } = useTheme();

  const orientationStyle: ViewStyle =
    orientation === 'vertical'
      ? {
          width: 1,
          alignSelf: 'stretch',
          backgroundColor: theme.colors.line,
          marginVertical: inset > 0 ? inset : undefined,
        }
      : {
          height: 1,
          backgroundColor: theme.colors.line,
          marginLeft: inset > 0 ? inset : undefined,
        };

  return (
    <View
      accessibilityElementsHidden={true}
      importantForAccessibility="no"
      style={[orientationStyle, style]}
    />
  );
}
