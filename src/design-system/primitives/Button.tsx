import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useMotion } from '../motion/useMotion';
import { useTheme } from '../theme/useTheme';
import { AppText, AppTextColor } from './AppText';
import { getPressFeedbackStyle } from './pressableFeedback';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface ButtonVariantSpec {
  container: ViewStyle;
  textColor: AppTextColor;
  spinnerColor: string;
}

/**
 * Accessible editorial button supporting primary, secondary, ghost, and danger variants.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps): React.ReactElement {
  const { theme } = useTheme();
  const { reduceMotion } = useMotion();
  const isDisabled = Boolean(disabled || loading);

  const variantMap = useMemo<Record<ButtonVariant, ButtonVariantSpec>>(
    () => ({
      primary: {
        container: {
          backgroundColor: theme.colors.accent,
        },
        textColor: 'onAccent',
        spinnerColor: theme.colors.onAccent,
      },
      secondary: {
        container: {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
        },
        textColor: 'ink',
        spinnerColor: theme.colors.ink,
      },
      ghost: {
        container: {
          backgroundColor: 'transparent',
        },
        textColor: 'accent',
        spinnerColor: theme.colors.accent,
      },
      danger: {
        container: {
          backgroundColor: theme.colors.danger,
        },
        textColor: 'onDanger',
        spinnerColor: theme.colors.onDanger,
      },
    }),
    [theme]
  );

  const sizeMap = useMemo<Record<ButtonSize, ViewStyle>>(
    () => ({
      md: {
        minHeight: 48,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
      },
      sm: {
        minHeight: 44,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
      },
    }),
    [theme]
  );

  const activeVariant = variantMap[variant];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: theme.radius.sm,
          gap: theme.spacing.xs,
        },
        sizeMap[size],
        activeVariant.container,
        fullWidth ? styles.fullWidth : undefined,
        disabled && !loading ? styles.disabledOpacity : undefined,
        loading ? styles.loadingOpacity : undefined,
        getPressFeedbackStyle(pressed, theme, reduceMotion, {
          disabled: isDisabled,
          scale: true,
        }),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={activeVariant.spinnerColor} />
      ) : leftIcon ? (
        <View style={styles.iconSlot}>{leftIcon}</View>
      ) : null}
      <AppText variant="bodyStrong" color={activeVariant.textColor} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledOpacity: {
    opacity: 0.5,
  },
  loadingOpacity: {
    opacity: 0.85,
  },
});
