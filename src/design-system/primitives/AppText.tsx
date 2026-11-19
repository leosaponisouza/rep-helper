import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { ThemeColors } from '../theme/types';
import { useTheme } from '../theme/useTheme';
import { TypographyVariant } from '../tokens/typography';

export type AppTextColor = keyof Pick<
  ThemeColors,
  | 'ink'
  | 'inkSecondary'
  | 'inkMuted'
  | 'accent'
  | 'onAccent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'onDanger'
>;

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: AppTextColor;
  strikethrough?: boolean;
}

/**
 * Semantic typography primitive bound to the Editorial de Convivência scale.
 * Preserves system font scaling and avoids fontWeight overrides on single-weight Google Fonts.
 */
export function AppText({
  variant = 'body',
  color = 'ink',
  strikethrough = false,
  allowFontScaling: _ignoredAllowFontScaling,
  style,
  children,
  ...rest
}: AppTextProps): React.ReactElement {
  const { theme } = useTheme();

  return (
    <Text
      {...rest}
      allowFontScaling={true}
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        strikethrough ? styles.strikethrough : undefined,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  strikethrough: {
    textDecorationLine: 'line-through',
  },
});
