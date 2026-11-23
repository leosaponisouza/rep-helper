import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { AppText, AppTextColor } from './AppText';

export type StatusTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface StatusTextProps {
  label: string;
  tone?: StatusTone;
  showDot?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const STATUS_TONE_COLORS: Record<StatusTone, AppTextColor> = {
  neutral: 'inkMuted',
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

/**
 * Pill-free editorial status indicator using tabular monoLabel typography
 * and an optional 6px semantic dot or icon.
 */
export function StatusText({
  label,
  tone = 'neutral',
  showDot = false,
  icon,
  style,
}: StatusTextProps): React.ReactElement {
  const { theme } = useTheme();
  const colorKey = STATUS_TONE_COLORS[tone];

  return (
    <View style={[styles.row, { gap: theme.spacing.xxs }, style]}>
      {icon ? (
        <View style={styles.iconSlot}>{icon}</View>
      ) : showDot ? (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: theme.colors[colorKey],
              borderRadius: theme.radius.full,
            },
          ]}
        />
      ) : null}
      <AppText variant="monoLabel" color={colorKey}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
