import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useMotion } from '../motion/useMotion';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';
import { getPressFeedbackStyle } from './pressableFeedback';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leftIcon?: React.ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Filter or selection chip: `subtle` when inactive, `accentSoft` + `accent` border when selected.
 */
export function Chip({
  label,
  selected = false,
  onPress,
  leftIcon,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}: ChipProps): React.ReactElement {
  const { theme } = useTheme();
  const { reduceMotion } = useMotion();

  const containerStyle: ViewStyle = {
    backgroundColor: selected ? theme.colors.accentSoft : theme.colors.subtle,
    borderColor: selected ? theme.colors.accent : theme.colors.line,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
  };

  const content = (
    <>
      {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
      <AppText variant="caption" color={selected ? 'accent' : 'inkSecondary'} numberOfLines={1}>
        {label}
      </AppText>
    </>
  );

  if (!onPress) {
    return (
      <View
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? label}
        style={[styles.base, styles.staticMinHeight, containerStyle, style]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.base,
        styles.interactiveMinHeight,
        containerStyle,
        disabled ? styles.disabled : undefined,
        getPressFeedbackStyle(pressed, theme, reduceMotion, { disabled, scale: true }),
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  interactiveMinHeight: {
    minHeight: 44,
  },
  staticMinHeight: {
    minHeight: 32,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
