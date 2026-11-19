import React, { useMemo } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useMotion } from '../motion/useMotion';
import { useTheme } from '../theme/useTheme';
import { getPressFeedbackStyle } from './pressableFeedback';

export type IconButtonVariant = 'ghost' | 'subtle' | 'danger';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityState?: PressableProps['accessibilityState'];
  variant?: IconButtonVariant;
  disabled?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const MIN_TOUCH_TARGET = 44;

/**
 * Accessible icon-only button enforcing at least 44x44 touch target and 8dp hitSlop.
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  variant = 'ghost',
  disabled = false,
  size = MIN_TOUCH_TARGET,
  style,
  testID,
}: IconButtonProps): React.ReactElement {
  const { theme } = useTheme();
  const { reduceMotion } = useMotion();
  const targetSize = Math.max(MIN_TOUCH_TARGET, size);

  const variantContainers = useMemo<Record<IconButtonVariant, ViewStyle>>(
    () => ({
      ghost: { backgroundColor: 'transparent' },
      subtle: { backgroundColor: theme.colors.subtle },
      danger: { backgroundColor: theme.colors.dangerSoft },
    }),
    [theme]
  );

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        ...accessibilityState,
        disabled: Boolean(disabled),
      }}
      style={({ pressed }) => [
        styles.base,
        {
          width: targetSize,
          height: targetSize,
          minWidth: MIN_TOUCH_TARGET,
          minHeight: MIN_TOUCH_TARGET,
          borderRadius: theme.radius.full,
        },
        variantContainers[variant],
        disabled ? styles.disabled : undefined,
        getPressFeedbackStyle(pressed, theme, reduceMotion, {
          disabled,
          scale: true,
        }),
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
